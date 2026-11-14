import { useState } from 'react';
import {
  AI_ARCH_HERO_POSTER,
  AI_ARCH_HERO_URL,
  DIAMETER_STUDY,
  LINEAR_WALKS,
  SEED_LOOPS,
  SEED_PREVIEW_COUNT,
  walkCaption,
  walkPosterUrl,
  walkVideoUrl,
  type LatentWalk,
} from '@/lib/aiArchitecture';
import { ArtLabel as Label, ArtTags, InViewClip } from './ArtArticleParts';
import { markLoaded } from '@/lib/fadeIn';

/** The piece itself, at the top of the page above the title. */
export function AiArchitectureHero() {
  return (
    <figure className="art-hero">
      <video className="media-fade" onLoadedData={markLoaded} src={AI_ARCH_HERO_URL} poster={AI_ARCH_HERO_POSTER} autoPlay muted loop playsInline aria-label="Flesh digression, a curved walk through the model's latent space" />
      <figcaption>FLESH DIGRESSION · A CURVED WALK THROUGH LATENT SPACE</figcaption>
    </figure>
  );
}

function WalkVideo({ walk, caption = walkCaption(walk) }: { walk: LatentWalk; caption?: string }) {
  return <InViewClip src={walkVideoUrl(walk)} poster={walkPosterUrl(walk)} caption={caption} />;
}

export function AiArchitectureArticle({ tech }: { tech: string[] }) {
  const [showAll, setShowAll] = useState(false);
  const seeds = showAll ? SEED_LOOPS : SEED_LOOPS.slice(0, SEED_PREVIEW_COUNT);

  return (
    <article className="art-article" aria-label="About AI Architecture">
      <Label>THE MODEL</Label>
      <p>
        447 architectural photographs, collected with an automated Selenium scraper and standardized to 512 × 512,
        trained for about 24 hours with StyleGAN2-ADA. Its augmentation makes up for how small the dataset is.
        Every frame on this page is a building the model imagined. None of them exist.
      </p>

      <Label>WALKING THE LATENT SPACE</Label>
      <p>
        A seed picks one point in the model's latent space, one imagined building. A circular loop walks a ring
        around that point and ends where it began, so the video repeats without a cut. The diameter sets how far
        the ring strays: small rings stay close to one building, large ones pass through many.
      </p>
      <div className="art-diameters">
        <svg className="art-rings" viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="60" cy="60" r="12" />
          <circle cx="60" cy="60" r="24" />
          <circle cx="60" cy="60" r="38" />
          <circle cx="60" cy="60" r="54" />
          <circle cx="60" cy="60" r="2" className="art-rings-seed" />
        </svg>
        <div className="art-grid art-grid-4">
          {DIAMETER_STUDY.map((walk) => (
            <WalkVideo key={walk.id} walk={walk} caption={`Ø${walk.diameter}`} />
          ))}
        </div>
      </div>

      <Label>LINEAR WALKS</Label>
      <p>
        A straight line between seeds instead of a ring. The first walks from seed 463 to seed 470, one house
        slowly becoming another. The longer two keep going through seed after seed.
      </p>
      <div className="art-grid art-grid-3">
        {LINEAR_WALKS.map((walk) => (
          <WalkVideo key={walk.id} walk={walk} />
        ))}
      </div>

      <Label>SEEDS · {SEED_LOOPS.length} LOOPS</Label>
      <div className="art-grid art-grid-3">
        {seeds.map((walk) => (
          <WalkVideo key={walk.id} walk={walk} />
        ))}
      </div>
      {!showAll && (
        <button type="button" className="art-more" onClick={() => setShowAll(true)}>
          SHOW ALL {SEED_LOOPS.length} ↓
        </button>
      )}

      <Label>TOOLS</Label>
      <ArtTags tags={tech} />
    </article>
  );
}
