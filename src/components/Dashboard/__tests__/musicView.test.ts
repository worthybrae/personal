import { describe, it, expect } from 'vitest';
import { layoutPlayerBox, playerBoxRows, drawMusicChrome } from '../musicView';
import type { MusicChromeGeom, MusicChromeState } from '../musicView';

const geom: MusicChromeGeom = { cols: 200, rows: 100, charW: 6, charH: 10, fontSize: 10, headerRows: 10 };

function makeStubCtx() {
  return {
    fillRect: () => {},
    fillText: () => {},
    font: '',
    textBaseline: 'top',
    fillStyle: '#000',
  } as unknown as CanvasRenderingContext2D;
}

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

describe('drawMusicChrome', () => {
  it('does not throw when progress is out of [0,1] range', () => {
    const overState: MusicChromeState = {
      query: '',
      focused: false,
      caretOn: true,
      nowPlaying: { title: 'X', isPlaying: true, progress: 1.5 },
    };
    const underState: MusicChromeState = {
      query: '',
      focused: false,
      caretOn: true,
      nowPlaying: { title: 'X', isPlaying: true, progress: -0.2 },
    };
    expect(() => drawMusicChrome(makeStubCtx(), geom, overState, '#000')).not.toThrow();
    expect(() => drawMusicChrome(makeStubCtx(), geom, underState, '#000')).not.toThrow();
  });
});
