import { useEffect, useRef, useState } from 'react';
import { ArtLabel, ArtTags } from '@/components/Art/ArtArticleParts';
import { ALBUM_CURVES } from './albumCurves';
import { linePath, medianByDay, nearestSeries } from './figures';
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

const MEDIAN = medianByDay(ALBUM_CURVES);
/** Readings are every second day from day 1. */
const dayOf = (i: number) => i * 2 + 1;
const TOP = 200; // index at the top edge; the few higher readings are clipped
const PAD = { top: 12, right: 8, bottom: 26, left: 8 };
const DAY_TICKS = [1, 30, 60, 90, 120, 150, 180];
const NARROW_TICKS = [1, 60, 120, 180];

/** Forty real album launches over their first 180 days, faint, with their
 *  median in white. Hovering (or touching) picks a day and the album line
 *  nearest the pointer, and says where it and the median stand. */
function AlbumLines() {
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 640, h: 420 });
  const [hover, setHover] = useState<{ i: number; album: number } | null>(null);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const measure = () => setSize({ w: box.clientWidth, h: box.clientHeight });
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  const n = MEDIAN.length;
  const plotW = size.w - PAD.left - PAD.right;
  const plotH = size.h - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (i / (n - 1)) * plotW;
  const y = (v: number) => PAD.top + plotH - (Math.min(v, TOP) / TOP) * plotH;
  const at = (i: number, v: number) => [x(i), y(v)] as const;

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const i = Math.max(0, Math.min(n - 1, Math.round(((e.clientX - rect.left - PAD.left) / plotW) * (n - 1))));
    const value = ((PAD.top + plotH - (e.clientY - rect.top)) / plotH) * TOP;
    setHover({ i, album: nearestSeries(ALBUM_CURVES, i, value) });
  };

  const hovered = hover && hover.album >= 0 ? ALBUM_CURVES[hover.album][hover.i] : null;
  const median = hover ? MEDIAN[hover.i] : null;
  const tipLeft = hover ? Math.min(Math.max(x(hover.i) + 12, 0), size.w - 190) : 0;
  const flip = hover ? x(hover.i) + 12 + 190 > size.w : false;

  return (
    <div
      ref={boxRef}
      className="sc-lines"
      onPointerMove={onMove}
      onPointerDown={onMove}
      onPointerLeave={() => setHover(null)}
    >
      <svg width={size.w} height={size.h} role="img" aria-label="Daily plays of 40 of 2026's biggest album launches over their first 180 days, each against its own first week. Almost every one starts high and falls the same way; the median is drawn in white.">
        <line x1={PAD.left} x2={size.w - PAD.right} y1={y(100)} y2={y(100)} className="sc-lines-ref" />
        <text x={size.w - PAD.right} y={y(100) - 6} textAnchor="end" className="sc-lines-axis">100 = FIRST WEEK</text>
        {(size.w < 500 ? NARROW_TICKS : DAY_TICKS).map((d) => (
          <text key={d} x={x((d - 1) / 2)} y={size.h - 6} textAnchor={d === 1 ? 'start' : d === 180 ? 'end' : 'middle'} className="sc-lines-axis">
            {d === 1 ? 'DAY 1' : d}
          </text>
        ))}
        {ALBUM_CURVES.map((curve, i) => (
          <path key={i} d={linePath(curve, at)} className={hover?.album === i ? 'sc-line sc-line-on' : 'sc-line'} />
        ))}
        <path d={linePath(MEDIAN, at)} className="sc-line-median" />
        {hover && (
          <g>
            <line x1={x(hover.i)} x2={x(hover.i)} y1={PAD.top} y2={PAD.top + plotH} className="sc-lines-cross" />
            {median !== null && median >= 0 && <circle cx={x(hover.i)} cy={y(median)} r={3.5} className="sc-dot-median" />}
            {hovered !== null && hovered >= 0 && <circle cx={x(hover.i)} cy={y(hovered)} r={3.5} className="sc-dot-on" />}
          </g>
        )}
      </svg>
      {hover && (
        <div className="sc-tip" style={{ left: flip ? x(hover.i) - 12 - 190 : tipLeft, top: PAD.top }}>
          <div className="sc-tip-day">DAY {dayOf(hover.i)}</div>
          {hovered !== null && hovered >= 0 && (
            <div><span>{Math.round(hovered)}</span> THIS ALBUM</div>
          )}
          {median !== null && median >= 0 && (
            <div><span>{Math.round(median)}</span> MEDIAN</div>
          )}
          <div className="sc-tip-note">100 = ITS FIRST WEEK</div>
        </div>
      )}
    </div>
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
