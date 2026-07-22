// src/components/Dashboard/musicView.ts
// Music-page chrome drawn over the card grid: pinned search row.
// The now-playing box itself is drawn by the shared landing pipeline in
// useTerrainAnimation.ts (setupNowPlaying / the np render block), not here.
// Pure layout is exported for tests; drawing writes directly to the terrain canvas
// with an opaque background so cards scrolling beneath never bleed through.

export interface MusicChromeGeom {
  cols: number; rows: number; charW: number; charH: number; fontSize: number; headerRows: number;
}
export interface MusicChromeState {
  query: string;
  focused: boolean;
  caretOn: boolean;
  // Getter-backed in Home.tsx (localPlayerRef pattern): trackId changes
  // without a React render, so these read the live player ref at access
  // time rather than being snapshotted into this object. Optional so
  // callers/tests that only exercise the search chrome need not supply them.
  playingTrackId?: string | null;
  playingIsPlaying?: boolean;
}
export interface ControlZone {
  action: 'search';
  x: number; y: number; w: number; h: number; // canvas pixels
}

const MONO = "'JetBrains Mono','Courier New',monospace";

// Search text renders at 2x the terrain glyph size: each char spans 2 grid
// cols and the row spans 2 grid rows (same convention as feed-card text).
const SEARCH_SCALE = 2;

export function searchRowLayout(geom: MusicChromeGeom) {
  return { row: geom.headerRows, left: Math.floor(geom.cols * 0.5) - 20 };
}

export function drawMusicChrome(
  ctx: CanvasRenderingContext2D,
  geom: MusicChromeGeom,
  state: MusicChromeState,
  bgFill: string,
): ControlZone[] {
  const { charW, charH, fontSize } = geom;
  ctx.font = `${fontSize * SEARCH_SCALE}px ${MONO}`;
  ctx.textBaseline = 'top';
  const zones: ControlZone[] = [];

  const putText = (str: string, col: number, row: number, fill: string) => {
    ctx.fillStyle = fill;
    for (let i = 0; i < str.length; i++) ctx.fillText(str[i], (col + i * SEARCH_SCALE) * charW, row * charH);
  };

  // --- Search row (pinned; opaque bg strip; spans 2 grid rows at 2x) ---
  const sr = searchRowLayout(geom);
  const label = 'SEARCH: ';
  const display = state.query.toUpperCase() + (state.focused && state.caretOn ? '_' : ' ');
  const searchText = label + display;
  const textCols = searchText.length * SEARCH_SCALE;
  const sLeft = Math.max(2, Math.floor((geom.cols - textCols) / 2));
  ctx.fillStyle = bgFill;
  ctx.fillRect((sLeft - 2) * charW, (sr.row - 0.5) * charH, (textCols + 4) * charW, charH * 3);
  putText(label, sLeft, sr.row, 'rgba(255,255,255,0.35)');
  putText(display, sLeft + label.length * SEARCH_SCALE, sr.row, 'rgba(255,255,255,0.85)');
  zones.push({
    action: 'search',
    x: (sLeft - 2) * charW, y: (sr.row - 0.5) * charH,
    w: (textCols + 4) * charW, h: charH * 3,
  });

  return zones;
}
