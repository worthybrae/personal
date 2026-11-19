// Copied from the koi Claude Code plugin (hooks/*.ts and types/index.d.ts); keep in step with it.
/** New York's weather as last read: the WMO `code`, `cloud` cover in %, `rain` in mm and `snow` in cm this quarter
 *  hour, `wind` in km/h, `temp` in °C, `sunrise` and `sunset` in minutes after local midnight, `offset` New York's
 *  seconds from UTC, `at` when it was read (ms since the epoch). */
export type Weather = {
  code: number
  cloud: number
  rain: number
  snow: number
  wind: number
  temp: number
  sunrise: number
  sunset: number
  offset: number
  at: number
}

/** The pond's sky: New York's `weather`, whether it is `dark` enough for the glowing fish to shine brighter, how
 *  much the fish have `grow`n since the pond's first day; `since` is when any of it last changed and `changed` when
 *  what the weather draws last changed, which it fades in from (ms since the epoch). */
export type Sky = { weather: Weather; dark: boolean; grow: number; since: number; changed: number }
