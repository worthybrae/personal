import { useFetch } from '@/hooks/useAnalytics';
import { api } from '@/lib/api';
import { Sparkline, AsciiBar, CountUp } from './AsciiChart';
import SpotifyRecord from './SpotifyRecord';
import FilmStrip from './FilmStrip';

export default function OverviewPanel() {
  const { data: overview } = useFetch(() => api.getOverview());
  const { data: projects } = useFetch(() => api.getProjects());

  const projectList = projects?.projects ?? [];
  const maxViews = Math.max(...projectList.map((p) => p.views_30d), 1);

  return (
    <div className="space-y-8 py-4">
      {/* Stats */}
      <div>
        <div className="text-[#06b6d4] text-[9px] font-mono tracking-[3px] uppercase mb-3">
          MONTHLY ACTIVE USERS
        </div>
        <div className="flex items-baseline gap-3">
          <CountUp
            value={overview?.total_visitors_30d ?? 0}
            className="text-white text-4xl md:text-5xl font-bold tracking-wider"
          />
          {overview && overview.weekly_trend_pct !== 0 && (
            <span
              className="text-xs font-mono"
              style={{ color: overview.weekly_trend_pct > 0 ? '#22c55e' : '#ef4444' }}
            >
              {overview.weekly_trend_pct > 0 ? '▲' : '▼'} {Math.abs(overview.weekly_trend_pct)}%
            </span>
          )}
        </div>

        {/* Per-project bars */}
        <div className="mt-4 space-y-1">
          {projectList.map((p) => (
            <AsciiBar
              key={p.slug}
              label={p.slug}
              value={p.views_30d}
              maxValue={maxViews}
            />
          ))}
        </div>

        {/* Sparkline */}
        {projectList.length > 0 && projectList[0].sparkline.length > 0 && (
          <div className="mt-3 font-mono text-[10px] text-white/30">
            <span className="text-white/20 mr-1">7d:</span>
            <Sparkline data={projectList[0].sparkline} />
          </div>
        )}
      </div>

      {/* Spotify */}
      <SpotifyRecord />

      {/* Letterboxd */}
      <FilmStrip />
    </div>
  );
}
