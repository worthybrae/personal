import { useNavigate } from 'react-router-dom';
import { useFetch } from '@/hooks/useAnalytics';
import { api } from '@/lib/api';
import AsciiBox from './AsciiBox';

export default function BlogPanel() {
  const navigate = useNavigate();
  const { data, loading } = useFetch(() => api.getBlogPosts());
  const posts = data?.posts ?? [];

  if (loading) {
    return (
      <div className="font-mono text-xs text-white/30 py-4 animate-pulse">
        Loading posts...
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="font-mono text-xs text-white/30 py-4">
        <span className="text-[#eab308]/50 text-[9px] tracking-[2px] uppercase">NO POSTS YET</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-4">
      {posts.map((post) => (
        <div
          key={post.slug}
          className="cursor-pointer"
          onClick={() => navigate(`/blog/${post.slug}`)}
        >
          <AsciiBox accentColor="#eab308">
            <div className="space-y-1.5">
              <div className="text-[#eab308] text-[10px] font-mono">{post.date}</div>
              <div className="text-white font-bold text-sm">{post.title}</div>
              <div className="text-white/40 text-xs leading-relaxed">{post.description}</div>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-[#eab308] text-[11px]">read →</span>
                <span className="text-white/20 text-[10px]">{post.read_time}</span>
              </div>
            </div>
          </AsciiBox>
        </div>
      ))}
    </div>
  );
}
