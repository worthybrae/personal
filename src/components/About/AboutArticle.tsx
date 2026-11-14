import { ArtLabel } from '@/components/Art/ArtArticleParts';
import { SHELVES } from '@/lib/about';
import { SITE } from '@/lib/seo';
import { GithubActivity } from './GithubActivity';
import './about.css';

export const RESUME_URL = 'https://portfolio-worthy.s3.us-east-1.amazonaws.com/resume.pdf';

function hostLabel(url: string): string {
  return new URL(url).hostname.replace('www.', '').replace('open.', '').split('.')[0].toUpperCase();
}

export function AboutArticle() {
  const shelves = SHELVES.filter((s) => s.items.length > 0 || s.allUrl);

  return (
    <article className="art-article" aria-label="About Worthy Rae">
      <p className="art-intro">
        I live in New York and I love building things with code. I try to push on the line between code and
        creativity: generative art, music, live visuals, and tools I wished existed. By day I'm an AI product
        engineer at Camber.
      </p>

      <ArtLabel>LATELY</ArtLabel>
      <GithubActivity />

      {shelves.map((shelf) => (
        <section key={shelf.label}>
          <ArtLabel>{shelf.label}</ArtLabel>
          {shelf.items.length > 0 && (
            <ol className="art-steps about-shelf">
              {shelf.items.slice(0, 5).map((item, i) => (
                <li key={item.title}>
                  <span>{i + 1}</span>
                  <span>
                    {item.url
                      ? <a href={item.url} target="_blank" rel="noopener noreferrer">{item.title}</a>
                      : item.title}
                  </span>
                  <span>{item.by}</span>
                </li>
              ))}
            </ol>
          )}
          {shelf.allUrl && (
            <a className="about-all" href={shelf.allUrl} target="_blank" rel="noopener noreferrer">
              {shelf.allLabel ?? 'SEE ALL'} →
            </a>
          )}
        </section>
      ))}

      <ArtLabel>LINKS</ArtLabel>
      <div className="about-links">
        <a href={RESUME_URL} target="_blank" rel="noopener noreferrer">RESUME</a>
        {SITE.sameAs.map((url) => (
          <a key={url} href={url} target="_blank" rel="me noopener noreferrer">{hostLabel(url)}</a>
        ))}
      </div>
    </article>
  );
}
