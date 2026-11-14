import { useEffect, useRef } from 'react';
import { getDuotoneColor } from '@/components/Dashboard/color';
import { perlin2 } from '@/components/Dashboard/noise';
import { RAMP } from '@/components/Dashboard/ramp';
import type { Favorite } from '@/lib/about';

// A row of cover art drawn the way the site draws everything else: each
// poster becomes glyphs from "worthy rae" in the cycling duotone palette,
// with a slow shimmer. Hovering a poster fades the real artwork in.

const SPEED_DIVISOR = 6750; // useTerrainAnimation's clock
const FRAME_MS = 1000 / 10;
const FONT_PX = 5;

interface Poster { el: HTMLCanvasElement; ctx: CanvasRenderingContext2D; lum: Float32Array | null; cols: number; rows: number }

function loadLuminance(src: string, cols: number, rows: number): Promise<Float32Array> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = cols;
      c.height = rows;
      const g = c.getContext('2d');
      if (!g) return reject(new Error('no 2d context'));
      g.drawImage(img, 0, 0, cols, rows);
      const px = g.getImageData(0, 0, cols, rows).data;
      const lum = new Float32Array(cols * rows);
      for (let i = 0; i < lum.length; i++) {
        const y = (0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]) / 255;
        // Darker mids and a lower ceiling, so white posters don't turn into
        // solid blocks of the brightest glyphs.
        lum[i] = Math.pow(y, 1.35) * 0.8;
      }
      resolve(lum);
    };
    img.onerror = reject;
    img.src = src;
  });
}

export function PosterStrip({ items }: { items: Favorite[] }) {
  const refs = useRef<(HTMLCanvasElement | null)[]>([]);
  const withArt = items.filter((i) => i.image);

  useEffect(() => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let cancelled = false;
    const posters: Poster[] = [];
    refs.current.forEach((el, i) => {
      const ctx = el?.getContext('2d');
      const src = withArt[i]?.image;
      if (!el || !ctx || !src) return;
      el.width = Math.round(el.clientWidth * dpr);
      el.height = Math.round(el.clientHeight * dpr);
      const cols = Math.max(8, Math.round(el.clientWidth / (FONT_PX * 0.602)));
      const rows = Math.max(8, Math.round(el.clientHeight / FONT_PX));
      const p: Poster = { el, ctx, lum: null, cols, rows };
      posters.push(p);
      loadLuminance(src, cols, rows).then((lum) => { if (!cancelled) p.lum = lum; }).catch(() => {});
    });

    const draw = (ts: number) => {
      const t = ts / SPEED_DIVISOR;
      const lut: string[] = [];
      for (let i = 0; i < 32; i++) {
        const v = i / 31;
        const c = getDuotoneColor(v, t);
        const dim = 0.22 + v * 1.28;
        lut.push(`rgb(${Math.min(255, c.r * dim) | 0},${Math.min(255, c.g * dim) | 0},${Math.min(255, c.b * dim) | 0})`);
      }
      posters.forEach((p, n) => {
        const { el, ctx, lum, cols, rows } = p;
        if (!lum) return;
        const cw = el.width / cols;
        const ch = el.height / rows;
        ctx.clearRect(0, 0, el.width, el.height);
        ctx.font = `${ch}px 'JetBrains Mono','Courier New',monospace`;
        ctx.textBaseline = 'top';
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const drift = perlin2(c * 0.12 + t * 0.4 + n * 7, r * 0.12 - t * 0.25) * 0.12;
            const v = Math.max(0, Math.min(1, lum[r * cols + c] + drift));
            ctx.fillStyle = lut[Math.min(31, (v * 32) | 0)];
            ctx.fillText(RAMP[Math.round(v * (RAMP.length - 1))], c * cw, r * ch);
          }
        }
      });
    };

    let raf = 0;
    let last = -Infinity;
    const loop = (ts: number) => {
      raf = requestAnimationFrame(loop);
      if (ts - last < FRAME_MS) return;
      last = ts;
      draw(ts);
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // One still frame once the art has loaded.
      const id = setTimeout(() => draw(performance.now()), 1500);
      return () => { cancelled = true; clearTimeout(id); };
    }
    raf = requestAnimationFrame(loop);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
    // The list is static data, so drawing set-up runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (withArt.length === 0) return null;

  return (
    <div className="about-posters" style={{ gridTemplateColumns: `repeat(${withArt.length}, minmax(0, 1fr))` }}>
      {withArt.map((item, i) => {
        const inner = (
          <>
            <canvas ref={(el) => { refs.current[i] = el; }} aria-hidden="true" />
            <img src={item.image} alt={item.title} crossOrigin="anonymous" loading="lazy" />
          </>
        );
        return item.url
          ? <a key={item.title} className="about-poster" href={item.url} title={item.by ? `${item.title} · ${item.by}` : item.title} target="_blank" rel="noopener noreferrer">{inner}</a>
          : <span key={item.title} className="about-poster" title={item.title}>{inner}</span>;
      })}
    </div>
  );
}
