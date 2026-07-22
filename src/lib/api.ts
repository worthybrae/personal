import type {
  OverviewStats,
  ProjectAnalytics,
  ProjectDetailAnalytics,
  PageViews,
  BlogPostMeta,
  BlogPost,
  SpotifyNowPlaying,
  SpotifyTopTracks,
  LetterboxdRecent,
} from '@/types/analytics';
import type { MusicCatalog, MusicPlayStats } from '@/types/music';

const BASE = '/api';

async function fetchJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  getOverview: () => fetchJSON<OverviewStats>('/analytics/overview'),
  getProjects: () => fetchJSON<{ projects: ProjectAnalytics[] }>('/analytics/projects'),
  getProjectDetail: (slug: string) => fetchJSON<ProjectDetailAnalytics>(`/analytics/project/${slug}`),
  getPageViews: () => fetchJSON<{ pages: PageViews[] }>('/analytics/pages'),
  getBlogPosts: () => fetchJSON<{ posts: BlogPostMeta[] }>('/blog'),
  getBlogPost: (slug: string) => fetchJSON<BlogPost>(`/blog/${slug}`),
  getSpotifyNowPlaying: () => fetchJSON<SpotifyNowPlaying>('/spotify/now-playing'),
  getSpotifyTopTracks: () => fetchJSON<SpotifyTopTracks>('/spotify/top-tracks'),
  getLetterboxdRecent: () => fetchJSON<LetterboxdRecent>('/letterboxd/recent'),
  getMusicCatalog: () => fetchJSON<MusicCatalog>('/music/catalog'),
  getMusicPlayStats: () => fetchJSON<MusicPlayStats>('/music/plays/stats'),
  recordMusicPlay: async (trackId: string): Promise<MusicPlayStats> => {
    const res = await fetch(`${BASE}/music/plays/${encodeURIComponent(trackId)}`, { method: 'POST' });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  },
};
