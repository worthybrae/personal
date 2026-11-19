// The lily pads: two clusters and a few strays on both sides of the chat column, big pads down to new leaves. They
// float with the water, down the right side and up the left, off one edge of the pond and back on at the other, and
// bump off each other and off the banks as they go; each turns a little and bobs more in wind; water lilies on the big ones open by day and
// close into buds at night. Drawn in 5 px tiles, the same as the koi.

import { gate, type Gate } from './light'
import type { Season } from './surface'
import { addTile, drawBacking, drawRuns, hashOf, type Point, type Tiles } from './tiles'

/** Tiles drawn over a solid backing in `grout`, so the gaps between them read as dark seams, not water. */
const solid = (tiles: Tiles, size: number, grout: string) => drawBacking(tiles, grout) + drawRuns(tiles, size)

/** A pad: where it starts (px), its radius (px), how fast it sets off (px/s, across and down), where its notch points,
 *  whether it shows a curled-up edge and in what colour underneath, and its lily. */
export type Pad = {
  at: Point
  r: number
  v: Point
  notch: number
  curl?: { at: number; under: string }
  lily?: 'pink' | 'white'
}

// Starts kept clear of the chat column (tests/pads.test.ts checks every place each pad goes against it). The water on
// the right flows down and on the left up; each pad floats with it at its own pace and drifts across its side, so the
// quicker ones catch up and bump.
export const PADS: readonly Pad[] = [
  { at: [1430, 150], r: 70, v: [1.6, 3.6], notch: 2.3, curl: { at: 5.4, under: '#7a2f38' }, lily: 'pink' },
  { at: [1530, 310], r: 46, v: [-2, 4.2], notch: 4.1 },
  { at: [1320, 66], r: 22, v: [2.4, 5.4], notch: 0.9 },
  { at: [1460, 830], r: 66, v: [-1.3, 3.9], notch: 3.6, lily: 'white' },
  { at: [1320, 930], r: 32, v: [2.2, 5], notch: 5.5, curl: { at: 1.2, under: '#4a7a3a' } },
  { at: [150, 560], r: 72, v: [1.3, -3.8], notch: 0.4, curl: { at: 3.4, under: '#7a2f38' }, lily: 'white' },
  { at: [290, 870], r: 46, v: [-2, -4.6], notch: 2.9, lily: 'pink' },
  { at: [110, 160], r: 30, v: [2.4, -5.2], notch: 4.8 },
]

// ---------- the drift ----------

/** The scene's size, the pond's. */
const W = 1600
const H = 1000
/** The drift repeats every eighteen minutes, on the clock (a day holds a whole number of them). With these paces and
 *  this length the last stretch eases every pad home without one passing over another. */
export const CYCLE = 1080
/** How far past the top and bottom edges a pad floats before it comes round to the other edge: far enough that the
 *  biggest is wholly out of sight. */
const MARGIN = 90
const LOOP = H + 2 * MARGIN
/** The chat column the pads keep out of, and how far wind may bob a pad past where it floats (the `sway`, in a gale). */
export const COLUMN: Point = [490, 1110]
export const GALE = 6 * (1 + 1.4)
/** The last stretch of the cycle, in which every pad eases back to where it was at the cycle's start, so the next one
 *  carries on without a jump. */
export const SETTLE = 240

/** Where a pad may float across: from a little past the pond's side edge to the chat column, less what wind adds. */
function banks(p: Pad): Point {
  return p.at[0] < W / 2 ? [p.r * 0.2, COLUMN[0] - GALE - p.r - 2] : [COLUMN[1] + GALE + p.r + 2, W - p.r * 0.2]
}

/** `y` folded into the loop the pads float round, from above the top edge to below the bottom one. */
const fold = (y: number) => ((((y + MARGIN) % LOOP) + LOOP) % LOOP) - MARGIN
/** The shortest way from one height to another round the loop. */
const across = (d: number) => d - Math.round(d / LOOP) * LOOP

/** A place on a pad's track: seconds into the cycle and where it is (px). */
export type Stop = [number, number, number]

/** Each pad's track over the cycle, as the places where it turns (a bump or a bank) or comes round from one edge to the
 *  other; between them it floats in a straight line. Worked out once: the pads float like discs on water, each as
 *  heavy as its size, and bounce off each other and off the banks without losing speed, and the water slowly brings
 *  each back to its own pace. */
export function padTracks(): { tracks: Stop[][]; bumps: number } {
  if (cached !== undefined) return cached
  const n = PADS.length
  const pos: [number, number][] = PADS.map(p => [p.at[0], p.at[1]])
  const vel: [number, number][] = PADS.map(p => [p.v[0], p.v[1]])
  const mass = PADS.map(p => p.r * p.r)
  // How fast the water carries each pad. When a quicker pad bumps into a slower one ahead, they trade paces, so the one
  // in front goes on ahead and the two part instead of bumping again and again.
  const pace = PADS.map(p => p.v[1])
  const dt = 0.25
  // The run starts SETTLE seconds before the cycle; where the pads are in that opening stretch is where the cycle's
  // last stretch eases them to, so one cycle runs on into the next.
  const marks: Stop[][] = PADS.map(() => [])
  const lead: Stop[][] = PADS.map(() => [])
  const mark = (k: number, t: number) => marks[k]!.push([t, pos[k]![0], pos[k]![1]])
  let bumps = 0
  for (let step = -SETTLE / dt; step * dt < CYCLE; step += 1) {
    const t = step * dt
    for (let k = 0; k < n; k += 1) {
      if (t < 0 && step % 80 === 0) lead[k]!.push([t, pos[k]![0], pos[k]![1]])
      if (t === 0) mark(k, 0)
    }
    for (let k = 0; k < n; k += 1) {
      const [lo, hi] = banks(PADS[k]!)
      const v = vel[k]!
      const q = pos[k]!
      q[0] += v[0] * dt
      q[1] += v[1] * dt
      // The water carries it: every so often a pad knocked off its way, slowed or sped by a bump, is eased back
      // toward the way the water flows, so none is left idling out of sight.
      const fx = Math.sign(v[0]) * Math.abs(PADS[k]!.v[0])
      const fy = pace[k]!
      if (step % 80 === 0 && Math.hypot(fx - v[0], fy - v[1]) > 0.25) {
        v[0] += (fx - v[0]) * 0.35
        v[1] += (fy - v[1]) * 0.35
        if (t >= 0) mark(k, t)
      }
      if ((q[0] < lo && v[0] < 0) || (q[0] > hi && v[0] > 0)) {
        v[0] = -v[0]
        if (t >= 0) mark(k, t)
      }
      if (q[1] > H + MARGIN || q[1] < -MARGIN) {
        // Out of sight past one edge: note where it left, and come round to the other. (Every other mark in a step is
        // at the step's time, so the marks stay in order.)
        if (t >= 0) mark(k, t - 0.04)
        q[1] = fold(q[1])
        if (t >= 0) mark(k, t)
      }
    }
    for (let i = 0; i < n; i += 1) {
      for (let j = i + 1; j < n; j += 1) {
        const [pi, pj, vi, vj] = [pos[i]!, pos[j]!, vel[i]!, vel[j]!]
        const dx = pj[0] - pi[0]
        const dy = across(pj[1] - pi[1])
        const d = Math.hypot(dx, dy)
        if (d >= PADS[i]!.r + PADS[j]!.r || d === 0) continue
        const [nx, ny] = [dx / d, dy / d]
        const closing = (vi[0] - vj[0]) * nx + (vi[1] - vj[1]) * ny
        if (closing <= 0) continue
        // A bounce that keeps the pads' speed between them: each is pushed back along the line between their middles,
        // the lighter one more.
        const push = (2 * closing) / (mass[i]! + mass[j]!)
        vi[0] -= push * mass[j]! * nx
        vi[1] -= push * mass[j]! * ny
        vj[0] += push * mass[i]! * nx
        vj[1] += push * mass[i]! * ny
        const ahead = Math.sign(pace[i]!) * dy > 0 ? j : i
        const behind = ahead === j ? i : j
        if (Math.sign(pace[i]!) === Math.sign(pace[j]!) && Math.abs(pace[behind]!) > Math.abs(pace[ahead]!)) {
          ;[pace[i], pace[j]] = [pace[j]!, pace[i]!]
        }
        if (t >= 0) {
          bumps += 1
          mark(i, t)
          mark(j, t)
        }
      }
    }
  }
  const end = CYCLE - SETTLE
  const tracks = marks.map((all, k) => {
    // A pad marked twice at one moment (a bump and a bank together) keeps the later place.
    const m = all.filter((s, i) => all[i + 1]?.[0] !== s[0])
    // Where the run had the pad at `t`: on the straight line between the marks either side. (It never comes round an
    // edge between two marks: that is marked.)
    const at = (t: number): Point => {
      const b = m.findIndex(s => s[0] >= t)
      const [t0, x0, y0] = b === -1 ? m[m.length - 1]! : m[Math.max(0, b - 1)]!
      const [t1, x1, y1] = b === -1 ? [CYCLE, pos[k]![0], pos[k]![1]] : m[b]!
      const f = t1 === t0 ? 0 : (t - t0) / (t1 - t0)
      return [x0 + (x1 - x0) * f, y0 + (y1 - y0) * f]
    }
    const out: Stop[] = [...m.filter(([t]) => t < end), [end, ...at(end)]]
    // The cycle's last stretch: the pad eases from where the run has it to where it was that long before the start.
    for (const [lt, lx, ly] of [...lead[k]!, [0, m[0]![1], m[0]![2]] as Stop]) {
      const t = CYCLE + lt
      if (t <= end) continue
      const [x, y] = at(t)
      const h = (lt + SETTLE) / SETTLE
      const w = h * h * (3 - 2 * h)
      const tx = x + (lx - x) * w
      const ty = fold(y + across(ly - y) * w)
      const [pt, px, py] = out[out.length - 1]!
      if (Math.abs(ty - py) > LOOP / 2) {
        // It comes round an edge on the way: leave by one and come back by the other, at the moment it would.
        const down = ty < py
        const gone = down ? H + MARGIN - py : py + MARGIN
        const back = down ? ty + MARGIN : H + MARGIN - ty
        const tc = pt + ((t - pt) * gone) / (gone + back)
        const xc = px + ((tx - px) * gone) / (gone + back)
        out.push([tc, xc, down ? H + MARGIN : -MARGIN], [tc + 0.04, xc, down ? -MARGIN : H + MARGIN])
      }
      out.push([t, tx, ty])
    }
    return out
  })
  cached = { tracks, bumps }
  return cached
}
let cached: { tracks: Stop[][]; bumps: number } | undefined

/** One keyframe rule per pad: its track, offset from where it is drawn. */
function trackCss(): string {
  return padTracks()
    .tracks.map((track, k) => {
      const [hx, hy] = PADS[k]!.at
      const frames = track.map(([t, x, y]) => `${Number(((t / CYCLE) * 100).toFixed(3))}%{translate:${Math.round(x - hx)}px ${Math.round(y - hy)}px}`)
      return `.f${k}{animation-name:f${k}}@keyframes f${k}{${frames.join('')}}`
    })
    .join('')
}

/** The pads' tile, the koi's. */
const T = 5
/** The pads' shapes were set in 12 px tiles: their rims, veins and curls keep those proportions. */
const K = 12 / T

/** Angle difference folded into -π..π. */
const turn = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

/** A pad's tiles round its own middle: a lit rim to the upper left and a shaded one to the lower right, veins out
 *  from the middle, a curled-up edge on some, and in autumn a few yellowing spots. */
function padTiles(p: Pad, k: number, season: Season | undefined): Tiles {
  const tiles: Tiles = new Map()
  const R = p.r / T
  const reach = Math.ceil(R)
  const young = p.r < 30
  const veins = 7
  for (let j = -reach; j <= reach; j += 1) {
    for (let i = -reach; i <= reach; i += 1) {
      const d = Math.hypot(i, j)
      if (d > R) continue
      const a = Math.atan2(j, i)
      if (!young && Math.abs(turn(a - p.notch)) < 0.24 && d > 0.6 * K) continue
      const rim = d > R - 1.5
      const lit = (-i - j) / (Math.SQRT2 * Math.max(d, 0.01))
      let colour: string
      if (p.curl !== undefined && d > R - 1.7 * K && Math.abs(turn(a - p.curl.at)) < 0.55) colour = rim ? p.curl.under : '#2a5e3c'
      else if (rim) colour = lit > 0.5 ? (young ? '#5a9460' : '#357452') : lit < -0.35 ? '#112e20' : '#18402c'
      else {
        const ray = turn((a - p.notch - Math.PI) * veins) // distance to the nearest vein, as an angle times the count
        const vein = d > 1.2 * K && d < R - 1.4 * K && Math.abs(ray) * d < 2.2 * K
        const spot = season === 'autumn' && hashOf(Math.round(i / K) + 40, Math.round(j / K) + 40, k + 600) < 0.05 && d > R * 0.4
        colour = spot
          ? hashOf(Math.round(i / K), Math.round(j / K), k + 601) < 0.5 ? '#6f6a2c' : '#7a5530'
          : vein
            ? young ? '#4f8c56' : '#2a5f42'
            : young
              ? '#3d7a4a'
              : lit > 0.2 && d > R * 0.5
                  ? '#22543a'
                  : '#1d4a32'
      }
      addTile(tiles, colour, i * T - T / 2, j * T - T / 2, T)
    }
  }
  // A bead of water caught on the bigger pads.
  if (!young) addTile(tiles, '#cfe8dc', Math.round(R * 0.35) * T - T / 2, Math.round(R * 0.2) * T - T / 2, T)
  return tiles
}

/** The lilies' tile, the koi's too. */
const F = 5

/** An open water lily round (0, 0): two rings of pointed petals and a gold middle. */
function lilyOpen(kind: 'pink' | 'white'): Tiles {
  const [base, tip, deep] = kind === 'pink' ? ['#e8a0b8', '#f8d0de', '#c4688a'] : ['#ece8f2', '#ffffff', '#bdb5cc']
  const tiles: Tiles = new Map()
  const R = 5.5
  for (let j = -6; j <= 6; j += 1) {
    for (let i = -6; i <= 6; i += 1) {
      const d = Math.hypot(i, j)
      const a = Math.atan2(j, i)
      const outer = R * (0.5 + 0.5 * Math.pow(Math.abs(Math.cos(4 * a)), 0.7))
      const inner = R * 0.68 * (0.55 + 0.45 * Math.pow(Math.abs(Math.cos(4 * a + Math.PI / 2)), 0.7))
      let colour = ''
      if (d < 1.3) colour = d < 0.7 ? '#d89a2a' : '#f2c53d'
      else if (d <= inner) colour = d > inner - 1 ? tip : base
      else if (d <= outer) colour = d > outer - 1 ? tip : d < R * 0.5 ? deep : base
      if (colour !== '') addTile(tiles, colour, i * F - F / 2, j * F - F / 2, F)
    }
  }
  return tiles
}

/** A closed bud round (0, 0): a pointed tip of petal colour in green sepals. */
function lilyBud(kind: 'pink' | 'white'): Tiles {
  const petal = kind === 'pink' ? '#c86a8c' : '#d8d2e2'
  const tiles: Tiles = new Map()
  for (let j = -4; j <= 3; j += 1) {
    const half = j < -2 ? 0 : j < 0 ? 1 : j < 3 ? 2 : 1
    for (let i = -half; i <= half; i += 1) {
      const colour = j < 1 ? (i === -half && half > 0 ? '#a85a78' : petal) : Math.abs(i) === half ? '#3f7a4a' : '#356a40'
      addTile(tiles, kind === 'white' && j < 1 && i === -half && half > 0 ? '#b0a8c0' : colour, i * F - F / 2, j * F - F / 2, F)
    }
  }
  return tiles
}

/** The night's dark over the pond (the light layer's `ld`), and how dark a pad goes at night, to match the water. */
const NIGHT = '#040b24'
/** The soft light round a lily's bud at night. */
const BUD_LIGHT = { pink: '#ffd6ea', white: '#f4f0ff' } as const

export type PadDraw = {
  season?: Season
  /** The day's gates; absent when there is no sky to go by, and the lilies show open. */
  light?: { local: number; sunrise: number; sunset: number }
}

/** The pads and their shadows (which use the pads drawn in black, set down and to the right). */
export function padsSvg(o: PadDraw): { pads: string; shadows: string; defs: string } {
  let pads = ''
  let shadows = ''
  const gated = (kind: Gate, inner: string) => (o.light === undefined ? (kind === 'dy' ? inner : '') : gate(kind, o.light.local, o.light.sunrise, o.light.sunset, inner))
  PADS.forEach((p, k) => {
    const tiles = padTiles(p, k, o.season)
    let body = solid(tiles, T, '#0d2418')
    // At night the pad dims with the water under it: its own outline in the night's dark, no filter to redraw.
    let night = drawBacking(tiles, NIGHT).split('<path ').join('<path class="pd-night" ')
    let bud = ''
    if (p.lily !== undefined) {
      const [x, y] = [-Math.round((p.r * 0.3) / T) * T, -Math.round((p.r * 0.25) / T) * T]
      const place = `transform="translate(${x} ${y})"`
      body += gated('dy', `<g class="lo" ${place}><use href="#lo-${p.lily}"/></g>`)
      // The bud glows: a soft light round it over the dimmed pad, and the bud itself left undimmed on top.
      night += `<circle cx="${x}" cy="${y - 3}" r="32" fill="url(#bg-${p.lily})"/>`
      bud = gated('dn', `<g class="lb" ${place}><use href="#lb-${p.lily}"/></g>`)
    }
    if (o.light !== undefined) body += gated('dn', night)
    body += bud
    const spin = 50 + Math.round(hashOf(k, 21, 4) * 40)
    pads +=
      `<g id="pd${k}" transform="translate(${p.at[0]} ${p.at[1]})"><g class="sway${k % 2 === 1 ? ' b' : ''}" style="animation-duration:${9 + (k % 4) * 2}s">` +
      `<g class="pf f${k}">` +
      `<g class="spin" style="animation-duration:${spin}s;animation-delay:calc(var(--t0) - ${Math.round(hashOf(k, 22, 4) * spin)}s)">${body}</g></g></g></g>`
    shadows += `<use href="#pd${k}"/>`
  })
  // Each kind of lily drawn once, open and in bud, and used on every pad that has one.
  const kinds = [...new Set(PADS.flatMap(p => (p.lily === undefined ? [] : [p.lily])))]
  const defs = kinds.map(kind => `<radialGradient id="bg-${kind}"><stop offset="0" stop-color="${BUD_LIGHT[kind]}" stop-opacity=".75"/><stop offset=".35" stop-color="${BUD_LIGHT[kind]}" stop-opacity=".3"/><stop offset="1" stop-color="${BUD_LIGHT[kind]}" stop-opacity="0"/></radialGradient><g id="lo-${kind}">${solid(lilyOpen(kind), F, kind === 'pink' ? '#9c4f6c' : '#8f879e')}</g><g id="lb-${kind}">${solid(lilyBud(kind), F, '#24502e')}</g>`).join('')
  return { pads, shadows, defs }
}

/** The style the pads need beyond the shared `sway`: how dark a pad goes at night, the slow turn, and the drift. */
export const PADS_CSS =
  `.pd-night{opacity:.45}.spin{animation:spin ease-in-out infinite alternate}@keyframes spin{from{transform:rotate(-9deg)}to{transform:rotate(9deg)}}` +
  `.pf{animation:${CYCLE}s linear infinite;animation-delay:var(--t0)}${trackCss()}`
