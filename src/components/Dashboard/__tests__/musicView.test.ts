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

const lineCenter = (l: { str: string; col: number; scale: number }) => l.col + (l.str.length * l.scale) / 2;

describe('musicPanelLayout', () => {
  it('desktop: centers the title, blurb and search above the tiles', () => {
    const L = musicPanelLayout(geom, false);
    expect(L.lines.length).toBeGreaterThan(2); // title + wrapped blurb
    for (const l of L.lines) expect(Math.abs(lineCenter(l) - geom.cols / 2)).toBeLessThanOrEqual(1.5);
    expect(Math.abs(L.panelLeft + L.panelWidth / 2 - geom.cols / 2)).toBeLessThanOrEqual(1);
    expect(L.searchRow).toBeGreaterThan(L.panelTop);
    expect(L.statRow).toBeGreaterThan(L.searchRow);
    expect(L.tilesTopRow).toBeGreaterThan(L.statRow + 2);
  });

  it('desktop: the tile region is centered with equal margins', () => {
    const L = musicPanelLayout(geom, false);
    expect(L.tilesLeftCol).toBeGreaterThan(0);
    expect(Math.abs(L.tilesLeftCol - (geom.cols - 1 - L.tilesRightCol))).toBeLessThanOrEqual(1);
  });

  it('writes the blurb in sentence case, not all caps', () => {
    const L = musicPanelLayout(geom, false);
    expect(L.lines.some((l) => /[a-z]/.test(l.str))).toBe(true);
  });

  it('mobile: centered top band, tiles start below the stat line', () => {
    const g = { ...geom, cols: 60 };
    const L = musicPanelLayout(g, true);
    for (const l of L.lines) expect(Math.abs(lineCenter(l) - g.cols / 2)).toBeLessThanOrEqual(1.5);
    expect(L.tilesTopRow).toBeGreaterThan(L.statRow);
  });

  it('mobile: drops the blurb so only the title sits above the search', () => {
    const L = musicPanelLayout({ ...geom, cols: 60 }, true);
    expect(L.lines).toHaveLength(1);
    expect(L.lines[0].str).toBe('UNRELEASED LIBRARY');
    expect(L.searchRow).toBeLessThan(L.panelTop + 8);
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
