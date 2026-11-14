import { useEffect, useRef, useState } from 'react';
import { ArtLabel, ArtTags } from '@/components/Art/ArtArticleParts';
import { LAUNCH_MEDIAN, NAMED_ALBUMS } from './albumCurves';
import { linePath, nearestSeries, spreadApart, streamsThatDay } from './figures';
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

const MEDIAN = LAUNCH_MEDIAN;
const NAMED = NAMED_ALBUMS.map((a) => a.curve);
/** Where each named album's readings stop. */
const LAST = NAMED.map((c) => {
  let i = c.length - 1;
  while (i > 0 && c[i] < 0) i--;
  return i;
});
const TIP_W = 250;
/** Readings are every second day from day 1. */
const dayOf = (i: number) => i * 2 + 1;
const TOP = 200; // percent at the top edge; the few higher readings are clipped
const GRID = [50, 100, 150];
const DAY_TICKS = [1, 30, 60, 90, 120, 150, 180];
const NARROW_TICKS = [1, 60, 120, 180];

/** Twelve named 2026 albums over their first 180 days, each as a share of
 *  its first week's plays, with the typical launch in white and each
 *  album's cover in a column at the right, tied to where its line ends.
 *  Hovering (or touching) a line or a cover shows that album's cover, name,
 *  share and new streams that day. */
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

  const narrow = size.w < 500;
  const cover = narrow ? 18 : 28;
  const PAD = { top: 12, right: cover + 20, bottom: 26, left: 8 };
  const n = MEDIAN.length;
  const plotW = size.w - PAD.left - PAD.right;
  const plotH = size.h - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (i / (n - 1)) * plotW;
  const y = (v: number) => PAD.top + plotH - (Math.min(v, TOP) / TOP) * plotH;
  const at = (i: number, v: number) => [x(i), y(v)] as const;
  const coverX = size.w - cover;
  const coverY = spreadApart(
    NAMED.map((c, k) => y(c[LAST[k]])),
    cover + 3,
    PAD.top + cover / 2,
    PAD.top + plotH - cover / 2,
  );

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    if (px > PAD.left + plotW + 6) {
      // Over the covers: the one nearest, at the end of its line.
      let k = 0;
      coverY.forEach((cy, j) => { if (Math.abs(cy - py) < Math.abs(coverY[k] - py)) k = j; });
      setHover({ i: LAST[k], album: k });
      return;
    }
    const i = Math.max(0, Math.min(n - 1, Math.round(((px - PAD.left) / plotW) * (n - 1))));
    const value = ((PAD.top + plotH - py) / plotH) * TOP;
    setHover({ i, album: nearestSeries(NAMED, i, value) });
  };

  const album = hover && hover.album >= 0 ? NAMED_ALBUMS[hover.album] : null;
  const share = album && hover ? album.curve[hover.i] : null;
  const median = hover ? MEDIAN[hover.i] : null;
  const crossX = hover ? x(hover.i) : 0;
  const flip = crossX + 12 + TIP_W > size.w - PAD.right;
  const tipLeft = Math.max(0, flip ? crossX - 12 - TIP_W : crossX + 12);
  const medianLabel = 44;

  return (
    <div
      ref={boxRef}
      className={hover ? 'sc-lines sc-lines-hover' : 'sc-lines'}
      onPointerMove={onMove}
      onPointerDown={onMove}
      // A finger lifting also 'leaves'; keep its reading up until the next touch.
      onPointerLeave={(e) => { if (e.pointerType !== 'touch') setHover(null); }}
    >
      <svg width={size.w} height={size.h} role="img" aria-label="Daily plays of twelve 2026 albums over their first 180 days, each as a share of its first week, with the typical album in white. Most fall to a fraction of their first week within a few months.">
        {GRID.map((g) => (
          <g key={g}>
            <line x1={PAD.left} x2={PAD.left + plotW} y1={y(g)} y2={y(g)} className="sc-lines-ref" />
            <text x={PAD.left + plotW} y={y(g) - 5} textAnchor="end" className="sc-lines-axis">{g}%</text>
          </g>
        ))}
        {(narrow ? NARROW_TICKS : DAY_TICKS).map((d) => (
          <text key={d} x={x((d - 1) / 2)} y={size.h - 6} textAnchor={d === 1 ? 'start' : d === 180 ? 'end' : 'middle'} className="sc-lines-axis">
            {d === 1 ? 'DAY 1' : d}
          </text>
        ))}
        {NAMED.map((curve, k) => (
          <path key={k} d={linePath(curve, at)} className={hover?.album === k ? 'sc-line sc-line-on' : 'sc-line'} />
        ))}
        <path d={linePath(MEDIAN, at)} className="sc-line-median" />
        <text x={x(medianLabel)} y={y(MEDIAN[medianLabel]) + 16} className="sc-lines-axis sc-lines-median-label">TYPICAL ALBUM</text>
        {NAMED_ALBUMS.map((a, k) => {
          const ex = x(LAST[k]);
          const ey = y(a.curve[LAST[k]]);
          const cy = coverY[k];
          return (
            <g key={a.name} className={hover?.album === k ? 'sc-cover sc-cover-on' : 'sc-cover'}>
              <path d={`M${ex.toFixed(1)},${ey.toFixed(1)}L${(PAD.left + plotW + 4).toFixed(1)},${ey.toFixed(1)}L${(coverX - 4).toFixed(1)},${cy.toFixed(1)}`} className="sc-cover-lead" />
              <image href={a.cover} x={coverX} y={cy - cover / 2} width={cover} height={cover} preserveAspectRatio="xMidYMid slice" />
            </g>
          );
        })}
        {hover && (
          <g>
            <line x1={crossX} x2={crossX} y1={PAD.top} y2={PAD.top + plotH} className="sc-lines-cross" />
            {median !== null && median >= 0 && <circle cx={crossX} cy={y(median)} r={3.5} className="sc-dot-median" />}
            {share !== null && share >= 0 && <circle cx={crossX} cy={y(share)} r={3.5} className="sc-dot-on" />}
          </g>
        )}
      </svg>
      {hover && (
        <div className="sc-tip" style={{ left: tipLeft, top: PAD.top }}>
          {album && (
            <div className="sc-tip-album">
              <img src={album.cover} alt="" width={44} height={44} referrerPolicy="no-referrer" />
              <div>
                <div className="sc-tip-name">{album.name}</div>
                <div className="sc-tip-artist">{album.artist}</div>
              </div>
            </div>
          )}
          <div className="sc-tip-day">DAY {dayOf(hover.i)}</div>
          {album && share !== null && share >= 0 && (
            <>
              <div><span>{streamsThatDay(album.firstWeek, share).toLocaleString('en-US')}</span> NEW STREAMS</div>
              <div><span>{Math.round(share)}%</span> OF ITS FIRST WEEK</div>
            </>
          )}
          {median !== null && median >= 0 && (
            <div><span>{Math.round(median)}%</span> TYPICAL ALBUM</div>
          )}
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
      <ArtLabel>THE LIFE OF AN ALBUM</ArtLabel>
      <p className="sc-explain">
        Each line is one album&apos;s new streams a day, as a share of what it drew a day in its
        first week. A typical 2026 album is under 40% a month in and about 15% by six months.
      </p>
      <figure className="sc-figure">
        <AlbumLines />
        <figcaption>12 OF 2026&apos;S ALBUMS, NEW STREAMS A DAY OVER THEIR FIRST 180 DAYS</figcaption>
      </figure>

      <p className="art-intro">{summary}</p>

      <dl className="sc-stats">
        {headline().map(([value, label]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      <ArtLabel>TOOLS</ArtLabel>
      <ArtTags tags={tech} />
    </article>
  );
}
