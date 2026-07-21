// src/components/Dashboard/musicView.ts
// Music-page chrome drawn over the card grid: pinned search row + bottom player box.
// Pure layout is exported for tests; drawing writes directly to the terrain canvas
// with an opaque background so cards scrolling beneath never bleed through.

export interface MusicChromeGeom {
  cols: number; rows: number; charW: number; charH: number; fontSize: number; headerRows: number;
}
export interface MusicChromeState {
  query: string;
  focused: boolean;
  caretOn: boolean;
  nowPlaying: { title: string; isPlaying: boolean; progress: number } | null;
}
export interface ControlZone {
  action: 'prev' | 'toggle' | 'next' | 'search';
  x: number; y: number; w: number; h: number; // canvas pixels
}

const MONO = "'JetBrains Mono','Courier New',monospace";
const BOX_HEIGHT = 7;   // border + pad + title(2) + controls/progress + pad + border
const BOTTOM_MARGIN = 2;

export function playerBoxRows(): number {
  return BOX_HEIGHT + BOTTOM_MARGIN;
}

export function layoutPlayerBox(geom: MusicChromeGeom, titleLen: number) {
  const { cols, rows, charW, charH } = geom;
  const padH = 2;
  const controlsCols = '|< '.length + '|| '.length + '>|'.length; // 8 cols at 1x
  const titleCols = Math.min(titleLen, Math.floor((Math.min(cols - 6, 80) - controlsCols - 4) / 2)) * 2;
  const innerWidth = Math.max(controlsCols + 2 + 16, controlsCols + 2 + titleCols);
  const boxWidth = 1 + padH + innerWidth + padH + 1;
  const left = Math.max(0, Math.floor((cols - boxWidth) / 2));
  const right = Math.min(cols - 1, left + boxWidth - 1);
  const bottom = rows - 1 - BOTTOM_MARGIN;
  const top = bottom - BOX_HEIGHT + 1;

  const contentLeft = left + 1 + padH;
  const controlsRow = top + 5; // row below the 2-row title
  const zone = (action: ControlZone['action'], col: number, chars: number): ControlZone => ({
    action,
    x: col * charW - charW * 0.5,
    y: controlsRow * charH - charH * 0.5,
    w: chars * charW + charW,
    h: charH * 2,
  });
  const controls: ControlZone[] = [
    zone('prev', contentLeft, 2),
    zone('toggle', contentLeft + 3, 2),
    zone('next', contentLeft + 6, 2),
  ];
  return { top, bottom, left, right, contentLeft, controlsRow, innerWidth, controls };
}

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
  ctx.font = `${fontSize}px ${MONO}`;
  ctx.textBaseline = 'top';
  const zones: ControlZone[] = [];

  const putText = (str: string, col: number, row: number, fill: string) => {
    ctx.fillStyle = fill;
    for (let i = 0; i < str.length; i++) ctx.fillText(str[i], (col + i) * charW, row * charH);
  };

  // --- Search row (pinned; opaque bg strip) ---
  const sr = searchRowLayout(geom);
  const label = 'SEARCH: ';
  const display = state.query.toUpperCase() + (state.focused && state.caretOn ? '_' : ' ');
  const searchText = label + display;
  const sLeft = Math.max(2, Math.floor((geom.cols - searchText.length) / 2));
  ctx.fillStyle = bgFill;
  ctx.fillRect((sLeft - 2) * charW, (sr.row - 0.5) * charH, (searchText.length + 4) * charW, charH * 2);
  putText(label, sLeft, sr.row, 'rgba(255,255,255,0.35)');
  putText(display, sLeft + label.length, sr.row, 'rgba(255,255,255,0.85)');
  zones.push({
    action: 'search',
    x: (sLeft - 2) * charW, y: (sr.row - 0.5) * charH,
    w: (searchText.length + 4) * charW, h: charH * 2,
  });

  // --- Player box (only when something has played) ---
  const np = state.nowPlaying;
  if (np) {
    const title = np.title.toUpperCase();
    const box = layoutPlayerBox(geom, title.length);
    const { top, bottom, left, right, contentLeft, controlsRow, innerWidth } = box;

    // Opaque background
    ctx.fillStyle = bgFill;
    ctx.fillRect(left * charW, top * charH, (right - left + 1) * charW, (bottom - top + 1) * charH);

    // Border
    const bColor = 'rgba(255,255,255,0.3)';
    putText('+' + '-'.repeat(right - left - 1) + '+', left, top, bColor);
    putText('+' + '-'.repeat(right - left - 1) + '+', left, bottom, bColor);
    for (let r = top + 1; r < bottom; r++) {
      putText('|', left, r, bColor);
      putText('|', right, r, bColor);
    }

    // Title at 2x (rows top+2, top+3)
    const maxTitleChars = Math.floor((innerWidth - 0) / 2);
    const shown = title.length > maxTitleChars ? title.slice(0, maxTitleChars - 1) + '…' : title;
    ctx.font = `${fontSize * 2}px ${MONO}`;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < shown.length; i++) {
      ctx.fillText(shown[i], (contentLeft + i * 2) * charW, (top + 2) * charH);
    }
    ctx.font = `${fontSize}px ${MONO}`;

    // Controls + progress on controlsRow
    putText('|<', contentLeft, controlsRow, 'rgba(255,255,255,0.6)');
    putText(np.isPlaying ? '||' : '> ', contentLeft + 3, controlsRow, 'rgba(255,255,255,0.9)');
    putText('>|', contentLeft + 6, controlsRow, 'rgba(255,255,255,0.6)');

    const barLeft = contentLeft + 10;
    const barWidth = Math.max(4, innerWidth - 12);
    const filled = Math.max(0, Math.min(barWidth, Math.round(np.progress * barWidth)));
    putText('█'.repeat(filled) + '░'.repeat(barWidth - filled), barLeft, controlsRow, 'rgba(255,255,255,0.4)');

    zones.push(...box.controls);
  }

  return zones;
}
