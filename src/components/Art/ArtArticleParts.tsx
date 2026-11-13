import { useEffect, useRef, useState, type ReactNode } from 'react';
import './art-article.css';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/**
 * A muted loop that only plays while it's on screen, so a page of many clips
 * doesn't decode them all at once. With reduced motion it waits for a tap.
 */
export function InViewClip({ src, poster, caption, wide = false }: {
  src: string;
  poster: string;
  caption: string;
  /** 16:9 instead of square. */
  wide?: boolean;
}) {
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
    <figure className={wide ? 'art-clip art-clip-wide' : 'art-clip'}>
      <video
        ref={ref}
        src={src}
        poster={poster}
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

export function ArtLabel({ children }: { children: ReactNode }) {
  return <div className="art-label">{children}</div>;
}

export function ArtTags({ tags }: { tags: string[] }) {
  return (
    <div className="art-tags">
      {tags.map((tag) => (
        <span key={tag}>{tag}</span>
      ))}
    </div>
  );
}
