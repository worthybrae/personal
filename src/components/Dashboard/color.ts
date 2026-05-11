export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface DuotoneColor extends RGB {
  bgR: number;
  bgG: number;
  bgB: number;
}

interface Duotone {
  name: string;
  a: RGB;
  b: RGB;
  bg: RGB;
}

export const DUOTONES: Duotone[] = [
  { name: 'reef', a: { r: 100, g: 180, b: 255 }, b: { r: 255, g: 160, b: 140 }, bg: { r: 12, g: 12, b: 22 } },
  { name: 'prestige', a: { r: 80, g: 255, b: 180 }, b: { r: 255, g: 240, b: 100 }, bg: { r: 12, g: 20, b: 15 } },
  { name: 'dusk', a: { r: 200, g: 120, b: 255 }, b: { r: 255, g: 220, b: 90 }, bg: { r: 16, g: 10, b: 24 } },
  { name: 'frost', a: { r: 160, g: 235, b: 255 }, b: { r: 255, g: 180, b: 210 }, bg: { r: 14, g: 16, b: 24 } },
  { name: 'neon', a: { r: 180, g: 255, b: 100 }, b: { r: 255, g: 100, b: 190 }, bg: { r: 10, g: 14, b: 10 } },
];

const RAMP = ".,':;|!ilc/1{[?eoasd0OkxXdpbWM#@@";

/** Pick a character from the density ramp based on elevation value (0–1) */
export function charForVal(val: number): string {
  return RAMP[Math.max(0, Math.min(RAMP.length - 1, Math.floor(val * (RAMP.length - 1))))];
}

/** Logistic S-curve for contrast enhancement */
export function scurve(val: number, strength: number): number {
  return 1 / (1 + Math.exp(-strength * (Math.max(0, Math.min(1, val)) - 0.5)));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** RGB to HSL */
export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (d > 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h, s, l };
}

/** HSL to RGB */
export function hslToRgb(h: number, s: number, l: number): RGB {
  if (s === 0) return { r: l * 255, g: l * 255, b: l * 255 };
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: hue2rgb(p, q, h + 1 / 3) * 255,
    g: hue2rgb(p, q, h) * 255,
    b: hue2rgb(p, q, h - 1 / 3) * 255,
  };
}

/** Blend two RGB colors through HSL with shortest-path hue interpolation */
export function blendHSL(c1: RGB, c2: RGB, t: number): RGB {
  const a = rgbToHsl(c1.r, c1.g, c1.b);
  const b = rgbToHsl(c2.r, c2.g, c2.b);
  let dh = b.h - a.h;
  if (dh > 0.5) dh -= 1;
  if (dh < -0.5) dh += 1;
  const h = (a.h + dh * t + 1) % 1;
  const s = a.s + (b.s - a.s) * t;
  const l = a.l + (b.l - a.l) * t;
  return hslToRgb(h, s, l);
}

/** Push RGB channels apart from their average to boost saturation */
export function saturate(col: RGB, amount: number): RGB {
  const avg = (col.r + col.g + col.b) / 3;
  return {
    r: Math.max(0, Math.min(255, avg + (col.r - avg) * amount)),
    g: Math.max(0, Math.min(255, avg + (col.g - avg) * amount)),
    b: Math.max(0, Math.min(255, avg + (col.b - avg) * amount)),
  };
}

/** Get the duotone color for a given elevation value and time */
export function getDuotoneColor(val: number, t: number): DuotoneColor {
  const cycleSec = 30;
  const total = DUOTONES.length * cycleSec;
  const pos = ((t * 4) % total) / cycleSec;
  const idx = Math.floor(pos) % DUOTONES.length;
  const nextIdx = (idx + 1) % DUOTONES.length;
  const blend = pos - Math.floor(pos);
  const ease = blend * blend * (3 - 2 * blend);

  const d1 = DUOTONES[idx];
  const d2 = DUOTONES[nextIdx];

  function sampleDuo(duo: Duotone, v: number): RGB {
    if (v < 0.05) {
      const st = v / 0.05;
      return blendHSL(duo.bg, duo.a, st);
    } else {
      const st0 = (v - 0.05) / 0.95;
      const st = st0 * st0 * (3 - 2 * st0);
      return blendHSL(duo.a, duo.b, st);
    }
  }

  const c1 = sampleDuo(d1, val);
  const c2 = sampleDuo(d2, val);

  const bg: RGB = {
    r: lerp(d1.bg.r, d2.bg.r, ease),
    g: lerp(d1.bg.g, d2.bg.g, ease),
    b: lerp(d1.bg.b, d2.bg.b, ease),
  };

  const blended = blendHSL(c1, c2, ease);
  const vivid = saturate(blended, 1.6);

  return {
    r: vivid.r, g: vivid.g, b: vivid.b,
    bgR: bg.r, bgG: bg.g, bgB: bg.b,
  };
}
