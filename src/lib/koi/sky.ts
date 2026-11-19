// The pond's sky between weather readings: how much the fish have grown, the weather to fall back on, and what of the
// weather the pond actually draws. Pure: the hooks module hands in the clock and the stored values.

import type { Sky, Weather } from './types'
import { darkAt } from './light'
import { conditionOf, localSeconds } from './weather'

const DAY = 86_400_000

/** How much bigger the fish are than on the pond's first day: a quarter at most, most of it in the first weeks,
 *  rounded so it changes about once a day. */
export function growAt(now: number, born: number): number {
  const days = Math.max(0, (now - born) / DAY)
  return Math.round((1 + 0.25 * (1 - Math.exp(-days / 20))) * 100) / 100
}

/** Clear weather with New York-ish sun times in this runtime's own zone: until a reading arrives. */
export function fallbackWeather(now: number): Weather {
  return { code: 0, cloud: 0, rain: 0, snow: 0, wind: 8, temp: 10, sunrise: 390, sunset: 1050, offset: -new Date(now).getTimezoneOffset() * 60, at: 0 }
}

/** What of a weather fades in when it changes: rain starting or stopping, snow starting or stopping. A shift in
 *  strength, cloud, wind or frost while it keeps falling does not, so the rain does not blink out and fade back. */
function fadedKey(w: Weather): string {
  const c = conditionOf(w)
  return [c.rain > 0, c.snow > 0].join(':')
}

/** Whether a new reading is close enough to the last that the pond should not change: the same weather code, cloud
 *  and wind within a margin, and no near-zero wobble in and out of frost. A reading on the edge of a step would
 *  otherwise flip the pond back and forth every quarter hour. */
function isSimilar(a: Weather, b: Weather): boolean {
  return (
    a.code === b.code &&
    Math.abs(a.cloud - b.cloud) < 15 &&
    Math.abs(a.wind - b.wind) < 8 &&
    (a.temp <= 0 === b.temp <= 0 || Math.abs(b.temp) < 1)
  )
}

/** The sky now, from the last sky and the weather in hand: the last one itself when nothing drawn would change, so
 *  the pond is not redrawn for nothing. Rain or snow starting fades in from now; wind and the
 *  first sky of a session do not. */
export function nextSky(last: Sky | null, reading: Weather, now: number, born: number): Sky {
  const sun = (w: Weather) => `${w.sunrise}:${w.sunset}:${w.offset}`
  // A reading close to the last keeps the last's weather, sun times taken fresh.
  const weather = last !== null && isSimilar(last.weather, reading) ? { ...last.weather, sunrise: reading.sunrise, sunset: reading.sunset, offset: reading.offset } : reading
  const dark = darkAt(localSeconds(now, weather.offset) / 60, weather.sunrise, weather.sunset)
  const grow = growAt(now, born)
  if (last !== null && weather.code === last.weather.code && weather.cloud === last.weather.cloud && weather.wind === last.weather.wind && weather.temp === last.weather.temp && last.dark === dark && last.grow === grow && sun(last.weather) === sun(weather)) return last
  const faded = last !== null && fadedKey(last.weather) === fadedKey(weather)
  return { weather, dark, grow, since: now, changed: last === null ? 0 : faded ? last.changed : now }
}
