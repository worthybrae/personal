// src/components/Dashboard/useTerrainAnimation.ts

import { useEffect, useRef, useCallback } from 'react';
import { warpedTerrain } from './noise';
import { getDuotoneColor, scurve } from './color';

const NOISE_SCALE = 0.015;
const COLOR_LEVELS = 64;

export interface TerrainConfig {
  speedDivisor?: number;
  showNameMask?: boolean;
  contrast?: number;
  onLogoClick?: () => void;
  onMenuClick?: () => void;
  onSubItemClick?: (url: string) => void;
  contentOpenRef?: React.RefObject<boolean>;
  activeLabelRef?: React.RefObject<string | null>;
  scrollTargetRef?: React.RefObject<number>;
  contentSubItemsRef?: React.RefObject<{ text: string; url: string; description?: string; mau?: string; category?: string; icon?: string }[]>;
  detailRef?: React.MutableRefObject<{ name: string; mau: string; url: string } | null>;
  meltCompleteRef?: React.MutableRefObject<boolean>;
  meltProgressRef?: React.MutableRefObject<number>;
  detailToFeedRef?: React.MutableRefObject<boolean>;
  nowPlayingRef?: React.RefObject<{ track: string; artist: string; isPlaying: boolean; playedAt?: string } | null>;
  coverCanvasRef?: React.RefObject<HTMLCanvasElement | null>;
  skipIntro?: boolean;
}

export function useTerrainAnimation(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  scrollProgressRef: React.MutableRefObject<number>,
  config: TerrainConfig = {},
) {
  const { speedDivisor = 6750, showNameMask = true, contrast = 8, onLogoClick, onMenuClick, onSubItemClick, contentOpenRef, activeLabelRef, scrollTargetRef, contentSubItemsRef, meltCompleteRef, meltProgressRef, detailToFeedRef, nowPlayingRef, coverCanvasRef, skipIntro } = config;

  // Wrap callbacks in refs so they never cause the useEffect to re-run.
  // navigate() from React Router changes identity on route changes, which cascades
  // through useCallback → useMemo → useEffect deps, resetting all animation state.
  const onLogoClickRef = useRef(onLogoClick);
  const onMenuClickRef = useRef(onMenuClick);
  const onSubItemClickRef = useRef(onSubItemClick);
  onLogoClickRef.current = onLogoClick;
  onMenuClickRef.current = onMenuClick;
  onSubItemClickRef.current = onSubItemClick;

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
      const isMob = window.innerWidth < 768;
      const fs = isMob
        ? Math.max(9, Math.min(14, window.innerWidth / 70)) * dpr
        : Math.max(5, Math.min(9, window.innerWidth / 180)) * dpr;
      // W logo: render at test size, scan pixel data to count actual grid rows, rescale to 6
      const cW = fs * 0.602;
      const cH = fs;
      const targetIconRows = 6;
      const logoX = 24 * dpr;
      const logoY = 20 * dpr;
      w2ctx.fillStyle = '#fff';
      w2ctx.textAlign = 'left';
      w2ctx.textBaseline = 'top';
      const wTestSize = 10 * fs;
      w2ctx.font = `900 ${wTestSize}px 'Arial Black','Impact','Helvetica Neue',sans-serif`;
      w2ctx.fillText('W', logoX, logoY);
      // Scan at grid resolution to measure actual rendered height
      const wScan = w2ctx.getImageData(0, 0, w2.width, w2.height).data;
      let wMinR = Infinity, wMaxR = 0;
      for (let r = 0; r < Math.ceil(w2.height / cH); r++) {
        const py = Math.floor(r * cH);
        for (let c = 0; c < Math.ceil(w2.width / cW); c++) {
          const px = Math.floor(c * cW);
          if (px < w2.width && py < w2.height && wScan[(py * w2.width + px) * 4] > 128) {
            if (r < wMinR) wMinR = r;
            if (r > wMaxR) wMaxR = r;
            break;
          }
        }
      }
      const wMeasured = wMaxR >= wMinR ? wMaxR - wMinR + 1 : 7;
      const logoSize = wTestSize * (targetIconRows / wMeasured);
      // Clear and redraw at corrected size
      w2ctx.fillStyle = '#000';
      w2ctx.fillRect(0, 0, w2.width, w2.height);
      w2ctx.fillStyle = '#fff';
      w2ctx.font = `900 ${logoSize}px 'Arial Black','Impact','Helvetica Neue',sans-serif`;
      w2ctx.fillText('W', logoX, logoY);
      // Scan final render to get actual top row for + alignment
      const wFinal = w2ctx.getImageData(0, 0, w2.width, w2.height).data;
      let wFinalMinR = Infinity;
      for (let r = 0; r < Math.ceil(w2.height / cH); r++) {
        const py = Math.floor(r * cH);
        for (let c = 0; c < Math.ceil(w2.width / cW); c++) {
          const px = Math.floor(c * cW);
          if (px < w2.width && py < w2.height && wFinal[(py * w2.width + px) * 4] > 128) {
            wFinalMinR = r;
            break;
          }
        }
        if (wFinalMinR < Infinity) break;
      }
      const wMetrics = w2ctx.measureText('W');
      wLogoBoundsRef.current = {
        x: logoX,
        y: logoY,
        w: wMetrics.width,
        h: targetIconRows * cH,
      };

      wLogoMaskRef.current = {
        data: wFinal,
        width: w2.width,
        height: w2.height,
      };

      // --- Menu (+) icon mask — grid-aligned, 3-wide vertical bar, 2-thick horizontal ---
      const m = document.createElement('canvas');
      m.width = canvasWidth;
      m.height = canvasHeight;
      const mctx = m.getContext('2d')!;
      mctx.fillStyle = '#000';
      mctx.fillRect(0, 0, m.width, m.height);

      mctx.fillStyle = '#fff';
      const plusCols = 9;
      const vBarThick = 3; // vertical bar: 3 columns wide
      const hBarThick = 2; // horizontal bar: 2 rows thick
      const plusRows = 6;
      const plusRightCol = Math.floor((canvasWidth - logoX) / cW);
      const plusTopRow = wFinalMinR < Infinity ? wFinalMinR : Math.floor(logoY / cH);
      const plusLeftCol = plusRightCol - plusCols;
      const plusMidCol = plusLeftCol + Math.floor((plusCols - vBarThick) / 2);
      const plusMidRow = plusTopRow + Math.floor((plusRows - hBarThick) / 2);
      const fillCell = (r: number, c: number) => {
        const x = Math.floor(c * cW);
        const y = Math.floor(r * cH);
        mctx.fillRect(x, y, Math.floor((c + 1) * cW) - x, Math.floor((r + 1) * cH) - y);
      };
      // Vertical bar (3 cols wide)
      for (let r = plusTopRow; r < plusTopRow + plusRows; r++) {
        for (let c = plusMidCol; c < plusMidCol + vBarThick; c++) {
          fillCell(r, c);
        }
      }
      // Horizontal bar (2 rows thick)
      for (let r = plusMidRow; r < plusMidRow + hBarThick; r++) {
        for (let c = plusLeftCol; c < plusLeftCol + plusCols; c++) {
          fillCell(r, c);
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
    let lastNowPlayingTrack = '';

    // Feed card geometry
    interface FeedCard {
      baseTop: number;    // grid row of top edge (before scroll)
      baseBottom: number;
      left: number;       // grid col of left edge
      right: number;
      iconCol: number;    // col where icon starts
      textCol: number;    // col where text (category/name/desc) starts
      catRow: number;     // row offsets from baseTop
      nameRow: number;
      descRow: number;
      catStr: string;
      nameStr: string;
      descStr: string;
      iconStr: string;
      url: string;
      textScale: number;  // font multiplier (2 = each char spans 2 grid cols/rows)
    }
    let feedCards: FeedCard[] = [];
    let feedCardWidth = 0;
    let feedScrollOffset = 0;
    let feedScrollTarget = 0;
    let feedMaxScroll = 0;
    let lastFeedItemsKey = '';
    let wasFeedMode = false;
    let feedToDetailMelt = false;
    let detailToFeedMelt = false;
    let d2fContentReset = false;
    let d2fMeltProgress = 0;
    let detailToFeedBrightness = -1; // -1 = inactive, 0→1 = fading in from dark (detail→feed)

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

    function setupNowPlaying(track: string, artist: string, isPlaying: boolean, _playedAt?: string) {
      npIsPlaying = isPlaying;
      npLabelStr = isPlaying ? 'LISTENING TO' : 'LAST LISTENED TO';
      npFullTextStr = `${track} — ${artist}`.toUpperCase();

      // Bars only shown when playing
      const barsWidth = isPlaying ? 5 : 0;
      const gapAfterBars = isPlaying ? 2 : 0;
      // Cap text width so the box doesn't overflow the screen
      const maxBoxCols = Math.min(cols - 6, 60);
      const maxTextArea = maxBoxCols - (1 + 2 + barsWidth + gapAfterBars + 2 + 1);
      npMaxTextWidth = maxTextArea;
      // Truncate display text with ellipsis if needed; full text used for scrolling
      if (npFullTextStr.length > npMaxTextWidth) {
        npTextStr = npFullTextStr.slice(0, npMaxTextWidth - 1) + '…';
      } else {
        npTextStr = npFullTextStr;
      }
      // Size box to actual content, not max width
      const textDisplayWidth = Math.min(npFullTextStr.length, npMaxTextWidth);
      const contentWidth = Math.max(npLabelStr.length, textDisplayWidth);
      const innerWidth = barsWidth + gapAfterBars + contentWidth;
      const padH = 2; // horizontal padding inside border
      const boxWidth = 1 + padH + innerWidth + padH + 1; // border + pad + content + pad + border

      // Box height: border + pad + label + track + pad + border = 6 rows
      const boxHeight = 6;

      // Center horizontally
      npBoxLeft = Math.floor((cols - boxWidth) / 2);
      npBoxRight = npBoxLeft + boxWidth - 1;

      // Position near bottom: box bottom border is 2 rows from canvas bottom
      npBoxBottom = rows - 3;
      npBoxTop = npBoxBottom - boxHeight + 1;

      // Content positions (inside the box)
      const contentLeft = npBoxLeft + 1 + padH; // after border + padding
      npBarsCol = contentLeft;
      npBarsRow = npBoxTop + 2; // first content row (after border + pad)
      npLabelCol = contentLeft + barsWidth + gapAfterBars;
      npLabelRow = npBoxTop + 2;
      npTextCol = contentLeft + barsWidth + gapAfterBars;
      npTextRow = npBoxTop + 3;
    }

    function setupFeedCards(items: { text: string; url: string; description?: string; category?: string; icon?: string }[]) {
      if (items.length === 0) {
        feedCards = [];
        feedMaxScroll = 0;
        return;
      }

      const textScale = 2;    // each character spans 2 grid cols & 2 grid rows
      const padH = 2;          // horizontal padding inside card (grid cols)
      const padV = 1;          // vertical padding (grid rows)
      const iconChars = 3;     // max icon characters
      const gapAfterIcon = 2;  // gap between icon and text (grid cols)
      const cardGap = 4;       // rows between cards

      // Each text line spans textScale rows; 2 lines (name + desc)
      const cardHeight = padV + textScale * 2 + padV; // 1 + 4 + 1 = 6

      // Text width: measure in characters, then convert to grid columns via textScale
      let maxTextChars = 0;
      for (const item of items) {
        const nameLen = item.text.toUpperCase().length;
        const descLen = (item.description ?? '').toUpperCase().length;
        maxTextChars = Math.max(maxTextChars, nameLen, descLen);
      }

      const iconCols = iconChars * textScale;
      const textCols = maxTextChars * textScale;
      const contentCols = iconCols + gapAfterIcon + textCols;
      const maxBoxCols = Math.min(cols - 6, 90);
      const cappedContentCols = Math.min(contentCols, maxBoxCols - (1 + padH + padH + 1));
      const cappedTextCols = cappedContentCols - iconCols - gapAfterIcon;
      const cappedTextChars = Math.floor(cappedTextCols / textScale);
      feedCardWidth = 1 + padH + cappedContentCols + padH + 1;

      // Center horizontally
      const cardLeft = Math.floor((cols - feedCardWidth) / 2);
      const cardRight = cardLeft + feedCardWidth - 1;
      const contentLeft = cardLeft + 1 + padH;
      const iconCol = contentLeft;
      const textCol = contentLeft + iconCols + gapAfterIcon;

      // Vertical layout: start below the 100px header
      const headerRows = Math.ceil(100 * canvasDpr / charH);
      const startRow = headerRows + 2;

      feedCards = items.map((item, i) => {
        const baseTop = startRow + i * (cardHeight + cardGap);
        const nameStr = item.text.toUpperCase();
        const descStr = (item.description ?? '').toUpperCase();
        return {
          baseTop,
          baseBottom: baseTop + cardHeight - 1,
          left: cardLeft,
          right: cardRight,
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
        };
      });

      const totalFeedHeight = startRow + items.length * (cardHeight + cardGap);
      feedMaxScroll = Math.max(0, totalFeedHeight - rows + 3);
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
      fontSize = isMobile
        ? Math.max(9, Math.min(14, window.innerWidth / 70)) * canvasDpr
        : Math.max(5, Math.min(9, window.innerWidth / 180)) * canvasDpr;
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

      for (let r = 0; r < rows; r++) {
        const py = Math.floor(r * charH);
        for (let c = 0; c < cols; c++) {
          const px = Math.floor(c * charW);
          const idx = r * cols + c;
          if (nameMask && px < nameMask.width && py < nameMask.height) {
            nameMaskGrid[idx] = nameMask.data[(py * nameMask.width + px) * 4] > 128 ? 1 : 0;
          }
          if (wMask && px < wMask.width && py < wMask.height) {
            wLogoMaskGrid[idx] = wMask.data[(py * wMask.width + px) * 4] > 128 ? 1 : 0;
          }
          if (menuMask && px < menuMask.width && py < menuMask.height) {
            menuMaskGrid[idx] = menuMask.data[(py * menuMask.width + px) * 4] > 128 ? 1 : 0;
          }
        }
      }

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
      // Smooth lerp scroll toward route-driven target
      const scrollTarget = scrollTargetRef?.current ?? 0;
      const scrollCurrent = scrollProgressRef.current ?? 0;
      const scrollDiff = scrollTarget - scrollCurrent;
      scrollProgressRef.current = Math.abs(scrollDiff) < 0.001
        ? scrollTarget
        : scrollCurrent + scrollDiff * 0.045;
      const scroll = scrollProgressRef.current;

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
      const feedItemsKey = feedItems.map(f => `${f.text}:${f.icon}`).join('|');
      if (feedItemsKey !== lastFeedItemsKey) {
        const hadFeedCards = feedCards.length > 0;
        lastFeedItemsKey = feedItemsKey;
        setupFeedCards(feedItems);
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
      const brightnessScale = detailToFeedMelt
        ? 1
        : (detailToFeedBrightness >= 0 ? detailToFeedBrightness : 1);
      const colorScale = (isClosing && !feedActive) ? (1 - contentProgress) : brightnessScale;

      for (let i = 0; i < COLOR_LEVELS; i++) {
        const val = i / (COLOR_LEVELS - 1);
        const col = colorFn(val, t);
        const dim = 0.35 + val * 1.15;
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
      const clearBgR = Math.round(bgR * brightnessScale);
      const clearBgG = Math.round(bgG * brightnessScale);
      const clearBgB = Math.round(bgB * brightnessScale);
      ctx.fillStyle = `rgb(${clearBgR},${clearBgG},${clearBgB})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // --- Name dissolve (scroll 0→0.7) ---
      const nameFade = Math.max(0, Math.min(1, scroll / 0.7));

      // Content titles scatter in (0.4→1.0)
      const contentTitleFade = Math.max(0, Math.min(1, (contentProgress - 0.4) / 0.6));
      const currentLabel = activeLabelRef?.current ?? null;
      const subItems = contentSubItemsRef?.current ?? [];
      const subItemsKey = subItems.map(s => `${s.text}:${s.description || ''}:${s.mau || ''}`).join('|');
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

      // --- Now-playing mask: rebuild on track change or playing state change ---
      const np = nowPlayingRef?.current;
      const npTrack = np?.track ?? '';
      const npKey = `${npTrack}|${np?.isPlaying}`;
      if (npKey !== lastNowPlayingTrack) {
        lastNowPlayingTrack = npKey;
        if (np && np.track) {
          setupNowPlaying(np.track, np.artist, np.isPlaying, np.playedAt);
        } else {
          npBoxTop = Infinity;
        }
      }
      // Visible only on home page — fades out as contentProgress increases, hidden when feed is showing
      const npVisible = np?.track && feedCards.length === 0 && !detailToFeedMelt ? Math.max(0, 1 - contentProgress * 3) : 0;
      const npIntro = Math.max(0, Math.min(1, (introElapsed - 1800) / 1200));

      // --- Hovered label / W logo detection ---
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const wb = wLogoBoundsRef.current;
      const wHovered = !isMobile && mx >= wb.x && mx < wb.x + wb.w && my >= wb.y && my < wb.y + wb.h;
      const mb = menuBoundsRef.current;
      const menuHovered = !isMobile && mx >= mb.x && mx < mb.x + mb.w && my >= mb.y && my < mb.y + mb.h;

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

      const RAMP = ".,':;|!ilc/1{[?eoasd0OkxXdpbWM#@@";
      const rampLen = RAMP.length;

      // --- Smooth lerp feed scroll ---
      const feedScrollDiff = feedScrollTarget - feedScrollOffset;
      feedScrollOffset = Math.abs(feedScrollDiff) < 0.01 ? feedScrollTarget : feedScrollOffset + feedScrollDiff * 0.08;

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

          // W logo — scatter-reveal on intro, highlight on hover
          if (wLogoMaskGrid[idx]) {
            let h3 = (c * 123456789 + r * 987654321) | 0;
            h3 = ((h3 ^ (h3 >>> 13)) * 1274126177) | 0;
            const logoHash = ((h3 ^ (h3 >>> 16)) & 0x7fff) / 0x7fff;
            if (logoMenuIntro > logoHash) {
              if (wHovered) {
                gridBg[idx] = 1;
              }
              gridSkip[idx] = 1;
            }
          }

          // Menu (+) icon — scatter-reveal on intro, highlight on hover
          if (menuMaskGrid[idx]) {
            let h4 = (c * 987654321 + r * 123456789) | 0;
            h4 = ((h4 ^ (h4 >>> 13)) * 1274126177) | 0;
            const menuHash = ((h4 ^ (h4 >>> 16)) & 0x7fff) / 0x7fff;
            if (logoMenuIntro > menuHash) {
              if (menuHovered) {
                gridBg[idx] = 1;
              }
              gridSkip[idx] = 1;
            }
          }

          // Name mask — scatter-reveal on intro, scatter-dissolve on scroll
          if (nameMaskGrid[idx]) {
            let h = (c * 374761393 + r * 668265263) | 0;
            h = ((h ^ (h >>> 13)) * 1274126177) | 0;
            const hash = ((h ^ (h >>> 16)) & 0x7fff) / 0x7fff;
            if (introProgress > hash && hash > nameFade) {
              gridSkip[idx] = 1;
            }
          }

          // Now-playing box: suppress terrain inside the box area
          if (npVisible > 0 && r >= npBoxTop && r <= npBoxBottom && c >= npBoxLeft && c <= npBoxRight) {
            let h5 = (c * 518230729 + r * 392041631) | 0;
            h5 = ((h5 ^ (h5 >>> 13)) * 1274126177) | 0;
            const npHash = ((h5 ^ (h5 >>> 16)) & 0x7fff) / 0x7fff;
            if (npIntro * npVisible > npHash) {
              gridSkip[idx] = 1;
            }
          }

          // Feed card boxes: suppress terrain inside card bounds
          if (contentTitleFade > 0 && feedCards.length > 0) {
            const scrolledR = r + feedScrollOffset;
            for (let fi = 0; fi < feedCards.length; fi++) {
              const fc = feedCards[fi];
              if (scrolledR >= fc.baseTop && scrolledR <= fc.baseBottom && c >= fc.left && c <= fc.right) {
                let hf = ((c + 7) * 374761393 + (r + 13) * 668265263) | 0;
                hf = ((hf ^ (hf >>> 13)) * 1274126177) | 0;
                const feedHash = ((hf ^ (hf >>> 16)) & 0x7fff) / 0x7fff;
                if (contentTitleFade * maskOpacity >= feedHash) {
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
                break;
              }
            }
          }

          // Content: scatter-reveal in, scatter-dissolve out (white on exit)
          if (contentTitleFade > 0 && contentTitleGrid[idx]) {
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
      if (contentProgress > 0 && !isFeedMode && !wasFeedMode) {
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
      if (detailToFeedMelt && d2fMeltProgress > 0) {
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

      // --- Feed card content ---
      if (contentTitleFade > 0 && feedCards.length > 0) {
        // Note: canDraw is the same helper as in the now-playing section.
        const canDraw = (r: number, c: number) => {
          if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
          return gridSkip[r * cols + c] === 1;
        };

        for (let fi = 0; fi < feedCards.length; fi++) {
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

        // Update hit detection bounds (after the feedCards rendering loop, before closing the if block)
        const newFeedBounds: { x: number; y: number; w: number; h: number }[] = [];
        for (let fi = 0; fi < feedCards.length; fi++) {
          const fc = feedCards[fi];
          const screenTop = Math.round(fc.baseTop - feedScrollOffset);
          const screenBottom = Math.round(fc.baseBottom - feedScrollOffset);
          if (screenBottom < 0 || screenTop >= rows) {
            newFeedBounds.push({ x: -1, y: -1, w: 0, h: 0 }); // off-screen placeholder
          } else {
            newFeedBounds.push({
              x: fc.left * charW,
              y: screenTop * charH,
              w: (fc.right - fc.left + 1) * charW,
              h: (screenBottom - screenTop + 1) * charH,
            });
          }
        }
        subItemBoundsRef.current = newFeedBounds;
      }

      // --- Now-playing box: border, equalizer bars, text ---
      if (npVisible > 0 && npTextStr && npBoxTop < rows) {
        ctx.font = `${fontSize}px 'JetBrains Mono','Courier New',monospace`;
        ctx.textBaseline = 'top';

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
          const colorIdx = Math.max(0, Math.min(COLOR_LEVELS - 1, (gridColors[idx] * 0.4) | 0));
          ctx.fillStyle = colorLUT[colorIdx];
          ctx.fillText(npLabelStr[i], c * charW, npLabelRow * charH);
        }

        // --- Track text (full brightness, scrolling if truncated) ---
        if (npFullTextStr.length > npMaxTextWidth) {
          // Pause-scroll-pause-scroll marquee with smoothstep easing
          const pad = '   ';
          const loopText = npFullTextStr + pad;
          const textLen = loopText.length;
          const halfLen = Math.ceil(textLen / 2);

          const pauseTime = 2.0; // seconds to hold still
          const scrollTime = Math.max(2, textLen / 4); // seconds per scroll segment
          const cycleTime = pauseTime + scrollTime + pauseTime + scrollTime;
          const t = ((ts / 1000) % cycleTime);

          // smoothstep: ease-in-out
          const ss = (x: number) => x * x * (3 - 2 * x);

          let scrollOffset: number;
          if (t < pauseTime) {
            scrollOffset = 0;
          } else if (t < pauseTime + scrollTime) {
            scrollOffset = ss((t - pauseTime) / scrollTime) * halfLen;
          } else if (t < pauseTime * 2 + scrollTime) {
            scrollOffset = halfLen;
          } else {
            scrollOffset = halfLen + ss((t - pauseTime * 2 - scrollTime) / scrollTime) * (textLen - halfLen);
          }

          const intOffset = Math.floor(scrollOffset);
          for (let i = 0; i < npMaxTextWidth; i++) {
            const charIndex = (intOffset + i) % textLen;
            const ch = loopText[charIndex];
            const c = npTextCol + i;
            if (!canDraw(npTextRow, c)) continue;
            const idx = npTextRow * cols + c;
            ctx.fillStyle = colorLUT[gridColors[idx]];
            ctx.fillText(ch, c * charW, npTextRow * charH);
          }
        } else {
          for (let i = 0; i < npTextStr.length; i++) {
            const c = npTextCol + i;
            if (!canDraw(npTextRow, c)) continue;
            const idx = npTextRow * cols + c;
            ctx.fillStyle = colorLUT[gridColors[idx]];
            ctx.fillText(npTextStr[i], c * charW, npTextRow * charH);
          }
        }
      }

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

      // W logo & menu — always clickable after intro
      if (logoMenuIntroProgressRef.current > 0.3) {
        const wb = wLogoBoundsRef.current;
        if (px >= wb.x && px < wb.x + wb.w && py >= wb.y && py < wb.y + wb.h) return 'logo';
        const mb = menuBoundsRef.current;
        if (px >= mb.x && px < mb.x + mb.w && py >= mb.y && py < mb.y + mb.h) return 'menu';
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
      document.body.style.cursor = hitTest(e.clientX, e.clientY) !== null ? 'pointer' : '';
    };

    const onClick = (e: MouseEvent) => {
      const hit = hitTest(e.clientX, e.clientY);
      if (hit === 'logo') {
        onLogoClickRef.current?.();
      } else if (hit === 'menu') {
        onMenuClickRef.current?.();
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
      }
    };

    const onWheel = (e: WheelEvent) => {
      // Only scroll when feed is open
      if (contentProgressRef.current < 0.5) return;
      const items = contentSubItemsRef?.current;
      if (!items || items.length === 0) return;

      const deltaRows = e.deltaY / (charH / canvasDpr);
      feedScrollTarget = Math.max(0, Math.min(feedMaxScroll, feedScrollTarget + deltaRows * 0.3));
      e.preventDefault();
    };

    let touchLastY = 0;

    const onTouchStart = (e: TouchEvent) => {
      if (contentProgressRef.current < 0.5) return;
      touchLastY = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
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
  }, [canvasRef, scrollProgressRef, buildMasks, speedDivisor, contrast, contentOpenRef, activeLabelRef, contentSubItemsRef, meltCompleteRef]);
}
