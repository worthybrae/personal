import { ArtLabel, ArtTags } from '@/components/Art/ArtArticleParts';
import './streamclout-article.css';

// Catalog totals from streamclout.io's own home page line on 2026-11-13;
// playlists from the 2026-11-12 playlist build in streamclout-io/app.
const CATALOG: [string, string][] = [
  ['13.5M', 'ARTISTS'],
  ['50.2M', 'ALBUMS'],
  ['154M', 'SONGS'],
  ['2.3M', 'PLAYLISTS'],
];

// Measured before and after figures from the streamclout-io/app history.
// Kept to outcomes: how the data is collected stays out of the page.
const REWRITES: [string, string, string][] = [
  ['2026-09', 'NIGHTLY BUILD', '128 min on a 16-core machine, re-reading a month each night → one new day folded in'],
  ['2026-09', 'A DAY OF HISTORY', '2.7 GB → 56 MB'],
  ['2026-10', 'ARTIST EXPORT', '44 min → 2 min'],
  ['2026-11', 'API SERVER', 'Switched off. The site is served from the edge, 9 ms warm p95'],
  ['2026-11', 'SLOW READS', 'Up to 2.5 s → 531 ms'],
];

export function StreamCloutArticle({ summary, tech }: { summary: string; tech: string[] }) {
  return (
    <article className="art-article" aria-label="About StreamClout">
      <figure className="sc-still">
        <img
          src="/media/code/streamclout-charts.jpg"
          width={800}
          height={500}
          alt="StreamClout's charts page: albums ranked by streams gained in the last seven days"
        />
        <figcaption>STREAMCLOUT.IO/CHARTS, NOVEMBER 2026</figcaption>
      </figure>

      <dl className="sc-stats">
        {CATALOG.map(([value, label]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <div className="sc-stats-note">COUNTED EVERY NIGHT, DAILY HISTORY SINCE JANUARY 2026</div>

      <p className="art-intro">{summary}</p>

      <ArtLabel>A YEAR OF REWRITES</ArtLabel>
      <ol className="sc-rewrites">
        {REWRITES.map(([date, name, text]) => (
          <li key={name}>
            <span>{date}</span>
            <span>{name}</span>
            <span>{text}</span>
          </li>
        ))}
      </ol>

      <ArtLabel>TOOLS</ArtLabel>
      <ArtTags tags={tech} />
    </article>
  );
}
