// src/components/Dashboard/useTerrainAnimation.ts

import { useEffect, useRef, useCallback } from 'react';
import { warpedTerrain } from './noise';
import { getDuotoneColor, charForVal, scurve } from './color';

const NOISE_SCALE = 0.015;

export function useTerrainAnimation(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
) {
  const rafRef = useRef(0);
  const nameMaskRef = useRef<{
    data: Uint8ClampedArray;
    width: number;
    height: number;
  } | null>(null);

  const buildNameMask = useCallback(
    (canvasWidth: number, canvasHeight: number) => {
      const off = document.createElement('canvas');
      off.width = canvasWidth;
      off.height = canvasHeight;
      const o = off.getContext('2d')!;
      o.fillStyle = '#000';
      o.fillRect(0, 0, off.width, off.height);
      const lineH = off.height * 0.18;
      const centerY = off.height * 0.5;
      o.fillStyle = '#fff';
      o.textAlign = 'center';
      o.textBaseline = 'middle';
      o.font = `900 ${lineH}px 'Arial Black','Impact','Helvetica Neue',sans-serif`;
      o.fillText('WORTHY', off.width / 2, centerY - lineH * 0.55);
      o.font = `900 ${lineH * 0.85}px 'Arial Black','Impact','Helvetica Neue',sans-serif`;
      o.fillText('RAE', off.width / 2, centerY + lineH * 0.55);
      const imageData = o.getImageData(0, 0, off.width, off.height);
      nameMaskRef.current = {
        data: imageData.data,
        width: off.width,
        height: off.height,
      };
    },
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cols = 0;
    let rows = 0;
    let fontSize = 0;
    let lastBg = { r: 10, g: 18, b: 30 };

    function resize() {
      if (!canvas) return;
      const dpr = devicePixelRatio;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      fontSize = Math.max(5, Math.min(9, window.innerWidth / 180)) * dpr;
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

    function draw(ts: number) {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const t = ts / 4000;

      // Background fill from current duotone
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
          val = scurve(val, 8);

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

    resize();
    rafRef.current = requestAnimationFrame(draw);
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [canvasRef, buildNameMask]);
}
