// Small helpers shared by the pond's drawing: hashing, colours, smooth paths, and tiles drawn as short strokes.

export type Point = readonly [number, number]

export function hashOf(x: number, y: number, salt: number): number {
  let h = Math.imul(x + 11, 374761393) ^ Math.imul(y + 7, 668265263) ^ Math.imul(salt + 3, 1274126177)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h = h ^ (h >>> 16)
  return (h >>> 0) / 4294967296
}

/** A number to two places, without a leading zero: 0.34 is `.34`. */
export const short = (v: number): string => String(Math.round(v * 100) / 100).replace(/^(-?)0\./, '$1.')

export const n1 = (v: number) => (Math.round(v * 10) / 10).toString()

function rgbOf(hex: string): [number, number, number] {
  const v = parseInt(hex.slice(1), 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}

function hexOf([r, g, b]: [number, number, number]): string {
  const c = (x: number) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

/** A colour made lighter (f > 1) or darker (f < 1). */
export function shade(hex: string, f: number): string {
  const [r, g, b] = rgbOf(hex)
  return hexOf([r * f, g * f, b * f])
}

/** A smooth path through points (Catmull-Rom as cubic Béziers), closed into a loop or open. */
export function smoothPath(points: readonly Point[], closed: boolean): string {
  const n = points.length
  const at = (i: number): Point => (closed ? points[((i % n) + n) % n]! : points[Math.max(0, Math.min(n - 1, i))]!)
  let d = `M${n1(at(0)[0])} ${n1(at(0)[1])}`
  const segments = closed ? n : n - 1
  for (let i = 0; i < segments; i += 1) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)]
    const c1: Point = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2: Point = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += `C${n1(c1[0])} ${n1(c1[1])} ${n1(c2[0])} ${n1(c2[1])} ${n1(p2[0])} ${n1(p2[1])}`
  }
  return closed ? `${d}Z` : d
}

export type Tiles = Map<string, Array<[number, number, number]>>

export function addTile(tiles: Tiles, paint: string, x: number, y: number, size: number): void {
  const list = tiles.get(paint) ?? []
  list.push([x, y, size])
  tiles.set(paint, list)
}

/** Every tile width drawn so far, so the scene's style can name each one. */
export const WIDTHS = new Set<string>()
export const widthClass = (s: string) => `t${s.replace('.', '')}`

/** Each paint's tiles in one path, a hair smaller than the grid so the seams show and the shape reads as built from
 *  blocks; each tile is placed relative to the one before, which keeps the scene inside the size a backdrop may have. */
export function drawTiles(tiles: Tiles, attributes = ''): string {
  let out = ''
  for (const [paint, list] of tiles) {
    const [colour, opacity] = paint.split('|')
    // Each tile is a short stroke as wide as it is long: a square in a dozen characters instead of twenty. Its width
    // comes from a class named for it (`t43` for 4.3), written once in the scene's style.
    const bySize = new Map<string, Array<[number, number]>>()
    for (const [x, y, size] of list) {
      const s = n1(size - 0.7)
      const group = bySize.get(s) ?? []
      group.push([x, y])
      bySize.set(s, group)
    }
    for (const [s, group] of bySize) {
      WIDTHS.add(s)
      const half = Number(s) / 2
      let d = ''
      let px = 0
      let py = 0
      for (const [x, y] of group) {
        const sx = Number(n1(x))
        const sy = Number(n1(y + half))
        d += `${d === '' ? `M${sx} ${sy}` : `m${n1(sx - px)} ${n1(sy - py)}`}h${s}`
        px = sx + Number(s)
        py = sy
      }
      out += `<path class="${widthClass(s)}" d="${d}" stroke="${colour}"${opacity === undefined ? attributes : ` opacity="${opacity.replace(/^0\./, '.')}"`}/>`
    }
  }
  return out
}

/** All tiles as one solid shape, rows joined into runs: a shadow needs no seams. */
/** Every tile filled solid in one colour, with no seams: rows of tiles as horizontal strokes a tile thick, in short
 *  relative steps. Drawn under the tiles, it fills the gaps between them. */
export function drawBacking(tiles: Tiles, colour: string): string {
  const bySize = new Map<number, Map<number, number[]>>()
  for (const list of tiles.values()) {
    for (const [x, y, size] of list) {
      const rows = bySize.get(size) ?? new Map<number, number[]>()
      rows.set(y, [...(rows.get(y) ?? []), x])
      bySize.set(size, rows)
    }
  }
  let out = ''
  for (const [size, rows] of bySize) {
    let d = ''
    let px = 0
    let py = 0
    for (const y of [...rows.keys()].sort((a, b) => a - b)) {
      const xs = [...new Set(rows.get(y)!)].sort((a, b) => a - b)
      let from = xs[0]!
      for (let i = 1; i <= xs.length; i += 1) {
        if (i < xs.length && xs[i]! - xs[i - 1]! <= size + 0.01) continue
        const width = Number(n1(xs[i - 1]! + size - from))
        const sx = Number(n1(from))
        const sy = Number(n1(y + size / 2))
        d += d === '' ? `M${sx} ${sy}h${width}` : `m${n1(sx - px)} ${n1(sy - py)}h${width}`
        px = sx + width
        py = sy
        from = xs[i]!
      }
    }
    if (d !== '') out += `<path stroke="${colour}" stroke-width="${n1(size)}" d="${d}"/>`
  }
  return out
}

export function drawSolid(tiles: Tiles): string {
  const rows = new Map<number, Map<number, number>>()
  for (const list of tiles.values()) {
    for (const [x, y, size] of list) {
      const row = rows.get(y) ?? new Map<number, number>()
      row.set(x, size)
      rows.set(y, row)
    }
  }
  let d = ''
  for (const [y, row] of rows) {
    const xs = [...row.keys()].sort((a, b) => a - b)
    let from = xs[0]!
    for (let i = 1; i <= xs.length; i += 1) {
      const size = row.get(xs[i - 1]!)!
      if (i < xs.length && xs[i]! - xs[i - 1]! <= size + 0.01) continue
      const width = xs[i - 1]! + size - from
      d += `M${n1(from)} ${n1(y)}h${n1(width)}v${n1(size)}h-${n1(width)}z`
      from = xs[i]!
    }
  }
  return d === '' ? '' : `<path d="${d}"/>`
}

/** Tiles of one size drawn as runs: each row's neighbours of one paint in a single stroke, cut into tiles by the
 *  dash named for the width (`d113` for `stroke-dasharray: 11.3 .7`, written once in the scene's style). Much shorter than tile by tile where a paint runs on, as on a lily pad;
 *  tiles of any other size are drawn one by one. */
export const DASHES = new Set<string>()

export function drawRuns(tiles: Tiles, size: number, attributes = ''): string {
  let out = ''
  const paths: string[] = []
  const odd: Tiles = new Map()
  const s = n1(size - 0.7)
  for (const [paint, list] of tiles) {
    const even = list.filter(([, , z]) => z === size).sort((a, b) => a[1] - b[1] || a[0] - b[0])
    const rest = list.filter(([, , z]) => z !== size)
    if (rest.length > 0) odd.set(paint, rest)
    if (even.length === 0) continue
    WIDTHS.add(s)
    DASHES.add(s)
    let d = ''
    let px = 0
    let py = 0
    let i = 0
    while (i < even.length) {
      const [x, y] = even[i]!
      let j = i + 1
      while (j < even.length && even[j]![1] === y && even[j]![0] === even[j - 1]![0] + size) j += 1
      const sx = Number(n1(x))
      const sy = Number(n1(y + Number(s) / 2))
      const len = n1((j - i) * size - 0.7)
      d += `${d === '' ? `M${sx} ${sy}` : `m${n1(sx - px)} ${n1(sy - py)}`}h${len}`
      px = sx + Number(len)
      py = sy
      i = j
    }
    const [colour, opacity] = paint.split('|')
    paths.push(`d="${d}" stroke="${colour}"${opacity === undefined ? attributes : ` opacity="${opacity.replace(/^0\./, '.')}"`}/>`)
  }
  // Two or more paths share their width and dash from one group round them (both are inherited).
  const cls = `${widthClass(s)} d${s.replace('.', '')}`
  out = paths.length === 0 ? '' : paths.length === 1 ? `<path class="${cls}" ${paths[0]}` : `<g class="${cls}">${paths.map(p => `<path ${p}`).join('')}</g>`
  return out + (odd.size > 0 ? drawTiles(odd, attributes) : '')
}
