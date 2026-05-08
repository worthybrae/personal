export interface OverviewStats {
  total_visitors_30d: number;
  visitors_this_week: number;
  weekly_trend_pct: number;
  project_count: number;
  post_count: number;
}

export interface ProjectAnalytics {
  slug: string;
  views_30d: number;
  sparkline: number[];
  source: string;
}

export interface ProjectDetailAnalytics {
  slug: string;
  views_30d: number;
  unique_visitors_30d: number;
  avg_session_duration: string;
  daily_views: { date: string; views: number }[];
  top_sources: { source: string; count: number }[];
}

export interface PageViews {
  path: string;
  views_30d: number;
}

export interface BlogPostMeta {
  slug: string;
  title: string;
  date: string;
  description: string;
  read_time: string;
  tags: string[];
}

export interface BlogPost extends BlogPostMeta {
  content_html: string;
}
