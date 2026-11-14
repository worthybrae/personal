import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { getDuotoneColor } from '@/components/Dashboard/color';
import { perlin2 } from '@/components/Dashboard/noise';
import { RAMP } from '@/components/Dashboard/ramp';
import type { GithubActivity as Activity } from '@/types/analytics';

// The last year of GitHub contributions, one glyph per day (weeks across,
// Sunday to Saturday down), drawn like the background terrain: busier days
// get denser letters from "worthy rae" and brighter duotone colour, a slow
// noise field makes the letters shimmer, and the palette cycles on the same
// clock as the page behind it.

const SPEED_DIVISOR = 6750; // useTerrainAnimation's clock
const FRAME_MS = 1000 / 12;
const ROW_PX = 11;
const LEVEL_VAL = [0.08, 0.38, 0.56, 0.76, 0.96];

export function GithubActivity() {
  const [data, setData] = useState<Activity | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let live = true;
    api.getGithubActivity().then((d) => { if (live) setData(d); }).catch(() => {});
    return () => { live = false; };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!data || data.days.length === 0 || !canvas || !ctx) return;

    // Pad the front so the first column starts on a Sunday.
    const lead = new Date(`${data.days[0].date}T00:00:00Z`).getUTCDay();
    const levels = [...Array(lead).fill(-1), ...data.days.map((d) => d.level)];
    const cols = Math.ceil(levels.length / 7);

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let W = 0;
    let cellW = 0;
    const resize = () => {
      W = canvas.clientWidth * dpr;
      canvas.width = W;
      canvas.height = 7 * ROW_PX * dpr;
      cellW = W / cols;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = (ts: number) => {
      const t = ts / SPEED_DIVISOR;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const fontPx = Math.min(cellW * 1.25, 9.5 * dpr);
      ctx.font = `${fontPx}px 'JetBrains Mono','Courier New',monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < levels.length; i++) {
        const level = levels[i];
        if (level < 0) continue;
        const c = (i / 7) | 0;
        const r = i % 7;
        const drift = perlin2(c * 0.18 + t * 0.35, r * 0.3 - t * 0.2) * 0.16;
        const val = Math.max(0, Math.min(1, LEVEL_VAL[level] + drift));
        const col = getDuotoneColor(val, t);
        const dim = 0.22 + val * 1.28;
        ctx.fillStyle = `rgb(${Math.min(255, col.r * dim) | 0},${Math.min(255, col.g * dim) | 0},${Math.min(255, col.b * dim) | 0})`;
        ctx.fillText(RAMP[Math.round(val * (RAMP.length - 1))], (c + 0.5) * cellW, (r + 0.5) * ROW_PX * dpr);
      }
    };

    let raf = 0;
    let last = -Infinity;
    let visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(canvas);
    const loop = (ts: number) => {
      raf = requestAnimationFrame(loop);
      if (!visible || ts - last < FRAME_MS) return;
      last = ts;
      draw(ts);
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) draw(performance.now());
    else raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
    };
  }, [data]);

  if (!data || data.days.length === 0) return null;

  return (
    <div className="about-activity">
      <a
        href={`https://github.com/${data.user}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${data.total.toLocaleString()} GitHub contributions in the last year`}
      >
        <canvas ref={canvasRef} className="about-activity-canvas" style={{ height: 7 * ROW_PX }} />
      </a>
      <p className="about-activity-caption">
        {data.total.toLocaleString()} contributions in the last year
      </p>
    </div>
  );
}
