import { useFetch } from '@/hooks/useAnalytics';
import { api } from '@/lib/api';
import ProjectCard from './ProjectCard';

const PROJECT_META: Record<string, { title: string; description: string; mediaUrl: string; mediaType: 'video' | 'image'; tags: string[]; link: string }> = {
  coderview: {
    title: 'CodeView',
    description: 'AI-powered career development platform',
    mediaUrl: 'https://portfolio-worthy.s3.amazonaws.com/coderview-demo.mp4',
    mediaType: 'video',
    tags: ['React', 'AI', 'FastAPI'],
    link: '/projects/coderview',
  },
  streamclout: {
    title: 'StreamClout',
    description: 'Real-time Spotify streaming analytics',
    mediaUrl: 'https://portfolio-worthy.s3.amazonaws.com/streamclout-demo.mp4',
    mediaType: 'video',
    tags: ['Python', 'Spotify API', 'Analytics'],
    link: '/projects/streamclout',
  },
};

export default function WebsitesPanel() {
  const { data, loading } = useFetch(api.getProjects);

  return (
    <section id="websites" className="px-6 py-8">
      <div className="flex items-center gap-3 mb-5">
        <span className="font-mono text-[10px] text-cyber-cyan tracking-[0.2em]">■ WEBSITES</span>
        <span className="font-mono text-[10px] text-cyber-dim">2 projects</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(['coderview', 'streamclout'] as const).map((slug) => {
          const meta = PROJECT_META[slug];
          const analytics = data?.projects.find((p) => p.slug === slug);
          return (
            <ProjectCard
              key={slug}
              slug={slug}
              title={meta.title}
              description={meta.description}
              mediaUrl={meta.mediaUrl}
              mediaType={meta.mediaType}
              views={loading ? 0 : (analytics?.views_30d ?? 0)}
              sparkline={loading ? [] : (analytics?.sparkline ?? [])}
              tags={meta.tags}
              link={meta.link}
            />
          );
        })}
      </div>
    </section>
  );
}
