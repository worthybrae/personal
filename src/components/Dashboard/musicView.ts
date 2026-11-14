// src/components/Dashboard/musicView.ts
// Music-page chrome: a pinned (sticky) intro band across the top, centered,
// holding the UNRELEASED LIBRARY title, the collection blurb, the search input
// and the plays stat. The tile grid renders below it, centered, and pages
// through its rows independently; the band never moves. The now-playing box is drawn by the
// shared landing pipeline in useTerrainAnimation.ts, not here.
// Layout is exported (musicPanelLayout) so the tile-grid setup in
// useTerrainAnimation.ts can carve its region around the panel, and pure
// drawing writes directly to the terrain canvas with an opaque background so
// terrain/melt frames never bleed through the text.

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
  // Library plays in the past 30 days (getter-backed in Home.tsx, fetched
  // from /api/music/plays/stats). Null/undefined until loaded — the stat
  // line simply doesn't render yet.
  plays30d?: number | null;
}
export interface ControlZone {
  action: 'search';
  x: number; y: number; w: number; h: number; // canvas pixels
}

export interface PanelLine { str: string; col: number; row: number; scale: number; alpha: number; terrain?: boolean }
export interface MusicPanelLayout {
  panelLeft: number;         // the search block: first col of the centered input line
  panelWidth: number;        // and its width (the underline's length)
  bgLeft: number;            // opaque backing behind the whole band
  bgWidth: number;
  panelTop: number;
  panelBottom: number;       // last grid row occupied by panel content
  lines: PanelLine[];        // title + blurb, pre-wrapped
  searchRow: number;         // top grid row of the search input line
  searchScale: number;
  searchCol: number;         // where the SEARCH: label starts (centers the empty line)
  searchAvailChars: number;  // visible query chars before the display tail-scrolls
  statRow: number;           // top grid row of the plays-stat line (below the search underline)
  tilesLeftCol: number;      // first grid col available to the tile grid
  tilesRightCol: number;     // last grid col available to the tile grid
  tilesTopRow: number;       // first grid row available to the tile grid
}

const MONO = "'JetBrains Mono','Courier New',monospace";
const SEARCH_LABEL = 'SEARCH: ';
const PLACEHOLDER = 'TYPE TO FILTER';
const TITLE = 'UNRELEASED LIBRARY';
const BLURB =
  'I fell in love with music when I discovered mixtapes in early 2015. ' +
  'I started collecting them on a hard drive that has miraculously survived ' +
  'since then. At some point I also started to collect unreleased / leaked ' +
  'tracks that surfaced online. The first website I made was a basic ' +
  'WordPress site that hosted some of my favorite leaked music. While that ' +
  'website is long gone, I wanted to revive my collection here.';

function wrapText(text: string, width: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const cand = line ? line + ' ' + word : word;
    if (cand.length > width && line) { out.push(line); line = word; }
    else { line = cand; }
  }
  if (line) out.push(line);
  return out;
}

export function musicPanelLayout(geom: MusicChromeGeom, isMobile: boolean): MusicPanelLayout {
  const { cols } = geom;
  const lines: PanelLine[] = [];
  // First col that centers a run of `len` glyphs drawn at `scale`.
  const centerCol = (len: number, scale: number) => Math.floor((cols - len * scale) / 2);
  const pushCentered = (str: string, row: number, scale: number, alpha: number, terrain?: boolean) => {
    lines.push({ str, col: centerCol(str.length, scale), row, scale, alpha, terrain });
  };

  // Desktop: 3x title, 2x blurb at a ~80-char measure, 40-char search line.
  // Mobile: 2x title, 1x blurb across the band, search across the band.
  const margin = isMobile ? 3 : 5;
  const titleScale = isMobile ? 2 : 3;
  const blurbScale = isMobile ? 1 : 2;
  const measure = Math.max(16, Math.min(isMobile ? cols - 2 * margin : 80, Math.floor((cols - 2 * margin) / blurbScale)));
  const searchScale = 2;
  const panelWidth = isMobile ? cols - 2 * margin : Math.min(cols - 2 * margin, 40 * searchScale);
  const panelLeft = Math.floor((cols - panelWidth) / 2);

  const top = geom.headerRows + (isMobile ? 2 : 1);
  pushCentered(TITLE, top, titleScale, 0.95, true);
  let row = top + titleScale + (isMobile ? 1 : 2);
  for (const l of wrapText(BLURB, measure)) {
    pushCentered(l, row, blurbScale, 0.55);
    // Desktop gets a row of leading; the 2x lines otherwise touch.
    row += blurbScale + (isMobile ? 0 : 1);
  }

  const searchRow = row + (isMobile ? 1 : 2);
  const statRow = searchRow + 4; // input (2 rows) + underline + 1 gap
  const panelBottom = statRow + 3;
  const searchCol = Math.max(panelLeft, centerCol(SEARCH_LABEL.length + PLACEHOLDER.length, searchScale));
  const bgWidth = Math.max(panelWidth, measure * blurbScale, TITLE.length * titleScale);
  // The grid keeps about the tile size the old side-panel layout gave it
  // instead of stretching edge to edge: ~72% of the width, centered.
  const gridWidth = isMobile ? cols - 2 * margin : Math.min(cols - 2 * margin, Math.round(cols * 0.72));
  const tilesLeftCol = Math.floor((cols - gridWidth) / 2);
  return {
    panelLeft, panelWidth,
    bgLeft: Math.floor((cols - bgWidth) / 2), bgWidth,
    panelTop: top, panelBottom,
    lines,
    searchRow, searchScale,
    searchCol,
    searchAvailChars: Math.max(6, Math.floor((panelLeft + panelWidth - searchCol) / searchScale) - SEARCH_LABEL.length),
    statRow,
    tilesLeftCol,
    tilesRightCol: cols - 1 - tilesLeftCol,
    tilesTopRow: panelBottom + (isMobile ? 2 : 3),
  };
}

export function drawMusicChrome(
  ctx: CanvasRenderingContext2D,
  geom: MusicChromeGeom,
  layout: MusicPanelLayout,
  state: MusicChromeState,
  bgFill: string,
  // Per-cell terrain color sampler (colorLUT[gridColors]) — lines flagged
  // `terrain` render in the animated background palette instead of white.
  terrainFill?: (col: number, row: number) => string,
): ControlZone[] {
  const { charW, charH, fontSize } = geom;
  ctx.textBaseline = 'top';
  const zones: ControlZone[] = [];
  const L = layout;

  const putText = (str: string, col: number, row: number, scale: number, fill: string) => {
    ctx.font = `${fontSize * scale}px ${MONO}`;
    ctx.fillStyle = fill;
    for (let i = 0; i < str.length; i++) {
      if (str[i] === ' ') continue;
      ctx.fillText(str[i], (col + i * scale) * charW, row * charH);
    }
  };

  // --- Opaque panel background (legibility during melt; invisible on black) ---
  ctx.fillStyle = bgFill;
  ctx.fillRect(
    (L.bgLeft - 2) * charW,
    (L.panelTop - 1) * charH,
    (L.bgWidth + 4) * charW,
    (L.panelBottom - L.panelTop + 3) * charH,
  );

  // --- Title + blurb ---
  for (const ln of L.lines) {
    if (ln.terrain && terrainFill) {
      ctx.font = `${fontSize * ln.scale}px ${MONO}`;
      for (let i = 0; i < ln.str.length; i++) {
        if (ln.str[i] === ' ') continue;
        ctx.fillStyle = terrainFill(ln.col + i * ln.scale, ln.row);
        ctx.fillText(ln.str[i], (ln.col + i * ln.scale) * charW, ln.row * charH);
      }
    } else {
      putText(ln.str, ln.col, ln.row, ln.scale, `rgba(255,255,255,${ln.alpha})`);
    }
  }

  // --- Search input ---
  const sc = L.searchScale;
  putText(SEARCH_LABEL, L.searchCol, L.searchRow, sc, 'rgba(255,255,255,0.4)');
  const inputCol = L.searchCol + SEARCH_LABEL.length * sc;
  const q = state.query.toUpperCase();
  if (!q && !state.focused) {
    putText(PLACEHOLDER, inputCol, L.searchRow, sc, 'rgba(255,255,255,0.25)');
  } else {
    // Tail-scroll long queries so the caret end stays visible
    const avail = L.searchAvailChars;
    const shown = q.length > avail ? q.slice(q.length - avail) : q;
    const display = shown + (state.focused && state.caretOn ? '_' : '');
    putText(display, inputCol, L.searchRow, sc, 'rgba(255,255,255,0.9)');
  }
  // Underline marks the input extent
  putText('─'.repeat(L.panelWidth), L.panelLeft, L.searchRow + sc, 1, 'rgba(255,255,255,0.25)');

  // --- Plays stat: big 30-day count, small caption beneath ---
  if (state.plays30d != null) {
    const numStr = `${state.plays30d.toLocaleString('en-US')} ${state.plays30d === 1 ? 'PLAY' : 'PLAYS'}`;
    const caption = 'IN THE PAST 30 DAYS';
    const mid = L.panelLeft + L.panelWidth / 2;
    putText(numStr, Math.floor(mid - numStr.length), L.statRow, 2, 'rgba(255,255,255,0.9)');
    putText(caption, Math.floor(mid - caption.length / 2), L.statRow + 2, 1, 'rgba(255,255,255,0.4)');
  }

  zones.push({
    action: 'search',
    x: (L.panelLeft - 1) * charW,
    y: (L.searchRow - 1) * charH,
    w: (L.panelWidth + 2) * charW,
    h: charH * (sc + 2),
  });

  return zones;
}
