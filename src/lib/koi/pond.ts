// Night pond: a dark pond seen from above, with fish made of small square tiles that swim on smooth curves.
// Fish come in four kinds, and the rarer the kind, the less often it shows:
// - common: three pond fish (white and orange, gold, slate) that circle the pond all the time;
// - glowing: a trio of small lantern fish with cyan lights, a violet one and a see-through ghost fish, that pass by
//   every minute or three;
// - rare: a crimson fish flecked with gold, with butterfly fins, about once every five minutes;
// - very rare: a pearl fish that shimmers through every colour, about once every fifteen minutes;
// - legendary: a jade dragon with a gold crest and whiskers, about once every half hour.
// Every motion is a whole shape gliding, turning or fading, never a jump, so it stays smooth.
// Pure string building: no DOM, nothing read from outside this file.

const W = 1600
const H = 1000

import type { Sky } from './types'
import { gateCss, lightCss, lightLayer } from './light'
import { conditionOf, localSeconds, type Conditions } from './weather'
import { PADS_CSS, padsSvg } from './pads'
import { seasonOf, VEIL, VEIL_DEF } from './surface'
import { DASHES, WIDTHS, addTile, drawBacking, drawRuns, drawSolid, hashOf, n1, shade, short, smoothPath, widthClass, type Point, type Tiles } from './tiles'


// ---------- fish ----------

/** A tile's colour from its place along (i) and across (j) the body, how far along (t), the half-width there (w), and
 *  the day's seed, so a breed's patches fall differently from one day to the next. */
type Paint = (i: number, j: number, t: number, w: number, seed: number) => string

/** The glowing fish's lights: a class each, and its colour; a tight bright edge and a wider faint one round the fish's
 *  own outline, brighter at night. */
const GLOWS: Record<string, readonly [string, string]> = {
  glowCyan: ['hc', '#4ff0e0'],
  glowViolet: ['hv', '#b07bff'],
  glowRuby: ['hr', '#ff5a5a'],
  glowPearl: ['hp', '#f4efff'],
  glowStar: ['hs', '#8fa8ff'],
  glowGold: ['hg', '#ffc95a'],
  glowEmber: ['he', '#ff8a3d'],
  glowMint: ['hm', '#7dffb0'],
  glowRose: ['hn', '#ff7ad9'],
}

type Species = {
  /** Body length and widest half-width, in tiles; the tile size in px. */
  length: number
  width: number
  tile: number
  /** Body profile: 'fish' bulges behind the head and tapers to the tail; 'eel' stays slim the whole way. */
  shape?: 'fish' | 'eel'
  /** How many pieces the body bends in, and how far each bends: more pieces make a smoother wave. */
  segments: number
  sway: number
  /** Tail fan length in tiles, how fast it widens, and whether it is forked or long and flowing. */
  tailLength: number
  tailSpread: number
  forked?: boolean
  flowing?: boolean
  /** The tail's shape; without one, a flowing tail flows, a forked one forks, and the rest fan. */
  tail?: Tail
  body: Paint
  fin: string
  finOpacity: number
  /** Side fins: how long, in tiles; long ones trail like wings. */
  finLength?: number
  /** A crest of fin tiles along the spine, in this colour. */
  crest?: string
  /** Edge tiles in this colour instead of shaded: a lit outline for the glowing kinds. */
  outline?: string
  /** See-through body, its spine kept solid. */
  ghost?: boolean
  /** Whiskers from the snout, in this colour. */
  whiskers?: string
  eye?: string
  /** Seconds for one beat of the tail. */
  beat: number
  /** A soft light round the fish, in a gradient from `defs`. */
  glow?: string
  glowSize?: number
  /** Tiles drawn over the body in bright colours that cycle through every hue. */
  shimmer?: boolean
  /** Ginrin: this share of the scales catch the light and twinkle, in this colour (white if not given). */
  sparkle?: number
  sparkleColour?: string
  /** Drawn this much larger or smaller than its tiles. */
  size?: number
  /** No shadow on the floor: the fish gives off light, or light passes through it. */
  noShadow?: boolean
}

/** The tails there are: a plain fan, forked, long and flowing, rounded, a lyre with long outer streamers, a deep
 *  swallowtail, a twin tail of two fans, a pointed spade, and a crescent. */
export const TAILS = ['fan', 'fork', 'flow', 'round', 'lyre', 'swallow', 'twin', 'spade', 'crescent'] as const
type Tail = (typeof TAILS)[number]

/** A tail's length in tiles, its half-width a step (k) back from the root, and whether the tile at (k, j) is part of it. */
function tailShape(style: Tail, L: number, spread: number): { length: number; half: (k: number) => number; keep: (k: number, j: number) => boolean } {
  const fan = (k: number) => 0.8 + k * spread
  const H = fan(L - 1)
  const s = (k: number) => Math.sin((Math.PI * (k + 0.6)) / (L + 0.4))
  const shapes: Record<Tail, { length: number; half: (k: number) => number; keep: (k: number, j: number, h: number) => boolean }> = {
    fan: { length: L, half: fan, keep: () => true },
    fork: { length: L, half: k => fan(k) + 0.3, keep: (k, j, h) => !(k > L * 0.5 && Math.abs(j) < h * 0.35) },
    flow: { length: L, half: k => 0.5 + spread * L * 0.32 * Math.pow(s(k), 0.8), keep: () => true },
    round: { length: L, half: k => 0.8 + (H - 0.3) * Math.pow(Math.sin((Math.PI * (k + 1)) / (L + 1)), 0.5), keep: () => true },
    lyre: {
      length: L + 3,
      half: k => fan(Math.min(k, L - 1)),
      keep: (k, j, h) => (k < L * 0.45 ? true : k < L ? Math.abs(j) >= h * 0.4 : Math.abs(j) >= Math.round(h) - 1),
    },
    swallow: { length: L + 1, half: k => fan(k) * 1.15 + 0.3, keep: (k, j, h) => k < L * 0.3 || Math.abs(j) >= h * ((k - L * 0.3) / L) * 0.85 },
    twin: { length: L, half: k => fan(k) + 1, keep: (k, j) => k < 2 || Math.abs(Math.abs(j) - (0.8 + k * spread * 0.85)) <= 2 },
    spade: { length: L + 1, half: k => 0.6 + H * 1.15 * Math.pow(1 - Math.abs((2 * (k + 0.5)) / (L + 1) - 0.85), 0.8), keep: () => true },
    crescent: {
      length: L,
      half: k => (k < L * 0.4 ? 0.8 + k * 0.25 : H * 1.25),
      keep: (k, j, h) => k < L * 0.4 || k <= L * 0.4 + 1 + (L * 0.6 - 1) * Math.pow(Math.abs(j) / Math.max(1, h), 1.6),
    },
  }
  const shape = shapes[style]
  return { length: shape.length, half: shape.half, keep: (k, j) => k >= 0 && k < shape.length && Math.abs(j) <= Math.round(shape.half(k)) && shape.keep(k, j, shape.half(k)) }
}

/** Half-width of the body at t (0 at the nose, 1 at the root of the tail), as a fraction of the widest. */
function profile(t: number, shape: 'fish' | 'eel'): number {
  if (shape === 'eel') return t < 0.06 ? 0.6 + 0.4 * (t / 0.06) : 1 - 0.55 * Math.pow((t - 0.06) / 0.94, 1.6)
  if (t < 0.22) return 0.45 + 0.55 * Math.sqrt(t / 0.22)
  return 1 - 0.68 * Math.pow((t - 0.22) / 0.78, 1.3)
}

/** Tiles by paint; a paint is a colour, or `colour|opacity` for a see-through one. */

const SHIMMER = ['#ff9ad5', '#9ad8ff', '#b6ffb0', '#ffe39a', '#c9a6ff']

/** One fish pointing right, the head's back edge at x = 0. The body behind the head is cut into pieces, each nested in
 *  the one before and swinging from its own joint a little later than it, the tail last: the swings add up along the
 *  body into one travelling wave, which is what makes it swim rather than wag. */
function fishSprite(sp: Species, silhouette: boolean, seed = 0): string {
  const P = sp.tile
  const shape = sp.shape ?? 'fish'
  const head = Math.max(2, Math.round(sp.length * (shape === 'eel' ? 0.12 : 0.38)))
  const pieces = Math.max(1, sp.segments)
  const pieceOf = (i: number) => (i < head ? 0 : 1 + Math.min(pieces - 1, Math.floor(((i - head) * pieces) / (sp.length - head))))
  const xOf = (i: number) => (head - i - 1) * P
  const body: Tiles[] = Array.from({ length: pieces + 1 }, () => new Map())
  const shimmer: Tiles[] = Array.from({ length: pieces + 1 }, () => new Map())
  const sparkle: Tiles[] = Array.from({ length: pieces + 1 }, () => new Map())
  const salt = Math.floor(seed * 1000)
  const fins: Tiles = new Map()
  const tail: Tiles = new Map()
  const solid = '#000'
  const see = (colour: string) => (sp.ghost ? `${colour}|0.38` : colour)

  for (let i = 0; i < sp.length; i += 1) {
    const t = i / (sp.length - 1)
    const w = sp.width * profile(t, shape)
    const reach = Math.max(1, Math.round(w))
    const piece = pieceOf(i)
    for (let j = -reach; j <= reach; j += 1) {
      if (Math.abs(j) > w + 0.35) continue
      const x = xOf(i)
      const y = j * P - P / 2
      if (silhouette) {
        addTile(body[piece]!, solid, x, y, P)
        continue
      }
      const edge = Math.abs(j) >= reach && reach > 1
      let paint: string
      if (i === Math.max(1, Math.round(sp.length * (shape === 'eel' ? 0.03 : 0.1))) && Math.abs(j) === Math.max(1, reach - 1)) {
        paint = sp.eye ?? '#0b0f12'
      } else if (sp.crest !== undefined && j === 0 && t > 0.08 && t < 0.92 && i % 2 === 0) {
        paint = sp.crest
      } else if (sp.outline !== undefined && edge) {
        paint = sp.outline
      } else {
        // Rounded like a body seen from above: lighter along the back, darker towards the sides, lit from the upper
        // left; every other tile a touch lighter, in a lattice, for scales.
        const across = Math.abs(j) / Math.max(1, w)
        let f = 1.12 - 0.5 * across * across - (j > 0 ? 0.06 : 0)
        if (edge) f *= 0.82
        if ((i + (j & 1)) % 2 === 0) f *= 1.07
        // A few shades only, so each colour's tiles share one path.
        f = Math.round(f / 0.09) * 0.09
        paint = sp.ghost && j === 0 ? shade(sp.body(i, j, t, w, seed), 1.1) : see(shade(sp.body(i, j, t, w, seed), f))
      }
      addTile(body[piece]!, paint, x, y, P)
      if (sp.sparkle !== undefined && Math.abs(j) < reach && hashOf(i, j, salt + 90) < sp.sparkle) addTile(sparkle[piece]!, sp.sparkleColour ?? '#ffffff', x, y, P)
      if (sp.shimmer && hashOf(i, j, 77) < 0.45) addTile(shimmer[piece]!, SHIMMER[Math.floor(hashOf(i, j, 78) * 5)]!, x, y, P)
    }
  }

  // Whiskers: two thin feelers from the snout, curling outward.
  if (sp.whiskers !== undefined) {
    const nose = xOf(0) + P
    for (const side of [-1, 1]) {
      for (let k = 1; k <= 7; k += 1) {
        addTile(fins, silhouette ? solid : sp.whiskers, nose - k * P * 0.6, side * (0.6 + k * k * 0.09) * P - P / 2, P * 0.6)
      }
    }
  }

  // The tail, behind the last piece: its rays in two shades, darker at the root, its trailing edge pale.
  const rootX = xOf(sp.length - 1)
  const tip = sp.outline ?? mix(sp.fin, '#f6f3ec')
  const shaped = tailShape(sp.tail ?? (sp.flowing ? 'flow' : sp.forked ? 'fork' : 'fan'), sp.tailLength, sp.tailSpread)
  for (let k = 0; k < shaped.length; k += 1) {
    const reach = Math.round(shaped.half(k))
    for (let j = -reach; j <= reach; j += 1) {
      if (!shaped.keep(k, j)) continue
      const edge = !shaped.keep(k + 1, j) || !shaped.keep(k, j + Math.sign(j || 1))
      const paint = silhouette ? solid : edge ? tip : shade(sp.fin, k === 0 ? 0.82 : j % 2 === 0 ? 1.04 : 0.9)
      addTile(tail, paint, rootX - (k + 1) * P, j * P - P / 2, P)
    }
  }

  // Side fins: a pair of paddles behind the head, each rooted under the body's edge and sweeping back, rays in two shades
  // and a pale edge; long ones (butterfly fins) trail like wings. Each paddles from its own root, the two together.
  const finAt = Math.max(1, Math.round(head * 0.75))
  const finReach = Math.round(sp.width * profile(finAt / (sp.length - 1), shape))
  const finLength = sp.finLength ?? 3
  // Rows outward from the root, each starting a little further back, longest at the root and shortening to a rounded
  // tip: a paddle swept back at about 40 degrees.
  const rows = Math.min(6, Math.round(3.2 + finLength * 0.3))
  const side: Tiles[] = [new Map(), new Map()]
  ;[-1, 1].forEach((dir, n) => {
    for (let v = 0; v <= rows; v += 1) {
      const start = Math.round(v * 0.8)
      const span = Math.max(1, Math.round((finLength + 1) * Math.sqrt(1 - Math.pow(v / (rows + 0.6), 2))))
      for (let u = start; u < start + span; u += 1) {
        const edge = v === rows || u === start + span - 1
        const paint = silhouette ? solid : v === 0 ? shade(sp.fin, 0.82) : edge ? tip : shade(sp.fin, v % 2 === 0 ? 1.04 : 0.9)
        addTile(side[n]!, paint, xOf(finAt) - u * P, (dir * (finReach + v) - 0.5) * P, P)
      }
    }
  })
  // Small belly fins further back, on the body piece there, so they turn with it.
  if (shape === 'fish' && !silhouette) {
    const at = Math.round(sp.length * 0.6)
    const reachAt = Math.round(sp.width * profile(at / (sp.length - 1), shape))
    for (const dir of [-1, 1]) {
      for (let u = 0; u < 2; u += 1) for (let v = 1; v <= 2 - u; v += 1) addTile(body[pieceOf(at)]!, v === 2 - u ? tip : shade(sp.fin, 0.95), xOf(at) - u * P, (dir * (reachAt + v) - 0.5) * P, P)
    }
  }

  // Fins are solid like the body, except on the see-through fish.
  const finAttr = silhouette || !sp.ghost ? '' : ` opacity="${sp.finOpacity}"`
  // A dark backing in the fish's own colour fills the seams between tiles, so nothing shows through it; the ghost is
  // meant to be seen through and keeps its gaps. See-through fins take their opacity as one group, backing and all.
  // The seams take the breed's main colour, darkened: grey on a white koi even where it carries red.
  const counts = new Map<string, number>()
  for (let i = 0; i < sp.length; i += 1) {
    for (const j of [-2, -1, 0, 1, 2]) {
      const c = sp.body(i, j, i / (sp.length - 1), sp.width, seed).split('|')[0]!
      counts.set(c, (counts.get(c) ?? 0) + 1)
    }
  }
  const grout = shade([...counts].sort((a, b) => b[1] - a[1])[0]![0], 0.45)
  const backed = (tiles: Tiles, root?: Tiles) =>
    (sp.ghost ? '' : drawBacking(root === undefined ? tiles : new Map([...tiles, ['root', [...root.values()].flat()]]), grout)) + drawRuns(tiles, P)
  const draw = (tiles: Tiles, attributes = '') =>
    silhouette ? drawSolid(tiles) : attributes === '' ? backed(tiles) : sp.ghost ? drawRuns(tiles, P, attributes) : `<g${attributes}>${backed(tiles)}</g>`
  // Each piece turns round its joint, lagging the one before by a share of the beat; the beat is set once, on the
  // outermost piece.
  const swing = (origin: number, degrees: number, k: number, outer = false) =>
    `class="sw" style="transform-origin:${n1(origin)}px 0;--a:${degrees.toFixed(1)}deg;--k:${short(0.17 * k)}${outer ? `;--b:${sp.beat}s` : ''}"`
  const overlay = (k: number) =>
    silhouette
      ? ''
      : // Shimmer: bright tiles of every colour, their hues turning round the wheel (a hue-rotate costs little to draw;
        // a fade would cost far more).
        (shimmer[k]!.size > 0 ? `<g class="opal">${drawRuns(shimmer[k]!, P, ' opacity=".5"')}</g>` : '') +
        (sparkle[k]!.size > 0 ? `<g class="gr" style="animation-delay:calc(var(--t0) - ${short(k * 0.55)}s)">${drawRuns(sparkle[k]!, P)}</g>` : '')

  // Each turning part carries a hidden root under the part in front (the tail, the body's last two columns; a piece, its
  // first column copied forward twice), drawn in the seam colour as part of its backing: a turn shows one more dark
  // seam at the joint instead of opening a gap there. The ghost, being seen through, would show it, and keeps its
  // joints bare.
  const rootOf = (from: Tiles, x: number, steps: number, start = 1): Tiles => {
    const out: Tiles = new Map()
    if (sp.ghost || silhouette) return out
    for (const [paint, list] of from) {
      for (const [tx, y, z] of list) if (z === P && Math.abs(tx - x) < 0.01) for (let k = start; k <= steps; k += 1) addTile(out, paint, tx + k * P, y, P)
    }
    return out
  }
  const tailRoot = rootOf(body[pieces]!, rootX, 1, 0)

  // Innermost first: the tail, then each piece wrapped round what follows it, nearer pieces drawn on top.
  let inner = `<g ${swing(rootX, 14, pieces + 1)}>${tailRoot.size === 0 ? '' : drawBacking(tailRoot, grout)}${draw(tail, finAttr)}</g>`
  for (let k = pieces; k >= 1; k -= 1) {
    let first = 0
    while (pieceOf(first) !== k) first += 1
    inner = `<g ${swing(xOf(first) + P, sp.sway * (0.6 + (0.8 * k) / pieces), k, k === 1)}>${inner}${silhouette ? draw(body[k]!) : backed(body[k]!, rootOf(body[k]!, xOf(first), 2))}${overlay(k)}</g>`
  }
  const finsSvg =
    (fins.size > 0 ? draw(fins) : '') +
    side.map((tiles, n) => `<g class="fin${n === 1 ? ' b' : ''}" style="transform-origin:${n1(xOf(finAt))}px ${n1((n === 0 ? -1 : 1) * finReach * P)}px;animation-duration:${sp.beat}s">${draw(tiles, finAttr)}</g>`).join('')
  return finsSvg + inner + draw(body[0]!) + overlay(0)
}

// Smooth blotches for patterned fish.
function blotch(i: number, j: number, seed: number): number {
  return Math.sin(i * 0.42 + seed) * Math.cos(j * 0.8 + seed * 1.7) + Math.sin(i * 0.19 - j * 0.33 + seed * 2.3)
}

/** A fancy koi's colours: its ground, its pattern, an accent, and the glow it gives off on the days it glows. */
type Palette = readonly [string, string, string, keyof typeof GLOWS]

const PALETTES: readonly Palette[] = [
  ['#f07c1c', '#faf7f0', '#17120e', 'glowEmber'],
  ['#f3efe8', '#d42a3c', '#16161a', 'glowRuby'],
  ['#16161a', '#f2f0ea', '#cc2a36', 'glowPearl'],
  ['#1d2b53', '#2a9d8f', '#e9c46a', 'glowCyan'],
  ['#e0ac4a', '#2e1c0e', '#c06a1c', 'glowGold'],
  ['#5b2a86', '#f26b38', '#fde68a', 'glowEmber'],
  ['#0f3d3e', '#7dffb0', '#e8fff4', 'glowMint'],
  ['#2b1055', '#ff7ad9', '#7ad0ff', 'glowRose'],
  ['#f6dde6', '#e47fa0', '#7a2f50', 'glowRose'],
  ['#1a1a1e', '#ffe03a', '#fff4a0', 'glowGold'],
  ['#e8f4fa', '#3a7bd5', '#0b2545', 'glowStar'],
  ['#3a0d12', '#ff5a5a', '#ffc95a', 'glowRuby'],
  ['#f4ecd8', '#2c6e2c', '#a8d888', 'glowMint'],
  ['#14213d', '#fca311', '#e5e5e5', 'glowGold'],
  ['#40193f', '#f4b942', '#9ad8ff', 'glowViolet'],
  ['#f7f5ff', '#6a4cff', '#ff9ad5', 'glowViolet'],
  ['#0b2a3a', '#4ff0e0', '#f4efff', 'glowCyan'],
  ['#c42a2a', '#f4efe6', '#1a1416', 'glowRuby'],
]

/** Halfway between two colours. */
function mix(a: string, b: string): string {
  const n = (h: string, k: number) => parseInt(h.slice(1 + 2 * k, 3 + 2 * k), 16)
  return `#${[0, 1, 2].map(k => Math.round((n(a, k) + n(b, k)) / 2).toString(16).padStart(2, '0')).join('')}`
}

/** A fancy koi's design: its build, and which of its palette's roles each tile takes (0 the ground, 1 the pattern,
 *  2 the accent, 3 the pattern deepened, 4 between ground and pattern, 5 between pattern and accent), its fins' role,
 *  and the role of an outline round it, if it has one. */
type Design = {
  build: Omit<Species, 'body' | 'fin' | 'outline'>
  role: (i: number, j: number, t: number, w: number) => number
  fin: number
  outline?: number
}

const KOI = { length: 28, width: 5, tile: 5, segments: 3, sway: 4, tailLength: 8, tailSpread: 0.6, finOpacity: 0.8, finLength: 4, beat: 2.0 }

const DESIGNS: Record<string, Design> = {
  // Clown: three bands edged in the accent, and an outline in it too.
  clown: {
    build: { ...KOI, length: 26, tailLength: 7, beat: 1.7, finOpacity: 0.9 },
    role: i => {
      const m = [5, 13, 20].map(c => Math.abs(i - c)).reduce((a, b) => Math.min(a, b))
      return m <= 1 ? 1 : m === 2 ? 2 : 0
    },
    fin: 0,
    outline: 2,
  },
  // Zebra: chevrons pointing to the nose.
  zebra: { build: { ...KOI, length: 30 }, role: (i, j) => (i > 1 && (i + Math.abs(j)) % 4 === 0 ? 1 : 0), fin: 1 },
  // Leopard: rosettes, each a ring round a middle of the accent.
  leopard: {
    build: { ...KOI, length: 30, beat: 2.1 },
    role: (i, j) => {
      const ci = Math.floor(i / 5)
      const cj = Math.floor((j + 20) / 4)
      if (i < 3 || hashOf(ci, cj, 832) < 0.2) return 0
      const d = Math.hypot(i - (ci * 5 + 2 + (hashOf(ci, cj, 830) - 0.5) * 1.4), j - (cj * 4 - 18.5 + (hashOf(ci, cj, 831) - 0.5) * 1.2))
      return d < 0.8 ? 2 : d < 1.8 ? 1 : 0
    },
    fin: 0,
  },
  // Melon: a rind of two stripes round the ground, seeded.
  melon: {
    build: { ...KOI, width: 5.2, tailLength: 7, beat: 2.1 },
    role: (i, j, _t, w) => (Math.abs(j) >= w - 0.6 ? 1 : Math.abs(j) >= w - 1.6 ? 2 : i > 3 && (i * 3 + j * 5) % 7 === 0 && Math.abs(j) < w - 2 ? 3 : 0),
    fin: 1,
  },
  // Candy: bold stripes running round at a slant.
  candy: { build: { ...KOI, length: 30, width: 4.6 }, role: (i, j) => ((((i + j) % 5) + 5) % 5 < 2 ? 1 : 0), fin: 0 },
  // Argyle: diamonds stitched in the accent.
  argyle: {
    build: { ...KOI, length: 30, beat: 2.1 },
    role: (i, j) => {
      const d = Math.abs((i % 6) - 3) + Math.abs((((j % 6) + 6) % 6) - 3)
      return d === 3 ? 2 : d < 3 ? 1 : 0
    },
    fin: 0,
  },
  // Eyespot: two great eyes, rings of accent and pattern round a deep middle.
  eyespot: {
    build: { ...KOI, length: 30, tailLength: 9, tailSpread: 0.65, finLength: 5, beat: 2.2 },
    role: (i, j) => {
      const d = Math.min(Math.hypot(i - 10, j * 1.1), Math.hypot(i - 20, j * 1.1))
      return d < 1.1 ? 3 : d < 2.2 ? 1 : d < 3.3 ? 2 : 0
    },
    fin: 1,
  },
  // Bolt: a lightning zigzag down its length, its middle the accent.
  bolt: {
    build: { ...KOI, length: 30, tailLength: 9, forked: true, beat: 1.8 },
    role: (i, j) => {
      const m = i % 8
      const centre = (m < 4 ? m : 8 - m) - 2
      return i > 2 && Math.abs(j - centre) <= 1 ? (j === centre ? 2 : 1) : 0
    },
    fin: 0,
  },
  // Harlequin: a checkerboard with a cap of the accent.
  harlequin: { build: KOI, role: (i, j) => (i < 3 ? 2 : (Math.floor(i / 2) + Math.floor((j + 20) / 2)) % 2 === 0 ? 1 : 0), fin: 0 },
  // Sunset: banded down its length, one side to the other, ground through pattern to accent.
  sunset: {
    build: { ...KOI, length: 30, tailLength: 10, tailSpread: 0.65, flowing: true, finLength: 5, beat: 2.2 },
    role: (_i, j, _t, w) => [0, 4, 1, 5, 2][Math.max(0, Math.min(4, Math.floor(((j + w) / (2 * w + 0.01)) * 5)))]!,
    fin: 1,
  },
  // Berry: a leafy cap of the accent, seeds of the pattern.
  berry: {
    build: { ...KOI, length: 26, tailLength: 7 },
    role: (i, j) => (i < 3 || (i === 3 && Math.abs(j) % 2 === 0) ? 2 : i % 2 === 0 && (((i / 2 + j) % 2) + 2) % 2 === 0 ? 1 : 0),
    fin: 2,
  },
  // Tuxedo: a coat of the ground over a shirt of the pattern, a bow tie of the accent.
  tuxedo: { build: KOI, role: (i, j, _t, w) => (i >= 5 && i <= 6 && Math.abs(j) <= 1 ? 2 : i > 4 && Math.abs(j) < w * 0.5 ? 1 : 0), fin: 0 },
}

/** A fancy koi in a palette. */
function fancySpecies(d: Design, p: Palette): Species {
  const colours = [p[0], p[1], p[2], shade(p[1], 0.35), mix(p[0], p[1]), mix(p[1], p[2])]
  return {
    ...d.build,
    body: (i, j, t, w) => colours[d.role(i, j, t, w)]!,
    fin: colours[d.fin]!,
    ...(d.outline === undefined ? {} : { outline: colours[d.outline]! }),
  }
}

const SPECIES: Record<string, Species> = {
  // Common: white with orange patches and a red cap.
  shiro: {
    length: 30, width: 5, tile: 5, segments: 3, sway: 4, tailLength: 8, tailSpread: 0.55, fin: '#d8d2c6', finOpacity: 0.7, finLength: 4, beat: 2.1,
    body: (i, j, _t, _w, seed) => (i < 5 && Math.abs(j) < 3 ? '#b8382e' : blotch(i, j, 1.3 + seed) > 0.35 ? '#c8642e' : '#ddd7cb'),
  },
  // Common: dusky gold with a darker crest.
  kin: {
    length: 26, width: 4.4, tile: 5, segments: 3, sway: 4, tailLength: 7, tailSpread: 0.6, forked: true, fin: '#b88d3e', finOpacity: 0.65, beat: 1.9,
    crest: '#7d5a24', sparkle: 0.08,
    body: (i, j, _t, _w, seed) => (hashOf(i, j, 3 + Math.floor(seed * 1000)) < 0.12 ? '#e4c27a' : '#c49a4a'),
  },
  // Common: slate blue with black spots and a black-edged tail.
  sumi: {
    length: 28, width: 4.6, tile: 5, segments: 3, sway: 4, tailLength: 7, tailSpread: 0.55, fin: '#4d5966', finOpacity: 0.75, beat: 2.2,
    body: (i, j, _t, _w, seed) => (blotch(i, j, 4.1 + seed) > 0.6 ? '#1b2026' : '#6c7d8c'),
  },
  // Common: kohaku, snow white with bold red patches.
  kohaku: {
    length: 30, width: 5, tile: 5, segments: 3, sway: 4, tailLength: 8, tailSpread: 0.6, fin: '#ece6dc', finOpacity: 0.7, finLength: 4, beat: 2.0,
    body: (i, j, _t, _w, seed) => (i > 1 && blotch(i * 0.9, j, 2.2 + seed) > 0.2 ? '#c42a2a' : '#eeeae2'),
  },
  // Common: showa, ink black wrapped in red and white, black-rooted fins.
  showa: {
    length: 29, width: 5, tile: 5, segments: 3, sway: 4, tailLength: 8, tailSpread: 0.6, fin: '#3a3d42', finOpacity: 0.8, finLength: 4, beat: 2.1, outline: '#101215',
    body: (i, j, _t, _w, seed) => (blotch(i, j, 5.3 + seed) > 0.45 ? '#c0392a' : blotch(i * 1.2, j, 8.1 + seed) > 0.25 ? '#e8e4dc' : '#17191d'),
  },
  // Common: asagi, a blue back netted with pale scale edges, orange down the sides.
  asagi: {
    length: 28, width: 4.8, tile: 5, segments: 3, sway: 4, tailLength: 7, tailSpread: 0.6, fin: '#d87a3e', finOpacity: 0.75, finLength: 4, beat: 2.2,
    body: (i, j, _t, w) => (Math.abs(j) >= Math.max(2, w * 0.7) ? '#d0642e' : i < 4 ? '#c3ced6' : (i + (j & 1)) % 2 === 0 ? '#a7bfd2' : '#5d7d9c'),
  },
  // Common: tancho, pure white with one round red crown on the head.
  tancho: {
    length: 28, width: 4.8, tile: 5, segments: 3, sway: 4, tailLength: 8, tailSpread: 0.6, fin: '#f2eee8', finOpacity: 0.7, finLength: 4, beat: 2.0,
    body: (i, j) => (Math.hypot(i - 3, j) < 2.3 ? '#d0262e' : '#f2eee6'),
  },
  // Common, bright: platinum ogon, metal white, its scales twinkling as it turns.
  platinum: {
    length: 30, width: 5, tile: 5, segments: 3, sway: 4, tailLength: 9, tailSpread: 0.6, fin: '#e6eaef', finOpacity: 0.75, finLength: 5, beat: 2.2, sparkle: 0.2,
    body: (i, j) => (j === 0 || (j === -1 && i % 3 === 0) ? '#f8fbff' : Math.abs(j) >= 3 ? '#aab3bd' : '#d7dde4'),
  },
  // Common: bekko, white with scattered black spots.
  bekko: {
    length: 28, width: 4.8, tile: 5, segments: 3, sway: 4, tailLength: 8, tailSpread: 0.6, fin: '#e6e1d8', finOpacity: 0.7, finLength: 4, beat: 2.0,
    body: (i, j, _t, _w, seed) => (i > 3 && blotch(i * 1.4, j * 1.3, 3 + seed) > 1 ? '#17191c' : '#ebe7df'),
  },
  // Common: shiro utsuri, ink black split by bold white bands.
  utsuri: {
    length: 29, width: 5, tile: 5, segments: 3, sway: 4, tailLength: 8, tailSpread: 0.6, fin: '#2c2f34', finOpacity: 0.8, finLength: 4, beat: 2.1,
    body: (i, j, _t, _w, seed) => (blotch(i * 0.8, j, 7 + seed) > 0.15 ? '#ebe7df' : '#15171a'),
  },
  // Common: goshiki, red and white under a dark net of scale edges.
  goshiki: {
    length: 28, width: 4.8, tile: 5, segments: 3, sway: 4, tailLength: 7, tailSpread: 0.6, fin: '#9aa0b4', finOpacity: 0.7, finLength: 4, beat: 2.1,
    body: (i, j, _t, _w, seed) => ((i + (j & 1)) % 2 === 0 && i > 3 ? '#3b4058' : blotch(i, j, 9 + seed) > 0.25 ? '#b8323a' : '#d9d4d0'),
  },
  // Common: chagoi, tea brown netted in a lighter brown; calm and broad.
  chagoi: {
    length: 31, width: 5.4, tile: 5, segments: 3, sway: 3.5, tailLength: 8, tailSpread: 0.6, fin: '#8a5e36', finOpacity: 0.75, finLength: 4, beat: 2.5,
    body: (i, j) => (i < 4 ? '#b38552' : (i + (j & 1)) % 2 === 0 ? '#b7834f' : '#8f6236'),
  },
  // Common, bright: kujaku, the peacock, pearl white netted in green-black, orange patches, scales that catch the light.
  kujaku: {
    length: 29, width: 4.8, tile: 5, segments: 3, sway: 4, tailLength: 8, tailSpread: 0.6, fin: '#efe9df', finOpacity: 0.7, finLength: 4, beat: 2.0, sparkle: 0.1,
    body: (i, j, _t, _w, seed) => (blotch(i, j, 11 + seed) > 0.35 ? '#e2742e' : (i + (j & 1)) % 2 === 0 && i > 3 ? '#3d5a4a' : '#e8e6e0'),
  },
  // Common, bright: kikokuryu, metal black and white, glinting.
  kikokuryu: {
    length: 28, width: 4.7, tile: 5, segments: 3, sway: 4, tailLength: 8, tailSpread: 0.6, fin: '#cfd5dc', finOpacity: 0.7, finLength: 4, beat: 2.0, sparkle: 0.14,
    body: (i, j, _t, _w, seed) => (blotch(i * 1.1, j, 13 + seed) > 0.3 ? '#1d2126' : '#e8ecf0'),
  },
  // Common, bright: yamabuki, sunflower yellow metal, its back paler, its scales twinkling.
  yamabuki: {
    length: 30, width: 5, tile: 5, segments: 3, sway: 4, tailLength: 9, tailSpread: 0.6, fin: '#f3d36a', finOpacity: 0.75, finLength: 5, beat: 2.2, sparkle: 0.16, sparkleColour: '#fff4c2',
    body: (_i, j) => (j === 0 ? '#ffe68a' : Math.abs(j) >= 3 ? '#c99a1c' : '#f1c232'),
  },
  // Common: ochiba, blue-grey with falling-leaf patches of russet.
  ochiba: {
    length: 28, width: 4.8, tile: 5, segments: 3, sway: 4, tailLength: 7, tailSpread: 0.6, fin: '#8796a6', finOpacity: 0.75, finLength: 4, beat: 2.2,
    body: (i, j, _t, _w, seed) => (blotch(i, j * 1.2, 15 + seed) > 0.4 ? '#b8743a' : (i + (j & 1)) % 2 === 0 ? '#95a3b2' : '#7b8a9a'),
  },
  // Common: sanke, white with red patches and small black spots.
  sanke: {
    length: 29, width: 4.9, tile: 5, segments: 3, sway: 4, tailLength: 8, tailSpread: 0.6, fin: '#ebe6dc', finOpacity: 0.7, finLength: 4, beat: 2.0,
    body: (i, j, _t, _w, seed) => (i > 2 && blotch(i * 1.6, j * 1.5, 21 + seed) > 1.05 ? '#16181b' : i > 1 && blotch(i * 0.9, j, 23 + seed) > 0.25 ? '#c42a2a' : '#eeeae2'),
  },
  // Common: hi utsuri, ink black split by fiery red.
  hiutsuri: {
    length: 29, width: 5, tile: 5, segments: 3, sway: 4, tailLength: 8, tailSpread: 0.6, fin: '#2c2f34', finOpacity: 0.8, finLength: 4, beat: 2.1,
    body: (i, j, _t, _w, seed) => (blotch(i * 0.8, j, 25 + seed) > 0.15 ? '#cf4a2a' : '#15171a'),
  },
  // Common: ki utsuri, ink black split by lemon yellow.
  kiutsuri: {
    length: 28, width: 4.8, tile: 5, segments: 3, sway: 4, tailLength: 8, tailSpread: 0.6, fin: '#2c2f34', finOpacity: 0.8, finLength: 4, beat: 2.1,
    body: (i, j, _t, _w, seed) => (blotch(i * 0.8, j, 27 + seed) > 0.15 ? '#e6c23a' : '#15171a'),
  },
  // Common: benigoi, red all over, lighter down the spine.
  benigoi: {
    length: 30, width: 5, tile: 5, segments: 3, sway: 4, tailLength: 8, tailSpread: 0.6, fin: '#c8402f', finOpacity: 0.75, finLength: 4, beat: 2.0,
    body: (_i, j) => (j === 0 ? '#d8423a' : Math.abs(j) >= 3 ? '#9c1f22' : '#c1272d'),
  },
  // Common, bright: matsuba, gold netted in dark brown like a pine cone, a few scales glinting.
  matsuba: {
    length: 29, width: 4.9, tile: 5, segments: 3, sway: 4, tailLength: 8, tailSpread: 0.6, fin: '#c99a3a', finOpacity: 0.75, finLength: 4, beat: 2.1, sparkle: 0.06,
    body: (i, j) => (i < 4 ? '#e2b452' : (i + (j & 1)) % 2 === 0 ? '#6b4a1e' : '#d9a640'),
  },
  // Common: karashi, mustard yellow netted lighter; broad and calm.
  karashi: {
    length: 31, width: 5.3, tile: 5, segments: 3, sway: 3.5, tailLength: 8, tailSpread: 0.6, fin: '#d8b43a', finOpacity: 0.75, finLength: 4, beat: 2.4,
    body: (i, j) => ((i + (j & 1)) % 2 === 0 ? '#e8c95a' : '#c9a12e'),
  },
  // Common: kumonryu, the dragon of the clouds, black and white in swirls.
  kumonryu: {
    length: 29, width: 4.8, tile: 5, segments: 3, sway: 4, tailLength: 8, tailSpread: 0.6, fin: '#2a2d31', finOpacity: 0.8, finLength: 4, beat: 2.0,
    body: (i, j, _t, _w, seed) => (Math.sin(i * 0.55 + seed * 3) * Math.cos(j * 0.9 + seed) + 0.3 * Math.sin(i * 0.21 - j * 0.4) > 0.15 ? '#e9e7e2' : '#141619'),
  },
  // Common, bright: midorigoi, rare green koi, chartreuse with a glinting back.
  midorigoi: {
    length: 28, width: 4.7, tile: 5, segments: 3, sway: 4, tailLength: 8, tailSpread: 0.6, fin: '#c9e070', finOpacity: 0.65, finLength: 4, beat: 2.0, sparkle: 0.1,
    body: (_i, j) => (j === 0 ? '#d6ec86' : Math.abs(j) >= 3 ? '#7f9a2e' : '#a8c84a'),
  },
  // Glowing: small dark fish with lit edges, a row of cyan lights and a cyan tail; they swim as a trio.
  lantern: {
    length: 15, width: 2.4, tile: 4, segments: 2, sway: 5, tailLength: 5, tailSpread: 0.5, forked: true, fin: '#4ff0e0', finOpacity: 0.8, beat: 1.1,
    outline: '#3fd8cc', eye: '#7ffff0',
    body: (i, j) => (j === 0 && i % 3 === 1 ? '#7ffff0' : '#1c2a33'),
    glow: 'glowCyan', glowSize: 1.4, noShadow: true,
  },
  // Glowing: violet with lit spots and long violet fins.
  violet: {
    length: 20, width: 3, tile: 4, segments: 3, sway: 5, tailLength: 8, tailSpread: 0.75, flowing: true, fin: '#b07bff', finOpacity: 0.75, finLength: 5, beat: 1.5,
    outline: '#8a5fd6',
    body: (i, j) => (hashOf(i, j, 9) < 0.16 ? '#e2c8ff' : '#2a2040'),
    glow: 'glowViolet', glowSize: 1.3, noShadow: true, size: 0.9,
  },
  // Glowing: a ghost fish, see-through, its spine lit white.
  ghost: {
    length: 26, width: 4, tile: 5, segments: 4, sway: 4, tailLength: 9, tailSpread: 0.6, forked: true, fin: '#bfe6ff', finOpacity: 0.3, finLength: 5, beat: 2.4,
    ghost: true, eye: '#e8fbff', noShadow: true, size: 1.2,
    body: (_i, j) => (j === 0 ? '#e8fbff' : '#9fc4d8'),
    glow: 'glowPearl', glowSize: 1,
  },
  // Glowing school: embers, dark with orange lights.
  ember: {
    length: 15, width: 2.4, tile: 4, segments: 2, sway: 5, tailLength: 5, tailSpread: 0.5, forked: true, fin: '#ff9a4d', finOpacity: 0.8, beat: 1.1,
    outline: '#ff8a3d', eye: '#ffd9a0',
    body: (i, j) => (j === 0 && i % 3 === 1 ? '#ffd9a0' : '#2a1a14'),
    glow: 'glowEmber', noShadow: true,
  },
  // Glowing school: mint, dark with sea-green lights.
  mint: {
    length: 14, width: 2.3, tile: 4, segments: 2, sway: 5, tailLength: 5, tailSpread: 0.5, forked: true, fin: '#7dffb0', finOpacity: 0.8, beat: 1.0,
    outline: '#5ae09a', eye: '#d0ffe6',
    body: (i, j) => (j === 0 && i % 3 === 1 ? '#d0ffe6' : '#14261e'),
    glow: 'glowMint', noShadow: true,
  },
  // Glowing school: neon roses, a bright blue stripe down the back and rose-red sides.
  rose: {
    length: 16, width: 2.4, tile: 4, segments: 2, sway: 5, tailLength: 5, tailSpread: 0.5, forked: true, fin: '#ff9ad5', finOpacity: 0.7, beat: 1.0,
    eye: '#ffffff',
    body: (_i, j) => (j === 0 ? '#6fe6ff' : Math.abs(j) === 1 ? '#ff4d6d' : '#2a1830'),
    glow: 'glowRose', noShadow: true,
  },
  // Glowing: a moonfin, pale moonlit blue with white spots and long trailing fins.
  moonfin: {
    length: 20, width: 3, tile: 4, segments: 3, sway: 5, tailLength: 11, tailSpread: 0.75, flowing: true, fin: '#9fd0ff', finOpacity: 0.7, finLength: 7, beat: 1.6,
    outline: '#7fb6e6',
    body: (i, j) => (hashOf(i, j, 43) < 0.14 ? '#ffffff' : '#8fb8e0'),
    glow: 'glowPearl', noShadow: true, size: 0.95,
  },
  // Glowing: an aurora fish, green fading to teal fading to violet, glinting.
  aurora: {
    length: 21, width: 3, tile: 4, segments: 3, sway: 5, tailLength: 9, tailSpread: 0.75, flowing: true, fin: '#7dffb0', finOpacity: 0.7, finLength: 5, beat: 1.5, sparkle: 0.1,
    body: (_i, _j, t) => (t < 0.33 ? '#3fe0a0' : t < 0.66 ? '#3fb8e0' : '#a070ff'),
    glow: 'glowMint', noShadow: true, size: 0.9,
  },
  // Glowing: a firefly fish, near black, freckled with yellow lights.
  firefly: {
    length: 19, width: 2.8, tile: 4, segments: 3, sway: 5, tailLength: 7, tailSpread: 0.7, forked: true, fin: '#d8e070', finOpacity: 0.7, finLength: 4, beat: 1.3,
    outline: '#4a5a20',
    body: (i, j) => (hashOf(i, j, 41) < 0.18 ? '#ffe066' : '#20261a'),
    glow: 'glowGold', noShadow: true, size: 0.9,
  },
  // See-through: a glass fish, its spine and ribs showing, red-eyed.
  glass: {
    length: 26, width: 4, tile: 5, segments: 4, sway: 4, tailLength: 9, tailSpread: 0.6, forked: true, fin: '#cfefff', finOpacity: 0.3, finLength: 5, beat: 2.2,
    ghost: true, eye: '#ff6a6a', noShadow: true, size: 1.1,
    body: (i, j) => (j === 0 ? '#f0fbff' : i % 3 === 0 && Math.abs(j) <= 2 ? '#d8f2ff' : '#9fc4d8'),
    glow: 'glowPearl',
  },
  // See-through: a phantom, violet mist with a pale spine and long veils.
  phantom: {
    length: 27, width: 4.2, tile: 5, segments: 4, sway: 4, tailLength: 12, tailSpread: 0.65, flowing: true, fin: '#c9b8ff', finOpacity: 0.3, finLength: 6, beat: 2.5,
    ghost: true, eye: '#f0e0ff', noShadow: true, size: 1.25,
    body: (_i, j) => (j === 0 ? '#efe6ff' : '#8f7fc4'),
    glow: 'glowViolet',
  },
  // Rare: a butterfly ruby, deep crimson flecked with twinkling gold, its fins and tail trailing long as ribbons.
  ruby: {
    length: 28, width: 4.4, tile: 5, segments: 4, sway: 4, tailLength: 17, tailSpread: 0.62, flowing: true, fin: '#d2383f', finOpacity: 0.7, finLength: 10, beat: 2.0,
    crest: '#f2c45a', sparkle: 0.14, sparkleColour: '#f2c45a', size: 1.15,
    body: (i, j) => (i < 4 && Math.abs(j) < 2 ? '#e05a3a' : Math.abs(j) <= 1 ? '#8e1726' : '#b3232f'),
    glow: 'glowRuby', glowSize: 1.1,
  },
  // Rare: a night-sky koi, deep blue with a band of violet haze and stars twinkling all over it, blue ribbon fins.
  starry: {
    length: 28, width: 4.6, tile: 5, segments: 4, sway: 4, tailLength: 13, tailSpread: 0.65, flowing: true, fin: '#7d92ff', finOpacity: 0.6, finLength: 7, beat: 2.3,
    outline: '#2a3470', eye: '#cfe0ff', sparkle: 0.16, size: 1.05,
    body: (i, j) => (blotch(i * 0.7, j, 6.6) > 0.7 ? '#3b2f6e' : (i + j) % 7 === 0 ? '#22306a' : '#141a3a'),
    glow: 'glowStar', glowSize: 1.3, noShadow: true,
  },
  // Rare: sakura, cherry-blossom pink with deeper petal spots, butterfly fins, pale twinkles.
  sakura: {
    length: 28, width: 4.4, tile: 5, segments: 4, sway: 4, tailLength: 15, tailSpread: 0.62, flowing: true, fin: '#f4b8cc', finOpacity: 0.7, finLength: 9, beat: 2.1,
    sparkle: 0.12, sparkleColour: '#fff0f6', size: 1.1,
    body: (i, j) => (blotch(i * 1.3, j * 1.3, 17) > 0.7 ? '#e47fa0' : '#f6dde6'),
    glow: 'glowRose',
  },
  // Rare: a tiger koi, blazing orange, striped black, pale along its sides.
  tiger: {
    length: 28, width: 4.6, tile: 5, segments: 4, sway: 4, tailLength: 9, tailSpread: 0.6, forked: true, fin: '#d06a1a', finOpacity: 0.8, finLength: 5, beat: 1.8, size: 1.15,
    body: (i, j, _t, w) => (i > 3 && i % 5 <= 1 && Math.abs(j) < w * 0.85 ? '#1a1410' : Math.abs(j) >= w * 0.75 ? '#f0d8b0' : '#e07a1e'),
    glow: 'glowEmber',
  },
  // Rare: jade, polished green stone, glinting, with long pale-green fins.
  jade: {
    length: 28, width: 4.5, tile: 5, segments: 4, sway: 4, tailLength: 12, tailSpread: 0.6, flowing: true, fin: '#7fe0b0', finOpacity: 0.7, finLength: 7, beat: 2.2,
    sparkle: 0.14, sparkleColour: '#e0fff0', size: 1.1,
    body: (_i, j) => (j === 0 ? '#9ff0c8' : Math.abs(j) >= 3 ? '#1f7a52' : '#3fae7a'),
    glow: 'glowMint',
  },
  // Very rare: pearl white, shimmering through every colour, with a soft white light; the biggest koi in the pond.
  opal: {
    length: 32, width: 5, tile: 5, segments: 4, sway: 4, tailLength: 14, tailSpread: 0.65, flowing: true, fin: '#f3eefa', finOpacity: 0.75, finLength: 8, beat: 2.4,
    sparkle: 0.08, size: 1.35,
    body: () => '#ece8f2',
    glow: 'glowPearl', glowSize: 1.3, shimmer: true,
  },
  // Very rare: prism, banded in every colour of the rainbow, glinting white.
  prism: {
    length: 32, width: 5, tile: 5, segments: 4, sway: 4, tailLength: 14, tailSpread: 0.65, flowing: true, fin: '#f3eefa', finOpacity: 0.7, finLength: 8, beat: 2.3,
    sparkle: 0.1, size: 1.3,
    body: i => ['#ff7a7a', '#ffc46b', '#fff27a', '#7affa0', '#7ad0ff', '#b07aff'][Math.floor(i / 5) % 6]!,
    glow: 'glowPearl',
  },
  // Very rare: kintsugi, black lacquer mended with veins of gold.
  kintsugi: {
    length: 32, width: 5, tile: 5, segments: 4, sway: 4, tailLength: 13, tailSpread: 0.65, flowing: true, fin: '#2a2b31', finOpacity: 0.85, finLength: 7, beat: 2.4,
    sparkle: 0.08, sparkleColour: '#ffe08a', size: 1.3,
    body: (i, j) => (Math.abs(blotch(i * 0.9, j * 1.1, 19)) < 0.14 ? '#e8c25a' : '#16171c'),
    glow: 'glowGold',
  },
  // Fancy koi: bold one-off designs, in the day's colours (see DESIGNS).
  ...Object.fromEntries(Object.entries(DESIGNS).map(([name, d]) => [name, fancySpecies(d, PALETTES[0]!)])),
  // Legendary: a jade dragon, long as four koi, with a gold crest, gold whiskers and red eyes, rippling as it swims.
  dragon: {
    length: 64, width: 2.6, tile: 5, shape: 'eel', segments: 10, sway: 5, tailLength: 9, tailSpread: 0.55, flowing: true, fin: '#e0b04a', finOpacity: 0.85, finLength: 5, beat: 2.8,
    crest: '#f0c860', whiskers: '#e0b04a', eye: '#ff4d3d', sparkle: 0.1, sparkleColour: '#ffd86b', size: 1.1,
    body: (i, j) => (Math.abs(j) >= 2 ? '#1f5e45' : j === 1 && i % 2 === 0 ? '#c9a640' : '#2f7d5b'),
    glow: 'glowGold', glowSize: 0.9,
  },
  // Legendary: a phoenix, a long fire-bird of a fish, gold at the head burning down to deep red, with flame fins.
  phoenix: {
    length: 56, width: 2.8, tile: 5, shape: 'eel', segments: 9, sway: 5, tailLength: 14, tailSpread: 0.6, flowing: true, fin: '#ff9a3d', finOpacity: 0.8, finLength: 6, beat: 2.6,
    crest: '#ffd86b', eye: '#fff2b0', sparkle: 0.1, sparkleColour: '#ffd86b', size: 1.1,
    body: (_i, j, t) => (Math.abs(j) >= 2 ? '#a8241c' : t < 0.3 ? '#ffb03a' : t < 0.65 ? '#ff6a2a' : '#d8321e'),
    glow: 'glowEmber',
  },
  // Legendary: a leviathan from the deep, longest of all, midnight blue with rows of lights down its sides.
  leviathan: {
    length: 70, width: 3, tile: 5, shape: 'eel', segments: 10, sway: 5, tailLength: 9, tailSpread: 0.55, flowing: true, fin: '#2a5a8a', finOpacity: 0.85, finLength: 5, beat: 3.0,
    crest: '#3f7ab8', eye: '#9fe8ff', size: 1.1,
    body: (i, j) => (Math.abs(j) === 2 && i % 4 === 0 ? '#7fe8ff' : Math.abs(j) >= 2 ? '#0e1f3a' : '#183660'),
    glow: 'glowCyan',
  },
}

type Swim = {
  species: string
  points: readonly Point[]
  closed: boolean
  seconds: number
  /** Seconds into its cycle the fish is at the epoch: every fish's place follows the clock, so a redrawn scene picks
   *  up where the last one was. */
  start: number
  /** For a fish that visits: the share of its cycle it spends crossing the pond; it waits out of sight the rest. */
  visible?: number
  /** Drawn this much larger or smaller; the everyday koi take theirs from the day. */
  size?: number
}

/** The everyday koi's sizes on a day, by loop: one big parent (its loop chosen by the day) and three between. */
function sizesOn(day: number): { sizes: number[]; parent: number } {
  const parent = Math.floor(hashOf(day, 7, 504) * 4)
  const rest = [0.72, 0.92, 1.1].map(v => [hashOf(day, v * 100, 505), v] as const).sort((a, b) => a[0] - b[0]).map(([, v]) => v)
  return { sizes: [0, 1, 2, 3].map(k => (k === parent ? 1.32 : rest.shift()!)), parent }
}

/** The everyday koi breeds; four of them swim in the pond each day. */
export const COMMONS: readonly string[] = [
  'shiro', 'kin', 'sumi', 'kohaku', 'showa', 'asagi', 'tancho', 'platinum', 'bekko', 'utsuri', 'goshiki', 'chagoi',
  'kujaku', 'kikokuryu', 'yamabuki', 'ochiba', 'sanke', 'hiutsuri', 'kiutsuri', 'benigoi', 'matsuba', 'karashi', 'kumonryu', 'midorigoi',
]

/** Every kind of fish there is. */
export const KINDS: readonly string[] = Object.keys(SPECIES)

/** The visitors' pools: each day one kind from each swims its slot (two rares, never the same). */
export const POOLS = {
  school: ['lantern', 'ember', 'mint', 'rose'],
  glow: ['violet', 'moonfin', 'aurora', 'firefly'],
  ghostly: ['ghost', 'glass', 'phantom'],
  rare: ['ruby', 'starry', 'sakura', 'tiger', 'jade'],
  veryrare: ['opal', 'prism', 'kintsugi'],
  legend: ['dragon', 'phoenix', 'leviathan'],
} as const

/** The visitors in the pond on a day (days since the epoch, New York time). */
export function visitorsOn(day: number): { school: string; glow: string; ghostly: string; rare: string; rare2: string; veryrare: string; legend: string } {
  const pick = (pool: readonly string[], salt: number) => pool[Math.floor(hashOf(day, salt, 600) * pool.length)]!
  const r = Math.floor(hashOf(day, 4, 600) * POOLS.rare.length)
  const r2 = (r + 1 + Math.floor(hashOf(day, 5, 600) * (POOLS.rare.length - 1))) % POOLS.rare.length
  return {
    school: pick(POOLS.school, 1),
    glow: pick(POOLS.glow, 2),
    ghostly: pick(POOLS.ghostly, 3),
    rare: POOLS.rare[r]!,
    rare2: POOLS.rare[r2]!,
    veryrare: pick(POOLS.veryrare, 6),
    legend: pick(POOLS.legend, 7),
  }
}

/** A day's koi in loop k may have long butterfly fins (about one in four) or ginrin scales that twinkle (about one in five),
 *  and has a tail of the day's shape. */
export function traitsOn(day: number, k: number): { butterfly: boolean; ginrin: boolean; tail: Tail } {
  return { butterfly: hashOf(day, k, 506) < 0.25, ginrin: hashOf(day, k, 507) < 0.2, tail: TAILS[Math.floor(hashOf(day, k, 508) * TAILS.length)]! }
}

/** A breed with the day's traits. */
function withTraits(sp: Species, t: { butterfly: boolean; ginrin: boolean; tail: Tail }): Species {
  return {
    ...sp,
    tail: t.butterfly ? 'flow' : t.tail,
    ...(t.butterfly ? { tailLength: sp.tailLength + 6, flowing: true, finLength: (sp.finLength ?? 3) + 4, segments: 4 } : {}),
    ...(t.ginrin && sp.sparkle === undefined ? { sparkle: 0.12 } : {}),
  }
}

/** The fancy koi, each a bold design of its own; two of them swim in the pond each day. */
export const FANCY: readonly string[] = Object.keys(DESIGNS)

/** A fancy koi's look for a day in loop k: its palette, and whether it glows (about one in three) or shimmers through
 *  every colour (about one in three). */
export function fancyOn(day: number, k: number): { palette: number; glow: boolean; shimmer: boolean } {
  return { palette: Math.floor(hashOf(day, k, 510) * PALETTES.length), glow: hashOf(day, k, 511) < 0.34, shimmer: hashOf(day, k, 512) < 0.34 }
}

/** A fancy koi dressed for the day. */
function fancyFor(name: string, day: number, k: number): Species {
  const look = fancyOn(day, k)
  const p = PALETTES[look.palette]!
  return { ...fancySpecies(DESIGNS[name]!, p), ...(look.glow ? { glow: p[3] } : {}), ...(look.shimmer ? { shimmer: true } : {}) }
}

/** The four koi in the pond on a day (days since the epoch, New York time): two everyday breeds and two fancy ones,
 *  shuffled by the day. */
export function lineup(day: number): string[] {
  const pick = (names: readonly string[], salt: number) =>
    [...names].map((name, k) => [hashOf(day, k, salt), name] as const).sort((a, b) => a[0] - b[0]).slice(0, 2).map(([, name]) => name)
  const four = [...pick(COMMONS, 501), ...pick(FANCY, 503)]
  return four.map((name, k) => [hashOf(day, k, 504), name] as const).sort((a, b) => a[0] - b[0]).map(([, name]) => name)
}

// Loops for the everyday koi, all inside the pond (their breed is the day's: `common`); the glowing fish's loops dip out
// of sight; the rare ones cross once.
const SWIMS: Swim[] = [
  { species: 'common', points: [[220, 260], [700, 140], [1300, 220], [1450, 600], [1000, 860], [420, 780], [150, 520]], closed: true, seconds: 95, start: 0 },
  { species: 'common', points: [[1350, 150], [1500, 450], [1250, 800], [600, 900], [180, 640], [400, 250], [900, 330]], closed: true, seconds: 110, start: 40 },
  { species: 'common', points: [[300, 880], [120, 700], [500, 560], [1000, 600], [1480, 640], [1350, 900], [800, 720]], closed: true, seconds: 85, start: 20 },
  { species: 'common', points: [[760, 480], [1120, 300], [1440, 260], [1300, 700], [900, 820], [480, 700], [340, 440]], closed: true, seconds: 120, start: 70 },
  // One fish of the day's glowing school: three cost the backdrop a good share more to draw for little more to see.
  { species: 'school', size: 1, points: [[-250, 300], [400, 460], [900, 360], [1300, 600], [1900, 520], [2000, 1300], [-400, 1300]], closed: true, seconds: 100, start: 10 },
  { species: 'glow', points: [[1900, 200], [1200, 120], [700, 380], [200, 300], [-300, 120], [-400, -500], [2000, -500]], closed: true, seconds: 130, start: 60 },
  { species: 'ghostly', points: [[-300, 820], [350, 700], [800, 820], [1250, 700], [1900, 860], [2000, 1500], [-400, 1500]], closed: true, seconds: 170, start: 120 },
  { species: 'rare', points: [[-200, 720], [300, 560], [800, 650], [1250, 430], [1850, 380]], closed: false, seconds: 300, start: 200, visible: 0.12 },
  { species: 'rare2', points: [[1900, 900], [1300, 760], [800, 880], [350, 640], [-300, 760]], closed: false, seconds: 420, start: 150, visible: 0.1 },
  { species: 'veryrare', points: [[1850, 140], [1250, 320], [750, 200], [300, 420], [-250, 330]], closed: false, seconds: 900, start: 420, visible: 0.045 },
  { species: 'legend', points: [[-450, 260], [250, 420], [650, 300], [1050, 520], [1400, 380], [2050, 560]], closed: false, seconds: 1800, start: 1290, visible: 0.032 },
]

/** Seconds into a swim's cycle at a moment (seconds since the epoch). */
function cycleAt(swim: Swim, seconds: number): number {
  return (((swim.start + seconds) % swim.seconds) + swim.seconds) % swim.seconds
}

/** A swim's own path, kept once in `defs` and named by the motions that follow it. */
function motion(swim: Swim, seconds: number, pathId: string): string {
  const timing = swim.visible === undefined ? '' : ` keyPoints="0;0;1" keyTimes="0;${(1 - swim.visible).toFixed(3)};1" calcMode="linear"`
  return `<animateMotion dur="${swim.seconds}s" begin="-${cycleAt(swim, seconds).toFixed(2)}s" repeatCount="indefinite" rotate="auto"${timing}><mpath href="#${pathId}"/></animateMotion>`
}

/** The fish's shadows, the fish, and the `defs` their paths are kept in. A shadow is the fish itself, used again in
 *  black and set down and to the right on the floor, so it follows every move without carrying a copy of the moves. */
/** The fish in two depths, each with its shadows, and the `defs` their paths and kinds are kept in. */
/** The fish layers; `glows` holds the glowing fish on a night (moving, and held still for motion off), drawn over the
 *  night's dark instead of under it. */
type FishLayers = { deep: string; shadows: string; fish: string; glows: string; defs: string }

/** The kinds of visitor that keep to the deep water: the glowing ones, lighting it from below. */
const DEEP_VISITORS = new Set(['school', 'glow'])

function fishLayers(drawnAt: number, grow: number, offset: number, night = false): FishLayers {
  const at = drawnAt / 1000
  const ids = new Map<string, string>()
  let defs = ''
  let shadows = ''
  let fish = ''
  let deep = ''
  let still = ''
  let stillShadows = ''
  let deepStill = ''
  let glows = ''
  let glowStill = ''
  const posed: Point[] = []
  const sprites = new Map<string, string>()
  const day = Math.floor((at + offset) / 86400)
  const today = lineup(day)
  const { sizes, parent } = sizesOn(day)
  // The day's swims: each loop's koi takes the day's breed and size.
  const loops = SWIMS.filter(s => s.species === 'common')
  const swims: { swim: Swim; name: string; size: number; seed: number; sp: Species; low: boolean }[] = []
  const visitors: Record<string, string> = visitorsOn(day)
  SWIMS.forEach(swim => {
    const kind = visitors[swim.species]
    if (kind !== undefined) {
      const own = SPECIES[kind]!
      return void swims.push({ swim, name: kind, size: swim.size ?? own.size ?? 1, seed: 0, sp: own, low: DEEP_VISITORS.has(swim.species) })
    }
    const k = loops.indexOf(swim)
    // Some of the day's everyday koi keep to the deep; the big parent stays near the surface, and the fancy koi
    // always swim near the surface, full size, to be seen.
    const fancy = DESIGNS[today[k]!] !== undefined
    const low = k !== parent && !fancy && hashOf(day, k, 520) < 0.5
    swims.push({ swim, name: today[k]!, size: fancy ? Math.max(1.05, sizes[k]!) : sizes[k]!, seed: hashOf(day, k + 1, 502) * 6, sp: withTraits(DESIGNS[today[k]!] === undefined ? SPECIES[today[k]!]! : fancyFor(today[k]!, day, k), traitsOn(day, k)), low })
  })
  swims.forEach(({ swim, name, size, seed, sp, low }, i) => {
    const d = smoothPath(swim.points, swim.closed)
    if (!ids.has(d)) {
      ids.set(d, `s${ids.size}`)
      defs += `<path id="s${ids.size - 1}" d="${d}"/>`
    }
    const moves = motion(swim, at, ids.get(d)!)
    // Each kind drawn once, in defs, and used by every fish of it at its own size.
    if (!sprites.has(name)) {
      sprites.set(name, '')
      defs += `<g id="k-${name}">${fishSprite(sp, false, seed)}</g>`
    }
    // Deep fish look a little smaller, further off.
    const scale = short(size * grow * (low ? 0.72 : 1))
    // A glowing fish gives off a soft light that hugs its own shape and moves with it (see GLOWS).
    const use = `<use href="#k-${name}" transform="scale(${scale})"/>`
    // A glowing fish gives off a soft light that hugs its own shape and moves with it: one small drop-shadow (see GLOWS).
    const body = sp.glow === undefined ? use : `<g class="${GLOWS[sp.glow]![0]}">${use}</g>`
    // Now and then the fish sinks (smaller, dimmer, its shadow closer under it) and rises to the surface (a little
    // larger, its shadow further off); each fish on its own slow cycle, on the clock.
    const cycle = 50 + Math.round(hashOf(i, 171, 1) * 40)
    const depth = `style="--c:${cycle}s;--o:${Math.round(hashOf(i, 172, 1) * cycle)}s"`
    const drawn = `<g id="f${i}">${moves}<g class="dv" ${depth}>${body}</g></g>`
    const casts = !(sp.noShadow || sp.glow !== undefined || size < 0.5)
    const shadow = casts ? `<g class="sd" ${depth}><use href="#f${i}"/></g>` : ''
    // With motion turned off the swimming fish are hidden and each shows instead holding still somewhere on its loop,
    // its shadow with it. A rare visitor is away most of the time, so it stays away.
    const pose = swim.visible === undefined ? stillPose(swim.points, posed) : undefined
    const kept = pose === undefined ? '' : `<g id="q${i}" class="still" transform="${pose}">${body.replace('"/>', '" class="pose"/>')}</g>`
    if (night && sp.glow !== undefined) {
      // On a night the glowing fish swim over the dark, so they shine; moved there, not copied, so they cost no more.
      glows += drawn
      glowStill += kept
    } else if (low) {
      deep += drawn
      deepStill += kept
    } else {
      fish += drawn
      shadows += shadow
      still += kept
      if (kept !== '' && casts) stillShadows += `<use class="still" href="#q${i}"/>`
    }
  })
  return {
    deep: `<g class="mv">${deep}</g>${deepStill}`,
    shadows: `<g class="mv">${shadows}</g>${stillShadows}`,
    fish: `<g class="mv">${fish}</g>${still}`,
    glows: glows === '' ? '' : `<g class="mv">${glows}</g>${glowStill}`,
    defs,
  }
}

/** Where a fish holds still with motion turned off: at the one of its loop's points well inside the pond that is
 *  furthest from the fish already posed (added to `posed`), turned to face the next point along. Undefined for a loop
 *  with no such point. */
export function stillPose(points: readonly Point[], posed: Point[]): string | undefined {
  const inside = points.map((p, k) => [p, k] as const).filter(([[x, y]]) => x >= 120 && x <= 1480 && y >= 100 && y <= 900)
  if (inside.length === 0) return undefined
  const room = ([x, y]: Point) => Math.min(Infinity, ...posed.map(([px, py]) => Math.hypot(px - x, py - y)))
  const [[x, y], k] = inside.reduce((best, c) => (room(c[0]) > room(best[0]) ? c : best))
  posed.push([x, y])
  const [nx, ny] = points[(k + 1) % points.length]!
  const angle = (Math.atan2(ny - y, nx - x) * 180) / Math.PI
  return `translate(${x} ${y}) rotate(${Math.round(angle)})`
}

// ---------- rain and snow ----------

/** Drops for each strength of rain, and how fast they come (1 is the drizzle's pace); flakes for each strength of snow. */
const RAIN_DROPS = [0, 8, 18, 30]
const RAIN_PACE = [1, 1, 0.8, 0.55]
const SNOWFLAKES = [0, 24, 42]

/** New York's rain and snow over the pond, faded in from when the weather changed: raindrops blinking on the water,
 *  snowflakes drifting down onto it. Empty when it is dry. */
function weatherLayer(c: Conditions, fadeFrom: number): string {
  let out = ''
  if (c.rain > 0) {
    out += `<rect width="${W}" height="${H}" fill="#8d9ca0" opacity="${[0, 0.05, 0.08, 0.12][c.rain]}"/>`
    for (let k = 0; k < RAIN_DROPS[c.rain]!; k += 1) {
      const x = Math.round(80 + hashOf(k, 41, 7) * (W - 160))
      const y = Math.round(60 + hashOf(k, 42, 7) * (H - 120))
      // Four speeds and five starts of drop, each a class, so a drop carries only its place.
      out += `<rect class="rd r${k % 4} d${Math.floor(hashOf(k, 45, 7) * 5)}" x="${x}" y="${y}"/>`
    }
  }
  for (let k = 0; k < SNOWFLAKES[c.snow]!; k += 1) {
    const x = Math.round(40 + hashOf(k, 61, 7) * (W - 80))
    const y = Math.round(40 + hashOf(k, 62, 7) * (H - 80))
    out += `<rect class="sn r${k % 4} d${Math.floor(hashOf(k, 63, 7) * 5)}" x="${x}" y="${y}"/>`
  }
  return out === '' ? '' : `<g class="wx" style="animation-delay:${Math.round(fadeFrom)}s">${out}</g>`
}

/** The style rain and snow need: their paces and starts; `--w` sways the pads wider in wind, `--rs` quickens the rain.
 *  Drops and flakes rest invisible until their animation runs, so with motion turned off none show. */
function weatherCss(c: Conditions): string {
  return (
    `:root{--w:${(1 + c.wind * 1.4).toFixed(2)};--rs:${RAIN_PACE[c.rain]}}` +
    `.wx{animation:wx 60s ease-out both}@keyframes wx{from{opacity:0}}` +
    `.rd{width:4px;height:4px;fill:#d8ece6;opacity:0;animation:rd linear infinite}` +
    `@keyframes rd{0%{opacity:.85}12%{opacity:.3}24%,100%{opacity:0}}` +
    `.sn{width:5px;height:5px;fill:#f2f8ff;opacity:0;animation:sn linear infinite}` +
    `@keyframes sn{0%{transform:translate(-26px,-44px);opacity:0}15%{opacity:.9}80%{transform:translate(0,0);opacity:.75}100%{transform:translate(0,0);opacity:0}}` +
    `.r0{animation-duration:calc(var(--rs) * 3s)}.r1{animation-duration:calc(var(--rs) * 4.3s)}.r2{animation-duration:calc(var(--rs) * 5.6s)}.r3{animation-duration:calc(var(--rs) * 6.9s)}` +
    `.sn.r0{animation-duration:6s}.sn.r1{animation-duration:7.5s}.sn.r2{animation-duration:9s}.sn.r3{animation-duration:10.5s}` +
    `.d0{animation-delay:var(--t0)}.d1{animation-delay:calc(var(--t0) - 1.3s)}.d2{animation-delay:calc(var(--t0) - 2.9s)}.d3{animation-delay:calc(var(--t0) - 4.4s)}.d4{animation-delay:calc(var(--t0) - 5.8s)}`
  )
}

/** The pond under this sky, drawn as of `drawnAt` (ms since the epoch): every motion is placed where it is at that
 *  moment, so a scene redrawn later carries on instead of starting over. */
export function pondSvg(sky?: Sky, drawnAt: number = sky?.since ?? 0): string {
  return drawPond(sky, drawnAt)
}

/** Wide pools of light and shade in the water, each swaying slowly on its own beat: lighter where the rippling surface
 *  gathers the light, darker where it spreads it. Big and soft, so the water never looks flat. */
const RIPPLES = `<g>${(
  [
    ['rl', 420, 300, 560, 320, 90, 50, 31],
    ['rl', 1240, 720, 600, 330, -110, 40, 37],
    ['rl', 860, 90, 460, 230, 70, 60, 26],
    ['rl', 1450, 380, 380, 260, -60, -70, 43],
    ['rd', 260, 830, 520, 280, 80, -40, 34],
    ['rd', 1380, 120, 420, 260, -70, 50, 29],
    ['rd', 820, 560, 380, 240, 100, 30, 47],
  ] as const
)
  .map(([fill, cx, cy, rx, ry, x, y, d], k) => `<ellipse class="rw" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#${fill})" style="--x:${x}px;--y:${y}px;--d:${d}s;--o:${k * 7}s"/>`)
  .join('')}</g>`

/** The most characters a backdrop scene may have. */
export const LIMIT = 131072

/** The pond: water, fish and lily pads, nothing else. */
function drawPond(sky: Sky | undefined, drawnAt: number): string {
  const { deep, shadows, fish, glows, defs: paths } = fishLayers(drawnAt, sky?.grow ?? 1, sky?.weather.offset ?? -18000, sky?.dark === true)
  const night = sky?.dark === true
  const local = sky === undefined ? 0 : localSeconds(drawnAt, sky.weather.offset)
  const cond = sky === undefined ? undefined : conditionOf(sky.weather)
  const season = sky === undefined ? undefined : seasonOf(drawnAt, sky.weather.offset)
  const { pads, shadows: padShadows, defs: padDefs } = padsSvg({
    season,
    light: sky === undefined ? undefined : { local, sunrise: sky.weather.sunrise, sunset: sky.weather.sunset },
  })

  // Every looping animation runs on the clock, not from when this scene was drawn: a scene redrawn when a turn starts
  // or ends carries on mid-swing instead of every tail and ripple starting over together.
  // Built last: the width and dash rules come from what the body and defs drew.
  // The sparkles' fade steps rather than glides: a smooth fade repaints the fish every frame, a stepped one a few times a
  // cycle, and costs the backdrop less than half as much to draw.
  const style = () => `:root{--t0:-${((drawnAt / 1000) % 86400).toFixed(2)}s}
.fin{animation:fin ease-in-out infinite alternate;animation-delay:var(--t0)}
@keyframes fin{from{transform:rotate(-14deg)}to{transform:rotate(10deg)}}.fin.b{animation-name:fn}@keyframes fn{from{transform:rotate(14deg)}to{transform:rotate(-10deg)}}
.sw{animation:sw ease-in-out infinite alternate;animation-duration:var(--b);animation-delay:calc(var(--t0) - var(--b) * var(--k))}
@keyframes sw{from{transform:rotate(calc(var(--a) * -1))}to{transform:rotate(var(--a))}}
.dv,.sd{animation:dv linear infinite;animation-duration:var(--c);animation-delay:calc(var(--t0) - var(--o))}.sd{animation-name:sd}
@keyframes dv{0%,38%{transform:none}50%,62%{transform:scale(.86)}74%{transform:none}80%,86%{transform:scale(1.07)}94%,100%{transform:none}}
@keyframes sd{0%,38%{transform:none}50%,62%{transform:translate(-11px,-15px)}74%{transform:none}80%,86%{transform:translate(8px,11px)}94%,100%{transform:none}}
.opal{animation:opal 6s linear infinite;animation-delay:var(--t0)}
@keyframes opal{from{filter:hue-rotate(0deg)}to{filter:hue-rotate(360deg)}}
.gr{animation:gr 2.6s steps(3) infinite alternate;animation-delay:var(--t0)}
@keyframes gr{0%,55%{stroke-opacity:0}100%{stroke-opacity:.7}}
.sway{animation:sway ease-in-out infinite alternate;animation-delay:var(--t0)}.sway.b{animation-direction:alternate-reverse}
@keyframes sway{from{transform:translate(calc(var(--w,1) * -6px),calc(var(--w,1) * -4px))}to{transform:translate(calc(var(--w,1) * 6px),calc(var(--w,1) * 5px))}}
.rw{transform-box:fill-box;transform-origin:center;animation:rw ease-in-out infinite alternate;animation-duration:var(--d);animation-delay:calc(var(--t0) - var(--o))}
@keyframes rw{from{transform:translate(calc(var(--x) * -1),calc(var(--y) * -1)) scale(.9,1.06)}to{transform:translate(var(--x),var(--y)) scale(1.1,.94)}}
.shade use{filter:brightness(0)}
${[...WIDTHS].map(w => `.${widthClass(w)}{stroke-width:${w}px}`).join('')}${[...DASHES].map(w => `.d${w.replace('.', '')}{stroke-dasharray:${w} .7}`).join('')}
${PADS_CSS}${sky === undefined ? '' : gateCss(sky.weather.sunrise, sky.weather.sunset) + lightCss(sky.weather.sunrise, sky.weather.sunset)}${cond === undefined ? '' : weatherCss(cond)}
${Object.values(GLOWS).map(([cls, colour]) => `.${cls}{filter:drop-shadow(0 0 ${night ? 8 : 3}px ${colour})}`).join('')}
.still{display:none}
@media (prefers-reduced-motion: reduce){*{animation:none!important}.mv{display:none}.still{display:inline}}`


  const defs =
    `<linearGradient id="water" x1="0" y1="0" x2="1" y2="0.62"><stop offset="0" stop-color="#18231f"/><stop offset="0.25" stop-color="#1f2d28"/><stop offset="0.55" stop-color="#22312b"/><stop offset="0.78" stop-color="#192623"/><stop offset="1" stop-color="#0c1414"/></linearGradient>` +
    `<radialGradient id="rl"><stop offset="0" stop-color="#4f7a66" stop-opacity=".34"/><stop offset=".55" stop-color="#3d6152" stop-opacity=".14"/><stop offset="1" stop-color="#3d6152" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="rd"><stop offset="0" stop-color="#050b0d" stop-opacity=".5"/><stop offset=".6" stop-color="#050b0d" stop-opacity=".2"/><stop offset="1" stop-color="#050b0d" stop-opacity="0"/></radialGradient>` +
    `<pattern id="grid" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M0 0.5h12M0.5 0v12" stroke="#a9c4b8" stroke-opacity="0.045" fill="none"/></pattern>` +
    VEIL_DEF +
    padDefs +
    paths

  const body =
    `<rect width="${W}" height="${H}" fill="url(#water)"/>` +
    // Light and shade moving slowly through the water, as the surface ripples overhead.
    RIPPLES +
    `<rect width="${W}" height="${H}" fill="url(#grid)"/>` +
    // The deep fish (too far down to cast a shadow worth its cost), then a haze of water over them,
    // then the fish near the surface with their shadows further off.
    `<g class="deep">${deep}</g>` +
    `<rect class="haze" width="${W}" height="${H}" fill="#1d2c27" opacity=".3"/>` +
    `<g class="shade" transform="translate(16 22)" opacity="0.32">${shadows}</g>` +
    fish +
    (sky === undefined || cond === undefined ? '' : weatherLayer(cond, (sky.changed - drawnAt) / 1000)) +
    // The day's light over the water and the fish: a dark blue at night, dawn and dusk tints. The lily pads lie on top
    // and dim themselves, so their buds can glow over the dark.
    (sky === undefined ? '' : lightLayer(local, sky.weather.sunrise, sky.weather.sunset)) +
    // On a night the glowing fish swim over the dark, so they shine.
    glows +
    `<g class="shade" transform="translate(8 10)" opacity="0.35">${padShadows}</g>` +
    pads +
    VEIL
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="xMidYMid slice"><style>${style()}</style><defs>${defs}</defs>${body}</svg>`
}
