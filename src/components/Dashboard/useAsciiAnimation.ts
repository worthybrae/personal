// src/components/Dashboard/useAsciiAnimation.ts

import { useRef, useEffect, useCallback } from 'react';
import { getAsciiChars, BACKGROUND_CHARS, type AsciiChar } from './ascii-art';

// --- Neon palette hue stops (cycled through continuously) ---
const PALETTE = [324, 348, 40, 152, 204]; // magenta, red, amber, green, cyan
const COLOR_WAVE_SPEED = 0.00008; // Full cycle every ~8-10s
const COLOR_WAVE_SPREAD = 0.005; // How much x-position affects hue

// --- Physics ---
const SPRING_STIFFNESS = 0.03;
const DAMPING = 0.85;
const MOUSE_RADIUS = 120;
const MOUSE_FORCE = 800;
const AMBIENT_AMPLITUDE = 1.5; // px of sine-wave jitter
const AMBIENT_SPEED = 0.0008;
const ASSEMBLY_DURATION = 2500; // ms

// --- Background particles ---
const BG_PARTICLE_COUNT = 18;

interface Particle {
  char: string;
  targetX: number;
  targetY: number;
  currentX: number;
  currentY: number;
  velocityX: number;
  velocityY: number;
  assemblyDelay: number; // stagger: 0..1
  opacity: number;
  isBackground: boolean;
  bgAngle: number; // for elliptical orbit
  bgRadiusX: number;
  bgRadiusY: number;
  bgSpeed: number;
  bgCenterX: number;
  bgCenterY: number;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Interpolate through the neon palette based on a 0..1 value */
function paletteHue(t: number): number {
  const normalized = ((t % 1) + 1) % 1; // ensure 0..1
  const index = normalized * PALETTE.length;
  const i = Math.floor(index);
  const frac = index - i;
  const hueA = PALETTE[i % PALETTE.length];
  const hueB = PALETTE[(i + 1) % PALETTE.length];

  // Shortest-path hue interpolation
  let diff = hueB - hueA;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return ((hueA + diff * frac) % 360 + 360) % 360;
}

export function useAsciiAnimation(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const startTimeRef = useRef(0);
  const rafRef = useRef(0);

  const init = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { chars, totalCols, totalRows } = getAsciiChars();
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    // Compute font size and offset to center the ASCII art
    const isMobile = width < 768;
    const fontSize = isMobile
      ? Math.min(width / (totalCols * 0.65), height / (totalRows * 2))
      : Math.min(width / (totalCols * 0.7), height / (totalRows * 1.8));
    const charWidth = fontSize * 0.6;
    const charHeight = fontSize * 1.15;

    const artWidth = totalCols * charWidth;
    const artHeight = totalRows * charHeight;
    const offsetX = (width - artWidth) / 2;
    const offsetY = (height - artHeight) / 2 - height * 0.03; // slight upward shift for subtitle room

    // Create text particles
    const textParticles: Particle[] = chars.map((ac: AsciiChar, i: number) => {
      const targetX = offsetX + ac.col * charWidth;
      const targetY = offsetY + ac.row * charHeight;

      // Random starting position (scattered across viewport)
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.max(width, height) * (0.5 + Math.random() * 0.5);
      const startX = width / 2 + Math.cos(angle) * dist;
      const startY = height / 2 + Math.sin(angle) * dist;

      return {
        char: ac.char,
        targetX,
        targetY,
        currentX: startX,
        currentY: startY,
        velocityX: 0,
        velocityY: 0,
        assemblyDelay: i / chars.length, // stagger
        opacity: 1,
        isBackground: false,
        bgAngle: 0,
        bgRadiusX: 0,
        bgRadiusY: 0,
        bgSpeed: 0,
        bgCenterX: 0,
        bgCenterY: 0,
      };
    });

    // Create background floating particles
    const bgParticles: Particle[] = Array.from({ length: BG_PARTICLE_COUNT }, () => {
      const centerX = Math.random() * width;
      const centerY = Math.random() * height;
      return {
        char: BACKGROUND_CHARS[Math.floor(Math.random() * BACKGROUND_CHARS.length)],
        targetX: 0,
        targetY: 0,
        currentX: centerX,
        currentY: centerY,
        velocityX: 0,
        velocityY: 0,
        assemblyDelay: 0,
        opacity: 0.04 + Math.random() * 0.06,
        isBackground: true,
        bgAngle: Math.random() * Math.PI * 2,
        bgRadiusX: 30 + Math.random() * 80,
        bgRadiusY: 20 + Math.random() * 50,
        bgSpeed: 0.0002 + Math.random() * 0.0004,
        bgCenterX: centerX,
        bgCenterY: centerY,
      };
    });

    particlesRef.current = [...textParticles, ...bgParticles];
    startTimeRef.current = performance.now();

    return { fontSize, dpr };
  }, [canvasRef]);

  const animate = useCallback(
    (fontSize: number, dpr: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.clientWidth;
      const isMobile = width < 768;

      const loop = (now: number) => {
        const elapsed = now - startTimeRef.current;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = `${fontSize * dpr}px "JetBrains Mono", "Courier New", monospace`;
        ctx.textBaseline = 'top';

        const mouse = mouseRef.current;

        for (const p of particlesRef.current) {
          if (p.isBackground) {
            // Elliptical orbit
            p.bgAngle += p.bgSpeed;
            p.currentX = p.bgCenterX + Math.cos(p.bgAngle) * p.bgRadiusX;
            p.currentY = p.bgCenterY + Math.sin(p.bgAngle) * p.bgRadiusY;
          } else {
            // Assembly phase
            const assemblyT = Math.min(1, (elapsed - p.assemblyDelay * ASSEMBLY_DURATION * 0.5) / ASSEMBLY_DURATION);
            const eased = easeOutCubic(Math.max(0, assemblyT));

            if (assemblyT < 1) {
              // Still assembling: interpolate from start to target
              const initialX = p.currentX;
              const initialY = p.currentY;
              p.currentX = lerp(initialX, p.targetX, eased * 0.08);
              p.currentY = lerp(initialY, p.targetY, eased * 0.08);
            } else {
              // Assembled: spring physics toward target + ambient jitter
              const ambientX = Math.sin(now * AMBIENT_SPEED + p.targetX * 0.01) * AMBIENT_AMPLITUDE;
              const ambientY = Math.cos(now * AMBIENT_SPEED * 0.7 + p.targetY * 0.01) * AMBIENT_AMPLITUDE;

              const goalX = p.targetX + ambientX;
              const goalY = p.targetY + ambientY;

              // Mouse repulsion (desktop only)
              let repelX = 0;
              let repelY = 0;
              if (!isMobile) {
                const dx = p.currentX - mouse.x;
                const dy = p.currentY - mouse.y;
                const distSq = dx * dx + dy * dy;
                if (distSq < MOUSE_RADIUS * MOUSE_RADIUS && distSq > 0) {
                  const dist = Math.sqrt(distSq);
                  const force = MOUSE_FORCE / distSq;
                  repelX = (dx / dist) * force;
                  repelY = (dy / dist) * force;
                }
              }

              // Spring toward goal + repulsion
              const forceX = (goalX - p.currentX) * SPRING_STIFFNESS + repelX;
              const forceY = (goalY - p.currentY) * SPRING_STIFFNESS + repelY;
              p.velocityX = (p.velocityX + forceX) * DAMPING;
              p.velocityY = (p.velocityY + forceY) * DAMPING;
              p.currentX += p.velocityX;
              p.currentY += p.velocityY;
            }
          }

          // Color wave: hue based on x-position + time
          const colorT = p.currentX * COLOR_WAVE_SPREAD + now * COLOR_WAVE_SPEED;
          const hue = paletteHue(colorT);

          ctx.fillStyle = p.isBackground
            ? `hsla(${hue}, 100%, 50%, ${p.opacity})`
            : `hsla(${hue}, 100%, 60%, ${p.opacity})`;
          ctx.fillText(p.char, p.currentX * dpr, p.currentY * dpr);
        }

        rafRef.current = requestAnimationFrame(loop);
      };

      rafRef.current = requestAnimationFrame(loop);
    },
    [canvasRef],
  );

  useEffect(() => {
    const result = init();
    if (!result) return;

    animate(result.fontSize, result.dpr);

    // Mouse tracking
    const canvas = canvasRef.current;
    const handleMouseMove = (e: MouseEvent) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const handleMouseLeave = () => {
      mouseRef.current = { x: -9999, y: -9999 };
    };

    canvas?.addEventListener('mousemove', handleMouseMove);
    canvas?.addEventListener('mouseleave', handleMouseLeave);

    // Resize handler
    const handleResize = () => {
      cancelAnimationFrame(rafRef.current);
      const result = init();
      if (result) animate(result.fontSize, result.dpr);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      canvas?.removeEventListener('mousemove', handleMouseMove);
      canvas?.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);
    };
  }, [canvasRef, init, animate]);
}
