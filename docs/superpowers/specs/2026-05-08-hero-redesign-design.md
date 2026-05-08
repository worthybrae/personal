# Hero Redesign: Chromatic Drift ASCII Art

## Summary

Replace the broken video-background hero with an animated ASCII art display of "WORTHY RAE". Characters assemble from scattered positions, a color wave continuously sweeps across the name, and the text responds subtly to mouse movement. Full viewport takeover for maximum first impression.

## Architecture

### Component: `AsciiHero.tsx`

Replaces `Hero.tsx`. A single React component using an HTML5 `<canvas>` element for performant character rendering.

**Why canvas over DOM elements:** Rendering 100+ independently animated characters with per-frame position and color updates is expensive in the DOM. Canvas gives us direct pixel control with a single composite operation per frame, avoiding layout thrashing.

### Data Flow

1. **Init**: Generate ASCII art string for "WORTHY RAE" using block characters (`█ ╗ ║ ╔ ╚ ═ ╝`)
2. **Parse**: Convert the ASCII art into a list of `CharParticle` objects, each with a target position (where it belongs in the final text) and a random starting position (scattered across the viewport)
3. **Animate in**: Over ~2-3 seconds, each particle eases from its random start to its target position. Stagger slightly so it looks like they're streaming in, not snapping.
4. **Ambient state**: After assembly, particles have subtle continuous jitter — small sine-wave offsets on x/y so nothing feels static
5. **Color wave**: A hue offset sweeps across the x-axis over time, cycling through the neon palette (magenta → red → amber → green → cyan). Each character's color is determined by its x-position + the global time offset.
6. **Mouse interaction**: Track cursor position. Characters within a radius of the cursor get a repulsion force — they drift away slightly, then ease back when the cursor moves away.

### Particle Structure

```ts
interface CharParticle {
  char: string           // The ASCII character to render
  targetX: number        // Final x position in the assembled text
  targetY: number        // Final y position in the assembled text
  currentX: number       // Current animated x position
  currentY: number       // Current animated y position
  velocityX: number      // For physics-based mouse repulsion
  velocityY: number
  hue: number            // Current computed hue (from color wave)
  isBackground: boolean  // True for stray orbiting characters
}
```

### Color Wave

The neon palette mapped to hue values:
- Magenta: 324
- Red: 348
- Amber: 40
- Green: 152
- Cyan: 204

A time-based offset (`t * speed`) shifts across the x-axis. Each character computes its hue as:
```
hue = palette[floor((charX + timeOffset) % paletteLength)]
```

Interpolate between palette stops for smooth transitions. The wave should complete a full cycle every ~8-10 seconds — slow enough to feel ambient, fast enough to notice.

### Mouse Interaction

- Track mouse position via `mousemove` on the canvas
- Repulsion radius: ~120px
- Force: inverse-square falloff from cursor
- Characters pushed away snap back with spring physics (damping ~0.85, stiffness ~0.03)
- On mobile: no mouse interaction, ambient-only

### Background Characters

~15-20 stray ASCII block characters (`█ ╗ ║ ╔ ╚ ═`) orbit slowly in the background at low opacity (0.05-0.1). They follow slow elliptical paths. These give depth and reinforce the "assembling from chaos" feel.

## Layout

```
┌─────────────────────────────────────────────┐
│ WR                    websites art blog [CTA]│  ← Nav overlay (z-10)
│                                              │
│                                              │
│         ██╗    ██╗ ██████╗ ...               │
│         ██║    ██║██╔═══██╗...               │  ← ASCII art (canvas)
│         ...                                  │     100vh, centered
│         ██████╗  █████╗ ███████╗             │
│         ...                                  │
│                                              │
│                                              │
│        ENGINEER · ARTIST · BUILDER           │  ← Subtitle (HTML overlay)
│                    ↓                         │  ← Scroll indicator
└─────────────────────────────────────────────┘
│ ● LIVE  11 visitors ...          3 projects  │  ← StatsTicker (below)
```

- Hero: `h-screen` (full viewport)
- Canvas: absolute, fills the hero section
- Nav: absolute, top, z-index above canvas
- Subtitle + scroll indicator: absolute, bottom, z-index above canvas
- Resume button: removed from hero, added to nav as a link or moved to a section below

## Responsive

- **Desktop (md+)**: Full-size ASCII art, mouse interaction active
- **Mobile**: Smaller ASCII art (scaled down font size on canvas), no mouse interaction, ambient drift only. May need to use a shorter/simpler ASCII font to fit narrow screens — or just scale the canvas and let it be cropped on the sides.

## Performance

- `requestAnimationFrame` loop for smooth 60fps
- Canvas rendering (no DOM particle elements)
- Cleanup: cancel animation frame on unmount
- Throttle mousemove to every ~16ms (already synced with rAF)
- Particle count: ~300-500 for the ASCII text + ~20 background = manageable

## Files to Modify

1. **Create** `src/components/Dashboard/AsciiHero.tsx` — new hero component
2. **Edit** `src/pages/Home.tsx` — swap `Hero` import for `AsciiHero`
3. **Edit or delete** `src/components/Dashboard/Hero.tsx` — no longer needed
4. **Edit** nav in `AsciiHero.tsx` — add resume link to nav (moved from hero body)

## Dependencies

None — pure canvas API + React. No Three.js, no external animation libraries needed.

## Out of Scope

- Video background (removed entirely)
- Art panel in hero (video stays in the art section only)
- Blog/project previews in hero
