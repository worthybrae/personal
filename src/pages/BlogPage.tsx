import { useParams, Link } from 'react-router-dom';
import { useFetch } from '@/hooks/useAnalytics';
import { api } from '@/lib/api';
import DOMPurify from 'dompurify';

export default function BlogPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, loading, error } = useFetch(() => api.getBlogPost(slug!));

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08080c] flex items-center justify-center">
        <p className="font-mono text-xs text-cyber-dim animate-pulse">Loading...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#08080c] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Post not found</h1>
          <Link to="/" className="text-cyber-cyan font-mono text-sm mt-4 inline-block">← back to dashboard</Link>
        </div>
      </div>
    );
  }

  const sanitizedHTML = DOMPurify.sanitize(data.content_html);

  return (
    <div className="min-h-screen bg-[#08080c]">
      <div className="max-w-[680px] mx-auto px-6 py-16">
        <Link to="/" className="font-mono text-xs text-cyber-cyan hover:opacity-80 transition-opacity">
          ← dashboard
        </Link>
        <header className="mt-8 mb-10">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">{data.title}</h1>
          <div className="flex items-center gap-4 mt-3 font-mono text-xs text-cyber-dim">
            <span>{data.date}</span>
            <span>{data.read_time}</span>
          </div>
          {data.tags.length > 0 && (
            <div className="flex gap-2 mt-3">
              {data.tags.map((tag) => (
                <span key={tag} className="text-[10px] px-2 py-0.5 bg-cyber-amber/10 text-cyber-amber rounded font-mono">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </header>
        <article
          className="prose prose-invert prose-sm max-w-none
            prose-headings:text-white prose-headings:font-bold
            prose-a:text-cyber-cyan prose-a:no-underline hover:prose-a:underline
            prose-code:font-mono prose-code:text-cyber-magenta prose-code:bg-white/[0.05] prose-code:px-1 prose-code:rounded
            prose-pre:bg-white/[0.03] prose-pre:border prose-pre:border-white/[0.05]"
          dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
        />
      </div>
    </div>
  );
}
