import { describe, it, expect } from 'vitest';
import { layoutPlayerBox, playerBoxRows } from '../musicView';
import type { MusicChromeGeom } from '../musicView';

const geom: MusicChromeGeom = { cols: 200, rows: 100, charW: 6, charH: 10, fontSize: 10, headerRows: 10 };

describe('layoutPlayerBox', () => {
  it('sits at the bottom within the grid', () => {
    const { top } = layoutPlayerBox(geom, 20);
    expect(top + playerBoxRows() - 2).toBeLessThanOrEqual(geom.rows - 2);
    expect(top).toBeGreaterThan(0);
  });

  it('is horizontally centered', () => {
    const { left, right } = layoutPlayerBox(geom, 20);
    expect(left).toBeGreaterThan(0);
    expect(Math.abs(left - (geom.cols - 1 - right))).toBeLessThanOrEqual(1);
  });

  it('returns prev/toggle/next control zones in pixel space, left to right', () => {
    const { controls } = layoutPlayerBox(geom, 20);
    const actions = controls.map((c) => c.action);
    expect(actions).toEqual(['prev', 'toggle', 'next']);
    expect(controls[0].x).toBeLessThan(controls[1].x);
    expect(controls[1].x).toBeLessThan(controls[2].x);
    for (const c of controls) { expect(c.w).toBeGreaterThan(0); expect(c.h).toBeGreaterThan(0); }
  });

  it('never overflows narrow grids', () => {
    const narrow = { ...geom, cols: 40 };
    const { left, right } = layoutPlayerBox(narrow, 60);
    expect(left).toBeGreaterThanOrEqual(0);
    expect(right).toBeLessThan(narrow.cols);
  });
});
