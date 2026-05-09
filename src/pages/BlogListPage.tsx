// src/pages/BlogListPage.tsx

import { Link } from 'react-router-dom';
import { useFetch } from '@/hooks/useAnalytics';
import { api } from '@/lib/api';
import TerrainLayout from '@/components/Layout/TerrainLayout';

export default function BlogListPage() {
  const { data, loading } = useFetch(api.getBlogPosts);
  const posts = data?.posts ?? [];

  return (
    <TerrainLayout title="BLOG">
      {loading ? (
        <p className="font-mono text-xs text-white/40 animate-pulse">Loading...</p>
      ) : posts.length === 0 ? (
        <div className="bg-[#08080c]/85 backdrop-blur-xl border border-dashed border-cyber-amber/20 rounded-lg p-8 text-center">
          <p className="font-mono text-sm text-white/50">No posts yet</p>
          <p className="font-mono text-xs text-white/30 mt-2">
            Check back soon — thoughts on building, creating, and shipping.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              className="block bg-[#08080c]/85 backdrop-blur-xl border border-cyber-amber/15 rounded-lg p-6 hover:border-cyber-amber/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-mono text-lg font-bold text-white">{post.title}</h2>
                  <p className="font-mono text-sm text-white/50 mt-1">{post.description}</p>
                </div>
                <span className="font-mono text-xs text-white/30 shrink-0">{post.date}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </TerrainLayout>
  );
}
