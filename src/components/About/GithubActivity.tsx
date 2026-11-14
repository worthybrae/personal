import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { GithubActivity as Activity } from '@/types/analytics';

// The last year of GitHub contributions as a grid of glyphs, one per day
// (weeks across, Sunday to Saturday down). Busier days get denser letters
// from "worthy rae", like the background terrain.
const GLYPHS = ['t', 'r', 'a', 'H', 'W'];
const OPACITY = [0.14, 0.4, 0.6, 0.8, 1];

export function GithubActivity() {
  const [data, setData] = useState<Activity | null>(null);

  useEffect(() => {
    let live = true;
    api.getGithubActivity().then((d) => { if (live) setData(d); }).catch(() => {});
    return () => { live = false; };
  }, []);

  if (!data || data.days.length === 0) return null;

  // Pad the front so the first column starts on a Sunday.
  const lead = new Date(`${data.days[0].date}T00:00:00Z`).getUTCDay();
  const cells: (Activity['days'][number] | null)[] = [...Array(lead).fill(null), ...data.days];
  const weeks: (typeof cells)[] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <div className="about-activity">
      <a
        className="about-activity-grid"
        href={`https://github.com/${data.user}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${data.total.toLocaleString()} GitHub contributions in the last year`}
        style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}
      >
        {weeks.map((week, w) => (
          <span key={w} className="about-activity-week">
            {week.map((day, d) => day ? (
              <span key={d} title={`${day.count} on ${day.date}`} style={{ opacity: OPACITY[day.level] }}>
                {GLYPHS[day.level]}
              </span>
            ) : <span key={d} />)}
          </span>
        ))}
      </a>
      <p className="about-activity-caption">
        {data.total.toLocaleString()} contributions in the last year
      </p>
    </div>
  );
}
