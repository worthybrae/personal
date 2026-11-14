import { ArtLabel } from '@/components/Art/ArtArticleParts';
import { SHELVES } from '@/lib/about';
import { GithubActivity } from './GithubActivity';
import { PosterStrip } from './PosterStrip';
import './about.css';

export function AboutArticle() {
  const shelves = SHELVES.filter((s) => s.items.length > 0);

  return (
    <article className="art-article" aria-label="About Worthy Rae">
      <p className="art-intro about-intro">
        I live in New York and I love building things with code. I'm really passionate about music streaming
        analytics and living art, both digital and physical. Consumer of thriller films, sci-fi tv shows, books
        about aliens, psychedelic rap, and eggnog.
      </p>

      {shelves.map((shelf) => (
        <section key={shelf.label}>
          <ArtLabel>{shelf.label}</ArtLabel>
          <PosterStrip items={shelf.items.slice(0, 5)} square={shelf.cover === 'square'} />
        </section>
      ))}

      <ArtLabel>CODE</ArtLabel>
      <GithubActivity />
    </article>
  );
}
