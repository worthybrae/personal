// Media for the AI Architecture page. The loops live in the portfolio S3
// bucket under ai-architecture/; first-frame posters ship with the site so
// the grid has something to show before a video loads.
// VITE_AI_ARCH_MEDIA_URL overrides the video origin (e.g. a local folder
// while testing new encodes).
const MEDIA_BASE: string =
  import.meta.env.VITE_AI_ARCH_MEDIA_URL ?? 'https://portfolio-worthy.s3.us-east-1.amazonaws.com/ai-architecture/';
const POSTER_BASE = '/media/ai-architecture/';

export const AI_ARCH_HERO_URL = 'https://portfolio-worthy.s3.us-east-1.amazonaws.com/flesh_digression.mp4';

export type WalkKind = 'circular' | 'linear';

export interface LatentWalk {
  id: string;
  kind: WalkKind;
  /** Seed the walk starts from; linear walks list both ends. */
  seeds: number[];
  /** Diameter of the circular path through latent space. */
  diameter?: number;
  seconds: number;
}

export function walkVideoUrl(walk: LatentWalk): string {
  return `${MEDIA_BASE}${walk.id}.mp4`;
}

export function walkPosterUrl(walk: LatentWalk): string {
  return `${POSTER_BASE}${walk.id}.jpg`;
}

export function formatWalkLength(seconds: number): string {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function walkCaption(walk: LatentWalk): string {
  const parts: string[] = [];
  if (walk.kind === 'linear') {
    parts.push(walk.seeds.length === 2 ? `SEED ${walk.seeds[0]} → ${walk.seeds[1]}` : 'MANY SEEDS');
  } else {
    parts.push(walk.seeds.length ? `SEED ${walk.seeds[0]}` : 'LOOP');
    if (walk.diameter) parts.push(`Ø${walk.diameter}`);
  }
  parts.push(formatWalkLength(walk.seconds));
  return parts.join(' · ');
}

const circle = (diameter: number, seed: number, seconds: number): LatentWalk => ({
  id: `${diameter}-${seed}`,
  kind: 'circular',
  seeds: [seed],
  diameter,
  seconds,
});

/** One loop per diameter, small to large, for the side-by-side comparison. */
export const DIAMETER_STUDY: LatentWalk[] = [
  circle(500, 194, 29.2),
  circle(800, 194, 60),
  circle(1200, 266, 62.5),
  circle(1500, 223, 125),
];

export const LINEAR_WALKS: LatentWalk[] = [
  { id: 'linear-463-470', kind: 'linear', seeds: [463, 470], seconds: 10 },
  { id: 'lerp-1', kind: 'linear', seeds: [], seconds: 64 },
  { id: 'lerp-2', kind: 'linear', seeds: [], seconds: 62 },
];

/** Every circular loop. The first few are the strongest and show before "show all". */
export const SEED_LOOPS: LatentWalk[] = [
  circle(1200, 322, 62.5),
  circle(800, 58, 60),
  circle(1200, 307, 62.5),
  circle(1500, 110, 125),
  circle(800, 219, 60),
  circle(1200, 296, 62.5),
  circle(1200, 229, 62.5),
  circle(1200, 251, 8.3),
  circle(1200, 253, 62.5),
  circle(1200, 258, 29.2),
  circle(1200, 261, 62.5),
  circle(1200, 264, 62.5),
  circle(1200, 269, 62.5),
  circle(1200, 272, 62.5),
  circle(1200, 279, 62.5),
  circle(1200, 291, 62.5),
  circle(1200, 299, 62.5),
  circle(1200, 303, 62.5),
  circle(1200, 310, 62.5),
  circle(1200, 316, 62.5),
  circle(1200, 318, 62.5),
  circle(1200, 327, 62.5),
  circle(1500, 38, 125),
  circle(1500, 338, 125),
  circle(800, 3, 60),
  circle(800, 15, 60),
  circle(800, 90, 53.3),
  circle(800, 344, 60),
  circle(800, 460, 60),
  circle(800, 466, 60),
  circle(800, 477, 29.2),
  circle(800, 507, 60),
  { id: 'circ-1', kind: 'circular', seeds: [], seconds: 13.4 },
];

export const SEED_PREVIEW_COUNT = 6;
