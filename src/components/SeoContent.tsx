import { Link } from 'react-router-dom';
import { PROJECTS } from '@/lib/projects';
import { ART_PIECES } from '@/lib/art';
import { SITE, humanize } from '@/lib/seo';

const RESUME_URL = 'https://portfolio-worthy.s3.us-east-1.amazonaws.com/resume.pdf';

const HEADINGS: Record<string, string> = {
  home: 'Worthy Rae',
  feed: 'Portfolio — Worthy Rae',
  music: 'Music — Worthy Rae',
};

/**
 * The visible site is drawn entirely into a <canvas>, which means search
 * crawlers and screen readers both see an empty page. This renders the same
 * information as real DOM — headings, prose, and crawlable links to every
 * route — visually hidden behind Tailwind's `sr-only`.
 *
 * It is a text alternative for canvas content, not hidden keyword text: it
 * says exactly what the canvas says, and it is the only way assistive tech
 * can reach these pages at all.
 */
export default function SeoContent({ page }: { page: string }) {
  const heading = HEADINGS[page];

  return (
    <div className="sr-only">
      {heading && <h1>{heading}</h1>}
      {page === 'home' && <p>{SITE.description}</p>}

      <nav aria-label="Site">
        <ul>
          <li><Link to="/">Home</Link></li>
          <li><Link to="/feed">Portfolio</Link></li>
          <li><Link to="/music">Music</Link></li>
          <li><a href={RESUME_URL}>Resume</a></li>
        </ul>
      </nav>

      <h2>Projects</h2>
      <ul>
        {PROJECTS.map((p) => (
          <li key={p.slug}>
            <Link to={`/work/${p.slug}`}>{humanize(p.name)}</Link>
            {' — '}
            {humanize(p.description)}
          </li>
        ))}
      </ul>

      <h2>Art</h2>
      <ul>
        {ART_PIECES.map((a) => (
          <li key={a.slug}>
            <Link to={`/art/${a.slug}`}>{humanize(a.name)}</Link>
            {' — '}
            {humanize(a.description)}
          </li>
        ))}
      </ul>

      <h2>Elsewhere</h2>
      <ul>
        {SITE.sameAs.map((url) => (
          <li key={url}>
            <a href={url} rel="me noopener noreferrer">{new URL(url).hostname.replace('www.', '')}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
