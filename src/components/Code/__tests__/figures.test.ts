import { describe, it, expect } from 'vitest';
import { linePath, nearestSeries } from '../figures';

describe('linePath', () => {
  it('draws through every reading and skips the missing ones', () => {
    const at = (i: number, v: number) => [i * 10, v] as const;
    expect(linePath([1, 2, -1, 4], at)).toBe('M0,1L10,2M30,4');
  });
});

describe('nearestSeries', () => {
  it('picks the series closest to the value on that day', () => {
    expect(nearestSeries([[10, 50], [10, 20], [10, 90]], 1, 30)).toBe(1);
  });

  it('ignores series without a reading that day', () => {
    expect(nearestSeries([[10, -1], [10, 80]], 1, 5)).toBe(1);
  });

  it('is -1 when nobody has a reading', () => {
    expect(nearestSeries([[10, -1]], 1, 5)).toBe(-1);
  });
});
