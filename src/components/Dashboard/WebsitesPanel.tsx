import { useFetch } from '@/hooks/useAnalytics';
import { api } from '@/lib/api';
import { Sparkline } from './AsciiChart';
import AsciiBox from './AsciiBox';

const PROJECT_META: Record<string, { name: string; description: string; url: string; displayUrl: string }> = {
  coderview: {
    name: 'CodeView',
    description: 'AI-powered career development platform',
    url: 'https://github.com/worthybrae/coderview',
    displayUrl: 'coderview.io',
  },
  streamclout: {
    name: 'StreamClout',
    description: 'Real-time Spotify streaming analytics',
    url: 'https://github.com/worthybrae/streamclout',
    displayUrl: 'streamclout.com',
  },
};

export default function WebsitesPanel() {
  const { data: projects } = useFetch(() => api.getProjects());
  const projectList = projects?.projects ?? [];

  return (
    <div className="space-y-4 py-4">
      {projectList.map((project) => {
        const meta = PROJECT_META[project.slug];
        if (!meta) return null;
        const trend = project.sparkline;
        const trendDir = trend.length >= 2 && trend[trend.length - 1] >= trend[trend.length - 2];

        return (
          <AsciiBox key={project.slug} accentColor="#06b6d4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-white font-bold text-sm">{meta.name}</span>
                <span className="text-xs" style={{ color: trendDir ? '#22c55e' : '#ef4444' }}>
                  {trendDir ? '▲' : '▼'}
                </span>
              </div>
              <div className="text-white/40 text-xs">{meta.description}</div>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-white/50 text-xs">visitors</span>
                <span className="text-white text-sm font-bold">{project.views_30d.toLocaleString()}</span>
                <span className="text-white/30 text-xs">7d</span>
                <Sparkline data={project.sparkline} />
              </div>
              <a
                href={meta.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#06b6d4] text-xs hover:text-[#06b6d4]/80 transition-colors inline-block mt-1"
              >
                {meta.displayUrl} →
              </a>
            </div>
          </AsciiBox>
        );
      })}
    </div>
  );
}
