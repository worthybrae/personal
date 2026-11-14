import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { RAMP } from '@/components/Dashboard/ramp';
import type { GithubActivity as Activity } from '@/types/analytics';

// The last year of GitHub contributions as one row of glyphs, one per week.
// Busier weeks get denser letters from "worthy rae" (the background
// terrain's ramp) and brighter ink.

interface Week { start: string; count: number }

function toWeeks(days: Activity['days']): Week[] {
  const weeks: Week[] = [];
  for (const day of days) {
    // Weeks start on Sunday, as on GitHub.
    const dow = new Date(`${day.date}T00:00:00Z`).getUTCDay();
    if (weeks.length === 0 || dow === 0) weeks.push({ start: day.date, count: 0 });
    weeks[weeks.length - 1].count += day.count;
  }
  return weeks;
}

export function GithubActivity() {
  const [data, setData] = useState<Activity | null>(null);

  useEffect(() => {
    let live = true;
    api.getGithubActivity().then((d) => { if (live) setData(d); }).catch(() => {});
    return () => { live = false; };
  }, []);

  if (!data || data.days.length === 0) return null;

  const weeks = toWeeks(data.days);
  const max = Math.max(1, ...weeks.map((w) => w.count));

  return (
    <div className="about-activity">
      <a
        className="about-activity-row"
        href={`https://github.com/${data.user}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${data.total.toLocaleString()} GitHub contributions in the last year`}
        style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}
      >
        {weeks.map((w) => {
          // Square root so quiet weeks still register next to the busiest.
          const k = w.count === 0 ? 0 : Math.sqrt(w.count / max);
          return (
            <span key={w.start} title={`${w.count} the week of ${w.start}`} style={{ opacity: 0.15 + k * 0.85 }}>
              {RAMP[Math.round(k * (RAMP.length - 1))]}
            </span>
          );
        })}
      </a>
      <p className="about-activity-caption">
        {data.total.toLocaleString()} contributions in the last year
      </p>
    </div>
  );
}
