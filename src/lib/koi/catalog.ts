// Every kind of fish in the pond, each drawn on its own small patch of water for the koi page's gallery, from the same
// sprites the pond swims.

import { DESIGNS, PALETTES, SPECIES, GLOWS, fancySpecies, fishSprite, COMMONS, FANCY, POOLS, type Species } from './pond'
import { FISH_NOTES } from './notes'
import { DASHES, WIDTHS, widthClass } from './tiles'

export type FishGroup = { title: string; blurb: string; names: readonly string[] }

/** The fish by how often they come, from every day to almost never. */
export const FISH_GROUPS: readonly FishGroup[] = [
  { title: 'Everyday koi', blurb: 'Two of these swim the pond each day.', names: COMMONS },
  { title: 'Fancy koi', blurb: 'Two a day, each in one of eighteen palettes; some days they glow or shimmer.', names: FANCY },
  { title: 'Glowing schools', blurb: 'One a day keeps to the deep water and lights it from below.', names: POOLS.school },
  { title: 'Glowing', blurb: 'One a day, swinging in from the edge of the pond; brightest after dark.', names: POOLS.glow },
  { title: 'See-through', blurb: 'One a day, easy to miss against the water.', names: POOLS.ghostly },
  { title: 'Rare', blurb: 'Two a day, each crossing the pond for under a minute every five to seven minutes.', names: POOLS.rare },
  { title: 'Very rare', blurb: 'One a day, crossing for about forty seconds every quarter hour.', names: POOLS.veryrare },
  { title: 'Legendary', blurb: 'One a day, crossing for about a minute every half hour.', names: POOLS.legend },
]

/** What a fish looks like, in a sentence. */
export function fishNote(name: string): string {
  const note = FISH_NOTES[name] ?? ''
  // Most notes open with the fish's own name, which the card already shows.
  const comma = note.indexOf(', ')
  if (comma === -1 || !note.slice(0, comma).replace(/ /g, '').toLowerCase().includes(name)) return note
  const rest = note.slice(comma + 2)
  return rest.charAt(0).toUpperCase() + rest.slice(1)
}

/** The species for a name; a fancy koi takes a palette by its place in the list, so the gallery shows a spread of them. */
function speciesOf(name: string): Species {
  const design = DESIGNS[name]
  if (design === undefined) return SPECIES[name]!
  const k = FANCY.indexOf(name)
  return { ...fancySpecies(design, PALETTES[(k * 5) % PALETTES.length]!), glow: undefined }
}

/** One fish pointing right on a patch of dark water, as a whole SVG; `moving` sets its tail and fins swinging. */
export function fishSvg(name: string, moving: boolean): string {
  const sp = speciesOf(name)
  const P = sp.tile
  const sprite = fishSprite(sp, false, 0)
  const head = Math.max(2, Math.round(sp.length * ((sp.shape ?? 'fish') === 'eel' ? 0.12 : 0.38)))
  // The sprite's reach: the nose ahead of x = 0, the tail and its fan behind, the fins out to each side.
  const front = (head + 2) * P
  const back = (sp.length - head + sp.tailLength + 3) * P
  const half = (sp.width + (sp.finLength ?? 3) + 4) * P
  const pad = 14
  const w = front + back + pad * 2
  const h = Math.max(half * 2 + pad * 2, w * 0.42)
  const glow = sp.glow === undefined ? undefined : GLOWS[sp.glow]
  const body = glow === undefined ? sprite : `<g class="${glow[0]}">${sprite}</g>`
  const style =
    `.fin{animation:fin ease-in-out infinite alternate}@keyframes fin{from{transform:rotate(-14deg)}to{transform:rotate(10deg)}}` +
    `.fin.b{animation-name:fn}@keyframes fn{from{transform:rotate(14deg)}to{transform:rotate(-10deg)}}` +
    `.sw{animation:sw ease-in-out infinite alternate;animation-duration:var(--b);animation-delay:calc(var(--b) * var(--k) * -1)}` +
    `@keyframes sw{from{transform:rotate(calc(var(--a) * -1))}to{transform:rotate(var(--a))}}` +
    `.opal{animation:opal 6s linear infinite}@keyframes opal{from{filter:hue-rotate(0deg)}to{filter:hue-rotate(360deg)}}` +
    `.gr{animation:gr 2.6s steps(3) infinite alternate}@keyframes gr{0%,55%{stroke-opacity:0}100%{stroke-opacity:.7}}` +
    [...WIDTHS].map(x => `.${widthClass(x)}{stroke-width:${x}px}`).join('') +
    [...DASHES].map(x => `.d${x.replace('.', '')}{stroke-dasharray:${x} .7}`).join('') +
    (glow === undefined ? '' : `.${glow[0]}{filter:drop-shadow(0 0 6px ${glow[1]})}`) +
    (moving ? '' : '*{animation:none!important}')
  const x = pad + back
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.round(w)} ${Math.round(h)}"><style>${style}</style>` +
    `<g transform="translate(${Math.round(x)} ${Math.round(h / 2)})">${body}</g></svg>`
  )
}
