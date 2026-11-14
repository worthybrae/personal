import { ArtLabel } from '@/components/Art/ArtArticleParts';
import { SHELVES } from '@/lib/about';
import { SITE } from '@/lib/seo';
import { GithubActivity } from './GithubActivity';
import { PosterStrip } from './PosterStrip';
import './about.css';

export const RESUME_URL = 'https://portfolio-worthy.s3.us-east-1.amazonaws.com/resume.pdf';

function hostLabel(url: string): string {
  return new URL(url).hostname.replace('www.', '').replace('open.', '').split('.')[0].toUpperCase();
}

export function AboutArticle() {
  const shelves = SHELVES.filter((s) => s.items.length > 0);

  return (
    <article className="art-article" aria-label="About Worthy Rae">
      <p className="art-intro about-intro">
        I live in New York and I love building things with code. I'm really passionate about music streaming
        analytics and about pushing the boundaries of living art, both digital and physical. I'm always trying to
        learn something new.
      </p>

      {shelves.map((shelf) => (
        <section key={shelf.label}>
          <ArtLabel>{shelf.label}</ArtLabel>
          <PosterStrip items={shelf.items.slice(0, 5)} square={shelf.cover === 'square'} />
        </section>
      ))}

      <ArtLabel>LINKS</ArtLabel>
      <div className="about-links">
        <a href={RESUME_URL} target="_blank" rel="noopener noreferrer">RESUME</a>
        {SITE.sameAs.map((url) => (
          <a key={url} href={url} target="_blank" rel="me noopener noreferrer">{hostLabel(url)}</a>
        ))}
      </div>

      <ArtLabel>CODE</ArtLabel>
      <GithubActivity />
    </article>
  );
}
