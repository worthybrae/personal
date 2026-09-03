// src/components/Dashboard/useTerrainAnimation.ts

import { useEffect, useRef, useCallback } from 'react';
import { warpedTerrain } from './noise';
import { getDuotoneColor, scurve } from './color';
import { RAMP } from './ramp';
import { drawMusicChrome, musicPanelLayout, type MusicChromeState, type MusicPanelLayout, type ControlZone } from './musicView';
import {
  contactLayout,
  computeContactZones,
  drawContactChrome,
  type ContactGeom,
  type ContactLayout,
  type ContactUIState,
  type ContactZone,
} from './contactView';
import { getArt } from './artCache';

const NOISE_SCALE = 0.015;
const COLOR_LEVELS = 64;
// Reserved rows below the feed cards so the last card can scroll clear of the
// now-playing box (box height 7 + bottom offset 3 — see setupNowPlaying).
const NP_BOTTOM_RESERVE = 10;          // single-line now-playing box: 7 rows + 2 margin + 1
const NP_BOTTOM_RESERVE_STACKED = 12;  // stacked (mobile) box: 9 rows + 2 margin + 1

// Terrain cell size in CSS pixels. Everything drawn as a terrain cutout — the
// W, the menu words, the page headings — is made of these cells, so the cell
// size sets how much detail a letterform can carry. The phone ramp bottoms out
// at 7px rather than 9px: at 9px a narrow phone only has ~62 columns, which
// leaves the nine letters of PORTFOLIO about seven cells each and no letterform
// survives that. Both the mask builder and the resize handler must agree on
// this, hence one function.
function terrainFontSize(innerWidth: number): number {
  return innerWidth < 768
    ? Math.max(7, Math.min(14, innerWidth / 55))
    : Math.max(5, Math.min(9, innerWidth / 180));
}

export type MenuEntryKey = 'portfolio' | 'music' | 'resume' | 'contact';
const MENU_ENTRIES: { key: MenuEntryKey; label: string }[] = [
  { key: 'portfolio', label: 'PORTFOLIO' },
  { key: 'music', label: 'MUSIC' },
  { key: 'resume', label: 'RESUME' },
  { key: 'contact', label: 'CONTACT' },
];

export interface TerrainConfig {
  speedDivisor?: number;
  showNameMask?: boolean;
  contrast?: number;
  onLogoClick?: () => void;
  onMenuClick?: () => void;
  onSubItemClick?: (url: string) => void;
  menuOpenRef?: React.RefObject<boolean>;
  // Set true by Home right before closing the menu via W/logo or + (animated
  // close-to-landing crossfade); set false right before an Esc-close (instant
  // restore, unchanged). Read once on the open->closed edge inside draw().
  menuCloseToHomeRef?: React.MutableRefObject<boolean>;
  // Set true by Home right before a menu entry navigates to a content page
  // (portfolio/music): the menu words scatter-dissolve OVER the incoming page
  // instead of covering it (no landing crossfade, no name reveal). Consumed
  // (reset to false) by draw() on the open->closed edge.
  menuCloseToContentRef?: React.MutableRefObject<boolean>;
  onMenuSelect?: (entry: MenuEntryKey) => void;
  // Canvas-native contact mode — same open/close/crossfade conventions as
  // the full-screen "+" menu above, but rendering a "CONTACT" heading cutout
  // + field strips instead of menu words. See contactView.ts.
  contactOpenRef?: React.RefObject<boolean>;
  contactCloseToHomeRef?: React.MutableRefObject<boolean>;
  contactUIRef?: React.RefObject<ContactUIState | null>;
  onContactControl?: (action: string) => void;
  contentOpenRef?: React.RefObject<boolean>;
  activeLabelRef?: React.RefObject<string | null>;
  scrollTargetRef?: React.RefObject<number>;
  contentSubItemsRef?: React.RefObject<{ text: string; url: string; description?: string; mau?: string; category?: string; icon?: string; artist?: string; hasArt?: boolean }[]>;
  detailRef?: React.MutableRefObject<{ name: string; mau: string; url: string } | null>;
  meltCompleteRef?: React.MutableRefObject<boolean>;
  meltProgressRef?: React.MutableRefObject<number>;
  detailToFeedRef?: React.MutableRefObject<boolean>;
  nowPlayingRef?: React.RefObject<{ track: string; artist: string; isPlaying: boolean; playedAt?: string } | null>;
  coverCanvasRef?: React.RefObject<HTMLCanvasElement | null>;
  skipIntro?: boolean;
  musicUIRef?: React.RefObject<MusicChromeState | null>;
  onMusicControl?: (action: 'search') => void;
}

export function useTerrainAnimation(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  scrollProgressRef: React.MutableRefObject<number>,
  config: TerrainConfig = {},
) {
  const { speedDivisor = 6750, showNameMask = true, contrast = 8, onLogoClick, onMenuClick, onSubItemClick, menuOpenRef, menuCloseToHomeRef, menuCloseToContentRef, onMenuSelect, contentOpenRef, activeLabelRef, scrollTargetRef, contentSubItemsRef, meltCompleteRef, meltProgressRef, detailToFeedRef, nowPlayingRef, coverCanvasRef, skipIntro, musicUIRef, onMusicControl, contactOpenRef, contactCloseToHomeRef, contactUIRef, onContactControl } = config;

  // Wrap callbacks in refs so they never cause the useEffect to re-run.
  // navigate() from React Router changes identity on route changes, which cascades
  // through useCallback → useMemo → useEffect deps, resetting all animation state.
  const onLogoClickRef = useRef(onLogoClick);
  const onMenuClickRef = useRef(onMenuClick);
  const onSubItemClickRef = useRef(onSubItemClick);
  onLogoClickRef.current = onLogoClick;
  onMenuClickRef.current = onMenuClick;
  onSubItemClickRef.current = onSubItemClick;
  const onMusicControlRef = useRef(onMusicControl);
  onMusicControlRef.current = onMusicControl;
  const onMenuSelectRef = useRef(onMenuSelect);
  onMenuSelectRef.current = onMenuSelect;
  const onContactControlRef = useRef(onContactControl);
  onContactControlRef.current = onContactControl;

  const rafRef = useRef(0);
  const introStartRef = useRef(-1);
  const logoMenuIntroProgressRef = useRef(0);
  const contentProgressRef = useRef(-1);

  const nameMaskRef = useRef<{
    data: Uint8ClampedArray;
    width: number;
    height: number;
  } | null>(null);

  const wLogoMaskRef = useRef<{
    data: Uint8ClampedArray;
    width: number;
    height: number;
  } | null>(null);


  const contentTitleMaskRef = useRef<{
    data: Uint8ClampedArray;
    width: number;
    height: number;
  } | null>(null);

  const wLogoBoundsRef = useRef<{ x: number; y: number; w: number; h: number }>({ x: 0, y: 0, w: 0, h: 0 });
  const menuBoundsRef = useRef<{ x: number; y: number; w: number; h: number }>({ x: 0, y: 0, w: 0, h: 0 });
  const mouseRef = useRef<{ x: number; y: number }>({ x: -1, y: -1 });
  const subItemBoundsRef = useRef<{ x: number; y: number; w: number; h: number }[]>([]);
  // Full-screen "+" menu overlay: pixel-space hit/hover bounds for the 4
  // stacked entries, index-aligned with the module-level MENU_ENTRIES array.
  const menuEntryBoundsRef = useRef<{ x: number; y: number; w: number; h: number }[]>([]);

  const menuMaskRef = useRef<{
    data: Uint8ClampedArray;
    width: number;
    height: number;
  } | null>(null);

  const buildMasks = useCallback(
    (canvasWidth: number, canvasHeight: number) => {
      const off = document.createElement('canvas');
      off.width = canvasWidth;
      off.height = canvasHeight;
      const o = off.getContext('2d')!;
      o.fillStyle = '#000';
      o.fillRect(0, 0, off.width, off.height);

      if (showNameMask) {
        const isPortrait = canvasHeight > canvasWidth;
        const lineH = isPortrait ? canvasWidth * 0.22 : canvasHeight * 0.18;
        const centerY = off.height * (isPortrait ? 0.45 : 0.5);
        o.fillStyle = '#fff';
        o.textAlign = 'center';
        o.textBaseline = 'middle';
        const maxW = off.width * 0.9;
        o.font = `900 ${lineH}px 'Arial Black','Impact','Helvetica Neue',sans-serif`;
        o.fillText('WORTHY', off.width / 2, centerY - lineH * 0.6, maxW);
        o.font = `900 ${lineH * 0.85}px 'Arial Black','Impact','Helvetica Neue',sans-serif`;
        o.fillText('RAE', off.width / 2, centerY + lineH * 0.6, maxW);
      }

      nameMaskRef.current = {
        data: o.getImageData(0, 0, off.width, off.height).data,
        width: off.width,
        height: off.height,
      };

      const w2 = document.createElement('canvas');
      w2.width = canvasWidth;
      w2.height = canvasHeight;
      const w2ctx = w2.getContext('2d')!;
      w2ctx.fillStyle = '#000';
      w2ctx.fillRect(0, 0, w2.width, w2.height);

      const dpr = canvasWidth / window.innerWidth;
      const fs = terrainFontSize(window.innerWidth) * dpr;
      const cW = fs * 0.602;
      const cH = fs;
      // Both header icons are exactly this many grid rows tall so they read as
      // one pair. The W's column span follows from the row count and the cell
      // aspect ratio (see wCols below) rather than from the font's metrics.
      const targetIconRows = 8;
      const logoX = 24 * dpr;
      const logoY = 20 * dpr;
      // Snap the icon origin to the character grid so the W and the + share a
      // top row exactly and both sit the same distance from their screen edge.
      const iconTopRow = Math.round(logoY / cH);
      const iconLeftCol = Math.round(logoX / cW);

      // --- W logo mask ---
      // The mask is baked to grid resolution downstream by point-sampling each
      // cell's top-left pixel. On the coarse mobile grid that sampling drops the
      // W's notches and the letter collapses into a solid block, so the glyph is
      // quantized to whole cells here (a cell inks when enough of its area is
      // covered) and the downstream point-sample then lands on a solid cell.
      const wCols = Math.max(8, Math.round((targetIconRows * 1.12) / 0.602));
      const glyph = document.createElement('canvas');
      glyph.width = Math.ceil((wCols + 4) * cW);
      glyph.height = Math.ceil((targetIconRows + 4) * cH);
      const gctx = glyph.getContext('2d')!;
      gctx.textAlign = 'left';
      gctx.textBaseline = 'top';

      // Measure the glyph's ink box at a probe size, then scale so the ink is
      // exactly targetIconRows tall and wCols wide (the W is stretched slightly
      // to fill its column span — cells are 0.602 as wide as they are tall, so
      // an unscaled W would land at whatever width Arial Black happens to give).
      const inkBox = (ctx2: CanvasRenderingContext2D, w: number, h: number) => {
        const d = ctx2.getImageData(0, 0, w, h).data;
        let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if (d[(y * w + x) * 4 + 3] > 40) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }
        return maxX < 0 ? null : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
      };

      const probeSize = 8 * fs;
      gctx.clearRect(0, 0, glyph.width, glyph.height);
      gctx.fillStyle = '#fff';
      gctx.font = `900 ${probeSize}px 'Arial Black','Impact','Helvetica Neue',sans-serif`;
      gctx.fillText('W', 0, 0);
      const probe = inkBox(gctx, glyph.width, glyph.height);
      const targetW = wCols * cW;
      const targetH = targetIconRows * cH;
      const drawW = probe ? (targetW / probe.w) * probeSize : targetW;
      const drawH = probe ? (targetH / probe.h) * probeSize : targetH;
      const offX = probe ? -(probe.x / probe.w) * targetW : 0;
      const offY = probe ? -(probe.y / probe.h) * targetH : 0;

      gctx.clearRect(0, 0, glyph.width, glyph.height);
      gctx.save();
      // Non-uniform scale: horizontal and vertical are solved independently so
      // the ink lands on exactly wCols x targetIconRows cells.
      gctx.scale(drawW / probeSize, drawH / probeSize);
      gctx.fillStyle = '#fff';
      gctx.font = `900 ${probeSize}px 'Arial Black','Impact','Helvetica Neue',sans-serif`;
      gctx.fillText('W', (offX * probeSize) / drawW, (offY * probeSize) / drawH);
      gctx.restore();

      // Quantize to cells: >= 40% covered turns the cell on. Sampled on a 4x4
      // lattice per cell, which is plenty at these cell sizes and keeps the
      // diagonal strokes from either dropping out or bleeding together.
      const gData = gctx.getImageData(0, 0, glyph.width, glyph.height).data;
      const cellInked = (col: number, row: number) => {
        const x0 = col * cW, y0 = row * cH;
        let hit = 0;
        for (let sy = 0; sy < 4; sy++) {
          for (let sx = 0; sx < 4; sx++) {
            const px = Math.floor(x0 + ((sx + 0.5) / 4) * cW);
            const py = Math.floor(y0 + ((sy + 0.5) / 4) * cH);
            if (px < 0 || py < 0 || px >= glyph.width || py >= glyph.height) continue;
            if (gData[(py * glyph.width + px) * 4 + 3] > 40) hit++;
          }
        }
        return hit >= 6; // 6/16 ~= 40% coverage
      };

      const fillCellOn = (ctx2: CanvasRenderingContext2D, r: number, c: number) => {
        const x = Math.floor(c * cW);
        const y = Math.floor(r * cH);
        ctx2.fillRect(x, y, Math.floor((c + 1) * cW) - x, Math.floor((r + 1) * cH) - y);
      };

      w2ctx.fillStyle = '#fff';
      let wMaxCol = 0;
      for (let r = 0; r < targetIconRows; r++) {
        for (let c = 0; c < wCols; c++) {
          if (!cellInked(c, r)) continue;
          if (c > wMaxCol) wMaxCol = c;
          fillCellOn(w2ctx, iconTopRow + r, iconLeftCol + c);
        }
      }

      wLogoBoundsRef.current = {
        x: iconLeftCol * cW,
        y: iconTopRow * cH,
        w: (wMaxCol + 1) * cW,
        h: targetIconRows * cH,
      };

      wLogoMaskRef.current = {
        data: w2ctx.getImageData(0, 0, w2.width, w2.height).data,
        width: w2.width,
        height: w2.height,
      };

      // --- Menu (+) icon mask — grid-drawn, same row height as the W ---
      const m = document.createElement('canvas');
      m.width = canvasWidth;
      m.height = canvasHeight;
      const mctx = m.getContext('2d')!;
      mctx.fillStyle = '#000';
      mctx.fillRect(0, 0, m.width, m.height);

      mctx.fillStyle = '#fff';
      // Odd span in both axes so the bars centre on an exact cell. Column count
      // tracks the row count through the cell aspect ratio, so the + stays
      // visually square (and matched to the W) at every viewport.
      // (targetIconRows is even and plusCols is forced odd, which is what lets
      // the even-thickness horizontal bar and odd-thickness vertical bar each
      // land on the exact centre of their axis.)
      const plusRows = targetIconRows;
      let plusCols = Math.round(plusRows / 0.602);
      if (plusCols % 2 === 0) plusCols += 1;
      const vBarThick = 3; // vertical bar: 3 columns wide (~1.8 rows of ink)
      const hBarThick = 2; // horizontal bar: 2 rows thick
      // Mirror the W's left inset on the right edge.
      const plusLeftCol = Math.floor((canvasWidth - logoX) / cW) - plusCols;
      const plusTopRow = iconTopRow + Math.floor((targetIconRows - plusRows) / 2);
      const plusMidCol = plusLeftCol + Math.floor((plusCols - vBarThick) / 2);
      const plusMidRow = plusTopRow + Math.floor((plusRows - hBarThick) / 2);
      // Vertical bar
      for (let r = plusTopRow; r < plusTopRow + plusRows; r++) {
        for (let c = plusMidCol; c < plusMidCol + vBarThick; c++) {
          fillCellOn(mctx, r, c);
        }
      }
      // Horizontal bar
      for (let r = plusMidRow; r < plusMidRow + hBarThick; r++) {
        for (let c = plusLeftCol; c < plusLeftCol + plusCols; c++) {
          fillCellOn(mctx, r, c);
        }
      }
      menuBoundsRef.current = {
        x: Math.floor(plusLeftCol * cW),
        y: Math.floor(plusTopRow * cH),
        w: Math.ceil(plusCols * cW),
        h: Math.ceil(plusRows * cH),
      };

      menuMaskRef.current = {
        data: mctx.getImageData(0, 0, m.width, m.height).data,
        width: m.width,
        height: m.height,
      };
    },
    [showNameMask],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cols = 0;
    let rows = 0;
    let fontSize = 0;
    let charW = 0;
    let charH = 0;
    let canvasDpr = 1;
    // Cover canvas context (for terrain cover/reveal over detail content)
    let coverCtx: CanvasRenderingContext2D | null = null;
    // Pre-allocated buffers — reused every frame (no GC pressure)
    let gridChars: Uint8Array = new Uint8Array(0);
    let gridColors: Uint8Array = new Uint8Array(0);
    let gridSkip: Uint8Array = new Uint8Array(0);
    let gridBg: Uint8Array = new Uint8Array(0);
    const colorLUT: string[] = new Array(COLOR_LEVELS);

    // Pre-baked grid-resolution mask lookups (avoid per-frame pixel lookups)
    let nameMaskGrid: Uint8Array = new Uint8Array(0);
    let wLogoMaskGrid: Uint8Array = new Uint8Array(0);
    let menuMaskGrid: Uint8Array = new Uint8Array(0);
    let contentTitleGrid: Uint8Array = new Uint8Array(0);
    // Full-screen "+" menu overlay: grid-baked mask for the 4 stacked entries
    // (built by buildMenuOverlayMask, distinct from menuMaskGrid above which
    // is the small "+" icon in the header). menuOpenStart timestamps the most
    // recent open transition, driving the scatter-in animation.
    let menuOverlayGrid: Uint8Array = new Uint8Array(0);
    // Canvas-native contact mode — same terrain-cutout technique as the menu
    // overlay above, applied to the "CONTACT" heading cutout.
    let contactHeadingGrid: Uint8Array = new Uint8Array(0);
    let contactHeadingBottomRow = 0;
    let contactZones: ContactZone[] = [];

    // --- Unified overlay crossfade state machine ---
    // Exactly one of these three "layers" is ever frontmost: the landing
    // name, the full-screen "+" menu, or canvas-native contact mode.
    // Switching between any pair (name<->menu, menu<->contact, contact<->name)
    // plays a single shared crossfade — the outgoing layer dissolves (reveal
    // 1->0) while the incoming layer scatters in (reveal 0->1) over the same
    // ~900ms window, each using its own per-cell hash pattern (see the
    // name/menu/contact mask blocks in the main grid loop below). This
    // generalizes the original W/+ close-to-landing crossfade to every
    // overlay transition instead of duplicating it per pair.
    type OverlayLayer = 'name' | 'menu' | 'contact';
    const XFADE_MS = 900;
    let currentLayer: OverlayLayer = 'name';
    let xfadeFrom: OverlayLayer | null = null;
    let xfadeTo: OverlayLayer | null = null;
    let xfadeStart = -1;
    // Snapshot of the name layer's actual visibility fraction at the moment
    // a name-dissolve leg starts (see xfadeFromNameFrac usage in draw()) —
    // 0 when the name wasn't shown at all (e.g. opening the menu from a
    // content page), 1 when it was fully on screen (landing, at rest).
    let xfadeFromNameFrac = 1;
    // Mirror snapshot for a name leg on the INCOMING side: the name's target
    // resting visibility when the crossfade will land on 'name'. 0 when the
    // close navigates to a content page (scroll already snapped to 1), so
    // the name never rides in just to pop back out when the leg ends.
    let xfadeToNameFrac = 1;
    // True while the active crossfade is a menu→content close: the menu
    // words dissolve OVER the revealing page, so the outgoing menu leg must
    // not count as a page-covering overlay (overlayVisual below).
    let xfadeMenuOverContent = false;
    // Click-gating for the incoming layer's interactive content (menu
    // entries / contact fields — NOT the W/+ toggle, which stays clickable
    // throughout so a transition can always be cancelled/reversed). Written
    // once per frame near the top of draw(), read by hitTest() below.
    let menuInteractive = false;
    let contactInteractive = false;
    let contactLayoutCache: ContactLayout | null = null;
    let contactLayoutKey = '';
    let lastContentLabel: string | null = null;
    let lastSubItemsKey = '';
    let lastDetailKey = '';
    // Now-playing box geometry
    let npBoxTop = Infinity;   // first row of box (top border)
    let npBoxBottom = 0;       // last row of box (bottom border)
    let npBoxLeft = 0;         // first col of box (left border)
    let npBoxRight = 0;        // last col of box (right border)
    let npLabelStr = '';
    let npTextStr = '';
    let npLabelCol = 0;        // col where label text starts
    let npTextCol = 0;         // col where track text starts
    let npLabelRow = 0;
    let npTextRow = 0;
    let npBarsCol = 0;         // col where equalizer bars start
    let npBarsRow = 0;
    let npIsPlaying = false;
    let npMaxTextWidth = 0;     // max visible chars for track text
    let npFullTextStr = '';     // full untruncated track text for scrolling
    // Narrow viewports stack the track over the artist on two 2x rows instead
    // of running "TRACK — ARTIST" as one marquee'd line: at mobile grid widths
    // that single line always overflows, and a permanently scrolling title is
    // the least readable thing on the page.
    let npStacked = false;
    let npArtistStr = '';
    let npArtistRow = 0;
    let lastNowPlayingTrack = '';

    // Feed card geometry
    interface FeedCard {
      baseTop: number;    // grid row of top edge (before scroll)
      baseBottom: number;
      left: number;       // grid col of left edge
      right: number;
      iconCol: number;    // col where icon starts (list mode only)
      textCol: number;    // col where text (category/name/desc) starts (list mode only)
      catRow: number;     // row offsets from baseTop (list mode only)
      nameRow: number;    // list mode only
      descRow: number;    // list mode only
      catStr: string;
      nameStr: string;    // list mode: item name; tile mode: title (centered)
      descStr: string;    // list mode only
      iconStr: string;    // list mode only
      url: string;
      textScale: number;  // font multiplier (2 = each char spans 2 grid cols/rows)
      // --- Music tile mode only (isMusicMode) ---
      artRows: number;    // rows spanned by the square art region
      titleRow: number;   // row for the centered title (below the art square)
      artistRow: number;  // row for the centered artist (below the title)
      tileArt: boolean;   // catalog has_art — gates whether we even attempt to load art
      artistStr: string;  // centered, dim, ellipsis-capped artist text
    }
    let feedCards: FeedCard[] = [];
    let musicControlZones: ControlZone[] = [];
    // Music-page pinned panel (title/blurb/search — musicView.ts) + fixed-slot
    // grid: musicSlotRows is how many full tile rows fit in the viewport. The
    // drawn scroll offset snaps to whole row-periods so tiles always land in
    // the same screen positions (designated slots) and scrolling swaps the
    // CONTENT of the slots rather than sliding the tiles.
    let musicLayoutCache: MusicPanelLayout | null = null;
    let musicLayoutKey = '';
    let musicSlotRows = 1;
    // Page heading for the generic feed (portfolio): a pinned "PORTFOLIO"
    // cutout in the exact style/position of the contact page's "CONTACT"
    // heading (buildFeedHeadingMask mirrors buildContactHeadingMask). Cards
    // start below feedHeadingBottomRow and scroll under it. Unused in music
    // mode (the pinned panel owns the title there) and detail mode (title
    // mask handles it).
    let feedHeadingGrid: Uint8Array = new Uint8Array(0);
    let feedHeadingBottomRow = 0;
    let feedCols = 1;         // number of grid columns (1 mobile, 2 feeds, 6-8 music desktop tiles)
    let feedColWidth = 0;     // grid-col width of a single card/tile, uniform across columns
    const feedColGap = 4;     // grid cols between columns — a deliberate terrain band, not a sliver
    let feedGridLeft = 0;     // grid col where the centered grid begins
    let feedStartRow = 0;
    let feedCardHeight = 0;
    let feedCardGap = 0;
    // Per-tile "is a loaded image ready to draw" flag (music mode), refreshed each
    // frame for on-screen tiles only — O(visible tiles), never O(catalog).
    let tileArtLoaded: Uint8Array = new Uint8Array(0);
    // Shared "off-screen" placeholder for subItemBoundsRef entries outside the
    // visible row-block range. hitTest() and the hover-detection loop only ever
    // read x/y/w/h off these entries and never mutate them, so one shared
    // instance is safe and avoids allocating ~1350 throwaway objects a frame.
    const OFFSCREEN_BOUNDS = { x: -1, y: -1, w: 0, h: 0 };
    // Per-card hit-test bounds — same length and index alignment as feedCards.
    // Refreshed each frame for on-screen cards only; off-screen indices point
    // at the shared OFFSCREEN_BOUNDS instead of a fresh object.
    let feedBoundsArr: { x: number; y: number; w: number; h: number }[] = [];
    let feedScrollOffset = 0;
    let feedScrollTarget = 0;
    let feedMaxScroll = 0;
    let lastFeedItemsKey = '';
    let lastItemsArrForKeys: unknown = null;
    let cachedFeedItemsKey = '';
    let cachedSubItemsKey = '';
    let wasFeedMode = false;
    // 0→1 fade of the /music full-black background — replaces the old
    // one-frame snap when contentProgress crossed 1. Drawn as a black veil
    // over the terrain glyph pass; page chrome (tiles, art, np box) renders
    // after the veil and is never dimmed by it.
    let musicBlackness = 0;
    let feedToDetailMelt = false;
    let detailToFeedMelt = false;
    let d2fContentReset = false;
    let d2fMeltProgress = 0;
    let detailToFeedBrightness = -1; // -1 = inactive, 0→1 = fading in from dark (detail→feed)
    let npReentryStart = -1;       // timestamp when now-playing re-enters after being hidden
    let npReentryScatter = 1;      // 0→1 scatter-in for re-entry (1 = fully revealed)
    let npWasVisible = false;

    function buildContentTitleMask(_label: string) {
      if (!canvas) return;
      const detail = config.detailRef?.current;

      const off = document.createElement('canvas');
      off.width = canvas.width;
      off.height = canvas.height;
      const o = off.getContext('2d')!;
      o.fillStyle = '#000';
      o.fillRect(0, 0, off.width, off.height);

      const newBounds: { x: number; y: number; w: number; h: number }[] = [];
      const bioDpr = canvas.width / window.innerWidth;
      const cutMaxW = Math.min(672, window.innerWidth - 48) * bioDpr;
      const cutMaxH = (window.innerHeight - 100) * bioDpr;
      const cutCX = canvas.width / 2;
      const cutCY = canvas.height * 0.53;
      const isPortrait = canvas.height > canvas.width;

      const titleH = isPortrait ? cutMaxW * 0.22 : cutMaxH * 0.1;

      o.fillStyle = '#fff';
      o.textAlign = 'center';
      o.textBaseline = 'middle';

      if (detail) {
        // Detail mode: project name centered + MAU below in smaller font
        const nameFont = `900 ${titleH}px 'Arial Black','Impact','Helvetica Neue',sans-serif`;
        const mauFont = `900 ${titleH * 0.85}px 'Arial Black','Impact','Helvetica Neue',sans-serif`;

        // Name
        o.font = nameFont;
        const nameY = cutCY - titleH * 0.7;
        o.fillText(detail.name, cutCX, nameY, cutMaxW * 0.9);
        const nameTw = o.measureText(detail.name).width;
        newBounds.push({
          x: cutCX - nameTw / 2,
          y: nameY - titleH * 0.55,
          w: Math.min(nameTw, cutMaxW * 0.9),
          h: titleH * 1.1,
        });

        // MAU stat
        o.font = mauFont;
        const mauY = nameY + titleH * 1.3;
        o.fillText(detail.mau, cutCX, mauY, cutMaxW * 0.9);
        const mauTw = o.measureText(detail.mau).width;
        newBounds.push({
          x: cutCX - mauTw / 2,
          y: mauY - titleH * 0.25,
          w: Math.min(mauTw, cutMaxW * 0.9),
          h: titleH * 0.5,
        });
      }
      // Feed items: no mask needed — handled by card boxes in draw loop

      subItemBoundsRef.current = newBounds;

      contentTitleMaskRef.current = {
        data: o.getImageData(0, 0, off.width, off.height).data,
        width: off.width,
        height: off.height,
      };

      // Bake to grid
      const mask = contentTitleMaskRef.current;
      contentTitleGrid = new Uint8Array(cols * rows);
      for (let r = 0; r < rows; r++) {
        const py = Math.floor(r * charH);
        for (let c = 0; c < cols; c++) {
          const px = Math.floor(c * charW);
          const idx = r * cols + c;
          if (px < mask.width && py < mask.height) {
            const offset = (py * mask.width + px) * 4;
            contentTitleGrid[idx] = mask.data[offset] > 128 ? 1 : 0;
          }
        }
      }
    }

    // Full-screen "+" menu overlay mask — same offscreen-canvas / Arial Black /
    // getImageData-bake-to-grid technique as the WORTHY RAE name mask and
    // buildContentTitleMask above, applied to 4 stacked entries. Static text,
    // Bake an offscreen mask (white ink on black) down to the character grid.
    // Sampling a single pixel per cell — the cell's top-left corner, which is
    // what this used to do — silently drops any stroke narrower than one cell,
    // and at mobile grid sizes that is most of them: the headings came out as
    // rubble and the W collapsed into a solid block. Inking a cell on area
    // coverage instead keeps thin strokes and open counters at every size.
    function bakeMaskGrid(
      out: Uint8Array,
      mask: { data: Uint8ClampedArray; width: number; height: number },
    ) {
      const S = 4;              // 4x4 sample lattice per cell
      const MIN_HITS = 6;       // 6/16 ~= 40% coverage
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          let hits = 0;
          for (let sy = 0; sy < S; sy++) {
            const py = Math.floor((r + (sy + 0.5) / S) * charH);
            if (py < 0 || py >= mask.height) continue;
            for (let sx = 0; sx < S; sx++) {
              const px = Math.floor((c + (sx + 0.5) / S) * charW);
              if (px < 0 || px >= mask.width) continue;
              if (mask.data[(py * mask.width + px) * 4] > 128) hits++;
            }
          }
          out[r * cols + c] = hits >= MIN_HITS ? 1 : 0;
        }
      }
    }

    // so it's rebuilt on every resize (cheap) rather than lazily on open.
    function buildMenuOverlayMask() {
      if (!canvas) return;
      const off = document.createElement('canvas');
      off.width = canvas.width;
      off.height = canvas.height;
      const o = off.getContext('2d')!;
      o.fillStyle = '#000';
      o.fillRect(0, 0, off.width, off.height);

      o.fillStyle = '#fff';
      o.textAlign = 'center';
      o.textBaseline = 'middle';

      const n = MENU_ENTRIES.length;
      const isPortrait = canvas.height > canvas.width;
      // Sized to read as 4 big stacked words filling the viewport, matching
      // the scale of the landing WORTHY RAE name treatment it replaces.
      const maxW = canvas.width * 0.9;

      // --- One size and one condense for the whole stack ---
      // Passing maxWidth to fillText condenses each word independently, so on a
      // narrow screen PORTFOLIO came out crushed to ~0.7 while MUSIC and RESUME
      // rendered at full width: four words, four different stroke weights, and
      // the set stopped reading as one menu. Instead the longest word sets a
      // single condense factor for all four, floored so nothing gets crushed
      // past legibility — below that floor the whole stack steps down in size.
      const MIN_CONDENSE = 0.72;
      const baseLineH = isPortrait ? canvas.width * 0.18 : canvas.height * 0.125;
      o.font = `900 ${baseLineH}px 'Arial Black','Impact','Helvetica Neue',sans-serif`;
      let widest = 1;
      for (const e of MENU_ENTRIES) widest = Math.max(widest, o.measureText(e.label).width);

      // Shrink the type only as far as the condense floor demands, then let the
      // condense take up whatever slack is left.
      const lineH = Math.min(baseLineH, (baseLineH * maxW) / (widest * MIN_CONDENSE));
      const condense = Math.min(1, maxW / (widest * (lineH / baseLineH)));

      const gap = lineH * 0.35;
      const totalH = n * lineH + (n - 1) * gap;
      const startCY = canvas.height / 2 - totalH / 2 + lineH / 2;

      o.font = `900 ${lineH}px 'Arial Black','Impact','Helvetica Neue',sans-serif`;

      const newBounds: { x: number; y: number; w: number; h: number }[] = [];
      for (let i = 0; i < n; i++) {
        const cy = startCY + i * (lineH + gap);
        const tw = o.measureText(MENU_ENTRIES[i].label).width * condense;
        // Condense by scaling the x axis rather than via fillText's maxWidth,
        // so every word shares the factor instead of only the overlong ones.
        o.save();
        o.translate(canvas.width / 2, cy);
        o.scale(condense, 1);
        o.fillText(MENU_ENTRIES[i].label, 0, 0);
        o.restore();
        newBounds.push({
          x: canvas.width / 2 - tw / 2,
          y: cy - lineH * 0.6,
          w: tw,
          h: lineH * 1.2,
        });
      }
      menuEntryBoundsRef.current = newBounds;

      menuOverlayGrid = new Uint8Array(cols * rows);
      bakeMaskGrid(menuOverlayGrid, {
        data: o.getImageData(0, 0, off.width, off.height).data,
        width: off.width,
        height: off.height,
      });
    }

    // Canvas-native contact mode heading — same offscreen-canvas / Arial
    // Black / getImageData-bake-to-grid cutout technique as the menu-word
    // overlay above, applied to a single smaller "CONTACT" word positioned
    // near the top (fields render below it, not vertically centered like
    // the 4-entry menu stack). Static text, rebuilt on resize.
    function buildContactHeadingMask() {
      if (!canvas) return;
      const off = document.createElement('canvas');
      off.width = canvas.width;
      off.height = canvas.height;
      const o = off.getContext('2d')!;
      o.fillStyle = '#000';
      o.fillRect(0, 0, off.width, off.height);

      o.fillStyle = '#fff';
      o.textAlign = 'center';
      o.textBaseline = 'middle';

      const isPortrait = canvas.height > canvas.width;
      const lineH = isPortrait ? canvas.width * 0.16 : canvas.height * 0.13;
      const headerBandPx = 100 * canvasDpr;
      const cy = headerBandPx + lineH * 1.1;
      const maxW = canvas.width * 0.9;

      o.font = `900 ${lineH}px 'Arial Black','Impact','Helvetica Neue',sans-serif`;
      o.fillText('CONTACT', canvas.width / 2, cy, maxW);

      contactHeadingGrid = new Uint8Array(cols * rows);
      bakeMaskGrid(contactHeadingGrid, {
        data: o.getImageData(0, 0, off.width, off.height).data,
        width: off.width,
        height: off.height,
      });
      // A handful of blank rows below the heading's baseline before fields begin.
      contactHeadingBottomRow = Math.ceil((cy + lineH * 0.7) / charH) + 3;
    }

    // "PORTFOLIO" heading for the generic feed — identical metrics, font, and
    // position to buildContactHeadingMask above so the two pages' titles look
    // exactly the same; only the string differs.
    function buildFeedHeadingMask() {
      if (!canvas) return;
      const off = document.createElement('canvas');
      off.width = canvas.width;
      off.height = canvas.height;
      const o = off.getContext('2d')!;
      o.fillStyle = '#000';
      o.fillRect(0, 0, off.width, off.height);

      o.fillStyle = '#fff';
      o.textAlign = 'center';
      o.textBaseline = 'middle';

      const isPortrait = canvas.height > canvas.width;
      const lineH = isPortrait ? canvas.width * 0.16 : canvas.height * 0.13;
      const headerBandPx = 100 * canvasDpr;
      const cy = headerBandPx + lineH * 1.1;
      const maxW = canvas.width * 0.9;

      o.font = `900 ${lineH}px 'Arial Black','Impact','Helvetica Neue',sans-serif`;
      o.fillText('PORTFOLIO', canvas.width / 2, cy, maxW);

      feedHeadingGrid = new Uint8Array(cols * rows);
      bakeMaskGrid(feedHeadingGrid, {
        data: o.getImageData(0, 0, off.width, off.height).data,
        width: off.width,
        height: off.height,
      });
      feedHeadingBottomRow = Math.ceil((cy + lineH * 0.7) / charH) + 3;
    }

    function setupNowPlaying(
      track: string,
      artist: string,
      isPlaying: boolean,
      _playedAt?: string,
      labels: [string, string] = ['LISTENING TO', 'LAST LISTENED TO'],
    ) {
      npIsPlaying = isPlaying;
      npLabelStr = isPlaying ? labels[0] : labels[1];
      const trackStr = track.toUpperCase();
      const artistStr = artist.toUpperCase();
      npFullTextStr = (artist ? `${trackStr} — ${artistStr}` : trackStr);

      // Bars only shown when playing
      const barsWidth = isPlaying ? 5 : 0;
      const gapAfterBars = isPlaying ? 2 : 0;
      // Title renders at 2x: each char spans 2 grid cols/rows (same as feed cards)
      const textScale = 2;
      const padH = 2; // horizontal padding inside border
      const chrome = 1 + padH + barsWidth + gapAfterBars + padH + 1;
      // Cap text width so the box doesn't overflow the screen. Mobile keeps a
      // wider outer margin because the box sits edge-to-edge otherwise.
      const maxBoxCols = Math.min(cols - (isMobile ? 10 : 6), 80);
      const maxTextCols = maxBoxCols - chrome;
      npMaxTextWidth = Math.max(4, Math.floor(maxTextCols / textScale)); // in CHARS, not cols

      // Stack onto two rows on phones, and anywhere the combined line can't
      // fit. A joined "TRACK — ARTIST" line only just squeezes onto the wider
      // phones, leaving the box pressed against both screen edges, and on the
      // rest it marquees — the least readable thing on the page.
      npStacked = !!artist && (isMobile || npFullTextStr.length > npMaxTextWidth);

      const clip = (str: string) =>
        str.length > npMaxTextWidth ? str.slice(0, npMaxTextWidth - 1) + '…' : str;

      let contentChars: number;
      if (npStacked) {
        npTextStr = clip(trackStr);
        npArtistStr = clip(artistStr);
        contentChars = Math.max(npTextStr.length, npArtistStr.length);
      } else {
        npArtistStr = '';
        npTextStr = clip(npFullTextStr);
        // Marquee (single-line path only) scrolls the full string in place.
        contentChars = Math.min(npFullTextStr.length, npMaxTextWidth);
      }

      // Size box to actual content, not max width
      const contentWidth = Math.max(npLabelStr.length, contentChars * textScale);
      const innerWidth = barsWidth + gapAfterBars + contentWidth;
      const boxWidth = 1 + padH + innerWidth + padH + 1; // border + pad + content + pad + border

      // Box height: border + pad + label(1) + title(2 rows at 2x)
      // [+ artist(2 rows) when stacked] + pad + border
      const boxHeight = npStacked ? 9 : 7;

      // Center horizontally
      npBoxLeft = Math.floor((cols - boxWidth) / 2);
      npBoxRight = npBoxLeft + boxWidth - 1;

      // Position near bottom: box bottom border is 2 rows from canvas bottom
      npBoxBottom = rows - 3;
      npBoxTop = npBoxBottom - boxHeight + 1;

      // Content positions (inside the box)
      const contentLeft = npBoxLeft + 1 + padH; // after border + padding
      npBarsCol = contentLeft;
      npBarsRow = npBoxTop + 3; // align bars with the 2-row title
      npLabelCol = contentLeft + barsWidth + gapAfterBars;
      npLabelRow = npBoxTop + 2;
      npTextCol = contentLeft + barsWidth + gapAfterBars;
      npTextRow = npBoxTop + 3; // spans rows +3 and +4 (2x)
      npArtistRow = npTextRow + textScale;
    }

    type FeedItem = { text: string; url: string; description?: string; category?: string; icon?: string; artist?: string; hasArt?: boolean };

    function setupFeedCards(items: FeedItem[], extraBottomRows = 0) {
      if (items.length === 0) {
        feedCards = [];
        feedMaxScroll = 0;
        return;
      }

      if (musicUIRef?.current) {
        setupMusicTiles(items, extraBottomRows);
        return;
      }

      const textScale = 2;    // each character spans 2 grid cols & 2 grid rows
      const padH = 2;          // horizontal padding inside card (grid cols)
      const padV = 1;          // vertical padding (grid rows)
      const iconChars = 3;     // max icon characters
      const gapAfterIcon = 2;  // gap between icon and text (grid cols)
      const cardGap = 4;       // rows between card row-blocks

      // Each text line spans textScale rows; 2 lines (name + desc)
      const cardHeight = padV + textScale * 2 + padV; // 1 + 4 + 1 = 6
      const iconCols = iconChars * textScale;

      // --- Card width: content-sized (same measurement as the original single-column
      // layout) — every card gets the width its longest title/desc actually needs,
      // capped so a stray long track title can't blow out the box. ---
      let maxTextChars = 0;
      for (const item of items) {
        const nameLen = item.text.toUpperCase().length;
        const descLen = (item.description ?? '').toUpperCase().length;
        maxTextChars = Math.max(maxTextChars, nameLen, descLen);
      }
      const textCols = maxTextChars * textScale;
      const contentCols = iconCols + gapAfterIcon + textCols;
      const maxBoxCols = Math.min(cols - 6, 64);
      const cappedContentCols = Math.min(contentCols, maxBoxCols - (1 + padH + padH + 1));
      const cappedTextCols = cappedContentCols - iconCols - gapAfterIcon;
      const cappedTextChars = Math.floor(cappedTextCols / textScale);
      feedColWidth = 1 + padH + cappedContentCols + padH + 1;

      // --- Column count: how many content-width cards fit side by side, clamped
      // to 2 columns. Mobile is always a single column — checked live (not the
      // mount-time isMobile) so shrinking the window also collapses to 1. ---
      const maxCols = 2;
      const nFit = Math.floor((cols - 4 + feedColGap) / (feedColWidth + feedColGap));
      const n = window.innerWidth < 768 ? 1 : Math.max(1, Math.min(nFit, maxCols));

      feedCols = n;
      feedGridLeft = Math.floor((cols - (n * feedColWidth + (n - 1) * feedColGap)) / 2);

      // Vertical layout: cards start below the pinned "PORTFOLIO" heading
      // cutout (buildFeedHeadingMask — same placement as the contact page's
      // CONTACT heading) and scroll under it.
      const headerRows = Math.ceil(100 * canvasDpr / charH);
      const startRow = Math.max(headerRows + 2, feedHeadingBottomRow);
      feedStartRow = startRow;
      feedCardHeight = cardHeight;
      feedCardGap = cardGap;

      feedCards = items.map((item, i) => {
        const colIdx = i % n;
        const rowBlock = Math.floor(i / n);
        const left = feedGridLeft + colIdx * (feedColWidth + feedColGap);
        const right = left + feedColWidth - 1;
        const contentLeft = left + 1 + padH;
        const iconCol = contentLeft;
        const textCol = contentLeft + iconCols + gapAfterIcon;
        const baseTop = startRow + rowBlock * (cardHeight + cardGap);
        const nameStr = item.text.toUpperCase();
        const descStr = (item.description ?? '').toUpperCase();
        return {
          baseTop,
          baseBottom: baseTop + cardHeight - 1,
          left,
          right,
          iconCol,
          textCol,
          catRow: 0,
          nameRow: baseTop + padV,
          descRow: baseTop + padV + textScale,
          catStr: '',
          nameStr: nameStr.length > cappedTextChars ? nameStr.slice(0, cappedTextChars - 1) + '…' : nameStr,
          descStr: descStr.length > cappedTextChars ? descStr.slice(0, cappedTextChars - 1) + '…' : descStr,
          iconStr: item.icon ?? '',
          url: item.url,
          textScale,
          artRows: 0,
          titleRow: 0,
          artistRow: 0,
          tileArt: false,
          artistStr: '',
        };
      });

      const numRowBlocks = Math.ceil(items.length / n);
      const totalFeedHeight = startRow + numRowBlocks * (cardHeight + cardGap);
      feedMaxScroll = Math.max(0, totalFeedHeight - rows + 3 + extraBottomRows);
    }

    // Shared panel/tile-region layout for the music page. Cached by geometry
    // key because both setupMusicTiles and the per-frame chrome draw need it.
    function getMusicLayout(): MusicPanelLayout {
      const headerRows = Math.ceil(100 * canvasDpr / charH);
      const key = `${cols}x${rows}x${headerRows}`;
      if (!musicLayoutCache || musicLayoutKey !== key) {
        musicLayoutCache = musicPanelLayout({ cols, rows, charW, charH, fontSize, headerRows }, isMobile);
        musicLayoutKey = key;
      }
      return musicLayoutCache;
    }

    // Album-art tile grid (music mode): square art region (T cols wide, ~T*0.602
    // rows tall to read as visually square given the 0.602 char aspect ratio),
    // a 1-row pad, then 2 centered 2x text lines (title, artist). The grid fills
    // the region beside/below the pinned intro panel (musicPanelLayout), and
    // musicSlotRows full rows of tiles form the fixed slots — scrolling swaps
    // slot content in whole row-blocks (see the snap logic in draw()) instead
    // of sliding tiles, so feedMaxScroll is measured in whole periods.
    function setupMusicTiles(items: FeedItem[], extraBottomRows: number) {
      const L = getMusicLayout();
      const tileGap = feedColGap; // reuse the same deliberate terrain-band gap, both axes
      const regionLeft = L.tilesLeftCol;
      const regionRight = cols - (isMobile ? 3 : 5);
      const availCols = Math.max(10, regionRight - regionLeft + 1);
      // Mobile: 2 columns of large tiles (readable 2x captions, thumbable
      // targets) instead of a cramped 3-4 column grid.
      const minT = isMobile ? 22 : 20;
      const desiredN = isMobile ? 2 : 7;
      const lowerBoundN = isMobile ? 2 : 4;

      let n = desiredN;
      let T = Math.floor((availCols - (n - 1) * tileGap) / n);
      while (T < minT && n > lowerBoundN) {
        n -= 1;
        T = Math.floor((availCols - (n - 1) * tileGap) / n);
      }
      T = Math.max(minT, T);
      n = Math.max(1, n);

      const textScale = 2;      // title/artist at 2x glyph size
      const artTextPad = 1;     // breathing room between art bottom and title top
      const tileArtRows = (t: number) => Math.max(6, Math.round(t * 0.602));
      const tilePeriod = (t: number) => tileArtRows(t) + artTextPad + textScale * 2 + tileGap;

      const availRows = rows - extraBottomRows - L.tilesTopRow + tileGap;

      // --- Mobile: fit the tile size to BOTH axes ---
      // T above is the widest tile the columns allow. On a phone the band left
      // under the intro panel only fits one such row, stranding most of a
      // second row's worth of empty space (about a third of the viewport). So
      // walk T down and take the largest tile that fits one more slot row.
      // Desktop keeps the width-driven size: its band already divides cleanly
      // and shrinking tiles there would only crowd the now-playing box.
      if (isMobile) {
        // Floor the shrink so the grid still fills most of its width: trading a
        // full-bleed row of large tiles for an extra row of small ones stranded
        // between wide side gutters is not a win.
        const minGridCols = Math.floor(availCols * 0.72);
        const minFitT = Math.max(minT, Math.ceil((minGridCols - (n - 1) * tileGap) / n));
        const slotsAt = (t: number) => Math.floor(availRows / tilePeriod(t));
        const baseSlots = Math.max(1, slotsAt(T));
        for (let t = T - 1; t >= minFitT; t--) {
          if (slotsAt(t) > baseSlots) { T = t; break; }
        }
      }

      const artRows = tileArtRows(T);
      const tileHeight = artRows + artTextPad + textScale * 2;
      const cappedTileChars = Math.max(3, Math.floor((T - 2) / textScale));

      feedCols = n;
      feedColWidth = T;
      feedGridLeft = regionLeft + Math.max(0, Math.floor((availCols - (n * T + (n - 1) * tileGap)) / 2));

      const period = tileHeight + tileGap;
      musicSlotRows = Math.max(1, Math.floor(availRows / period));
      // Center the fixed slot grid in whatever band is left over, so any
      // remaining slack reads as symmetric padding rather than a dead band
      // hanging off the bottom.
      const leftoverRows = Math.max(0, availRows - musicSlotRows * period);
      const startRow = L.tilesTopRow + Math.floor(leftoverRows / 2);
      feedStartRow = startRow;
      feedCardHeight = tileHeight;
      feedCardGap = tileGap;

      feedCards = items.map((item, i) => {
        const colIdx = i % n;
        const rowBlock = Math.floor(i / n);
        const left = feedGridLeft + colIdx * (T + tileGap);
        const right = left + T - 1;
        const baseTop = startRow + rowBlock * period;
        const artistStr = (item.artist ?? '').toUpperCase();
        return {
          baseTop,
          baseBottom: baseTop + tileHeight - 1,
          left,
          right,
          iconCol: 0,
          textCol: 0,
          catRow: 0,
          nameRow: baseTop,
          descRow: baseTop,
          catStr: '',
          // Full title, uncapped — the tile renderer marquees names longer
          // than the tile width instead of truncating them.
          nameStr: item.text.toUpperCase(),
          descStr: '',
          iconStr: '',
          url: item.url,
          textScale,
          artRows,
          titleRow: baseTop + artRows + artTextPad,
          artistRow: baseTop + artRows + artTextPad + textScale,
          tileArt: item.hasArt ?? false,
          artistStr: artistStr.length > cappedTileChars ? artistStr.slice(0, cappedTileChars - 1) + '…' : artistStr,
        };
      });

      const numRowBlocks = Math.ceil(items.length / n);
      feedMaxScroll = Math.max(0, (numRowBlocks - musicSlotRows) * period);
    }

    const isMobile = window.innerWidth < 768;
    const frameBudget = isMobile ? 60 : 0; // Desktop: uncapped. Mobile: ~16fps
    const terrainFn = warpedTerrain;

    function resize() {
      if (!canvas) return;
      canvasDpr = window.devicePixelRatio;
      canvas.width = window.innerWidth * canvasDpr;
      canvas.height = window.innerHeight * canvasDpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      fontSize = terrainFontSize(window.innerWidth) * canvasDpr;
      charW = fontSize * 0.602;
      charH = fontSize * 1.0;
      cols = Math.ceil(canvas.width / charW);
      rows = Math.ceil(canvas.height / charH);
      buildMasks(canvas.width, canvas.height);

      const size = cols * rows;

      // Pre-allocate frame buffers
      gridChars = new Uint8Array(size);
      gridColors = new Uint8Array(size);
      gridSkip = new Uint8Array(size);
      gridBg = new Uint8Array(size);

      // Bake mask lookups to grid resolution (avoids per-pixel checks in draw)
      nameMaskGrid = new Uint8Array(size);
      wLogoMaskGrid = new Uint8Array(size);
      menuMaskGrid = new Uint8Array(size);
      const nameMask = nameMaskRef.current;
      const wMask = wLogoMaskRef.current;
      const menuMask = menuMaskRef.current;

      if (nameMask) bakeMaskGrid(nameMaskGrid, nameMask);
      if (wMask) bakeMaskGrid(wLogoMaskGrid, wMask);
      if (menuMask) bakeMaskGrid(menuMaskGrid, menuMask);

      buildMenuOverlayMask();
      buildContactHeadingMask();
      buildFeedHeadingMask();

      // Force card/tile layouts to rebuild against the new geometry (column
      // count, tile region, heading rows are all width-dependent).
      lastFeedItemsKey = '';
      lastContentLabel = null;
    }

    let lastDrawTime = 0;
    // Initialize contentProgress only on first mount; persist across effect re-runs
    if (contentProgressRef.current < 0) {
      contentProgressRef.current = contentOpenRef?.current ? 1 : 0;
    }
    // Use refs so intro state survives effect re-runs (e.g. navigation)
    // Animation only plays on first page load, then stays complete
    let maskOpacity = 1;
    let maskOpacityTarget = 1;
    let pendingMaskRebuild = false;

    function draw(ts: number) {
      if (!canvas) return;
      if (frameBudget > 0 && ts - lastDrawTime < frameBudget) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }
      lastDrawTime = ts;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const t = ts / speedDivisor;

      // --- Intro animation (terrain first, then name + logo scatter in) ---
      if (introStartRef.current < 0) introStartRef.current = skipIntro ? ts - 10000 : ts;
      const introElapsed = ts - introStartRef.current;
      const introProgress = Math.max(0, Math.min(1, (introElapsed - 400) / 1800));
      const logoMenuIntro = Math.max(0, Math.min(1, (introElapsed - 800) / 1000));
      logoMenuIntroProgressRef.current = logoMenuIntro;

      // Smooth lerp scroll toward route-driven target
      const scrollTarget = scrollTargetRef?.current ?? 0;
      const scrollCurrent = scrollProgressRef.current ?? 0;
      const scrollDiff = scrollTarget - scrollCurrent;
      scrollProgressRef.current = Math.abs(scrollDiff) < 0.001
        ? scrollTarget
        : scrollCurrent + scrollDiff * 0.045;
      const scroll = scrollProgressRef.current;

      // --- Name dissolve (scroll 0→0.7) --- computed earlier than its old
      // position (just before the per-cell loop) so the overlay crossfade
      // below can read the name's actual current visibility the moment a
      // "name" leg starts — see xfadeFromNameFrac.
      const nameFade = Math.max(0, Math.min(1, scroll / 0.7));

      // --- Full-screen "+" menu / canvas-native contact mode: raw open
      // flags. These gate a few things that aren't part of the crossfade
      // itself (hover detection, mask rebuilds, hit-test branch selection);
      // the visible transition is driven by the layer state machine right
      // below, which reacts to these same two booleans.
      const menuOpenNow = !!menuOpenRef?.current;
      const contactOpenNow = !!contactOpenRef?.current;
      if (menuOpenNow && menuOverlayGrid.length !== cols * rows) buildMenuOverlayMask();

      // --- Overlay crossfade: detect a layer change and (re)start the
      // shared crossfade. Menu wins over contact if both refs are somehow
      // open at once (contact is preserved, unrendered, underneath until
      // the menu closes — same convention as before). Reopening
      // mid-transition (rapid +/+/+ toggling) restarts the crossfade fresh
      // from whatever was frontmost a moment ago rather than blending two
      // in-flight animations — the same hard cancel-and-restart the
      // original close-to-landing anim used on a mid-close reopen, now
      // shared by every pair of layers.
      const requestedLayer: OverlayLayer = menuOpenNow ? 'menu' : contactOpenNow ? 'contact' : 'name';
      if (requestedLayer !== currentLayer) {
        xfadeMenuOverContent = false;
        if (requestedLayer === 'name') {
          // Closing back to landing — animate only if Home set the
          // "animated close" flag for the layer we're leaving (W/+ do;
          // Esc doesn't, so Esc-closes stay an instant restore, unchanged).
          // A menu entry that navigates to a content page (portfolio/music)
          // instead sets menuCloseToContentRef: same dissolve animation, but
          // flagged so the words fade over the incoming page rather than
          // covering it (consumed once here).
          const animate = currentLayer === 'menu' ? !!menuCloseToHomeRef?.current : !!contactCloseToHomeRef?.current;
          const toContent = currentLayer === 'menu' && !!menuCloseToContentRef?.current;
          if (menuCloseToContentRef?.current) menuCloseToContentRef.current = false;
          if (animate || toContent) {
            xfadeFrom = currentLayer;
            xfadeTo = 'name';
            xfadeStart = ts;
            xfadeMenuOverContent = toContent;
          } else {
            xfadeFrom = null;
            xfadeTo = null;
            xfadeStart = -1;
          }
        } else {
          // Opening, or switching directly between menu and contact —
          // always an animated crossfade.
          xfadeFrom = currentLayer;
          xfadeTo = requestedLayer;
          xfadeStart = ts;
          // Opening the menu over the live feed page (canvas-drawn cards):
          // render the scattering words over the page while it dissolves
          // out beneath them (mirror of the close-to-content leg). Only the
          // feed qualifies — music's full-black background and the melted-
          // black canvas under DOM detail pages both give the cutout words
          // nothing to read against, so those keep the instant takeover
          // (bright menu terrain from frame one) instead of a black gap.
          if (requestedLayer === 'menu' && !!contentOpenRef?.current && !musicUIRef?.current &&
              feedCards.length > 0) {
            xfadeMenuOverContent = true;
          }
        }
        // Snapshot the name layer's actual current visibility fraction (0
        // when e.g. we're opening the menu from a content page and the name
        // isn't shown at all) so a name-dissolve leg starts from what's
        // really on screen instead of always assuming it was fully visible.
        if (xfadeFrom === 'name') xfadeFromNameFrac = Math.max(0, Math.min(1, introProgress - nameFade));
        // Same snapshot for the incoming side: a leg landing on 'name' rides
        // in toward the name's actual resting visibility (0 on content pages,
        // where scroll keeps the name dissolved) instead of always toward 1.
        if (xfadeTo === 'name') xfadeToNameFrac = Math.max(0, Math.min(1, introProgress - nameFade));
        currentLayer = requestedLayer;
      }

      let xfadeP = 0;
      if (xfadeFrom !== null) {
        xfadeP = Math.max(0, Math.min(1, (ts - xfadeStart) / XFADE_MS));
        if (xfadeP >= 1) {
          xfadeFrom = null;
          xfadeTo = null;
          xfadeStart = -1;
        }
      }
      // reveal: 0 (hidden) -> 1 (fully shown) for a given layer this frame —
      // the incoming layer of an active crossfade rides xfadeP up, the
      // outgoing layer rides it down (name's outgoing leg scales from its
      // actual starting visibility instead of assuming 1 — see above),
      // everyone else is simply fully on or fully off.
      const revealOf = (layer: OverlayLayer): number => {
        if (xfadeFrom !== null) {
          if (layer === xfadeTo) return layer === 'name' ? xfadeToNameFrac * xfadeP : xfadeP;
          if (layer === xfadeFrom) return layer === 'name' ? xfadeFromNameFrac * (1 - xfadeP) : 1 - xfadeP;
        }
        return layer === currentLayer ? 1 : 0;
      };
      const menuReveal = revealOf('menu');
      const contactReveal = revealOf('contact');
      // The name mask keeps its own resting-state rule (intro scatter-in /
      // scroll dissolve, computed above) and only yields to the crossfade
      // while 'name' is actually one leg of an active transition.
      const nameXfadeActive = xfadeFrom === 'name' || xfadeTo === 'name';
      const nameXfadeReveal = nameXfadeActive ? revealOf('name') : 0;

      const menuVisible = menuReveal > 0;
      const contactVisible = contactReveal > 0;
      // Entries/fields only register clicks once their layer's crossfade is
      // mostly (or fully) done — the W/+ toggle itself stays clickable
      // throughout so a transition can always be cancelled/reversed.
      menuInteractive = currentLayer === 'menu' && (xfadeFrom === null || xfadeP > 0.5);
      contactInteractive = currentLayer === 'contact' && (xfadeFrom === null || xfadeP > 0.5);

      // Combined "something full-screen is covering the page" flag — gates
      // every piece of underlying-page rendering (feed/tiles/np box/search
      // row/content masks/full-black music mode/terrain melt) for the whole
      // transition, in either direction. A menu→content close is the
      // exception: the dissolving words render over the page WITHOUT
      // suppressing it, so the page fades in beneath them.
      // Over-content legs only stay transparent while the crossfade runs: an
      // open-over-content leg must become a real overlay once the menu is at
      // rest (the page has fully dissolved out by then — see the
      // contentTitleFade scaling below), while a close leg ends with the menu
      // gone anyway so the live-window distinction is free there.
      const menuOverContentLive = xfadeMenuOverContent && xfadeFrom !== null;
      const overlayVisual = (menuVisible && !menuOverContentLive) || contactVisible;

      // --- Content open animation ---
      let contentProgress = contentProgressRef.current;
      const contentTarget = contentOpenRef?.current ? 1 : 0;
      const contentLerp = contentTarget === 0 ? 0.033 : feedToDetailMelt ? 0.055 : 0.104;
      contentProgress += (contentTarget - contentProgress) * contentLerp;
      if (Math.abs(contentProgress - contentTarget) < 0.001) contentProgress = contentTarget;
      if (feedToDetailMelt && contentProgress >= 1) feedToDetailMelt = false;
      contentProgressRef.current = contentProgress;

      // Detail → feed: start reverse melt and feed content simultaneously
      if (detailToFeedRef?.current) {
        detailToFeedRef.current = false;
        detailToFeedMelt = true;
        d2fMeltProgress = 0;
        d2fContentReset = true;
        contentProgress = 0;
        contentProgressRef.current = 0;
      }

      // --- Feed cards: rebuild on item change ---
      const feedItems = contentSubItemsRef?.current ?? [];
      if (feedItems !== lastItemsArrForKeys) {
        lastItemsArrForKeys = feedItems;
        cachedFeedItemsKey = feedItems.map(f => `${f.text}:${f.icon}`).join('|');
        cachedSubItemsKey = feedItems.map(s => `${s.text}:${s.description || ''}:${s.mau || ''}`).join('|');
      }
      const feedItemsKey = cachedFeedItemsKey;
      if (feedItemsKey !== lastFeedItemsKey) {
        const hadFeedCards = feedCards.length > 0;
        lastFeedItemsKey = feedItemsKey;
        setupFeedCards(
          feedItems,
          musicUIRef?.current ? (isMobile ? NP_BOTTOM_RESERVE_STACKED : NP_BOTTOM_RESERVE) : 0,
        );
        feedScrollTarget = 0;
        feedScrollOffset = 0;
        // Feed → detail: restart melt animation so terrain transitions to black
        if (hadFeedCards && feedCards.length === 0 && contentTarget === 1) {
          contentProgress = 0;
          contentProgressRef.current = 0;
          feedToDetailMelt = true;
        }
        // Detail → feed (old path): only when NOT using reverse melt
        if (!hadFeedCards && feedCards.length > 0 && contentProgress > 0.3 && !detailToFeedMelt) {
          contentProgress = 0;
          contentProgressRef.current = 0;
          detailToFeedBrightness = 0;
        }
      }
      // Reset scroll when feed closes
      if (feedCards.length > 0 && contentTarget === 0 && contentProgress < 0.1) {
        feedScrollTarget = 0;
        feedScrollOffset = 0;
      }

      // Reverse melt progress (detail → feed) — slower so cover accumulation is visible
      if (detailToFeedMelt) {
        d2fMeltProgress += (1 - d2fMeltProgress) * 0.035;
        if (d2fMeltProgress > 0.999) d2fMeltProgress = 1;

      }

      // Update melt complete AFTER feed cards section (contentProgress may have been reset above)
      if (meltCompleteRef) meltCompleteRef.current = contentProgress >= 1;
      if (meltProgressRef) meltProgressRef.current = detailToFeedMelt ? d2fMeltProgress : contentProgress;

      // Complete reverse melt AFTER setting meltProgressRef (overlay sees progress=1 for one frame)
      if (detailToFeedMelt && d2fMeltProgress >= 1) {
        detailToFeedMelt = false;
        d2fMeltProgress = 0;
        if (!d2fContentReset) {
          contentProgress = 0;
          contentProgressRef.current = 0;
        }
        d2fContentReset = false;
      }

      // Detail→feed brightness fade (lerp from dark to full brightness)
      if (detailToFeedBrightness >= 0 && detailToFeedBrightness < 1) {
        detailToFeedBrightness += (1 - detailToFeedBrightness) * 0.04;
        if (detailToFeedBrightness > 0.999) detailToFeedBrightness = -1;
      }

      // Music mode + fully open (post-melt) → the whole viewport goes black except
      // the W/+ logo, no-art placeholder tiles, and the search/np chrome. Gated on
      // contentProgress >= 1 so the melt animation in/out of /music still shows
      // terrain (prior behavior) while transitioning.
      const isMusicMode = !!musicUIRef?.current;
      // Suppressed while the menu/contact overlay is showing — the frame
      // renders as plain full-brightness terrain regardless of the page
      // beneath (overlayVisual).
      // Ease toward black instead of snapping: musicFullBlack (terrain fully
      // suppressed) only engages once the veil below has finished fading in.
      // Starts the moment music mode engages — waiting for the melt to fully
      // settle (contentProgress >= 1) left seconds of idle terrain before the
      // dissolve began.
      const musicBlackTarget = isMusicMode && !overlayVisual ? 1 : 0;
      musicBlackness += (musicBlackTarget - musicBlackness) * 0.09;
      if (Math.abs(musicBlackTarget - musicBlackness) < 0.001) musicBlackness = musicBlackTarget;
      const musicFullBlack = musicBlackness >= 0.999;
      // Pinned header band (W logo / + / top 100px): feed cards, music tiles,
      // and the intro block all scroll UNDER this boundary, never over it.
      // On the generic feed the boundary extends to below the pinned
      // PORTFOLIO heading so scrolled cards slide under the title too.
      const pinnedHeaderRows = Math.ceil(100 * canvasDpr / charH);
      const feedContentTopRow = isMusicMode
        ? pinnedHeaderRows
        : Math.max(pinnedHeaderRows, feedHeadingBottomRow - 1);

      // --- Color LUT (reuse array, just overwrite values) ---
      const colorFn = getDuotoneColor;
      const bgSample = colorFn(0, t);
      const bgR = Math.floor(bgSample.bgR);
      const bgG = Math.floor(bgSample.bgG);
      const bgB = Math.floor(bgSample.bgB);

      // Scale character colors: dim during feed→home close, or during detail→feed brightness fade
      const feedActive = feedCards.length > 0 || wasFeedMode;
      const isClosing = contentTarget === 0 && contentProgress > 0;
      // During reverse melt: main canvas at FULL brightness — it's hidden behind the
      // overlay's opaque bg anyway, and needs to match the cover canvas when cover dissolves.
      const brightnessScale = overlayVisual
        ? 1
        : detailToFeedMelt
          ? 1
          : (detailToFeedBrightness >= 0 ? detailToFeedBrightness : 1);
      const colorScale = overlayVisual ? 1 : ((isClosing && !feedActive) ? (1 - contentProgress) : brightnessScale);

      for (let i = 0; i < COLOR_LEVELS; i++) {
        const val = i / (COLOR_LEVELS - 1);
        const col = colorFn(val, t);
        const dim = 0.22 + val * 1.28;
        const rawR = Math.min(255, Math.max(bgR + 10, Math.floor(col.r * dim)));
        const rawG = Math.min(255, Math.max(bgG + 10, Math.floor(col.g * dim)));
        const rawB = Math.min(255, Math.max(bgB + 10, Math.floor(col.b * dim)));
        const mr = Math.round(rawR * colorScale);
        const mg = Math.round(rawG * colorScale);
        const mb = Math.round(rawB * colorScale);
        colorLUT[i] = `rgb(${mr},${mg},${mb})`;
      }
      colorLUT[COLOR_LEVELS] = '#fff'; // white override for hover

      // --- Clear ---
      // Background lerps to black in step with the cell dissolve (matches the
      // forward melt's bg fade); at musicBlackness 1 this is pure black.
      const clearBgR = Math.round(bgR * brightnessScale * (1 - musicBlackness));
      const clearBgG = Math.round(bgG * brightnessScale * (1 - musicBlackness));
      const clearBgB = Math.round(bgB * brightnessScale * (1 - musicBlackness));
      ctx.fillStyle = `rgb(${clearBgR},${clearBgG},${clearBgB})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Content titles scatter in (0.4→1.0)
      let contentTitleFade = Math.max(0, Math.min(1, (contentProgress - 0.4) / 0.6));
      // Menu opening over content: hash-dissolve the page out as the words
      // scatter in, so the page hits zero exactly when the crossfade ends and
      // overlayVisual takes over the suppression.
      if (xfadeMenuOverContent && xfadeTo === 'menu') contentTitleFade *= 1 - menuReveal;
      const currentLabel = activeLabelRef?.current ?? null;
      const subItemsKey = cachedSubItemsKey;
      const detail = config.detailRef?.current;
      const detailKey = detail ? `${detail.name}|${detail.mau}` : '';
      if (currentLabel !== lastContentLabel || subItemsKey !== lastSubItemsKey || detailKey !== lastDetailKey) {
        if (lastContentLabel !== null && contentTitleFade > 0.5 && currentLabel !== null) {
          maskOpacityTarget = 0;
          pendingMaskRebuild = true;
        } else {
          lastContentLabel = currentLabel;
          lastSubItemsKey = subItemsKey;
          lastDetailKey = detailKey;
          if (currentLabel) buildContentTitleMask(currentLabel);
        }
      }

      // Lerp maskOpacity toward target
      maskOpacity += (maskOpacityTarget - maskOpacity) * 0.08;
      if (Math.abs(maskOpacity - maskOpacityTarget) < 0.01) maskOpacity = maskOpacityTarget;

      // When fade-out completes, rebuild mask and fade back in
      if (pendingMaskRebuild && maskOpacity < 0.02) {
        lastContentLabel = currentLabel;
        lastSubItemsKey = subItemsKey;
        lastDetailKey = detailKey;
        if (currentLabel) buildContentTitleMask(currentLabel);
        maskOpacityTarget = 1;
        pendingMaskRebuild = false;
      }

      // --- Now-playing mask: rebuild on track change, playing state change, or mode change ---
      const np = nowPlayingRef?.current;
      const npTrack = np?.track ?? '';
      const npKey = `${npTrack}|${np?.isPlaying}|${isMusicMode}`;
      if (npKey !== lastNowPlayingTrack) {
        lastNowPlayingTrack = npKey;
        if (np && np.track) {
          setupNowPlaying(np.track, np.artist, np.isPlaying, np.playedAt, isMusicMode ? ['NOW PLAYING', 'PAUSED'] : undefined);
        } else {
          npBoxTop = Infinity;
        }
      }
      // Persistent across pages: fully visible under the menu/contact
      // overlays and on the music feed; on the home page it fades out as
      // contentProgress increases. Hidden only on portfolio pages (the
      // generic feed and detail pages — feedCards>0 / contentProgress→1)
      // and during the melt transitions.
      const npVisible = (np?.track && !feedToDetailMelt && !detailToFeedMelt)
        ? (overlayVisual || isMusicMode
            ? 1
            : feedCards.length === 0 ? Math.max(0, 1 - contentProgress * 3) : 0)
        : 0;
      const npIntro = Math.max(0, Math.min(1, (introElapsed - 1800) / 1200));

      // Re-entry scatter: when now-playing becomes visible again after initial intro, animate scatter-in
      const npNowVisible = npVisible > 0;
      if (npNowVisible && !npWasVisible && npIntro >= 1) {
        npReentryStart = ts;
        npReentryScatter = 0;
      }
      if (!npNowVisible) {
        npReentryScatter = 1;
        npReentryStart = -1;
      }
      npWasVisible = npNowVisible;
      if (npReentryStart >= 0) {
        npReentryScatter = Math.max(0, Math.min(1, (ts - npReentryStart) / 1200));
        if (npReentryScatter >= 1) npReentryStart = -1;
      }
      const npScatter = Math.min(npIntro, npReentryScatter);

      // --- Hovered label / W logo detection ---
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const wb = wLogoBoundsRef.current;
      const wHovered = !isMobile && mx >= wb.x && mx < wb.x + wb.w && my >= wb.y && my < wb.y + wb.h;
      const mb = menuBoundsRef.current;
      const menuHovered = !isMobile && mx >= mb.x && mx < mb.x + mb.w && my >= mb.y && my < mb.y + mb.h;

      // --- Full-screen menu entry hover detection (word cutouts). Hover
      // highlights the entry's cells with a white bg, same convention as
      // sub-item / logo hover elsewhere. ---
      const menuEntryBoundsList = menuEntryBoundsRef.current;
      let menuEntryHoverIdx = -1;
      if (menuOpenNow) {
        for (let i = 0; i < menuEntryBoundsList.length; i++) {
          const b = menuEntryBoundsList[i];
          if (mx >= b.x && mx < b.x + b.w && my >= b.y && my < b.y + b.h) { menuEntryHoverIdx = i; break; }
        }
      }

      // --- Sub-item hover detection ---
      let hoveredSubItem = -1;
      const subBounds = subItemBoundsRef.current;
      for (let i = 0; i < subBounds.length; i++) {
        const b = subBounds[i];
        if (mx >= b.x && mx < b.x + b.w && my >= b.y && my < b.y + b.h) {
          hoveredSubItem = i;
          break;
        }
      }

      // --- Compute terrain grid (reuse pre-allocated buffers) ---
      gridSkip.fill(0);
      gridBg.fill(0);

      const rampLen = RAMP.length;

      // --- Smooth lerp feed scroll ---
      const feedScrollDiff = feedScrollTarget - feedScrollOffset;
      feedScrollOffset = Math.abs(feedScrollDiff) < 0.01 ? feedScrollTarget : feedScrollOffset + feedScrollDiff * 0.08;

      // Music mode: the DRAWN offset snaps to whole row-periods, so tiles
      // always occupy the same screen slots and scrolling swaps which tracks
      // fill them (row-block at a time) instead of sliding the tiles.
      const musicPeriod = feedCardHeight + feedCardGap;
      const musicSnapBlock = isMusicMode && musicPeriod > 0
        ? Math.max(0, Math.round(feedScrollOffset / musicPeriod))
        : 0;
      const drawScroll = isMusicMode && musicPeriod > 0 ? musicSnapBlock * musicPeriod : feedScrollOffset;

      // --- Visible feedCards index range ---
      // Cards/tiles sit on a uniform row-block grid: row-block period is
      // feedCardHeight + feedCardGap, origin feedStartRow, feedCols cards per
      // row-block (fi = rowBlock * feedCols + colIdx — see setupFeedCards /
      // setupMusicTiles). That makes "which cards are on-screen" arithmetic
      // instead of a per-card scan: screenTop(rowBlock) = feedStartRow +
      // rowBlock*period - feedScrollOffset, visible when screenBottom >= 0 &&
      // screenTop < rows. Solve for the rowBlock bounds and widen by one
      // row-block on each side as slack for the per-card Math.round() used
      // downstream. The three per-frame loops over feedCards (art pre-pass,
      // card/tile render, hit-bounds) below all iterate only
      // [feedVisStart, feedVisEnd) instead of the full catalog-sized array.
      let feedVisStart = 0;
      let feedVisEnd = feedCards.length;
      if (feedCards.length > 0) {
        const rowPeriod = feedCardHeight + feedCardGap;
        if (isMusicMode && rowPeriod > 0 && feedCols > 0) {
          // Fixed slots: exactly musicSlotRows row-blocks starting at the
          // snapped scroll block are on screen — nothing partial.
          feedVisStart = Math.max(0, Math.min(feedCards.length, musicSnapBlock * feedCols));
          feedVisEnd = Math.max(feedVisStart, Math.min(feedCards.length, (musicSnapBlock + musicSlotRows) * feedCols));
        } else if (rowPeriod > 0 && feedCols > 0) {
          const firstBlock = Math.floor((feedScrollOffset - feedStartRow - feedCardHeight + 1) / rowPeriod) - 1;
          const lastBlock = Math.ceil((feedScrollOffset - feedStartRow + rows) / rowPeriod) + 1;
          feedVisStart = Math.max(0, Math.min(feedCards.length, firstBlock * feedCols));
          feedVisEnd = Math.max(feedVisStart, Math.min(feedCards.length, (lastBlock + 1) * feedCols));
        }
      }

      // --- Music tile art: refresh the "loaded image ready" flag for on-screen
      // tiles only, bounded to [feedVisStart, feedVisEnd) derived above — never
      // O(catalog). getArt() is a cache lookup that also kicks off a lazy load
      // on miss; tiles with has_art=false never call it, so a not-yet-refreshed
      // catalog (has_art missing → false) never spams the art endpoint. ---
      if (!menuOpenNow && isMusicMode && feedCards.length > 0) {
        if (tileArtLoaded.length !== feedCards.length) tileArtLoaded = new Uint8Array(feedCards.length);
        for (let fi = feedVisStart; fi < feedVisEnd; fi++) {
          const fc = feedCards[fi];
          const screenTop = Math.round(fc.baseTop - drawScroll);
          const screenBottom = Math.round(fc.baseBottom - drawScroll);
          if (screenBottom < 0 || screenTop >= rows) continue; // off-screen: leave stale, unused this frame
          if (!fc.tileArt) { tileArtLoaded[fi] = 0; continue; }
          const trackId = fc.url.startsWith('music:') ? fc.url.slice(6) : '';
          tileArtLoaded[fi] = trackId && getArt(trackId) ? 1 : 0;
        }
      }

      for (let r = 0; r < rows; r++) {
        const py = r * charH;
        const rowOffset = r * cols;
        for (let c = 0; c < cols; c++) {
          const idx = rowOffset + c;

          // Compute terrain for every cell
          const nx = c * NOISE_SCALE;
          const ny = r * NOISE_SCALE;
          let elev = terrainFn(nx, ny, t);
          let val = (elev + 0.5) / 1.8;
          val = Math.max(0, Math.min(1, val));
          val = scurve(val, contrast);
          gridChars[idx] = Math.max(0, Math.min(rampLen - 1, (val * (rampLen - 1)) | 0));
          gridColors[idx] = Math.min(COLOR_LEVELS - 1, (val * COLOR_LEVELS) | 0);

          // Full-black music mode: cells scatter-dissolve to black as
          // musicBlackness ramps (same hash pattern as the detail-page
          // forward melt), landing on every cell suppressed; W/+ and tile
          // placeholder squares punch holes back through below.
          if (musicBlackness > 0) {
            let hb = (c * 271828183 + r * 314159265) | 0;
            hb = ((hb ^ (hb >>> 13)) * 1274126177) | 0;
            const bHash = ((hb ^ (hb >>> 16)) & 0x7fff) / 0x7fff;
            if (musicBlackness >= bHash) gridSkip[idx] = 1;
          }

          // W logo — scatter-reveal on intro, highlight on hover. In full-black
          // music mode the contrast trick inverts: normally the letter is a flat
          // cutout against textured terrain, but with no terrain elsewhere to
          // contrast against, the letter instead punches terrain THROUGH the
          // black (same "reveal via terrain" trick as the detail-page melt).
          if (wLogoMaskGrid[idx]) {
            let h3 = (c * 123456789 + r * 987654321) | 0;
            h3 = ((h3 ^ (h3 >>> 13)) * 1274126177) | 0;
            const logoHash = ((h3 ^ (h3 >>> 16)) & 0x7fff) / 0x7fff;
            if (logoMenuIntro > logoHash) {
              if (wHovered) {
                gridBg[idx] = 1;
              }
              gridSkip[idx] = musicFullBlack ? 0 : 1;
            }
          }

          // Menu (+) icon — same scatter-reveal / hover / full-black inversion as the W logo.
          if (menuMaskGrid[idx]) {
            let h4 = (c * 987654321 + r * 123456789) | 0;
            h4 = ((h4 ^ (h4 >>> 13)) * 1274126177) | 0;
            const menuHash = ((h4 ^ (h4 >>> 16)) & 0x7fff) / 0x7fff;
            if (logoMenuIntro > menuHash) {
              if (menuHovered) {
                gridBg[idx] = 1;
              }
              gridSkip[idx] = musicFullBlack ? 0 : 1;
            }
          }

          // Name mask — scatter-reveal on intro, scatter-dissolve on scroll,
          // at rest (currentLayer === 'name'). While 'name' is one leg of an
          // active overlay crossfade (opening the menu from landing, or
          // closing the menu/contact back to landing), it instead scatters
          // via nameXfadeReveal — same hash pattern, different driver — so
          // it dissolves out/reveals in lockstep with whichever layer it's
          // trading places with instead of popping.
          if (nameMaskGrid[idx]) {
            let h = (c * 374761393 + r * 668265263) | 0;
            h = ((h ^ (h >>> 13)) * 1274126177) | 0;
            const hash = ((h ^ (h >>> 16)) & 0x7fff) / 0x7fff;
            if (nameXfadeActive) {
              if (nameXfadeReveal > hash) gridSkip[idx] = 1;
            } else if (currentLayer === 'name') {
              if (introProgress > hash && hash > nameFade) gridSkip[idx] = 1;
            }
          }

          // Full-screen menu overlay — cutout silhouette, same technique as
          // the name mask above: masked cells suppress terrain (negative
          // space against the surrounding full-brightness field). menuReveal
          // already encodes direction (scattering in when menu is the
          // crossfade's incoming layer, dissolving away when it's outgoing,
          // full/zero at rest) so a single comparison covers every case.
          // Hover highlights the entry with a white cell bg.
          if (menuVisible && menuOverlayGrid[idx]) {
            let hm = ((c + 41) * 374761393 + (r + 59) * 668265263) | 0;
            hm = ((hm ^ (hm >>> 13)) * 1274126177) | 0;
            const hashM = ((hm ^ (hm >>> 16)) & 0x7fff) / 0x7fff;
            if (menuReveal > hashM) {
              gridSkip[idx] = 1;
              if (menuEntryHoverIdx >= 0) {
                const hb = menuEntryBoundsList[menuEntryHoverIdx];
                const cellPx = c * charW;
                if (cellPx >= hb.x && cellPx < hb.x + hb.w && py >= hb.y && py < hb.y + hb.h) {
                  gridBg[idx] = 1;
                }
              }
            }
          }

          // Canvas-native contact mode heading ("CONTACT") — same cutout
          // technique as the menu overlay above (contactReveal likewise
          // direction-aware), no hover (it's not clickable, just a title).
          // Field rows/SEND are drawn as direct opaque strips after the
          // terrain pass (see the contact chrome block below draw()'s main
          // render), faded via globalAlpha there rather than as a mask cutout.
          if (contactVisible && contactHeadingGrid[idx]) {
            let hc = ((c + 71) * 374761393 + (r + 97) * 668265263) | 0;
            hc = ((hc ^ (hc >>> 13)) * 1274126177) | 0;
            const hashC = ((hc ^ (hc >>> 16)) & 0x7fff) / 0x7fff;
            if (contactReveal > hashC) gridSkip[idx] = 1;
          }

          // Pinned "PORTFOLIO" heading (generic feed only): cutout silhouette
          // in the exact style of the contact page's CONTACT heading, hash-
          // gated so it scatter-reveals with the cards and whites out on exit.
          if (!overlayVisual && !isMusicMode && contentTitleFade > 0 && feedCards.length > 0 && feedHeadingGrid[idx]) {
            let hh = ((c + 29) * 374761393 + (r + 53) * 668265263) | 0;
            hh = ((hh ^ (hh >>> 13)) * 1274126177) | 0;
            const headingHash = ((hh ^ (hh >>> 16)) & 0x7fff) / 0x7fff;
            if (contentTitleFade * maskOpacity >= headingHash) {
              if (contentTarget === 0 && !feedActive) gridColors[idx] = COLOR_LEVELS;
              else gridSkip[idx] = 1;
            }
          }

          // Feed card / music tile boxes: suppress terrain inside the footprint.
          // Cards/tiles sit on a uniform row-block/column grid, so the index is
          // arithmetic — O(1) per cell (2D: row-block × column). Rows above
          // feedContentTopRow are excluded so scrolled content never swallows
          // the W/+/header band (or the pinned PORTFOLIO heading on the feed).
          if (!overlayVisual && contentTitleFade > 0 && feedCards.length > 0 && r >= feedContentTopRow) {
            const scrolledR = r + drawScroll;
            const rel = scrolledR - feedStartRow;
            const period = feedCardHeight + feedCardGap;
            const rowBlock = Math.floor(rel / period);
            const colPeriod = feedColWidth + feedColGap;
            const gc = c - feedGridLeft;
            // Math.floor of a negative gc (cells left of the grid) yields -1 or lower,
            // which the colIdx < 0 check below rejects.
            const colIdx = Math.floor(gc / colPeriod);
            const inColumn = colIdx >= 0 && colIdx < feedCols && gc - colIdx * colPeriod < feedColWidth;
            // Music mode: only the musicSlotRows fixed slots exist on screen —
            // row-blocks outside [snapBlock, snapBlock + slotRows) are not drawn,
            // so a partially-scrolled next row never pokes in at the bottom.
            const inSlotWindow = !isMusicMode ||
              (rowBlock >= musicSnapBlock && rowBlock < musicSnapBlock + musicSlotRows);
            const fi = rowBlock * feedCols + colIdx;
            const fc = inColumn && inSlotWindow && rowBlock >= 0 && fi >= 0 && fi < feedCards.length ? feedCards[fi] : null;
            const relInCard = fc ? rel - rowBlock * period : -1;
            const inFooter = !!fc && relInCard >= 0 && relInCard <= feedCardHeight - 1 && c >= fc.left && c <= fc.right;

            if (inFooter && fc) {
              let hf = ((c + 7) * 374761393 + (r + 13) * 668265263) | 0;
              hf = ((hf ^ (hf >>> 13)) * 1274126177) | 0;
              const feedHash = ((hf ^ (hf >>> 16)) & 0x7fff) / 0x7fff;
              if (contentTitleFade * maskOpacity >= feedHash) {
                if (isMusicMode) {
                  // Art square (top artRows) vs the 2 text rows beneath. A square
                  // with no loaded image (missing has_art, still loading, or a
                  // text tile like RADIO) is the "living placeholder": terrain
                  // stays visible/animated instead of being suppressed. A square
                  // with a loaded image is suppressed so drawImage paints cleanly
                  // over it; text rows are always suppressed for clean glyphs.
                  const inArtSquare = relInCard < fc.artRows;
                  const isPlaceholder = !fc.tileArt || !tileArtLoaded[fi];
                  if (inArtSquare && isPlaceholder) {
                    // Punch back through the full-black baseline so terrain animates live.
                    gridSkip[idx] = 0;
                    if (hoveredSubItem === fi) gridBg[idx] = 1;
                  } else {
                    gridSkip[idx] = 1;
                    if (hoveredSubItem === fi && !inArtSquare) gridBg[idx] = 1;
                  }
                } else {
                  const isClosing = contentTarget === 0;
                  if (isClosing && !feedActive) {
                    gridColors[idx] = COLOR_LEVELS;
                  } else if (hoveredSubItem === fi) {
                    gridBg[idx] = 1;
                    gridSkip[idx] = 1;
                  } else {
                    gridSkip[idx] = 1;
                  }
                }
              }
            }

          }

          // Now-playing box: suppress terrain inside the box area. Runs AFTER the
          // feed-card block so on the music feed the np cutout wins over card
          // cells beneath it (the render-side np text/bg also draws after cards).
          if (npVisible > 0 && r >= npBoxTop && r <= npBoxBottom && c >= npBoxLeft && c <= npBoxRight) {
            let h5 = (c * 518230729 + r * 392041631) | 0;
            h5 = ((h5 ^ (h5 >>> 13)) * 1274126177) | 0;
            const npHash = ((h5 ^ (h5 >>> 16)) & 0x7fff) / 0x7fff;
            if (npScatter > npHash) {
              gridSkip[idx] = 1;
              gridBg[idx] = 0;
            }
          }

          // Content: scatter-reveal in, scatter-dissolve out (white on exit)
          if (!overlayVisual && contentTitleFade > 0 && contentTitleGrid[idx]) {
            let h2 = ((c + 17) * 374761393 + (r + 31) * 668265263) | 0;
            h2 = ((h2 ^ (h2 >>> 13)) * 1274126177) | 0;
            const hash2 = ((h2 ^ (h2 >>> 16)) & 0x7fff) / 0x7fff;
            const effectiveFade = contentTitleFade * maskOpacity;
            if (effectiveFade >= hash2) {
              const isClosing = contentTarget === 0;
              if (isClosing) {
                // Exit: render as white so dissolve is visible
                gridColors[idx] = COLOR_LEVELS;
              } else if (hoveredSubItem >= 0) {
                const hb = subBounds[hoveredSubItem];
                const cellPx = c * charW;
                if (hb && cellPx >= hb.x && cellPx < hb.x + hb.w && py >= hb.y && py < hb.y + hb.h) {
                  gridBg[idx] = 1; // white bg on hover
                }
                gridSkip[idx] = 1;
              } else {
                gridSkip[idx] = 1;
              }
            }
          }
        }
      }

      // --- Terrain melt: scatter-dissolve terrain to black, reveal masks as terrain ---
      // Skip melt when feed is showing or was just showing (prevents black flash on feed→home)
      const isFeedMode = feedCards.length > 0;
      if (isFeedMode) wasFeedMode = true;
      if (contentProgress < 0.01 || contentTarget === 1) wasFeedMode = false;
      if (!overlayVisual && contentProgress > 0 && !isFeedMode && !wasFeedMode) {
        // Fade background to black
        const inv = contentProgress;
        const invBgR = Math.round(bgR * (1 - inv));
        const invBgG = Math.round(bgG * (1 - inv));
        const invBgB = Math.round(bgB * (1 - inv));
        ctx.fillStyle = `rgb(${invBgR},${invBgG},${invBgB})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Scatter-dissolve: terrain melts away, W/+ fill with terrain to stay visible
        const totalCells = rows * cols;
        for (let i = 0; i < totalCells; i++) {
          const cr = Math.floor(i / cols);
          const cc = i % cols;
          let hd = (cc * 271828183 + cr * 314159265) | 0;
          hd = ((hd ^ (hd >>> 13)) * 1274126177) | 0;
          const dHash = ((hd ^ (hd >>> 16)) & 0x7fff) / 0x7fff;

          if (gridSkip[i] === 0) {
            // Terrain cell — dissolve to black
            if (contentProgress > dHash) gridSkip[i] = 1;
          } else if (!isClosing && (wLogoMaskGrid[i] || menuMaskGrid[i])) {
            // W/+ cells — scatter-reveal using same hash pattern as terrain dissolve
            const reveal = Math.max(0, (contentProgress - 0.15) / 0.55);
            if (reveal > dHash) {
              gridSkip[i] = 0;
              gridBg[i] = 0;
            }
          }
          // Name cutout cells: stay as empty space (no action)
        }
        // Re-apply W/+ hover highlight after melt (melt clears gridBg)
        if (wHovered || menuHovered) {
          for (let i = 0; i < totalCells; i++) {
            if (wHovered && wLogoMaskGrid[i]) {
              gridBg[i] = 1;
              gridSkip[i] = 1;
            }
            if (menuHovered && menuMaskGrid[i]) {
              gridBg[i] = 1;
              gridSkip[i] = 1;
            }
          }
        }
      }

      // --- Reverse terrain melt: terrain reforms from dark (detail→feed) ---
      if (!overlayVisual && detailToFeedMelt && d2fMeltProgress > 0) {
        const totalCells = rows * cols;
        for (let i = 0; i < totalCells; i++) {
          // W/+ cells keep their normal mask state
          if (wLogoMaskGrid[i] || menuMaskGrid[i]) continue;

          const cr = Math.floor(i / cols);
          const cc = i % cols;
          let hd = (cc * 271828183 + cr * 314159265) | 0;
          hd = ((hd ^ (hd >>> 13)) * 1274126177) | 0;
          const dHash = ((hd ^ (hd >>> 16)) & 0x7fff) / 0x7fff;

          // Reverse of forward melt: cells reform as progress increases
          // Last to dissolve (high hash) are first to reform
          if (gridSkip[i] === 0 && (1 - d2fMeltProgress) > dHash) {
            gridSkip[i] = 1; // still dissolved
          }
        }
      }

      // --- Render white backgrounds for highlighted (hovered) cells ---
      ctx.fillStyle = '#fff';
      for (let r = 0; r < rows; r++) {
        const py = r * charH;
        const rowOffset = r * cols;
        let bgRunStart = -1;
        for (let c = 0; c <= cols; c++) {
          const hasBg = c < cols && gridBg[rowOffset + c] === 1;
          if (hasBg && bgRunStart < 0) {
            bgRunStart = c;
          } else if (!hasBg && bgRunStart >= 0) {
            ctx.fillRect(bgRunStart * charW, py, (c - bgRunStart) * charW, charH);
            bgRunStart = -1;
          }
        }
      }

      // --- Render (batched by row + color runs) ---
      ctx.font = `${fontSize}px 'JetBrains Mono','Courier New',monospace`;
      ctx.textBaseline = 'top';

      for (let r = 0; r < rows; r++) {
        const py = r * charH;
        const rowOffset = r * cols;
        let runStart = -1;
        let runColor = -1;
        let runStr = '';

        for (let c = 0; c <= cols; c++) {
          const idx = rowOffset + c;
          const isEnd = c === cols;
          const isSkip = !isEnd && gridSkip[idx] === 1;
          const color = isEnd || isSkip ? -1 : gridColors[idx];

          if (color !== runColor || isEnd || isSkip) {
            if (runStr.length > 0 && runColor >= 0) {
              ctx.fillStyle = colorLUT[runColor];
              ctx.fillText(runStr, runStart * charW, py);
            }
            runStart = c;
            runColor = color;
            runStr = isEnd || isSkip ? '' : RAMP[gridChars[idx]];
          } else {
            runStr += RAMP[gridChars[idx]];
          }

          if (isSkip && !isEnd) {
            runStart = c + 1;
            runColor = -1;
            runStr = '';
          }
        }
      }

      // --- Feed card / music tile content ---
      if (!overlayVisual && contentTitleFade > 0 && feedCards.length > 0) {
        // Note: canDraw is the same helper as in the now-playing section.
        const canDraw = (r: number, c: number) => {
          if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
          return gridSkip[r * cols + c] === 1;
        };

        // Pinned header: everything that scrolls (cards, tiles, art images,
        // intro text) is clipped to below the top 100px band so the W/+ and
        // header area stay visible at any scroll position.
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, feedContentTopRow * charH, canvas.width, canvas.height - feedContentTopRow * charH);
        ctx.clip();

        if (isMusicMode) {
          // playingTrackId/playingIsPlaying are getters (Home.tsx) so this always
          // reflects the live player, never a stale render-time snapshot.
          const playingTrackId = musicUIRef?.current?.playingTrackId ?? null;
          const playingIsPlaying = musicUIRef?.current?.playingIsPlaying ?? false;

          for (let fi = feedVisStart; fi < feedVisEnd; fi++) {
            const fc = feedCards[fi];
            const screenTop = Math.round(fc.baseTop - drawScroll);
            const screenBottom = Math.round(fc.baseBottom - drawScroll);
            if (screenBottom < 0 || screenTop >= rows) continue; // cull off-screen tiles

            const tileWidth = fc.right - fc.left + 1;
            const trackId = fc.url.startsWith('music:') ? fc.url.slice(6) : '';

            // --- Art image: drawn AFTER the char pass, covering the terrain
            // underneath (that terrain was already suppressed above whenever
            // tileArtLoaded said an image was ready for this tile). ---
            if (fc.tileArt) {
              const img = getArt(trackId);
              if (img) {
                ctx.drawImage(img, fc.left * charW, screenTop * charH, tileWidth * charW, fc.artRows * charH);
              }
            }

            // Title/artist render at fc.textScale (2x): each char spans
            // textScale grid cols, each line textScale grid rows.
            const ts3 = fc.textScale;
            ctx.font = `${fontSize * ts3}px 'JetBrains Mono','Courier New',monospace`;
            ctx.textBaseline = 'top';

            // --- Title (full brightness). Names wider than the tile marquee:
            // pause, crawl to the end, pause, snap back — driven by ts, and
            // computed only for on-screen tiles so hidden tracks never animate. ---
            const visChars = Math.max(3, Math.floor((tileWidth - 2) / ts3));
            let title = fc.nameStr;
            let titleStartCol: number;
            if (title.length > visChars) {
              // Timed rather than counted in steps: holding for a fixed number
              // of steps means a long title spends nearly all its cycle
              // mid-scroll, and a grid of tiles doing that reads as churn
              // instead of as a list of names. Fixed hold durations plus a
              // brisk crawl keep every tile parked on its opening characters
              // for most of the loop no matter how long the title is.
              const HOLD_START_MS = 3200;
              const HOLD_END_MS = 1400;
              const STEP_MS = 220;
              const over = title.length - visChars;
              const crawlMs = over * STEP_MS;
              const t = ts % (HOLD_START_MS + crawlMs + HOLD_END_MS);
              const shift = t < HOLD_START_MS
                ? 0
                : t < HOLD_START_MS + crawlMs
                  ? Math.min(over, Math.floor((t - HOLD_START_MS) / STEP_MS))
                  : over;
              title = title.slice(shift, shift + visChars);
              titleStartCol = fc.left + 1;
            } else {
              titleStartCol = fc.left + Math.max(0, Math.floor((tileWidth - title.length * ts3) / 2));
            }
            const titleScreenRow = Math.round(fc.titleRow - drawScroll);
            for (let i = 0; i < title.length; i++) {
              const c = titleStartCol + i * ts3;
              if (!canDraw(titleScreenRow, c)) continue;
              const idx = titleScreenRow * cols + c;
              ctx.fillStyle = colorLUT[gridColors[idx]];
              ctx.fillText(title[i], c * charW, titleScreenRow * charH);
            }

            // --- Artist (centered, dim) ---
            if (fc.artistStr) {
              const artistScreenRow = Math.round(fc.artistRow - drawScroll);
              const artistStartCol = fc.left + Math.max(0, Math.floor((tileWidth - fc.artistStr.length * ts3) / 2));
              for (let i = 0; i < fc.artistStr.length; i++) {
                const c = artistStartCol + i * ts3;
                if (!canDraw(artistScreenRow, c)) continue;
                const idx = artistScreenRow * cols + c;
                const colorIdx = Math.max(0, Math.min(COLOR_LEVELS - 1, (gridColors[idx] * 0.4) | 0));
                ctx.fillStyle = colorLUT[colorIdx];
                ctx.fillText(fc.artistStr[i], c * charW, artistScreenRow * charH);
              }
            }

            // --- Playing marker: 3 equalizer bars over the art square's
            // bottom-left corner (replaces the old list-card icon override —
            // tiles have no icon row). Drawn in white for contrast against
            // both album art and the terrain placeholder. ---
            const isPlayingTile = !!trackId && playingTrackId != null && trackId === playingTrackId;
            if (isPlayingTile) {
              // Bars stay at base glyph size (the 2x font above is for text only);
              // the next tile iteration resets the font anyway.
              ctx.font = `${fontSize}px 'JetBrains Mono','Courier New',monospace`;
              const barChars = '░▒▓█';
              const barRow = screenTop + fc.artRows - 1;
              if (barRow >= 0 && barRow < rows) {
                for (let b = 0; b < 3; b++) {
                  const c = fc.left + b;
                  if (c > fc.right) break;
                  let charIdx = 0;
                  if (playingIsPlaying) {
                    const p1 = Math.sin(ts * 0.005 + b * 1.7);
                    const p2 = Math.sin(ts * 0.0083 + b * 2.9 + 0.5);
                    const p3 = Math.sin(ts * 0.013 + b * 0.7 + barRow * 3.1);
                    const wave = Math.max(0, Math.min(1, (p1 + p2 * 0.6 + p3 * 0.3 + 1.2) / 2.8));
                    charIdx = Math.min(barChars.length - 1, (wave * barChars.length) | 0);
                  }
                  ctx.fillStyle = '#fff';
                  ctx.fillText(barChars[charIdx], c * charW, barRow * charH);
                }
              }
            }
          }
        } else {
          for (let fi = feedVisStart; fi < feedVisEnd; fi++) {
            const fc = feedCards[fi];
            const ts2 = fc.textScale;
            // Convert virtual card rows to screen rows via scroll offset
            const screenTop = Math.round(fc.baseTop - feedScrollOffset);
            const screenBottom = Math.round(fc.baseBottom - feedScrollOffset);

            // Cull cards entirely off-screen
            if (screenBottom < 0 || screenTop >= rows) continue;

            const nameScreenRow = Math.round(fc.nameRow - feedScrollOffset);
            const descScreenRow = Math.round(fc.descRow - feedScrollOffset);

            // Use scaled font for feed card text
            ctx.font = `${fontSize * ts2}px 'JetBrains Mono','Courier New',monospace`;
            ctx.textBaseline = 'top';

            // --- Icon (on name row, full brightness) ---
            for (let i = 0; i < fc.iconStr.length; i++) {
              const c = fc.iconCol + i * ts2;
              if (!canDraw(nameScreenRow, c)) continue;
              const idx = nameScreenRow * cols + c;
              ctx.fillStyle = colorLUT[gridColors[idx]];
              ctx.fillText(fc.iconStr[i], c * charW, nameScreenRow * charH);
            }

            // --- Name (full brightness) ---
            for (let i = 0; i < fc.nameStr.length; i++) {
              const c = fc.textCol + i * ts2;
              if (!canDraw(nameScreenRow, c)) continue;
              const idx = nameScreenRow * cols + c;
              ctx.fillStyle = colorLUT[gridColors[idx]];
              ctx.fillText(fc.nameStr[i], c * charW, nameScreenRow * charH);
            }

            // --- Description (dim, ~40% brightness) ---
            for (let i = 0; i < fc.descStr.length; i++) {
              const c = fc.textCol + i * ts2;
              if (!canDraw(descScreenRow, c)) continue;
              const idx = descScreenRow * cols + c;
              const colorIdx = Math.max(0, Math.min(COLOR_LEVELS - 1, (gridColors[idx] * 0.4) | 0));
              ctx.fillStyle = colorLUT[colorIdx];
              ctx.fillText(fc.descStr[i], c * charW, descScreenRow * charH);
            }
          }
        }

        ctx.restore(); // end pinned-header clip

        // Update hit detection bounds (after the feedCards rendering loop, before closing the if block).
        // Index alignment with feedCards must be preserved (sub:N click/hover handlers use the raw
        // index), so this stays a full-length array — but only indices in [feedVisStart, feedVisEnd)
        // are recomputed; everything else is pointed at the shared OFFSCREEN_BOUNDS (no allocation)
        // rather than allocating ~1350 throwaway off-screen placeholder objects every frame.
        if (feedBoundsArr.length !== feedCards.length) {
          feedBoundsArr = new Array(feedCards.length).fill(OFFSCREEN_BOUNDS);
        } else {
          feedBoundsArr.fill(OFFSCREEN_BOUNDS);
        }
        const clampTopPx = feedContentTopRow * charH; // cards under the pinned header/heading aren't clickable there
        for (let fi = feedVisStart; fi < feedVisEnd; fi++) {
          const fc = feedCards[fi];
          const screenTop = Math.round(fc.baseTop - drawScroll);
          const screenBottom = Math.round(fc.baseBottom - drawScroll);
          if (screenBottom < 0 || screenTop >= rows) continue; // stays OFFSCREEN_BOUNDS
          const topPx = Math.max(screenTop * charH, clampTopPx);
          const bottomPx = (screenBottom + 1) * charH;
          if (bottomPx <= topPx) continue; // fully hidden behind the header band
          feedBoundsArr[fi] = {
            x: fc.left * charW,
            y: topPx,
            w: (fc.right - fc.left + 1) * charW,
            h: bottomPx - topPx,
          };
        }
        subItemBoundsRef.current = feedBoundsArr;
      }

      // --- Now-playing box: border, equalizer bars, text ---
      if (npVisible > 0 && npTextStr && npBoxTop < rows) {
        ctx.font = `${fontSize}px 'JetBrains Mono','Courier New',monospace`;
        ctx.textBaseline = 'top';

        // On the music feed, cards scroll beneath the box — paint an opaque
        // background over its footprint first (same technique as the search-row
        // strip in musicView.ts) so scrolled card text never bleeds through.
        if (isMusicMode) {
          ctx.fillStyle = `rgb(${clearBgR},${clearBgG},${clearBgB})`;
          ctx.fillRect(
            npBoxLeft * charW,
            npBoxTop * charH,
            (npBoxRight - npBoxLeft + 1) * charW,
            (npBoxBottom - npBoxTop + 1) * charH,
          );
        }

        // Helper: only draw if cell was scatter-revealed
        const canDraw = (r: number, c: number) => {
          if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
          return gridSkip[r * cols + c] === 1;
        };

        // --- Equalizer bars (only when playing) ---
        if (npIsPlaying) {
          const barChars = '░▒▓█';
          for (let b = 0; b < 5; b++) {
            const bCol = npBarsCol + b;
            const barRows = [npBarsRow, npBarsRow + 1];
            for (const bRow of barRows) {
              if (!canDraw(bRow, bCol)) continue;
              const idx = bRow * cols + bCol;
              const p1 = Math.sin(ts * 0.005 + b * 1.7);
              const p2 = Math.sin(ts * 0.0083 + b * 2.9 + 0.5);
              const p3 = Math.sin(ts * 0.013 + b * 0.7 + bRow * 3.1);
              const wave = Math.max(0, Math.min(1, (p1 + p2 * 0.6 + p3 * 0.3 + 1.2) / 2.8));
              if (bRow === npBarsRow && wave < 0.4) continue;
              const charIdx = Math.min(barChars.length - 1, (wave * barChars.length) | 0);
              ctx.fillStyle = colorLUT[gridColors[idx]];
              ctx.fillText(barChars[charIdx], bCol * charW, bRow * charH);
            }
          }
        }

        // --- Label: "NOW PLAYING" (dimmer) ---
        for (let i = 0; i < npLabelStr.length; i++) {
          const c = npLabelCol + i;
          if (!canDraw(npLabelRow, c)) continue;
          const idx = npLabelRow * cols + c;
          const colorIdx = Math.max(0, Math.min(COLOR_LEVELS - 1, (gridColors[idx] * 0.65) | 0));
          ctx.fillStyle = colorLUT[colorIdx];
          ctx.fillText(npLabelStr[i], c * charW, npLabelRow * charH);
        }

        // --- Track text (2x scale, full brightness, scrolling if truncated) ---
        ctx.font = `${fontSize * 2}px 'JetBrains Mono','Courier New',monospace`;
        const drawTitleChar = (ch: string, i: number, row = npTextRow, dim = 1) => {
          const c = npTextCol + i * 2;
          if (!canDraw(row, c)) return;
          const idx = row * cols + c;
          const lvl = dim === 1
            ? gridColors[idx]
            : Math.max(0, Math.min(COLOR_LEVELS - 1, (gridColors[idx] * dim) | 0));
          ctx.fillStyle = colorLUT[lvl];
          ctx.fillText(ch, c * charW, row * charH);
        };
        if (npStacked) {
          // Two static 2x rows: track, then artist a shade dimmer.
          for (let i = 0; i < npTextStr.length; i++) drawTitleChar(npTextStr[i], i);
          for (let i = 0; i < npArtistStr.length; i++) {
            drawTitleChar(npArtistStr[i], i, npArtistRow, 0.7);
          }
        } else if (npFullTextStr.length > npMaxTextWidth) {
          // Pause-scroll-pause-scroll marquee with smoothstep easing
          const pad = '   ';
          const loopText = npFullTextStr + pad;
          const textLen = loopText.length;
          const halfLen = Math.ceil(textLen / 2);

          const pauseTime = 2.0; // seconds to hold still
          const scrollTime = Math.max(2, textLen / 4); // seconds per scroll segment
          const cycleTime = pauseTime + scrollTime + pauseTime + scrollTime;
          const t2 = ((ts / 1000) % cycleTime);

          // smoothstep: ease-in-out
          const ss = (x: number) => x * x * (3 - 2 * x);

          let scrollOffset: number;
          if (t2 < pauseTime) {
            scrollOffset = 0;
          } else if (t2 < pauseTime + scrollTime) {
            scrollOffset = ss((t2 - pauseTime) / scrollTime) * halfLen;
          } else if (t2 < pauseTime * 2 + scrollTime) {
            scrollOffset = halfLen;
          } else {
            scrollOffset = halfLen + ss((t2 - pauseTime * 2 - scrollTime) / scrollTime) * (textLen - halfLen);
          }

          const intOffset = Math.floor(scrollOffset);
          for (let i = 0; i < npMaxTextWidth; i++) {
            drawTitleChar(loopText[(intOffset + i) % textLen], i);
          }
        } else {
          for (let i = 0; i < npTextStr.length; i++) {
            drawTitleChar(npTextStr[i], i);
          }
        }
        // Restore 1x font for anything drawn after
        ctx.font = `${fontSize}px 'JetBrains Mono','Courier New',monospace`;
      }

      // --- Music chrome: pinned intro panel with title/blurb/search (the
      // now-playing box itself is drawn by the shared np pipeline above) ---
      const musicUI = musicUIRef?.current;
      if (!overlayVisual && musicUI && feedCards.length > 0 && contentProgress > 0.6) {
        musicUI.caretOn = ((ts / 500) | 0) % 2 === 0;
        musicControlZones = drawMusicChrome(
          ctx,
          { cols, rows, charW, charH, fontSize, headerRows: Math.ceil(100 * canvasDpr / charH) },
          getMusicLayout(),
          musicUI,
          `rgb(${clearBgR},${clearBgG},${clearBgB})`,
          (tc, tr) => colorLUT[gridColors[Math.min(rows - 1, Math.max(0, tr)) * cols + Math.min(cols - 1, Math.max(0, tc))]],
        );
      } else {
        musicControlZones = [];
      }

      // --- Contact chrome: field label + opaque legibility strip + typed
      // text + caret for NAME/EMAIL/MESSAGE, plus a SEND row. Drawn as
      // direct opaque strips (same technique as the /music search row)
      // rather than terrain cutouts, so typed text stays reliably legible
      // regardless of scatter/reveal state — see contactView.ts. Faded via
      // globalAlpha=contactReveal so it fades in/out in step with the
      // "CONTACT" heading cutout's scatter instead of popping.
      if (contactVisible) {
        const contactGeom: ContactGeom = { cols, rows, charW, charH, fontSize, headingBottomRow: contactHeadingBottomRow };
        const contactKey = `${cols}x${rows}x${contactHeadingBottomRow}`;
        if (!contactLayoutCache || contactLayoutKey !== contactKey) {
          contactLayoutCache = contactLayout(contactGeom);
          contactLayoutKey = contactKey;
        }
        contactZones = computeContactZones(contactLayoutCache, charW, charH);
        const contactState = contactUIRef?.current;
        if (contactState) {
          // Hover highlight only once the crossfade has mostly settled —
          // matches the click-gating in hitTest() (contactInteractive).
          let hoveredContactAction: ContactZone['action'] | null = null;
          if (contactInteractive) {
            for (const z of contactZones) {
              if (mx >= z.x && mx < z.x + z.w && my >= z.y && my < z.y + z.h) { hoveredContactAction = z.action; break; }
            }
          }
          const contactCaretOn = ((ts / 500) | 0) % 2 === 0;
          ctx.save();
          ctx.globalAlpha = contactReveal;
          drawContactChrome(
            ctx,
            contactGeom,
            contactLayoutCache,
            contactState,
            contactCaretOn,
            `rgb(${clearBgR},${clearBgG},${clearBgB})`,
            hoveredContactAction,
          );
          ctx.restore();
        }
      } else {
        contactZones = [];
      }

      // Full-screen "+" menu overlay: the terrain-native cutout is rendered
      // inline in the main per-cell grid loop above (menuOverlayGrid block,
      // alongside the name mask) so it participates in the same single
      // terrain pass as everything else, at full brightness, with no dim
      // layer. Open/close tracking, the overlay crossfade, and hover
      // detection are all computed early in draw() (menuOpenNow / menuReveal
      // / menuEntryHoverIdx above).

      // --- Cover canvas: copy from main canvas with scatter mask ---
      // Placed AFTER all main canvas rendering so drawImage captures everything:
      // terrain, W logo, + icon, feed cards, now-playing.
      const coverCanvas = coverCanvasRef?.current;
      if (coverCanvas) {
        if (!coverCtx) coverCtx = coverCanvas.getContext('2d');
        if (coverCanvas.width !== canvas.width || coverCanvas.height !== canvas.height) {
          coverCanvas.width = canvas.width;
          coverCanvas.height = canvas.height;
        }
        if (coverCtx) {
          coverCtx.clearRect(0, 0, coverCanvas.width, coverCanvas.height);
          const isForwardCover = contentTarget === 1 && contentProgress < 1 && !isFeedMode && !wasFeedMode && !detailToFeedMelt;
          const isReverseCover = detailToFeedMelt;

          if (isForwardCover) {
            // Forward melt: terrain scatter-dissolves to reveal detail content.
            // Only cover below header (100px) — header stays on main canvas so W/+ animate naturally.
            const contentStartPx = 100 * canvasDpr;
            for (let r = 0; r < rows; r++) {
              const py = r * charH;
              if (py + charH <= contentStartPx) continue;
              const rowOff = r * cols;
              let runS = -1;
              for (let c = 0; c <= cols; c++) {
                const idx = rowOff + c;
                const draw = c < cols && gridSkip[idx] === 0;
                if (draw && runS < 0) { runS = c; }
                else if (!draw && runS >= 0) {
                  const sx = runS * charW, w = (c - runS) * charW;
                  coverCtx.drawImage(canvas, sx, py, w, charH, sx, py, w, charH);
                  runS = -1;
                }
              }
            }
          } else if (isReverseCover) {
            // Reverse melt: feed terrain scatter-accumulates ON TOP of detail content.
            // Copies directly from main canvas — includes terrain, W, +, feed cards, everything.
            const p = d2fMeltProgress;
            for (let r = 0; r < rows; r++) {
              const py = r * charH;
              let runS = -1;
              for (let c = 0; c <= cols; c++) {
                let opaque = false;
                if (c < cols) {
                  let hd = (c * 271828183 + r * 314159265) | 0;
                  hd = ((hd ^ (hd >>> 13)) * 1274126177) | 0;
                  const h = ((hd ^ (hd >>> 16)) & 0x7fff) / 0x7fff;
                  const appear = h * 0.7;
                  const disappear = h * 0.2 + 0.8;
                  opaque = p >= appear && p < disappear;
                }
                if (opaque && runS < 0) { runS = c; }
                else if (!opaque && runS >= 0) {
                  const sx = runS * charW, w = (c - runS) * charW;
                  coverCtx.drawImage(canvas, sx, py, w, charH, sx, py, w, charH);
                  runS = -1;
                }
              }
            }
          }
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    function hitTest(ex: number, ey: number) {
      const px = ex * canvasDpr;
      const py = ey * canvasDpr;

      const contentTitleVis = Math.max(0, Math.min(1, (contentProgressRef.current - 0.6) / 0.4));

      // Full-screen menu open: it takes over the entire hit-test chain. Only
      // the W logo, the "+" (to close), and the 4 entries resolve to a hit;
      // everything else beneath (music zones, np box, sub-items) is
      // suppressed while open. W resolves to 'logo' same as the normal
      // path — Home's onLogoClick handles the menu-aware close-to-landing
      // transition itself.
      if (menuOpenRef?.current) {
        const mb2 = menuBoundsRef.current;
        if (px >= mb2.x && px < mb2.x + mb2.w && py >= mb2.y && py < mb2.y + mb2.h) return 'menu';
        const wb2 = wLogoBoundsRef.current;
        if (px >= wb2.x && px < wb2.x + wb2.w && py >= wb2.y && py < wb2.y + wb2.h) return 'logo';
        // Entries only register once the scatter-in crossfade is mostly (or
        // fully) revealed (menuInteractive) — clicking through half-formed
        // letters mid-transition shouldn't register a hit.
        if (menuInteractive) {
          const mEntries = menuEntryBoundsRef.current;
          for (let i = 0; i < mEntries.length; i++) {
            const b = mEntries[i];
            if (px >= b.x && px < b.x + b.w && py >= b.y && py < b.y + b.h) return `menuitem:${i}`;
          }
        }
        return null;
      }

      // Canvas-native contact mode: takes over the hit-test chain the same
      // way the menu does above (and only reached once the menu-open branch
      // above has already returned, so menu always wins if both are somehow
      // open). W and "+" still resolve normally — W goes home (closing
      // contact), "+" opens the menu over contact.
      if (contactOpenRef?.current) {
        if (logoMenuIntroProgressRef.current > 0.3) {
          const wb2 = wLogoBoundsRef.current;
          if (px >= wb2.x && px < wb2.x + wb2.w && py >= wb2.y && py < wb2.y + wb2.h) return 'logo';
          const mb2 = menuBoundsRef.current;
          if (px >= mb2.x && px < mb2.x + mb2.w && py >= mb2.y && py < mb2.y + mb2.h) return 'menu';
        }
        // Fields/SEND only register once mostly (or fully) revealed —
        // mirrors menuInteractive above.
        if (contactInteractive) {
          for (const z of contactZones) {
            if (px >= z.x && px < z.x + z.w && py >= z.y && py < z.y + z.h) return `contact:${z.action}`;
          }
        }
        return null;
      }

      // W logo & menu — always clickable after intro
      if (logoMenuIntroProgressRef.current > 0.3) {
        const wb = wLogoBoundsRef.current;
        if (px >= wb.x && px < wb.x + wb.w && py >= wb.y && py < wb.y + wb.h) return 'logo';
        const mb = menuBoundsRef.current;
        if (px >= mb.x && px < mb.x + mb.w && py >= mb.y && py < mb.y + mb.h) return 'menu';
      }

      // Music control zones — must win over sub-item card bounds since the search
      // row draws opaquely OVER cards; checking sub-items first could resolve clicks
      // on the visible search row to a hidden card underneath.
      for (const z of musicControlZones) {
        if (px >= z.x && px < z.x + z.w && py >= z.y && py < z.y + z.h) return `music:${z.action}`;
      }

      // Now-playing box dead zone — consume clicks to prevent fall-through to cards below.
      // On the music feed, the np box draws opaquely over scrolling cards, so we must
      // intercept clicks in its rect to prevent resolving them to hidden cards beneath.
      if (musicUIRef?.current && npBoxTop < rows) {
        const npBoxLeftPx = npBoxLeft * charW;
        const npBoxTopPx = npBoxTop * charH;
        const npBoxRightPx = (npBoxRight + 1) * charW;
        const npBoxBottomPx = (npBoxBottom + 1) * charH;
        if (px >= npBoxLeftPx && px < npBoxRightPx && py >= npBoxTopPx && py < npBoxBottomPx) {
          return 'np-box';
        }
      }

      // Sub-items — only when content title is revealed
      if (contentTitleVis > 0.3) {
        const sBounds = subItemBoundsRef.current;
        for (let i = 0; i < sBounds.length; i++) {
          const b = sBounds[i];
          if (px >= b.x && px < b.x + b.w && py >= b.y && py < b.y + b.h) return `sub:${i}`;
        }
      }

      return null;
    }

    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX * canvasDpr, y: e.clientY * canvasDpr };
      const hit = hitTest(e.clientX, e.clientY);
      document.body.style.cursor = hit !== null && hit !== 'np-box' ? 'pointer' : '';
    };

    const onClick = (e: MouseEvent) => {
      const hit = hitTest(e.clientX, e.clientY);
      if (hit === 'logo') {
        onLogoClickRef.current?.();
      } else if (hit === 'menu') {
        onMenuClickRef.current?.();
      } else if (typeof hit === 'string' && hit.startsWith('menuitem:')) {
        const idx = parseInt(hit.slice('menuitem:'.length));
        const entry = MENU_ENTRIES[idx]?.key;
        if (entry) onMenuSelectRef.current?.(entry);
      } else if (typeof hit === 'string' && hit.startsWith('sub:')) {
        const idx = parseInt(hit.slice(4));
        const detail = config.detailRef?.current;
        if (detail && idx === 0) {
          // Detail mode: clicking the name opens external URL
          window.open(detail.url, '_blank');
        } else {
          const items = contentSubItemsRef?.current;
          if (items?.[idx]?.url) {
            if (onSubItemClickRef.current) {
              onSubItemClickRef.current(items[idx].url);
            } else {
              window.open(items[idx].url, '_blank');
            }
          }
        }
      } else if (typeof hit === 'string' && hit.startsWith('music:')) {
        onMusicControlRef.current?.(hit.slice(6) as 'search');
      } else if (typeof hit === 'string' && hit.startsWith('contact:')) {
        onContactControlRef.current?.(hit.slice('contact:'.length));
      }
    };

    const onWheel = (e: WheelEvent) => {
      // Menu/contact open: suppress the page beneath (don't scroll cards behind it).
      if (menuOpenRef?.current || contactOpenRef?.current) return;
      // Only scroll when feed is open
      if (contentProgressRef.current < 0.5) return;
      const items = contentSubItemsRef?.current;
      if (!items || items.length === 0) return;

      // Music slots page by whole rows (the drawn offset snaps to row-periods),
      // so wheel input converts to rows ~1:1 — at the list-feed 0.3 factor a
      // slot swap would take several full wheel notches and feel stuck.
      const deltaRows = e.deltaY / (charH / canvasDpr);
      const wheelFactor = musicUIRef?.current ? 0.9 : 0.3;
      feedScrollTarget = Math.max(0, Math.min(feedMaxScroll, feedScrollTarget + deltaRows * wheelFactor));
      e.preventDefault();
    };

    let touchLastY = 0;

    const onTouchStart = (e: TouchEvent) => {
      if (menuOpenRef?.current || contactOpenRef?.current) return;
      if (contentProgressRef.current < 0.5) return;
      touchLastY = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (menuOpenRef?.current || contactOpenRef?.current) return;
      if (contentProgressRef.current < 0.5) return;
      const items = contentSubItemsRef?.current;
      if (!items || items.length === 0) return;

      const currentY = e.touches[0].clientY;
      const deltaY = touchLastY - currentY;
      touchLastY = currentY;

      const deltaRows = deltaY / (charH / canvasDpr);
      feedScrollTarget = Math.max(0, Math.min(feedMaxScroll, feedScrollTarget + deltaRows));
      e.preventDefault();
    };

    resize();
    rafRef.current = requestAnimationFrame(draw);
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('click', onClick);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('click', onClick);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      document.body.style.cursor = '';
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- callbacks are accessed via stable refs (onLogoClickRef etc.)
  }, [canvasRef, scrollProgressRef, buildMasks, speedDivisor, contrast, contentOpenRef, activeLabelRef, contentSubItemsRef, meltCompleteRef, menuOpenRef, menuCloseToHomeRef, contactOpenRef, contactCloseToHomeRef]);
}
