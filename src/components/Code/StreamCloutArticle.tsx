import { ArtLabel, ArtTags } from '@/components/Art/ArtArticleParts';
import { ALBUM_CURVES } from './albumCurves';
import { linePath, medianByDay, squareSide } from './figures';
import './streamclout-article.css';

/** Daily play counts start here (streamclout-io/app,
 *  docs/research/album-lifecycle/README.md). */
const FIRST_NIGHT = Date.UTC(2026, 0, 22);

function nightsSoFar(now = Date.now()): number {
  return Math.floor((now - FIRST_NIGHT) / 86_400_000) + 1;
}

// Songs from streamclout.io's own home page line on 2026-11-13; stored data
// from the September 2026 AWS bill; 9 ms is a warm page lookup in the
// October 2026 edge trial.
function headline(): [string, string][] {
  return [
    ['154M', 'SONGS'],
    ['746 GB', 'STORED'],
    [String(nightsSoFar()), 'NIGHTS'],
    ['9 ms', 'PER PAGE'],
  ];
}

// streamclout.io's totals on 2026-11-13; playlists from the 2026-11-12
// playlist build in streamclout-io/app. Largest first: each square sits
// inside the one before it.
const CATALOG: [number, string, string][] = [
  [154, '154M', 'SONGS'],
  [50.2, '50.2M', 'ALBUMS'],
  [13.5, '13.5M', 'ARTISTS'],
  [2.3, '2.3M', 'PLAYLISTS'],
];

/** The catalog as squares nested in one corner, each with the area of its
 *  count, so the sizes compare at a glance. */
function CatalogSquares() {
  const full = 210;
  const base = 212;
  const labelX = 236;
  const max = CATALOG[0][0];
  // Label lines sit level with each square's top, spread where the small
  // squares crowd together.
  const labelY = [14, 96, 168, 204];
  return (
    <svg className="sc-squares" viewBox="0 0 440 214" role="img" aria-label="StreamClout's catalog to scale: 154 million songs, 50.2 million albums, 13.5 million artists and 2.3 million playlists">
      {CATALOG.map(([value, figure, label], i) => {
        const side = squareSide(value, max, full);
        const y = labelY[i];
        return (
          <g key={label}>
            <rect
              x={0.5}
              y={base - side}
              width={side}
              height={side}
              fill={i === 0 ? 'rgba(255,255,255,.04)' : 'none'}
              stroke={`rgba(255,255,255,${0.25 + i * 0.17})`}
            />
            <line x1={side + 4} y1={base - side + 0.5} x2={labelX - 8} y2={y - 4} stroke="rgba(255,255,255,.15)" />
            <text x={labelX} y={y} className="sc-fig-num">
              {figure}
              <tspan dx={10} className="sc-fig-label">{label}</tspan>
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Forty real album launches over their first 180 days, faint, with their
 *  median in white. */
function AlbumLines() {
  const width = 600;
  const height = 240;
  const top = 200; // index drawn at the top edge; higher readings are clipped
  const days = ALBUM_CURVES[0].length;
  const at = (i: number, v: number) => [
    (i / (days - 1)) * width,
    height - (Math.min(v, top) / top) * (height - 10),
  ] as const;
  return (
    <svg className="sc-lines" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="Daily plays of 40 of 2026's biggest album launches over their first 180 days, each against its own first week. Almost every one starts high and falls the same way; the median is drawn in white.">
      {ALBUM_CURVES.map((curve, i) => (
        <path key={i} d={linePath(curve, at)} fill="none" stroke="rgba(255,255,255,.16)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      ))}
      <path d={linePath(medianByDay(ALBUM_CURVES), at)} fill="none" stroke="#fff" strokeWidth={1.8} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** streamclout.io's charts page, live, across the whole screen with W and +
 *  over it, like Livestream Art's hero. It is a view, not a second
 *  browser: a click opens the site, and scrolling stays with this page. The
 *  still sits behind it in case the site can't be framed. */
export function StreamCloutHero() {
  return (
    <section className="sc-hero" aria-label="StreamClout's charts page">
      <iframe
        src="https://streamclout.io/charts"
        title="StreamClout's charts page, live"
        tabIndex={-1}
        referrerPolicy="no-referrer"
      />
      <a href="https://streamclout.io/charts" target="_blank" rel="noopener noreferrer" aria-label="Open StreamClout's charts" />
    </section>
  );
}

export function StreamCloutArticle({ summary, tech }: { summary: string; tech: string[] }) {
  return (
    <article className="art-article" aria-label="About StreamClout">
      <dl className="sc-stats">
        {headline().map(([value, label]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      <p className="art-intro">{summary}</p>

      <ArtLabel>THE CATALOG</ArtLabel>
      <CatalogSquares />

      <ArtLabel>THE LIFE OF AN ALBUM</ArtLabel>
      <figure className="sc-figure">
        <AlbumLines />
        <figcaption>40 OF 2026&apos;S BIGGEST ALBUMS, DAILY PLAYS OVER THEIR FIRST 180 DAYS · MEDIAN IN WHITE</figcaption>
      </figure>

      <ArtLabel>TOOLS</ArtLabel>
      <ArtTags tags={tech} />
    </article>
  );
}
