import { describe, it, expect } from 'vitest';
import { drawMusicChrome } from '../musicView';
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

describe('drawMusicChrome', () => {
  it('does not throw and returns exactly one search zone', () => {
    const state: MusicChromeState = { query: '', focused: false, caretOn: true };
    let zones;
    expect(() => { zones = drawMusicChrome(makeStubCtx(), geom, state, '#000'); }).not.toThrow();
    expect(zones).toHaveLength(1);
    expect(zones![0].action).toBe('search');
  });

  it('does not throw with a query and focused caret', () => {
    const state: MusicChromeState = { query: 'test', focused: true, caretOn: true };
    expect(() => drawMusicChrome(makeStubCtx(), geom, state, '#000')).not.toThrow();
  });
});
