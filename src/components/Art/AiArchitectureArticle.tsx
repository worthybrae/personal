import { useEffect, useRef, useState } from 'react';
import {
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
import './ai-architecture.css';

/** The piece itself, at the top of the page above the title. */
export function AiArchitectureHero() {
  return (
    <figure className="aia-hero">
      <video src={AI_ARCH_HERO_URL} autoPlay muted loop playsInline aria-label="Flesh digression, a curved walk through the model's latent space" />
      <figcaption>FLESH DIGRESSION · A CURVED WALK THROUGH LATENT SPACE</figcaption>
    </figure>
  );
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/**
 * A loop that only plays while it's on screen, so a page of thirty-odd
 * videos doesn't decode them all at once. With reduced motion it waits for
 * a tap instead.
 */
function WalkVideo({ walk, caption = walkCaption(walk) }: { walk: LatentWalk; caption?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [userPaused, setUserPaused] = useState(prefersReducedMotion);

  useEffect(() => {
    const video = ref.current;
    if (!video || userPaused || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.35 },
    );
    observer.observe(video);
    return () => {
      observer.disconnect();
      video.pause();
    };
  }, [userPaused]);

  const toggle = () => {
    const video = ref.current;
    if (!video) return;
    if (video.paused) {
      setUserPaused(false);
      video.play().catch(() => {});
    } else {
      setUserPaused(true);
      video.pause();
    }
  };

  return (
    <figure className="aia-walk">
      <video
        ref={ref}
        src={walkVideoUrl(walk)}
        poster={walkPosterUrl(walk)}
        preload="none"
        muted
        loop
        playsInline
        onClick={toggle}
        aria-label={caption}
      />
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="aia-label">{children}</div>;
}

export function AiArchitectureArticle({ tech }: { tech: string[] }) {
  const [showAll, setShowAll] = useState(false);
  const seeds = showAll ? SEED_LOOPS : SEED_LOOPS.slice(0, SEED_PREVIEW_COUNT);

  return (
    <article className="aia" aria-label="About AI Architecture">
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
      <div className="aia-diameters">
        <svg className="aia-rings" viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="60" cy="60" r="12" />
          <circle cx="60" cy="60" r="24" />
          <circle cx="60" cy="60" r="38" />
          <circle cx="60" cy="60" r="54" />
          <circle cx="60" cy="60" r="2" className="aia-rings-seed" />
        </svg>
        <div className="aia-grid aia-grid-4">
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
      <div className="aia-grid aia-grid-3">
        {LINEAR_WALKS.map((walk) => (
          <WalkVideo key={walk.id} walk={walk} />
        ))}
      </div>

      <Label>SEEDS · {SEED_LOOPS.length} LOOPS</Label>
      <div className="aia-grid aia-grid-3">
        {seeds.map((walk) => (
          <WalkVideo key={walk.id} walk={walk} />
        ))}
      </div>
      {!showAll && (
        <button type="button" className="aia-more" onClick={() => setShowAll(true)}>
          SHOW ALL {SEED_LOOPS.length} ↓
        </button>
      )}

      <Label>TOOLS</Label>
      <div className="aia-tags">
        {tech.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
    </article>
  );
}
