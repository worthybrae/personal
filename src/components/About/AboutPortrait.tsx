import { useEffect, useRef } from 'react';
import { warpedTerrain } from '@/components/Dashboard/noise';
import { getDuotoneColor, scurve } from '@/components/Dashboard/color';
import { RAMP } from '@/components/Dashboard/ramp';

// A round portrait drawn the way the site background is drawn: glyphs from
// "worthy rae", duotone colours, flowing terrain. The map is a pre-cropped
// headshot: red holds brightness, green holds the person mask (from macOS
// Vision), blue holds warmth (red minus blue in the photo, stretched).
//
// Behind the person is the site's own terrain, dimmed. In the person,
// brightness picks the glyph and how lit it is, and warmth picks where on the
// palette's two colours it sits, so skin and hair land on the warm end and
// the shirt on the cool end instead of everything following brightness. The
// rim fades out, so the circle has no hard edge.

const MAP_URL = '/media/about/portrait-map.png';
const MAP_SIZE = 256;
const SIZE = 380; // CSS px; shrinks to fit narrow screens
const FONT_PX = 5;
// Same clock as the background terrain (useTerrainAnimation speedDivisor), so
// the circle runs through the palettes in step with the page behind it.
const SPEED_DIVISOR = 6750;
const FRAME_MS = 1000 / 24;
const NOISE_SCALE = 2.4;
// Colour lookup: palette position x brightness, rebuilt each frame.
const HUES = 16;
const LEVELS = 32;
// How lit the terrain behind the person is, so the face stays brightest.
const BG_LEVEL = 0.42;
// How much terrain moves through the person.
const TERRAIN_IN_PERSON = 0.12;
// How much warmth, rather than brightness, sets the person's palette position.
const WARMTH_WEIGHT = 0.7;
// The glyphs fade out over this band at the rim.
const RIM_FADE_START = 0.38;

interface PortraitMap { lum: Float32Array; mask: Float32Array; warm: Float32Array }

function loadMap(): Promise<PortraitMap> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = MAP_SIZE;
      c.height = MAP_SIZE;
      const g = c.getContext('2d');
      if (!g) return reject(new Error('no 2d context'));
      g.drawImage(img, 0, 0, MAP_SIZE, MAP_SIZE);
      const px = g.getImageData(0, 0, MAP_SIZE, MAP_SIZE).data;
      const n = MAP_SIZE * MAP_SIZE;
      const lum = new Float32Array(n);
      const mask = new Float32Array(n);
      const warm = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        lum[i] = px[i * 4] / 255;
        mask[i] = px[i * 4 + 1] / 255;
        warm[i] = px[i * 4 + 2] / 255;
      }
      resolve({ lum, mask, warm });
    };
    img.onerror = reject;
    img.src = MAP_URL;
  });
}

function sampleMap(map: Float32Array, u: number, v: number): number {
  const x = Math.max(0, Math.min(MAP_SIZE - 1.001, u * MAP_SIZE - 0.5));
  const y = Math.max(0, Math.min(MAP_SIZE - 1.001, v * MAP_SIZE - 0.5));
  const x0 = x | 0;
  const y0 = y | 0;
  const fx = x - x0;
  const fy = y - y0;
  const i = y0 * MAP_SIZE + x0;
  const top = map[i] + (map[i + 1] - map[i]) * fx;
  const bot = map[i + MAP_SIZE] + (map[i + MAP_SIZE + 1] - map[i + MAP_SIZE]) * fx;
  return top + (bot - top) * fy;
}

export function AboutPortrait() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.round(SIZE * dpr);
    canvas.width = W;
    canvas.height = W;
    const fontSize = FONT_PX * dpr;
    const charW = fontSize * 0.602;
    const charH = fontSize;
    const cols = Math.ceil(W / charW);
    const rows = Math.ceil(W / charH);
    const lut: string[] = new Array(HUES * LEVELS);

    let map: PortraitMap | null = null;
    let raf = 0;
    let last = -Infinity;
    let visible = true;
    let cancelled = false;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const draw = (ts: number) => {
      const t = ts / SPEED_DIVISOR;
      const bg = getDuotoneColor(0, t);
      const bgR = Math.floor(bg.bgR);
      const bgG = Math.floor(bg.bgG);
      const bgB = Math.floor(bg.bgB);
      // Same colour-then-dim rule as the background terrain, but with the
      // palette position and the brightness as separate axes.
      for (let h = 0; h < HUES; h++) {
        const col = getDuotoneColor(0.05 + 0.95 * (h / (HUES - 1)), t);
        for (let l = 0; l < LEVELS; l++) {
          const dim = 0.22 + (l / (LEVELS - 1)) * 1.28;
          const r = Math.min(255, Math.max(bgR + 10, Math.floor(col.r * dim)));
          const g = Math.min(255, Math.max(bgG + 10, Math.floor(col.g * dim)));
          const b = Math.min(255, Math.max(bgB + 10, Math.floor(col.b * dim)));
          lut[h * LEVELS + l] = `rgb(${r},${g},${b})`;
        }
      }

      ctx.clearRect(0, 0, W, W);
      ctx.font = `${fontSize}px 'JetBrains Mono','Courier New',monospace`;
      ctx.textBaseline = 'top';

      for (let r = 0; r < rows; r++) {
        const v = (r + 0.5) * charH / W;
        for (let c = 0; c < cols; c++) {
          const u = (c + 0.5) * charW / W;
          const du = u - 0.5;
          const dv = v - 0.5;
          const d = Math.sqrt(du * du + dv * dv);
          if (d > 0.5) continue;

          let terrain = (warpedTerrain(u * NOISE_SCALE, v * NOISE_SCALE, t) + 0.5) / 1.8;
          terrain = scurve(Math.max(0, Math.min(1, terrain)), 8);
          // Background: the site's terrain, palette position as on the site,
          // brightness dimmed.
          let hue = terrain;
          let val = terrain * BG_LEVEL;
          if (map) {
            const m = sampleMap(map.mask, u, v);
            if (m > 0.01) {
              // A gentler curve than the terrain's, pulled down a little, so the
              // skin doesn't clip and the eyes and mouth keep their shape.
              const lit = scurve(sampleMap(map.lum, u, v) - 0.06 + (terrain - 0.5) * TERRAIN_IN_PERSON, 4);
              const warmHue = lit + (sampleMap(map.warm, u, v) - lit) * WARMTH_WEIGHT;
              val += (lit - val) * m;
              hue += (warmHue - hue) * m;
            }
          }
          if (d > RIM_FADE_START) {
            const k = 1 - (d - RIM_FADE_START) / (0.5 - RIM_FADE_START);
            val *= k * k * (3 - 2 * k);
          }
          const hi = Math.min(HUES - 1, Math.max(0, (hue * HUES) | 0));
          const li = Math.min(LEVELS - 1, (val * LEVELS) | 0);
          ctx.fillStyle = lut[hi * LEVELS + li];
          ctx.fillText(RAMP[Math.min(RAMP.length - 1, (val * (RAMP.length - 1)) | 0)], c * charW, r * charH);
        }
      }
    };

    const loop = (ts: number) => {
      raf = requestAnimationFrame(loop);
      if (!visible || ts - last < FRAME_MS) return;
      last = ts;
      draw(ts);
    };

    loadMap()
      .then((m) => {
        if (cancelled) return;
        map = m;
        if (reduceMotion) draw(performance.now());
      })
      .catch(() => {});

    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    io.observe(canvas);

    if (reduceMotion) draw(performance.now());
    else raf = requestAnimationFrame(loop);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="about-portrait"
      style={{ width: `min(${SIZE}px, 100%)`, aspectRatio: '1' }}
      aria-hidden="true"
    />
  );
}
