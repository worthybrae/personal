import { useEffect, useRef, useState } from 'react';
import { useFetch } from '@/hooks/useAnalytics';
import { api } from '@/lib/api';

function AnimatedNumber({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>();

  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (progress < 1) ref.current = requestAnimationFrame(step);
    };
    ref.current = requestAnimationFrame(step);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [value, duration]);

  return <>{display.toLocaleString()}</>;
}

export default function StatsTicker() {
  const { data, loading } = useFetch(api.getOverview);

  if (loading || !data) {
    return (
      <div className="bg-cyber-green/[0.04] border-y border-cyber-green/[0.12] px-6 py-3 font-mono text-xs text-muted animate-pulse">
        Loading stats...
      </div>
    );
  }

  const trendColor = data.weekly_trend_pct >= 0 ? 'text-cyber-green' : 'text-cyber-red';
  const trendArrow = data.weekly_trend_pct >= 0 ? '\u25B2' : '\u25BC';

  return (
    <div className="bg-cyber-green/[0.04] border-y border-cyber-green/[0.12] px-6 py-3 flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
      <div className="flex items-center gap-6">
        <span className="text-cyber-green">● LIVE</span>
        <span className="text-muted">
          <AnimatedNumber value={data.total_visitors_30d} /> visitors{' '}
          <span className="text-cyber-dim">(30d)</span>
        </span>
        <span className="text-muted">
          <AnimatedNumber value={data.visitors_this_week} /> this week{' '}
          <span className={trendColor}>
            {trendArrow} {Math.abs(data.weekly_trend_pct)}%
          </span>
        </span>
      </div>
      <div className="flex items-center gap-6 text-cyber-dim">
        <span>{data.project_count} projects</span>
        <span>{data.post_count} posts</span>
      </div>
    </div>
  );
}
