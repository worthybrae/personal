import { describe, it, expect } from 'vitest';
import { drawMusicChrome, musicPanelLayout } from '../musicView';
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

describe('musicPanelLayout', () => {
  it('desktop: reserves a left panel and starts tiles right of it', () => {
    const L = musicPanelLayout(geom, false);
    expect(L.tilesLeftCol).toBeGreaterThan(L.panelLeft + L.panelWidth);
    expect(L.lines.length).toBeGreaterThan(2); // title lines + wrapped blurb
    expect(L.searchRow).toBeGreaterThan(L.panelTop);
  });

  it('mobile: panel is a top band and tiles start below the search input', () => {
    const L = musicPanelLayout({ ...geom, cols: 60 }, true);
    expect(L.tilesLeftCol).toBe(L.panelLeft);
    expect(L.tilesTopRow).toBeGreaterThan(L.searchRow);
  });
});

describe('drawMusicChrome', () => {
  it('does not throw and returns exactly one search zone', () => {
    const state: MusicChromeState = { query: '', focused: false, caretOn: true };
    const layout = musicPanelLayout(geom, false);
    let zones;
    expect(() => { zones = drawMusicChrome(makeStubCtx(), geom, layout, state, '#000'); }).not.toThrow();
    expect(zones).toHaveLength(1);
    expect(zones![0].action).toBe('search');
  });

  it('does not throw with a query and focused caret', () => {
    const state: MusicChromeState = { query: 'test', focused: true, caretOn: true };
    const layout = musicPanelLayout(geom, false);
    expect(() => drawMusicChrome(makeStubCtx(), geom, layout, state, '#000')).not.toThrow();
  });
});
