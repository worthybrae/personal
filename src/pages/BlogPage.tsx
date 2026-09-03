import { useParams } from 'react-router-dom';
import { useFetch } from '@/hooks/useAnalytics';
import { api } from '@/lib/api';
import DOMPurify from 'dompurify';
import TerrainLayout from '@/components/Layout/TerrainLayout';
import { useSeo } from '@/hooks/useSeo';
import { SITE } from '@/lib/seo';

export default function BlogPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, loading, error } = useFetch(() => api.getBlogPost(slug!));

  useSeo({
    path: `/blog/${slug}`,
    title: data ? `${data.title} — ${SITE.name}` : `Blog — ${SITE.name}`,
    description: data?.description || SITE.description,
    type: 'article',
  });

  if (loading) {
    return (
      <TerrainLayout title="BLOG">
        <p className="font-mono text-xs text-white/40 animate-pulse">Loading...</p>
      </TerrainLayout>
    );
  }

  if (error || !data) {
    return (
      <TerrainLayout title="BLOG">
        <div className="bg-[#08080c]/85 backdrop-blur-xl border border-cyber-amber/15 rounded-lg p-8 text-center">
          <h2 className="text-xl font-bold text-white">Post not found</h2>
        </div>
      </TerrainLayout>
    );
  }

  return (
    <TerrainLayout title={data.title}>
      <div className="bg-[#08080c]/85 backdrop-blur-xl border border-cyber-amber/15 rounded-lg p-6 md:p-10">
        <div className="flex items-center gap-4 font-mono text-xs text-white/40 mb-6">
          <span>{data.date}</span>
          <span>{data.read_time}</span>
        </div>
        {data.tags.length > 0 && (
          <div className="flex gap-2 mb-6">
            {data.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-2 py-0.5 bg-cyber-amber/10 text-cyber-amber rounded font-mono"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        <article
          className="prose prose-invert prose-sm max-w-none
            prose-headings:text-white prose-headings:font-bold
            prose-a:text-cyber-cyan prose-a:no-underline hover:prose-a:underline
            prose-code:font-mono prose-code:text-cyber-magenta prose-code:bg-white/[0.05] prose-code:px-1 prose-code:rounded
            prose-pre:bg-white/[0.03] prose-pre:border prose-pre:border-white/[0.05]"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(data.content_html) }}
        />
      </div>
    </TerrainLayout>
  );
}
