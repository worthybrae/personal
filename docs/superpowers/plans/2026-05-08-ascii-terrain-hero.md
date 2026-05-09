# ASCII Terrain Hero Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the chromatic-drift ASCII hero with a dense ASCII terrain renderer — every cell filled with a density-ramp character driven by procedural noise, name revealed in bold white, duotone color palettes cycling over time.

**Architecture:** Four focused modules — a pure-math noise engine (`noise.ts`), a color system with HSL blending and duotone palettes (`color.ts`), a canvas animation hook (`useTerrainAnimation.ts`), and the updated component (`AsciiHero.tsx`). The old `ascii-art.ts` data file is deleted since name rendering now uses canvas text masking.

**Tech Stack:** React 18, TypeScript, Canvas API, Vite, Tailwind CSS

**Reference prototype:** `.superpowers/brainstorm/79925-1778274557/content/terrain-duotone-v9.html`

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/components/Dashboard/noise.ts` | Perlin noise, FBM, ridged noise, domain-warped terrain |
| Create | `src/components/Dashboard/color.ts` | Duotone palettes, HSL blending, saturation boost, elevation brightness |
| Create | `src/components/Dashboard/useTerrainAnimation.ts` | Canvas setup, resize, name mask, render loop |
| Modify | `src/components/Dashboard/AsciiHero.tsx` | Swap hook import, update bg color |
| Delete | `src/components/Dashboard/ascii-art.ts` | No longer needed |

---

### Task 1: Noise Engine

**Files:**
- Create: `src/components/Dashboard/noise.ts`
- Create: `src/components/Dashboard/__tests__/noise.test.ts`

- [ ] **Step 1: Write failing tests for the noise engine**

```typescript
// src/components/Dashboard/__tests__/noise.test.ts
import { describe, it, expect } from 'vitest';
import { perlin2, fbm, ridged, warpedTerrain } from '../noise';

describe('perlin2', () => {
  it('returns values in [-1, 1] range', () => {
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const val = perlin2(x, y);
      expect(val).toBeGreaterThanOrEqual(-1);
      expect(val).toBeLessThanOrEqual(1);
    }
  });

  it('returns 0 at integer coordinates', () => {
    // Perlin noise at exact integer coords should be 0 (dot product of zero offset)
    const val = perlin2(0, 0);
    expect(val).toBeCloseTo(0, 5);
  });

  it('is deterministic for same inputs', () => {
    const a = perlin2(3.7, 8.2);
    const b = perlin2(3.7, 8.2);
    expect(a).toBe(b);
  });
});

describe('fbm', () => {
  it('returns a number', () => {
    const val = fbm(1.5, 2.5, 6);
    expect(typeof val).toBe('number');
    expect(Number.isFinite(val)).toBe(true);
  });

  it('varies with different inputs', () => {
    const a = fbm(0, 0, 6);
    const b = fbm(10, 10, 6);
    expect(a).not.toBe(b);
  });
});

describe('ridged', () => {
  it('returns non-negative values', () => {
    for (let i = 0; i < 50; i++) {
      const val = ridged(Math.random() * 50, Math.random() * 50, 5);
      expect(val).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('warpedTerrain', () => {
  it('returns a finite number', () => {
    const val = warpedTerrain(1, 2, 0.5);
    expect(Number.isFinite(val)).toBe(true);
  });

  it('changes over time', () => {
    const a = warpedTerrain(5, 5, 0);
    const b = warpedTerrain(5, 5, 10);
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/Dashboard/__tests__/noise.test.ts`
Expected: FAIL — module `../noise` not found

- [ ] **Step 3: Implement the noise engine**

```typescript
// src/components/Dashboard/noise.ts

// Permutation table — seeded once at module load
const P = new Uint8Array(512);
const G: [number, number][] = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
];

{
  const p: number[] = [];
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    // Fixed seed via simple LCG for determinism
    const j = (i * 16807 + 7) % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) P[i] = p[i & 255];
}

/** 2D Perlin noise */
export function perlin2(x: number, y: number): number {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const dot = (g: number, a: number, b: number) =>
    G[g % 8][0] * a + G[g % 8][1] * b;
  const aa = P[P[X] + Y];
  const ab = P[P[X] + Y + 1];
  const ba = P[P[X + 1] + Y];
  const bb = P[P[X + 1] + Y + 1];
  return (
    dot(aa, xf, yf) +
    u * (dot(ba, xf - 1, yf) - dot(aa, xf, yf)) +
    v *
      (dot(ab, xf, yf - 1) +
        u * (dot(bb, xf - 1, yf - 1) - dot(ab, xf, yf - 1)) -
        (dot(aa, xf, yf) + u * (dot(ba, xf - 1, yf) - dot(aa, xf, yf))))
  );
}

/** Fractal Brownian Motion — 6 octaves, persistence 0.48, lacunarity 2.05 */
export function fbm(x: number, y: number, octaves: number): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * perlin2(x * frequency, y * frequency);
    amplitude *= 0.48;
    frequency *= 2.05;
  }
  return value;
}

/** Ridged noise — 5 octaves with absolute-value inversion */
export function ridged(x: number, y: number, octaves: number): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let prev = 1;
  for (let i = 0; i < octaves; i++) {
    let n = Math.abs(perlin2(x * frequency, y * frequency));
    n = 1 - n;
    n = n * n;
    n *= prev;
    value += n * amplitude;
    prev = n;
    amplitude *= 0.5;
    frequency *= 2.1;
  }
  return value;
}

/** Domain-warped terrain combining FBM and ridged noise with cyclical time */
export function warpedTerrain(x: number, y: number, t: number): number {
  const tx = Math.sin(t * 0.13) * 8 + Math.cos(t * 0.07) * 5;
  const ty = Math.cos(t * 0.11) * 8 + Math.sin(t * 0.09) * 5;
  const tx2 = Math.sin(t * 0.17) * 3;
  const ty2 = Math.cos(t * 0.14) * 3;

  const wx1 = fbm(x + tx, y + ty, 3);
  const wy1 = fbm(x + 5.2 + tx * 0.3, y + 1.3 + ty * 0.5, 3);
  const wx2 = fbm(x + wx1 * 3 + tx2, y + wy1 * 3 + ty2, 4);
  const wy2 = fbm(x + wx1 * 3 + 8.3, y + wy1 * 3 + 2.8 + tx2 * 0.5, 4);

  const wx = x + wx2 * 2;
  const wy = y + wy2 * 2;

  return fbm(wx, wy, 6) * 0.6 + ridged(wx * 0.8 + 20, wy * 0.8 + 20, 5) * 0.8;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/Dashboard/__tests__/noise.test.ts`
Expected: All 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/Dashboard/noise.ts src/components/Dashboard/__tests__/noise.test.ts
git commit -m "feat(hero): add procedural noise engine with Perlin, FBM, ridged, and domain-warped terrain"
```

---

### Task 2: Color System

**Files:**
- Create: `src/components/Dashboard/color.ts`
- Create: `src/components/Dashboard/__tests__/color.test.ts`

- [ ] **Step 1: Write failing tests for the color system**

```typescript
// src/components/Dashboard/__tests__/color.test.ts
import { describe, it, expect } from 'vitest';
import {
  rgbToHsl,
  hslToRgb,
  blendHSL,
  saturate,
  getDuotoneColor,
  DUOTONES,
  charForVal,
  scurve,
} from '../color';

describe('rgbToHsl / hslToRgb roundtrip', () => {
  it('converts red correctly', () => {
    const hsl = rgbToHsl(255, 0, 0);
    expect(hsl.h).toBeCloseTo(0, 1);
    expect(hsl.s).toBeCloseTo(1, 1);
    expect(hsl.l).toBeCloseTo(0.5, 1);
  });

  it('roundtrips a color', () => {
    const hsl = rgbToHsl(100, 180, 255);
    const rgb = hslToRgb(hsl.h, hsl.s, hsl.l);
    expect(rgb.r).toBeCloseTo(100, 0);
    expect(rgb.g).toBeCloseTo(180, 0);
    expect(rgb.b).toBeCloseTo(255, 0);
  });
});

describe('blendHSL', () => {
  it('returns first color at t=0', () => {
    const c1 = { r: 255, g: 0, b: 0 };
    const c2 = { r: 0, g: 0, b: 255 };
    const result = blendHSL(c1, c2, 0);
    expect(result.r).toBeCloseTo(255, 0);
    expect(result.g).toBeCloseTo(0, 0);
    expect(result.b).toBeCloseTo(0, 0);
  });

  it('returns second color at t=1', () => {
    const c1 = { r: 255, g: 0, b: 0 };
    const c2 = { r: 0, g: 0, b: 255 };
    const result = blendHSL(c1, c2, 1);
    expect(result.r).toBeCloseTo(0, 0);
    expect(result.g).toBeCloseTo(0, 0);
    expect(result.b).toBeCloseTo(255, 0);
  });

  it('midpoint stays saturated (not grey)', () => {
    const c1 = { r: 255, g: 0, b: 0 };
    const c2 = { r: 0, g: 0, b: 255 };
    const mid = blendHSL(c1, c2, 0.5);
    const avg = (mid.r + mid.g + mid.b) / 3;
    const maxDiff = Math.max(
      Math.abs(mid.r - avg),
      Math.abs(mid.g - avg),
      Math.abs(mid.b - avg)
    );
    // Should not be grey — channels should differ from average
    expect(maxDiff).toBeGreaterThan(30);
  });
});

describe('saturate', () => {
  it('increases channel spread', () => {
    const col = { r: 150, g: 100, b: 200 };
    const result = saturate(col, 1.6);
    const avgOrig = (col.r + col.g + col.b) / 3;
    // r should move further from average
    expect(Math.abs(result.r - avgOrig)).toBeGreaterThan(Math.abs(col.r - avgOrig) * 1.2);
  });
});

describe('getDuotoneColor', () => {
  it('returns RGB values in 0-255 range', () => {
    const col = getDuotoneColor(0.5, 1.0);
    expect(col.r).toBeGreaterThanOrEqual(0);
    expect(col.r).toBeLessThanOrEqual(255);
    expect(col.g).toBeGreaterThanOrEqual(0);
    expect(col.g).toBeLessThanOrEqual(255);
    expect(col.b).toBeGreaterThanOrEqual(0);
    expect(col.b).toBeLessThanOrEqual(255);
  });

  it('returns background color values', () => {
    const col = getDuotoneColor(0.5, 1.0);
    expect(typeof col.bgR).toBe('number');
    expect(typeof col.bgG).toBe('number');
    expect(typeof col.bgB).toBe('number');
  });
});

describe('DUOTONES', () => {
  it('has 5 palettes', () => {
    expect(DUOTONES).toHaveLength(5);
  });
});

describe('charForVal', () => {
  it('returns first ramp char for val=0', () => {
    expect(charForVal(0)).toBe('.');
  });

  it('returns last ramp char for val=1', () => {
    expect(charForVal(0.999)).toBe('@');
  });
});

describe('scurve', () => {
  it('maps 0.5 to ~0.5', () => {
    expect(scurve(0.5, 8)).toBeCloseTo(0.5, 2);
  });

  it('maps 0 close to 0', () => {
    expect(scurve(0, 8)).toBeLessThan(0.02);
  });

  it('maps 1 close to 1', () => {
    expect(scurve(1, 8)).toBeGreaterThan(0.98);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/Dashboard/__tests__/color.test.ts`
Expected: FAIL — module `../color` not found

- [ ] **Step 3: Implement the color system**

```typescript
// src/components/Dashboard/color.ts

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
  { name: 'prestige', a: { r: 80, g: 255, b: 180 }, b: { r: 255, g: 240, b: 100 }, bg: { r: 12, g: 20, b: 15 } },
  { name: 'reef', a: { r: 100, g: 180, b: 255 }, b: { r: 255, g: 160, b: 140 }, bg: { r: 12, g: 12, b: 22 } },
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/Dashboard/__tests__/color.test.ts`
Expected: All 11 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/Dashboard/color.ts src/components/Dashboard/__tests__/color.test.ts
git commit -m "feat(hero): add duotone color system with HSL blending and palette cycling"
```

---

### Task 3: Terrain Animation Hook

**Files:**
- Create: `src/components/Dashboard/useTerrainAnimation.ts`

This hook wires up canvas lifecycle (resize, DPR, font sizing), builds the name mask via offscreen canvas, and runs the per-frame render loop calling into noise and color modules.

- [ ] **Step 1: Create the animation hook**

```typescript
// src/components/Dashboard/useTerrainAnimation.ts

import { useEffect, useRef, useCallback } from 'react';
import { warpedTerrain } from './noise';
import { getDuotoneColor, charForVal, scurve } from './color';

const NOISE_SCALE = 0.015;

export function useTerrainAnimation(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
) {
  const rafRef = useRef(0);
  const nameMaskRef = useRef<{
    data: Uint8ClampedArray;
    width: number;
    height: number;
  } | null>(null);

  const buildNameMask = useCallback(
    (canvasWidth: number, canvasHeight: number) => {
      const off = document.createElement('canvas');
      off.width = canvasWidth;
      off.height = canvasHeight;
      const o = off.getContext('2d')!;
      o.fillStyle = '#000';
      o.fillRect(0, 0, off.width, off.height);
      const lineH = off.height * 0.18;
      const centerY = off.height * 0.5;
      o.fillStyle = '#fff';
      o.textAlign = 'center';
      o.textBaseline = 'middle';
      o.font = `900 ${lineH}px 'Arial Black','Impact','Helvetica Neue',sans-serif`;
      o.fillText('WORTHY', off.width / 2, centerY - lineH * 0.55);
      o.font = `900 ${lineH * 0.85}px 'Arial Black','Impact','Helvetica Neue',sans-serif`;
      o.fillText('RAE', off.width / 2, centerY + lineH * 0.55);
      const imageData = o.getImageData(0, 0, off.width, off.height);
      nameMaskRef.current = {
        data: imageData.data,
        width: off.width,
        height: off.height,
      };
    },
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cols = 0;
    let rows = 0;
    let fontSize = 0;
    let lastBg = { r: 10, g: 18, b: 30 };

    function resize() {
      if (!canvas) return;
      const dpr = devicePixelRatio;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      fontSize = Math.max(5, Math.min(9, window.innerWidth / 180)) * dpr;
      cols = Math.floor(canvas.width / (fontSize * 0.602));
      rows = Math.floor(canvas.height / (fontSize * 1.0));
      buildNameMask(canvas.width, canvas.height);
    }

    function isName(px: number, py: number): boolean {
      const mask = nameMaskRef.current;
      if (!mask) return false;
      const ix = Math.floor(px);
      const iy = Math.floor(py);
      if (ix < 0 || ix >= mask.width || iy < 0 || iy >= mask.height) return false;
      return mask.data[(iy * mask.width + ix) * 4] > 128;
    }

    function draw(ts: number) {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const t = ts / 4000;

      // Background fill from current duotone
      const bgSample = getDuotoneColor(0, t);
      lastBg = { r: bgSample.bgR, g: bgSample.bgG, b: bgSample.bgB };
      ctx.fillStyle = `rgb(${Math.floor(lastBg.r)},${Math.floor(lastBg.g)},${Math.floor(lastBg.b)})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const charW = fontSize * 0.602;
      const charH = fontSize * 1.0;

      ctx.font = `${fontSize}px 'JetBrains Mono','Courier New',monospace`;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';

      for (let r = 0; r < rows; r++) {
        const py = r * charH;
        for (let c = 0; c < cols; c++) {
          const px = c * charW;
          const nx = c * NOISE_SCALE;
          const ny = r * NOISE_SCALE;

          let elev = warpedTerrain(nx, ny, t);
          let val = (elev + 0.5) / 1.8;
          val = Math.max(0, Math.min(1, val));
          val = scurve(val, 8);

          const nameHit = isName(px, py);

          if (nameHit) {
            const boosted = Math.min(0.999, val * 0.2 + 0.8);
            const ch = charForVal(boosted);
            const pulse = 0.93 + 0.07 * Math.sin(t * 2 + c * 0.01);
            const b = Math.min(255, Math.floor(255 * pulse));
            ctx.fillStyle = `rgb(${b},${b},${b})`;
            ctx.font = `bold ${fontSize}px 'JetBrains Mono','Courier New',monospace`;
            ctx.fillText(ch, px, py);
            ctx.font = `${fontSize}px 'JetBrains Mono','Courier New',monospace`;
          } else {
            const ch = charForVal(val);
            const col = getDuotoneColor(val, t);
            const dim = 0.35 + val * 1.15;
            const mr = Math.min(255, Math.max(Math.floor(lastBg.r + 10), Math.floor(col.r * dim)));
            const mg = Math.min(255, Math.max(Math.floor(lastBg.g + 10), Math.floor(col.g * dim)));
            const mb = Math.min(255, Math.max(Math.floor(lastBg.b + 10), Math.floor(col.b * dim)));
            ctx.fillStyle = `rgb(${mr},${mg},${mb})`;
            ctx.fillText(ch, px, py);
          }
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    resize();
    rafRef.current = requestAnimationFrame(draw);
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [canvasRef, buildNameMask]);
}
```

- [ ] **Step 2: Verify the module compiles**

Run: `npx tsc --noEmit src/components/Dashboard/useTerrainAnimation.ts`
Expected: No errors (or run the dev server and check console)

- [ ] **Step 3: Commit**

```bash
git add src/components/Dashboard/useTerrainAnimation.ts
git commit -m "feat(hero): add terrain animation hook with canvas rendering, name mask, and render loop"
```

---

### Task 4: Wire Up AsciiHero Component

**Files:**
- Modify: `src/components/Dashboard/AsciiHero.tsx:1-7` (import swap)
- Delete: `src/components/Dashboard/ascii-art.ts`

- [ ] **Step 1: Update AsciiHero to use the terrain animation hook**

In `src/components/Dashboard/AsciiHero.tsx`, change the import on line 6:

```diff
-import { useAsciiAnimation } from './useAsciiAnimation';
+import { useTerrainAnimation } from './useTerrainAnimation';
```

And update the hook call on line 10:

```diff
-  useAsciiAnimation(canvasRef);
+  useTerrainAnimation(canvasRef);
```

The rest of the component (nav, subtitle, scroll indicator) stays exactly the same.

- [ ] **Step 2: Delete the old ascii-art.ts data file**

```bash
git rm src/components/Dashboard/ascii-art.ts
```

- [ ] **Step 3: Verify the dev server starts without errors**

Run: `npm run dev`
Expected: Compiles successfully, no import errors. Open in browser and verify the terrain animation renders with "WORTHY RAE" in bold white and duotone colors cycling.

- [ ] **Step 4: Commit**

```bash
git add src/components/Dashboard/AsciiHero.tsx
git commit -m "feat(hero): swap chromatic drift for ASCII terrain renderer

Replace useAsciiAnimation with useTerrainAnimation. Delete ascii-art.ts
data file — name mask is now generated via offscreen canvas text rendering."
```

---

### Task 5: Clean Up Old Animation Hook

**Files:**
- Delete: `src/components/Dashboard/useAsciiAnimation.ts`

- [ ] **Step 1: Verify no other files import the old hook**

Run: `grep -r 'useAsciiAnimation' src/`
Expected: No results (AsciiHero.tsx was already updated in Task 4)

- [ ] **Step 2: Delete the old animation hook**

```bash
git rm src/components/Dashboard/useAsciiAnimation.ts
```

- [ ] **Step 3: Run full test suite to verify nothing breaks**

Run: `npm test`
Expected: All tests pass, including the new noise and color tests

- [ ] **Step 4: Run the dev server and visually verify**

Run: `npm run dev`
Expected: Full terrain animation renders correctly with:
- Dense ASCII grid filling every cell
- Characters varying by density ramp (`. , ' :` in valleys → `# @ W M` on peaks)
- "WORTHY RAE" rendered in bold white with subtle pulse
- Duotone colors cycling through 5 palettes (~30s each)
- Elevation-driven brightness (dark valleys, bright peaks)
- Smooth terrain morphing via domain-warped noise

- [ ] **Step 5: Commit**

```bash
git rm src/components/Dashboard/useAsciiAnimation.ts
git commit -m "chore(hero): remove old chromatic drift animation hook"
```
