import { useEffect, useRef } from 'react';
import { fbm, warpedTerrain } from '@/components/Dashboard/noise';
import { getDuotoneColor, scurve } from '@/components/Dashboard/color';
import { RAMP } from '@/components/Dashboard/ramp';

// A round portrait drawn the way the site background is drawn: glyphs from
// "worthy rae", duotone colours, flowing terrain. The map is a pre-cropped
// photo in a tiled plaza: red holds brightness, green holds the person mask
// (from macOS Vision). The person is lifted so they glow above the scene,
// with a little terrain moving through them; the plaza behind is dimmer and
// drifts with the terrain. A lit edge traces the mask.

const MAP_URL = '/media/about/portrait-map.png';
const MAP_SIZE = 256;
const SIZE = 380; // CSS px; shrinks to fit narrow screens
const FONT_PX = 5;
// Same clock as the background terrain (useTerrainAnimation speedDivisor), so
// the circle runs through the palettes in step with the page behind it.
const SPEED_DIVISOR = 6750;
const FRAME_MS = 1000 / 24;
const LEVELS = 48;
// How much the terrain shows through the person and through the wall, and
// how bright the wall is allowed to get, so the face stays the brightest thing.
const TERRAIN_IN_PERSON = 0.12;
const TERRAIN_IN_WALL = 0.2;
const WALL_LEVEL = 0.5;
// Lifts the person's darkest parts (a black shirt) above the scene.
const PERSON_FLOOR = 0.4;
const EDGE_LEVEL = 0.78;
const NOISE_SCALE = 2.4;

interface PortraitMap { lum: Float32Array; mask: Float32Array }

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
      const lum = new Float32Array(MAP_SIZE * MAP_SIZE);
      const mask = new Float32Array(MAP_SIZE * MAP_SIZE);
      for (let i = 0; i < lum.length; i++) {
        lum[i] = px[i * 4] / 255;
        mask[i] = px[i * 4 + 1] / 255;
      }
      resolve({ lum, mask });
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
    const lut: string[] = new Array(LEVELS);

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
      for (let i = 0; i < LEVELS; i++) {
        const val = i / (LEVELS - 1);
        const col = getDuotoneColor(val, t);
        const dim = 0.22 + val * 1.28;
        const r = Math.min(255, Math.max(bgR + 10, Math.floor(col.r * dim)));
        const g = Math.min(255, Math.max(bgG + 10, Math.floor(col.g * dim)));
        const b = Math.min(255, Math.max(bgB + 10, Math.floor(col.b * dim)));
        lut[i] = `rgb(${r},${g},${b})`;
      }

      ctx.clearRect(0, 0, W, W);
      ctx.fillStyle = `rgb(${bgR},${bgG},${bgB})`;
      ctx.beginPath();
      ctx.arc(W / 2, W / 2, W / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = `${fontSize}px 'JetBrains Mono','Courier New',monospace`;
      ctx.textBaseline = 'top';

      // Slow liquid drift for where the photo is sampled.
      const ft = t * 0.5;
      for (let r = 0; r < rows; r++) {
        const v = (r + 0.5) * charH / W;
        for (let c = 0; c < cols; c++) {
          const u = (c + 0.5) * charW / W;
          const du = u - 0.5;
          const dv = v - 0.5;
          const d = Math.sqrt(du * du + dv * dv);
          if (d > 0.5) continue;

          let terrain = (warpedTerrain(u * NOISE_SCALE, v * NOISE_SCALE, t) + 0.5) / 1.8;
          terrain = Math.max(0, Math.min(1, terrain));
          // Before the map loads: the background terrain's curve, dimmed.
          let val = scurve(terrain, 8) * WALL_LEVEL;
          if (map) {
            const inPerson = sampleMap(map.mask, u, v);
            let person = 0;
            if (inPerson > 0.01) {
              // The person is sampled where they are, so the face holds still.
              person = scurve(PERSON_FLOOR + sampleMap(map.lum, u, v) * (1 - PERSON_FLOOR) + (terrain - 0.45) * TERRAIN_IN_PERSON, 5);
            }
            let wall = 0;
            if (inPerson < 0.99) {
              // The wall drifts a little, like it's under water.
              const su = u + fbm(u * 2.5 + 1.7, v * 2.5 + ft, 3) * 0.015;
              const sv = v + fbm(u * 2.5 + 9.2 + ft, v * 2.5, 3) * 0.015;
              wall = scurve(sampleMap(map.lum, su, sv) * 0.8 + (terrain - 0.45) * TERRAIN_IN_WALL, 6) * WALL_LEVEL;
            }
            val = wall + (person - wall) * inPerson;
            // A soft lit edge where the mask crosses half, so the dark shirt
            // still separates from the dark wall.
            const edge = Math.max(0, 1 - Math.abs(inPerson - 0.5) * 2);
            if (edge > 0) val = Math.max(val, edge * EDGE_LEVEL);
          }
          ctx.fillStyle = lut[Math.min(LEVELS - 1, (val * LEVELS) | 0)];
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
