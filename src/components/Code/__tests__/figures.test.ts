import { describe, it, expect } from 'vitest';
import { linePath, nearestSeries, shortCount, spreadApart } from '../figures';

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

describe('spreadApart', () => {
  it('leaves marks that are already far enough apart alone', () => {
    expect(spreadApart([10, 50, 90], 20, 0, 100)).toEqual([10, 50, 90]);
  });

  it('pushes crowded marks apart, keeping their order', () => {
    expect(spreadApart([50, 40, 45], 10, 0, 100)).toEqual([60, 40, 50]);
  });

  it('pulls a pile at the bottom back up inside the range', () => {
    expect(spreadApart([100, 99, 98], 10, 0, 100)).toEqual([100, 90, 80]);
  });
});

describe('shortCount', () => {
  it('writes millions, thousands and small counts briefly', () => {
    expect(shortCount(2_345_678)).toBe('2.3M');
    expect(shortCount(14_200_000)).toBe('14M');
    expect(shortCount(640_400)).toBe('640K');
    expect(shortCount(900)).toBe('900');
  });
});
