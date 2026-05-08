# Hero Redesign: Chromatic Drift ASCII Art — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the video-background hero with an animated ASCII art display of "WORTHY RAE" that assembles from scattered characters, cycles through neon colors, and reacts to mouse movement.

**Architecture:** A single `AsciiHero` React component renders an HTML5 canvas covering the full viewport. Animation logic lives in a custom hook `useAsciiAnimation` that manages particle state, spring physics, color cycling, and the requestAnimationFrame loop. ASCII art data is a static constant in its own file.

**Tech Stack:** React, TypeScript, HTML5 Canvas API, no external dependencies.

**Note:** This project has no test framework configured. Canvas animation is best verified visually, so each task includes manual verification steps using the dev server (`npm run dev`).

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/components/Dashboard/ascii-art.ts` | ASCII art constant + parser that converts it to `{char, col, row}[]` |
| Create | `src/components/Dashboard/useAsciiAnimation.ts` | Custom hook: particle lifecycle, physics, color wave, mouse tracking, rAF loop |
| Create | `src/components/Dashboard/AsciiHero.tsx` | React component: canvas element, nav overlay, subtitle, scroll indicator |
| Modify | `src/pages/Home.tsx` | Swap `Hero` import for `AsciiHero` |
| Delete | `src/components/Dashboard/Hero.tsx` | No longer needed |

---

### Task 1: ASCII Art Data & Parser

**Files:**
- Create: `src/components/Dashboard/ascii-art.ts`

- [ ] **Step 1: Create the ASCII art constant and parser**

```ts
// src/components/Dashboard/ascii-art.ts

const WORTHY_ART = `
██╗    ██╗ ██████╗ ██████╗ ████████╗██╗  ██╗██╗   ██╗
██║    ██║██╔═══██╗██╔══██╗╚══██╔══╝██║  ██║╚██╗ ██╔╝
██║ █╗ ██║██║   ██║██████╔╝   ██║   ███████║ ╚████╔╝ 
██║███╗██║██║   ██║██╔══██╗   ██║   ██╔══██║  ╚██╔╝  
╚███╔███╔╝╚██████╔╝██║  ██║   ██║   ██║  ██║   ██║   
 ╚══╝╚══╝  ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝   ╚═╝   `;

const RAE_ART = `
██████╗  █████╗ ███████╗
██╔══██╗██╔══██╗██╔════╝
██████╔╝███████║█████╗  
██╔══██╗██╔══██║██╔══╝  
██║  ██║██║  ██║███████╗
╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝`;

export interface AsciiChar {
  char: string;
  col: number;
  row: number;
}

/**
 * Parse an ASCII art string into positioned characters.
 * Skips spaces — only non-space characters become particles.
 */
function parseArt(art: string, colOffset: number, rowOffset: number): AsciiChar[] {
  const chars: AsciiChar[] = [];
  const lines = art.split('\n').filter((l) => l.length > 0);
  for (let row = 0; row < lines.length; row++) {
    for (let col = 0; col < lines[row].length; col++) {
      const char = lines[row][col];
      if (char !== ' ') {
        chars.push({ char, col: col + colOffset, row: row + rowOffset });
      }
    }
  }
  return chars;
}

export function getAsciiChars(): { chars: AsciiChar[]; totalCols: number; totalRows: number } {
  const worthyLines = WORTHY_ART.split('\n').filter((l) => l.length > 0);
  const raeLines = RAE_ART.split('\n').filter((l) => l.length > 0);

  const worthyCols = Math.max(...worthyLines.map((l) => l.length));
  const raeCols = Math.max(...raeLines.map((l) => l.length));
  const totalCols = Math.max(worthyCols, raeCols);

  // Center RAE horizontally under WORTHY
  const raeColOffset = Math.floor((worthyCols - raeCols) / 2);

  const worthyChars = parseArt(WORTHY_ART, 0, 0);
  const raeChars = parseArt(RAE_ART, raeColOffset, worthyLines.length + 1);

  const totalRows = worthyLines.length + 1 + raeLines.length;

  return {
    chars: [...worthyChars, ...raeChars],
    totalCols,
    totalRows,
  };
}

/** Characters used for background floating particles */
export const BACKGROUND_CHARS = ['█', '╗', '║', '╔', '╚', '═', '╝', '╬', '░', '▒'];
```

- [ ] **Step 2: Verify the module compiles**

Run: `npx tsc --noEmit src/components/Dashboard/ascii-art.ts`

If this fails due to tsconfig module issues, just check the dev server: `npm run dev` — Vite will report any syntax errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/Dashboard/ascii-art.ts
git commit -m "feat(hero): add ASCII art data and parser for WORTHY RAE"
```

---

### Task 2: Animation Hook — Particle System & Color Wave

**Files:**
- Create: `src/components/Dashboard/useAsciiAnimation.ts`

- [ ] **Step 1: Create the animation hook**

```ts
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
      const height = canvas.clientHeight;
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
```

- [ ] **Step 2: Verify the module compiles**

Run `npm run dev` and check the terminal for TypeScript/Vite errors. The hook isn't used yet, so no visual output — just confirm no compilation errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/Dashboard/useAsciiAnimation.ts
git commit -m "feat(hero): add ASCII animation hook with particle physics and color wave"
```

---

### Task 3: AsciiHero Component

**Files:**
- Create: `src/components/Dashboard/AsciiHero.tsx`

- [ ] **Step 1: Create the AsciiHero component**

```tsx
// src/components/Dashboard/AsciiHero.tsx

import { useRef } from 'react';
import { Link } from 'react-router-dom';
import ContactForm from '@/components/global/ContactForm';
import { useAsciiAnimation } from './useAsciiAnimation';

export default function AsciiHero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useAsciiAnimation(canvasRef);

  return (
    <section className="relative h-screen overflow-hidden bg-[#08080c]">
      {/* Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Nav */}
      <nav className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-4">
        <Link to="/" className="font-mono text-sm font-bold text-white tracking-widest">
          WR
        </Link>
        <div className="hidden md:flex items-center gap-6 font-mono text-xs">
          <a href="#websites" className="text-cyber-cyan hover:opacity-80 transition-opacity">
            websites
          </a>
          <a href="#art" className="text-cyber-magenta hover:opacity-80 transition-opacity">
            art
          </a>
          <a href="#blog" className="text-cyber-amber hover:opacity-80 transition-opacity">
            blog
          </a>
          <a
            href="https://portfolio-worthy.s3.amazonaws.com/resume.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/60 hover:text-white transition-colors"
          >
            resume
          </a>
          <ContactForm compact />
        </div>
      </nav>

      {/* Bottom overlay: subtitle + scroll indicator */}
      <div className="absolute bottom-0 left-0 right-0 z-10 flex flex-col items-center pb-8">
        <p className="font-mono text-xs text-white/30 tracking-[0.25em] mb-6">
          ENGINEER · ARTIST · BUILDER
        </p>
        <div className="w-px h-8 bg-gradient-to-b from-white/20 to-transparent animate-pulse" />
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify compilation**

Run `npm run dev`. The component isn't wired in yet, so just confirm no errors in the terminal.

- [ ] **Step 3: Commit**

```bash
git add src/components/Dashboard/AsciiHero.tsx
git commit -m "feat(hero): add AsciiHero component with nav and scroll indicator"
```

---

### Task 4: Wire Into Home Page & Remove Old Hero

**Files:**
- Modify: `src/pages/Home.tsx`
- Delete: `src/components/Dashboard/Hero.tsx`

- [ ] **Step 1: Update Home.tsx to use AsciiHero**

In `src/pages/Home.tsx`, replace the Hero import:

```ts
// Change this:
import Hero from '@/components/Dashboard/Hero';

// To this:
import AsciiHero from '@/components/Dashboard/AsciiHero';
```

And in the JSX, replace `<Hero />` with `<AsciiHero />`:

```tsx
export default function Home() {
  return (
    <div className="min-h-screen bg-[#08080c]">
      <AsciiHero />
      <StatsTicker />
      <WebsitesPanel />
      <div className="mx-6 h-px bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />
      <ArtPanel />
      <div className="mx-6 h-px bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />
      <BlogPanel />
      <Footer />
    </div>
  );
}
```

- [ ] **Step 2: Delete the old Hero component**

```bash
rm src/components/Dashboard/Hero.tsx
```

- [ ] **Step 3: Verify in browser**

Run `npm run dev` and open the site. You should see:
- Full-viewport dark background
- ASCII characters scattered then assembling into "WORTHY RAE"
- Color wave cycling through neon palette
- Mouse cursor causing nearby characters to ripple away
- Nav overlaid at top
- Subtitle and scroll indicator at bottom
- StatsTicker and rest of page visible on scroll

- [ ] **Step 4: Commit**

```bash
git add src/pages/Home.tsx
git rm src/components/Dashboard/Hero.tsx
git commit -m "feat(hero): replace video hero with chromatic drift ASCII art"
```

---

### Task 5: Polish & Tuning

**Files:**
- Modify: `src/components/Dashboard/useAsciiAnimation.ts` (if needed)
- Modify: `src/components/Dashboard/AsciiHero.tsx` (if needed)

This is a tuning pass. Run the dev server and adjust these values based on how it looks:

- [ ] **Step 1: Check assembly animation timing**

Open the site and watch the initial load. Characters should stream in over ~2-3 seconds, not all snap at once. If it's too fast or too slow, adjust `ASSEMBLY_DURATION` in `useAsciiAnimation.ts`.

- [ ] **Step 2: Check color wave speed**

Watch the color cycling for 10+ seconds. A full palette cycle should take ~8-10 seconds. Adjust `COLOR_WAVE_SPEED` if needed.

- [ ] **Step 3: Check mouse interaction**

Move the cursor over the assembled text. Characters should push away gently and spring back. If the effect is too strong/weak, adjust `MOUSE_RADIUS` and `MOUSE_FORCE`. If it's too stiff or too bouncy, adjust `SPRING_STIFFNESS` and `DAMPING`.

- [ ] **Step 4: Check mobile layout**

Open browser devtools, toggle mobile viewport (375px width). The ASCII art should scale down to fit. No mouse interaction on mobile. If the text is too small or overflows, adjust the mobile `fontSize` calculation in the `init` function.

- [ ] **Step 5: Check background particles**

Verify ~18 faint characters are slowly orbiting in the background. They should be barely visible (opacity 0.04-0.1). Adjust `BG_PARTICLE_COUNT` and opacity range if needed.

- [ ] **Step 6: Verify build passes**

```bash
npm run build
```

Expected: clean build, no TypeScript errors.

- [ ] **Step 7: Commit any tuning changes**

```bash
git add -A
git commit -m "fix(hero): tune animation timing and physics values"
```

Only commit if changes were made. Skip if everything looked good as-is.
