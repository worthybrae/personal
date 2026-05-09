// src/components/Dashboard/useTerrainAnimation.ts

import { useEffect, useRef, useCallback } from 'react';
import { warpedTerrain } from './noise';
import { getDuotoneColor, charForVal, scurve } from './color';

const NOISE_SCALE = 0.015;

interface NavRegion {
  label: string;
  href: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TerrainConfig {
  /** Animation speed divisor — higher = slower. Default 4000 (hero). Use 8000 for background. */
  speedDivisor?: number;
  /** Whether to render the name mask ("WORTHY RAE") and nav links. Default true. */
  showNameMask?: boolean;
  /** S-curve contrast exponent. Default 8. Use 5-6 for subtler background. */
  contrast?: number;
}

export function useTerrainAnimation(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  config: TerrainConfig = {},
) {
  const { speedDivisor = 4000, showNameMask = true, contrast = 8 } = config;
  const rafRef = useRef(0);
  const nameMaskRef = useRef<{
    data: Uint8ClampedArray;
    width: number;
    height: number;
  } | null>(null);
  const navRegionsRef = useRef<NavRegion[]>([]);

  const buildNameMask = useCallback(
    (canvasWidth: number, canvasHeight: number) => {
      const off = document.createElement('canvas');
      off.width = canvasWidth;
      off.height = canvasHeight;
      const o = off.getContext('2d')!;
      o.fillStyle = '#000';
      o.fillRect(0, 0, off.width, off.height);

      if (!showNameMask) {
        navRegionsRef.current = [];
        const imageData = o.getImageData(0, 0, off.width, off.height);
        nameMaskRef.current = {
          data: imageData.data,
          width: off.width,
          height: off.height,
        };
        return;
      }

      const isPortrait = canvasHeight > canvasWidth;
      const lineH = isPortrait ? canvasWidth * 0.2 : canvasHeight * 0.18;
      const centerY = off.height * (isPortrait ? 0.35 : 0.5);
      o.fillStyle = '#fff';
      o.textAlign = 'center';
      o.textBaseline = 'middle';
      o.font = `900 ${lineH}px 'Arial Black','Impact','Helvetica Neue',sans-serif`;
      o.fillText('WORTHY', off.width / 2, centerY - lineH * 0.55);
      o.font = `900 ${lineH * 0.85}px 'Arial Black','Impact','Helvetica Neue',sans-serif`;
      o.fillText('RAE', off.width / 2, centerY + lineH * 0.55);

      // Nav at the bottom of the screen — same mask rendering
      const navH = isPortrait ? lineH * 0.8 : lineH * 0.5;
      o.font = `900 ${navH}px 'Arial Black','Impact','Helvetica Neue',sans-serif`;
      o.textAlign = 'center';

      if (isPortrait) {
        // Vertical stack on mobile
        const navLabels = ['APPS', 'ART', 'BLOG'];
        const navHrefs = ['/apps', '/art', '/blog'];
        const navStartY = canvasHeight * 0.68;
        const navGap = navH * 1.3;

        navRegionsRef.current = [];
        for (let i = 0; i < navLabels.length; i++) {
          const label = navLabels[i];
          const y = navStartY + i * navGap;
          o.fillText(label, off.width / 2, y);
          const w = o.measureText(label).width;
          navRegionsRef.current.push({
            label,
            href: navHrefs[i],
            x: off.width / 2 - w / 2,
            y: y - navH * 0.5,
            w,
            h: navH * 1.2,
          });
        }
      } else {
        // Desktop: spread into corners along the bottom
        const navY = canvasHeight * 0.94;
        const pad = canvasWidth * 0.05;

        const navLabels = ['APPS', 'ART', 'BLOG'];
        const navHrefs = ['/apps', '/art', '/blog'];
        const aligns: CanvasTextAlign[] = ['left', 'center', 'right'];
        const xPositions = [pad, off.width / 2, off.width - pad];

        navRegionsRef.current = [];
        for (let i = 0; i < navLabels.length; i++) {
          o.textAlign = aligns[i];
          o.fillText(navLabels[i], xPositions[i], navY);
          const w = o.measureText(navLabels[i]).width;
          const x = aligns[i] === 'left' ? xPositions[i]
            : aligns[i] === 'right' ? xPositions[i] - w
            : xPositions[i] - w / 2;
          navRegionsRef.current.push({
            label: navLabels[i],
            href: navHrefs[i],
            x,
            y: navY - navH * 0.5,
            w,
            h: navH * 1.2,
          });
        }
        o.textAlign = 'center';
      }

      const imageData = o.getImageData(0, 0, off.width, off.height);
      nameMaskRef.current = {
        data: imageData.data,
        width: off.width,
        height: off.height,
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
    let lastBg = { r: 10, g: 18, b: 30 };

    const isMobile = window.innerWidth < 768;

    function resize() {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio, isMobile ? 2 : window.devicePixelRatio);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      fontSize = isMobile
        ? Math.max(7, Math.min(12, window.innerWidth / 100)) * dpr
        : Math.max(5, Math.min(9, window.innerWidth / 180)) * dpr;
      cols = Math.floor(canvas.width / (fontSize * 0.602));
      rows = Math.floor(canvas.height / (fontSize * 1.0));
      buildNameMask(canvas.width, canvas.height);
    }

    function isName(px: number, py: number): boolean {
      const mask = nameMaskRef.current;
      if (!mask) return false;
      const ix = Math.floor(px);
      const iy = Math.floor(py);
      if (ix < 0 || ix >= mask.width || iy < 0 || iy >= mask.height) return false;
      return mask.data[(iy * mask.width + ix) * 4] > 128;
    }

    let lastDrawTime = 0;

    function draw(ts: number) {
      if (!canvas) return;
      if (isMobile && ts - lastDrawTime < 32) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }
      lastDrawTime = ts;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const t = ts / speedDivisor;

      const bgSample = getDuotoneColor(0, t);
      lastBg = { r: bgSample.bgR, g: bgSample.bgG, b: bgSample.bgB };
      ctx.fillStyle = `rgb(${Math.floor(lastBg.r)},${Math.floor(lastBg.g)},${Math.floor(lastBg.b)})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const charW = fontSize * 0.602;
      const charH = fontSize * 1.0;

      ctx.font = `${fontSize}px 'JetBrains Mono','Courier New',monospace`;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';

      for (let r = 0; r < rows; r++) {
        const py = r * charH;
        for (let c = 0; c < cols; c++) {
          const px = c * charW;
          const nx = c * NOISE_SCALE;
          const ny = r * NOISE_SCALE;

          let elev = warpedTerrain(nx, ny, t);
          let val = (elev + 0.5) / 1.8;
          val = Math.max(0, Math.min(1, val));
          val = scurve(val, contrast);

          const nameHit = isName(px, py);

          if (nameHit) {
            const boosted = Math.min(0.999, val * 0.2 + 0.8);
            const ch = charForVal(boosted);
            const pulse = 0.93 + 0.07 * Math.sin(t * 2 + c * 0.01);
            const b = Math.min(255, Math.floor(255 * pulse));
            ctx.fillStyle = `rgb(${b},${b},${b})`;
            ctx.font = `bold ${fontSize}px 'JetBrains Mono','Courier New',monospace`;
            ctx.fillText(ch, px, py);
            ctx.font = `${fontSize}px 'JetBrains Mono','Courier New',monospace`;
          } else {
            const ch = charForVal(val);
            const col = getDuotoneColor(val, t);
            const dim = 0.35 + val * 1.15;
            const mr = Math.min(255, Math.max(Math.floor(lastBg.r + 10), Math.floor(col.r * dim)));
            const mg = Math.min(255, Math.max(Math.floor(lastBg.g + 10), Math.floor(col.g * dim)));
            const mb = Math.min(255, Math.max(Math.floor(lastBg.b + 10), Math.floor(col.b * dim)));
            ctx.fillStyle = `rgb(${mr},${mg},${mb})`;
            ctx.fillText(ch, px, py);
          }
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    function hitTest(clientX: number, clientY: number): NavRegion | null {
      const rect = canvas!.getBoundingClientRect();
      const dpr = canvas!.width / rect.width;
      const mx = (clientX - rect.left) * dpr;
      const my = (clientY - rect.top) * dpr;
      for (const region of navRegionsRef.current) {
        if (mx >= region.x && mx <= region.x + region.w && my >= region.y && my <= region.y + region.h) {
          return region;
        }
      }
      return null;
    }

    function navigate(hit: NavRegion) {
      if (hit.href.startsWith('http')) {
        window.open(hit.href, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = hit.href;
      }
    }

    function handleClick(e: MouseEvent) {
      const hit = hitTest(e.clientX, e.clientY);
      if (hit) navigate(hit);
    }

    function handleTouchEnd(e: TouchEvent) {
      const touch = e.changedTouches[0];
      if (!touch) return;
      const hit = hitTest(touch.clientX, touch.clientY);
      if (hit) {
        e.preventDefault();
        navigate(hit);
      }
    }

    function handleMouseMove(e: MouseEvent) {
      canvas!.style.cursor = hitTest(e.clientX, e.clientY) ? 'pointer' : 'default';
    }

    resize();
    rafRef.current = requestAnimationFrame(draw);
    window.addEventListener('resize', resize);
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('mousemove', handleMouseMove);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      canvas!.removeEventListener('click', handleClick);
      canvas!.removeEventListener('touchend', handleTouchEnd);
      canvas!.removeEventListener('mousemove', handleMouseMove);
    };
  }, [canvasRef, buildNameMask, speedDivisor, contrast]);
}
