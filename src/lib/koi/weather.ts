// New York's weather, as the pond shows it: read from Open-Meteo's answer and turned into what to draw.
// Pure: the hooks module fetches; only New York's coordinates are sent.

import type { Weather } from './types'

export type { Weather }

/** The weather service's answer for New York: now, and today's sunrise and sunset, in New York's own time. */
export const WEATHER_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=40.71&longitude=-74.01' +
  '&current=weather_code,precipitation,rain,snowfall,cloud_cover,wind_speed_10m,temperature_2m' +
  '&daily=sunrise,sunset&timezone=America%2FNew_York&forecast_days=1'

/** What the pond draws for the weather: cloud shadows (0–1), rain and snow by strength, fog, a thunderstorm, wind
 *  (0–1) and frost. */
export type Conditions = { clouds: number; rain: 0 | 1 | 2 | 3; snow: 0 | 1 | 2; fog: boolean; storm: boolean; wind: number; frost: boolean }

const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)

/** Minutes after midnight of a local time written `2026-11-16T06:44`. */
function minutesOf(v: unknown): number | undefined {
  const m = typeof v === 'string' ? /T(\d\d):(\d\d)/.exec(v) : null
  return m === null ? undefined : Number(m[1]) * 60 + Number(m[2])
}

/** The weather service's answer, or null when it is not one. */
export function parseWeather(text: string, now: number): Weather | null {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return null
  }
  const d = data as { utc_offset_seconds?: unknown; current?: Record<string, unknown>; daily?: { sunrise?: unknown[]; sunset?: unknown[] } }
  const c = d.current ?? {}
  const w = {
    code: num(c.weather_code),
    cloud: num(c.cloud_cover),
    rain: num(c.rain) ?? num(c.precipitation) ?? 0,
    snow: num(c.snowfall) ?? 0,
    wind: num(c.wind_speed_10m),
    temp: num(c.temperature_2m),
    sunrise: minutesOf(d.daily?.sunrise?.[0]),
    sunset: minutesOf(d.daily?.sunset?.[0]),
    offset: num(d.utc_offset_seconds),
    at: now,
  }
  return Object.values(w).every(v => v !== undefined) ? (w as Weather) : null
}

/** Seconds after local midnight at a moment, for a place `offset` seconds from UTC. */
export function localSeconds(now: number, offset: number): number {
  return ((((Math.floor(now / 1000) + offset) % 86400) + 86400) % 86400)
}

const RAIN: Record<number, 1 | 2 | 3> = { 51: 1, 53: 1, 55: 2, 56: 1, 57: 2, 61: 1, 63: 2, 65: 3, 66: 1, 67: 3, 80: 1, 81: 2, 82: 3, 95: 3, 96: 3, 99: 3 }
const SNOW: Record<number, 1 | 2> = { 71: 1, 73: 2, 75: 2, 77: 1, 85: 1, 86: 2 }
const CLOUD: Record<number, number> = { 1: 0.25, 2: 0.5, 3: 0.9, 45: 0.6, 48: 0.6 }

/** What to draw for a weather. */
export function conditionOf(w: Weather): Conditions {
  const rain = RAIN[w.code] ?? 0
  const snow = SNOW[w.code] ?? 0
  const wet = rain > 0 || snow > 0
  return {
    clouds: Math.min(1, Math.max(w.cloud / 100, CLOUD[w.code] ?? 0, wet ? 0.7 : 0)),
    rain,
    snow,
    fog: w.code === 45 || w.code === 48,
    storm: w.code >= 95,
    wind: Math.min(1, Math.max(0, w.wind / 40)),
    frost: w.temp <= 0,
  }
}
