import { useEffect, useRef, useState } from 'react';
import { ArtLabel, ArtTags } from '@/components/Art/ArtArticleParts';
import { asciiBar, filledCells } from './asciiBar';
import './streamclout-article.css';

// Catalog totals from streamclout.io's own home page line on 2026-11-13;
// playlists from the 2026-11-12 playlist build in streamclout-io/app.
const CATALOG: [string, string][] = [
  ['13.5M', 'ARTISTS'],
  ['50.2M', 'ALBUMS'],
  ['154M', 'SONGS'],
  ['2.3M', 'PLAYLISTS'],
];

// What one night does, in plain words, from the streamclout-io/app history:
// the 2.7 GB → 56 MB day was measured in September 2026, the 33 min build and
// 9 ms lookup in the October 2026 edge trial. The last field is the millions
// of records each one touches, which sets its bar. How the data is collected
// stays out of the page.
const NIGHT: [string, string, string, number][] = [
  ["COUNT EVERY SONG'S PLAYS", '154M songs', 'nightly', 154],
  ['CHECK EVERY PLAYLIST', '2.3M playlists, ~30M song slots', 'nightly', 30],
  ["SAVE THE DAY'S HISTORY", '2.7 GB squeezed into 56 MB', 'nightly', 154],
  ["REBUILD THE SITE'S DATA", '108M records, 30 GB', '33 min', 108],
  ['OPEN A PAGE', '1 record out of 108M', '9 ms', 0.000001],
];
const NIGHT_MAX = Math.max(...NIGHT.map((row) => row[3]));
const STEP_MS = 55;

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/** The night's operations, each with an ASCII bar that fills in, a cell at a
 *  time, once the list scrolls into view. */
function NightsWork() {
  const listRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [cells, setCells] = useState(48);
  const [step, setStep] = useState(() => (prefersReducedMotion() ? Number.POSITIVE_INFINITY : 0));

  // As many cells as fit across the list at the bar's font size.
  useEffect(() => {
    const list = listRef.current;
    const probe = probeRef.current;
    if (!list || !probe) return;
    const measure = () => {
      const cellWidth = probe.getBoundingClientRect().width / 10;
      if (cellWidth > 0) setCells(Math.max(10, Math.floor(list.clientWidth / cellWidth)));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, []);

  // Start filling the first time the list is on screen.
  useEffect(() => {
    const list = listRef.current;
    if (!list || prefersReducedMotion()) return;
    if (typeof IntersectionObserver === 'undefined') {
      setStep(Number.POSITIVE_INFINITY);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        timerRef.current = setInterval(() => setStep((s) => s + 1), STEP_MS);
      },
      { threshold: 0.3 },
    );
    observer.observe(list);
    return () => {
      observer.disconnect();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (step >= cells && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [step, cells]);

  return (
    <div className="sc-night" ref={listRef}>
      <span className="sc-bar sc-probe" ref={probeRef} aria-hidden="true">██████████</span>
      <ol>
      {NIGHT.map(([name, detail, time, millions]) => {
        const [solid, empty] = asciiBar(Math.min(step, filledCells(millions, NIGHT_MAX, cells)), cells);
        return (
          <li key={name}>
            <span className="sc-night-name">{name}</span>
            <span className="sc-night-detail">{detail}</span>
            <span className="sc-night-time">{time}</span>
            <span className="sc-bar" aria-hidden="true">
              <span>{solid}</span>
              {empty}
            </span>
          </li>
        );
      })}
      </ol>
    </div>
  );
}

/** streamclout.io's charts page, live, across the whole screen under the
 *  header band, like Livestream Art's hero. It is a view, not a second
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
        {CATALOG.map(([value, label]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      <p className="art-intro">{summary}</p>

      <ArtLabel>A NIGHT&apos;S WORK</ArtLabel>
      <NightsWork />

      <ArtLabel>TOOLS</ArtLabel>
      <ArtTags tags={tech} />
    </article>
  );
}
