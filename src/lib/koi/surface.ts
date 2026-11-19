// The pond's season (it spots the lily pads in autumn) and the veil that keeps the chat readable over the fish.

const H = 1000

// ---------- seasons ----------

export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

/** The season in New York at a moment (ms since the epoch), by month: spring from March, summer from June, autumn from
 *  September, winter from December. `offset` is New York's offset from UTC, in seconds. */
export function seasonOf(ms: number, offset: number): Season {
  const month = new Date(ms + offset * 1000).getUTCMonth()
  return month >= 2 && month <= 4 ? 'spring' : month >= 5 && month <= 7 ? 'summer' : month >= 8 && month <= 10 ? 'autumn' : 'winter'
}

/** A dark veil behind the chat column (490 to 1110 across the pond), so its text reads over the fish, darkest in the
 *  middle and fading out gradually to clear on both sides, with no edge. The app's own panels are left clear for it. */
export const VEIL_DEF = `<linearGradient id="veil"><stop offset="0" stop-color="#0e1513" stop-opacity="0"/><stop offset="0.12" stop-color="#0e1513" stop-opacity="0.04"/><stop offset="0.24" stop-color="#0e1513" stop-opacity="0.13"/><stop offset="0.34" stop-color="#0e1513" stop-opacity="0.22"/><stop offset="0.42" stop-color="#0e1513" stop-opacity="0.26"/><stop offset="0.58" stop-color="#0e1513" stop-opacity="0.26"/><stop offset="0.66" stop-color="#0e1513" stop-opacity="0.22"/><stop offset="0.76" stop-color="#0e1513" stop-opacity="0.13"/><stop offset="0.88" stop-color="#0e1513" stop-opacity="0.04"/><stop offset="1" stop-color="#0e1513" stop-opacity="0"/></linearGradient>`
export const VEIL = `<rect x="200" width="1200" height="${H}" fill="url(#veil)" pointer-events="none"/>`

