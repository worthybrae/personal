import { describe, it, expect } from 'vitest';
import {
  rgbToHsl,
  hslToRgb,
  blendHSL,
  saturate,
  getDuotoneColor,
  DUOTONES,
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
    expect(maxDiff).toBeGreaterThan(30);
  });
});

describe('saturate', () => {
  it('increases channel spread', () => {
    const col = { r: 150, g: 100, b: 200 };
    const result = saturate(col, 1.6);
    const avgOrig = (col.r + col.g + col.b) / 3;
    // col.b (200) deviates from avgOrig (150) by 50; after saturation it should deviate more
    expect(Math.abs(result.b - avgOrig)).toBeGreaterThan(Math.abs(col.b - avgOrig) * 1.2);
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
