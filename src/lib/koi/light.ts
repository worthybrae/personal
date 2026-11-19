// Day and night over the pond: the day's light, and the gates that open the lilies by day and close them at night, each
// one 24-hour animation whose keyframes follow New York's sunrise and sunset, so the pond changes on its own with no
// redraw.

const DAY = 1440

/** A moment of the day's light: minutes after midnight, the wash colour and strength, and how dark. */
type Stop = [number, string, number, number]

function stopsOf(sunrise: number, sunset: number): Stop[] {
  const r = sunrise
  const s = sunset
  const night: [string, number, number] = ['#4a6aa8', 0, 0.46]
  const raw: Stop[] = [
    [0, ...night],
    [r - 75, ...night],
    [r - 30, '#6f8fd0', 0.1, 0.3],
    [r + 10, '#ffb070', 0.18, 0.1],
    [r + 60, '#ffe0b0', 0.1, 0],
    [r + 120, '#d8ecff', 0.12, 0],
    [s - 120, '#d8ecff', 0.12, 0],
    [s - 50, '#ffc070', 0.16, 0.04],
    [s, '#ff7a50', 0.2, 0.12],
    [s + 25, '#5a6ad0', 0.14, 0.28],
    [s + 70, ...night],
    [DAY, ...night],
  ]
  // Keep them in order whatever the sun does (very short or long days).
  let last = 0
  return raw.map(([m, ...rest]) => {
    last = Math.min(DAY, Math.max(last, m))
    return [last, ...rest] as Stop
  })
}

const pct = (m: number) => `${Math.round((m / DAY) * 100000) / 1000}%`

/** The style for the day's light: the wash (`lw`) and the dark (`ld`). Plain see-through layers, no blend modes: a
 *  blended full-screen layer would be blended again under every moving fish each frame. */
export function lightCss(sunrise: number, sunset: number): string {
  const stops = stopsOf(sunrise, sunset)
  const wash = stops.map(([m, colour, strength]) => `${pct(m)}{fill:${colour};opacity:${strength}}`).join('')
  const dark = stops.map(([m, , , depth]) => `${pct(m)}{opacity:${depth}}`).join('')
  return (
    `.lw,.ld{animation:86400s steps(24) infinite}.lw{animation-name:lw}.ld{fill:#040b24;animation-name:ld}` +
    `@keyframes lw{${wash}}@keyframes ld{${dark}}`
  )
}

/** The light at a minute of the day: the wash colour of the stop before, and the wash and dark strengths between the
 *  stops either side. What shows where motion is turned off and the day's animation does not run. */
function lightNow(minute: number, sunrise: number, sunset: number): [string, number, number] {
  const stops = stopsOf(sunrise, sunset)
  let i = 0
  while (i + 1 < stops.length && stops[i + 1]![0] <= minute) i += 1
  const [m0, colour, w0, d0] = stops[i]!
  const [m1, , w1, d1] = stops[Math.min(stops.length - 1, i + 1)]!
  const t = m1 > m0 ? (minute - m0) / (m1 - m0) : 0
  const round = (v: number) => Math.round(v * 100) / 100
  return [colour, round(w0 + (w1 - w0) * t), round(d0 + (d1 - d0) * t)]
}

/** The two layers of light, started `local` seconds into the day; their own colour and strength are the moment's, so
 *  with motion turned off the pond still shows the right light. */
export function lightLayer(local: number, sunrise: number, sunset: number): string {
  const [colour, wash, dark] = lightNow(local / 60, sunrise, sunset)
  const delay = `style="animation-delay:-${Math.round(local)}s"`
  return (
    `<rect class="lw" width="1600" height="1000" ${delay} fill="${colour}" opacity="${wash}"/>` +
    `<rect class="ld" width="1600" height="1000" ${delay} opacity="${dark}"/>`
  )
}

/** Whether it is dark enough for the glowing fish to shine brighter: before first light or after the blue hour. */
export function darkAt(minute: number, sunrise: number, sunset: number): boolean {
  return minute < sunrise - 30 || minute > sunset + 40
}

/** The day's gates: `dy` is open in daylight (open lilies), `dn` is its
 *  opposite (lily buds), `nt` only once it is properly dark (fireflies). Minutes and how open, in order. */
export type Gate = 'dy' | 'dn' | 'nt'

function gateStops(kind: Gate, r: number, s: number): Array<[number, number]> {
  const day: Array<[number, number]> = [[0, 0], [r - 20, 0], [r + 40, 1], [s - 40, 1], [s + 20, 0], [DAY, 0]]
  const raw: Array<[number, number]> =
    kind === 'dy' ? day : kind === 'dn' ? day.map(([m, v]) => [m, 1 - v]) : [[0, 1], [r - 60, 1], [r - 10, 0], [s + 30, 0], [s + 80, 1], [DAY, 1]]
  let last = 0
  return raw.map(([m, v]) => {
    last = Math.min(DAY, Math.max(last, m))
    return [last, v]
  })
}

function gateAt(kind: Gate, minute: number, r: number, s: number): number {
  const stops = gateStops(kind, r, s)
  let i = 0
  while (i + 1 < stops.length && stops[i + 1]![0] <= minute) i += 1
  const [m0, v0] = stops[i]!
  const [m1, v1] = stops[Math.min(stops.length - 1, i + 1)]!
  const t = m1 > m0 ? (minute - m0) / (m1 - m0) : 0
  return Math.round((v0 + (v1 - v0) * t) * 100) / 100
}

/** How much daylight there is at a minute of the day, 0 to 1. */
export function daylight(minute: number, sunrise: number, sunset: number): number {
  return gateAt('dy', minute, sunrise, sunset)
}

/** The style for the gates: each a 24-hour opacity animation. */
export function gateCss(sunrise: number, sunset: number): string {
  const kinds: Gate[] = ['dy', 'dn', 'nt']
  return (
    `.dy,.dn,.nt{animation:86400s steps(24) infinite}` +
    kinds.map(k => `.${k}{animation-name:${k}}@keyframes ${k}{${gateStops(k, sunrise, sunset).map(([m, v]) => `${pct(m)}{opacity:${v}}`).join('')}}`).join('')
  )
}

/** `inner` behind a gate, started `local` seconds into the day; its own opacity is the moment's, so with motion turned
 *  off it still shows right. */
export function gate(kind: Gate, local: number, sunrise: number, sunset: number, inner: string): string {
  if (inner === '') return ''
  return `<g class="${kind}" opacity="${gateAt(kind, local / 60, sunrise, sunset)}" style="animation-delay:-${Math.round(local)}s">${inner}</g>`
}
