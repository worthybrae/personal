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
