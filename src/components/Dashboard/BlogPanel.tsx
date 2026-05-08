import { useFetch } from '@/hooks/useAnalytics';
import { api } from '@/lib/api';
import { Link } from 'react-router-dom';

export default function BlogPanel() {
  const { data } = useFetch(api.getBlogPosts);
  const posts = data?.posts ?? [];

  return (
    <section id="blog" className="px-6 py-8">
      <div className="flex items-center gap-3 mb-5">
        <span className="font-mono text-[10px] text-cyber-amber tracking-[0.2em]">■ BLOG</span>
        <span className="font-mono text-[10px] text-cyber-dim">{posts.length} posts</span>
      </div>

      {posts.length === 0 ? (
        <div className="border border-dashed border-cyber-amber/[0.12] rounded-md p-8 text-center">
          <p className="text-sm text-cyber-dim">No posts yet</p>
          <p className="text-xs text-cyber-dim/60 font-mono mt-2">
            Check back soon — thoughts on building, creating, and shipping.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              className="block bg-white/[0.02] border border-cyber-amber/10 rounded-md p-4 hover:border-cyber-amber/30 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">{post.title}</h3>
                  <p className="text-xs text-muted mt-1">{post.description}</p>
                </div>
                <div className="font-mono text-[10px] text-cyber-dim shrink-0 ml-4">
                  {post.date} · {post.read_time}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
