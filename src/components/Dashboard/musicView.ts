// src/components/Dashboard/musicView.ts
// Music-page chrome: a pinned (sticky) intro panel — left side on desktop, top
// band on mobile — holding the UNRELEASED LIBRARY title, the collection blurb,
// and the search input. The tile grid renders beside/below it and scrolls
// independently; the panel never moves. The now-playing box is drawn by the
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
  panelLeft: number;
  panelWidth: number;
  panelTop: number;
  panelBottom: number;       // last grid row occupied by panel content
  lines: PanelLine[];        // title + blurb, pre-wrapped
  searchRow: number;         // top grid row of the search input line
  searchScale: number;
  searchAvailChars: number;  // visible query chars before the display tail-scrolls
  statRow: number;           // top grid row of the plays-stat line (below the search underline)
  tilesLeftCol: number;      // first grid col available to the tile grid
  tilesTopRow: number;       // first grid row available to the tile grid
}

const MONO = "'JetBrains Mono','Courier New',monospace";
const SEARCH_LABEL = 'SEARCH: ';
const BLURB =
  'I FELL IN LOVE WITH MUSIC WHEN I DISCOVERED MIXTAPES IN EARLY 2015. ' +
  'I STARTED COLLECTING THEM ON A HARD DRIVE THAT HAS MIRACULOUSLY SURVIVED ' +
  'SINCE THEN. AT SOME POINT I ALSO STARTED TO COLLECT UNRELEASED / LEAKED ' +
  'TRACKS THAT SURFACED ONLINE. THE FIRST WEBSITE I MADE WAS A BASIC ' +
  'WORDPRESS SITE THAT HOSTED SOME OF MY FAVORITE LEAKED MUSIC. WHILE THAT ' +
  'WEBSITE IS LONG GONE, I WANTED TO REVIVE MY COLLECTION HERE.';

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

  if (!isMobile) {
    // --- Desktop: sticky left panel, tiles to the right ---
    const panelLeft = 5;
    const panelWidth = Math.max(34, Math.min(64, Math.floor(cols * 0.28)));
    const top = geom.headerRows + 3;

    // Title at 3x, two stacked lines
    lines.push({ str: 'UNRELEASED', col: panelLeft, row: top, scale: 3, alpha: 0.95, terrain: true });
    lines.push({ str: 'LIBRARY', col: panelLeft, row: top + 3, scale: 3, alpha: 0.95, terrain: true });

    // Blurb at 2x for readability
    let row = top + 7;
    for (const l of wrapText(BLURB, Math.floor(panelWidth / 2))) {
      lines.push({ str: l, col: panelLeft, row, scale: 2, alpha: 0.55 });
      row += 2;
    }

    const searchRow = row + 2;
    const statRow = searchRow + 4; // input (2 rows) + underline + 1 gap
    return {
      panelLeft, panelWidth, panelTop: top, panelBottom: statRow + 4,
      lines,
      searchRow, searchScale: 2,
      searchAvailChars: Math.max(6, Math.floor(panelWidth / 2) - SEARCH_LABEL.length),
      statRow,
      tilesLeftCol: panelLeft + panelWidth + 6,
      tilesTopRow: geom.headerRows + 2,
    };
  }

  // --- Mobile: sticky top band, tiles below ---
  const panelLeft = 3;
  const panelWidth = cols - 6;
  const top = geom.headerRows + 2;

  lines.push({ str: 'UNRELEASED LIBRARY', col: panelLeft, row: top, scale: 2, alpha: 0.95, terrain: true });
  let row = top + 3;
  for (const l of wrapText(BLURB, panelWidth)) {
    lines.push({ str: l, col: panelLeft, row, scale: 1, alpha: 0.55 });
    row += 1;
  }

  const searchRow = row + 1;
  const statRow = searchRow + 4; // input (2 rows) + underline + 1 gap
  return {
    panelLeft, panelWidth, panelTop: top, panelBottom: statRow + 4,
    lines,
    searchRow, searchScale: 2,
    searchAvailChars: Math.max(6, Math.floor(panelWidth / 2) - SEARCH_LABEL.length),
    statRow,
    tilesLeftCol: panelLeft,
    tilesTopRow: statRow + 5,
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
    (L.panelLeft - 2) * charW,
    (L.panelTop - 1) * charH,
    (L.panelWidth + 4) * charW,
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
  putText(SEARCH_LABEL, L.panelLeft, L.searchRow, sc, 'rgba(255,255,255,0.4)');
  const inputCol = L.panelLeft + SEARCH_LABEL.length * sc;
  const q = state.query.toUpperCase();
  if (!q && !state.focused) {
    putText('TYPE TO FILTER', inputCol, L.searchRow, sc, 'rgba(255,255,255,0.25)');
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
    putText(numStr, L.panelLeft, L.statRow, 2, 'rgba(255,255,255,0.9)');
    putText('IN THE PAST 30 DAYS', L.panelLeft, L.statRow + 2, 1, 'rgba(255,255,255,0.4)');
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
