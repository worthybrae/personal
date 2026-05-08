# Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign worthyrae.com from a traditional portfolio into a cyberpunk-styled live data dashboard with three sections (Websites, Art, Blog), real GA4 analytics per project, and a markdown-based blog system.

**Architecture:** React + Vite + Tailwind frontend with an expanded FastAPI backend. The backend serves analytics from three GA4 properties (portfolio, CodeView, StreamClout) and blog posts from markdown files. The landing page becomes a single-page dashboard showing live data across all sections.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, FastAPI, Google Analytics Data API, Recharts, python-frontmatter, markdown, DOMPurify

**Spec:** `docs/superpowers/specs/2026-05-08-dashboard-redesign-design.md`

---

## File Structure

### New Files to Create

```
src/
  components/
    Dashboard/
      Hero.tsx              — Video hero section with gradient overlay and CTAs
      StatsTicker.tsx       — Live stats bar with animated counters
      WebsitesPanel.tsx     — Websites section with project cards
      ArtPanel.tsx          — Art section with art cards
      BlogPanel.tsx         — Blog section with post list or empty state
      ProjectCard.tsx       — Card with screenshot, stats, sparkline, tech tags
      ArtCard.tsx           — Art preview card with image and view count
      Sparkline.tsx         — Tiny inline SVG line chart
    Layout/
      Footer.tsx            — Cyberpunk-styled footer
  pages/
    Home.tsx                — Dashboard landing page (assembles all Dashboard components)
    ArtPage.tsx             — Individual art piece detail page
    BlogPage.tsx            — Individual blog post page (uses DOMPurify for HTML sanitization)
  hooks/
    useAnalytics.ts         — Fetch analytics data from backend
  lib/
    api.ts                  — API client functions
  types/
    analytics.ts            — TypeScript types for API responses
backend/
  analytics.py              — GA4 multi-property query logic with caching
  blog.py                   — Blog post reading, parsing, and serving
blog/                       — Directory for markdown blog posts (initially empty)
```

### Files to Modify

```
src/App.tsx                             — New routes, remove CountryDensity, add art/blog routes
src/index.css                           — Cyberpunk color system, monospace fonts
tailwind.config.js                      — New color tokens, font families
src/components/global/Header.tsx        — New cyberpunk nav with color-coded section links
src/components/global/PageTemplate.tsx  — Add stats header section for project pages
src/components/projects/Coderview.tsx   — Update relatedProjects (remove CountryDensity)
src/components/projects/Streamclout.tsx — Update relatedProjects (remove CountryDensity)
src/components/projects/AIArchitecture.tsx — Update relatedProjects
src/components/projects/LivestreamArt.tsx  — Update relatedProjects
backend/main.py                         — New endpoints, multi-property GA4, blog routes
backend/requirements.txt                — Add python-frontmatter, markdown
index.html                              — Update title, add font import
package.json                            — Remove @vercel/analytics, add @tailwindcss/typography, dompurify
```

### Files to Delete

```
src/components/projects/CountryDensity.tsx
src/components/global/VisitorCount.tsx
```

---

## Task 1: Cyberpunk Color System & Typography

**Files:**
- Modify: `src/index.css`
- Modify: `tailwind.config.js`
- Modify: `index.html`

This task replaces the current light/dark theme CSS variables with the cyberpunk palette and adds monospace font support.

- [ ] **Step 1: Replace CSS variables in `src/index.css`**

Replace the existing `@layer base { ... }` block (and remove the `@media (prefers-color-scheme: light)` block entirely) with:

```css
@layer base {
  :root {
    --background: 230 25% 3%;
    --foreground: 0 0% 88%;
    --card: 230 25% 5%;
    --card-foreground: 0 0% 88%;
    --popover: 230 25% 5%;
    --popover-foreground: 0 0% 88%;
    --primary: 204 100% 50%;
    --primary-foreground: 0 0% 100%;
    --secondary: 324 100% 50%;
    --secondary-foreground: 0 0% 100%;
    --muted: 0 0% 53%;
    --muted-foreground: 0 0% 53%;
    --accent: 40 100% 50%;
    --accent-foreground: 0 0% 100%;
    --destructive: 348 100% 60%;
    --destructive-foreground: 0 0% 100%;
    --border: 0 0% 100% / 0.05;
    --input: 0 0% 100% / 0.1;
    --ring: 204 100% 50%;
    --radius: 0.375rem;
    --cyber-green: 152 100% 50%;
    --cyber-cyan: 204 100% 50%;
    --cyber-magenta: 324 100% 50%;
    --cyber-amber: 40 100% 50%;
    --cyber-red: 348 100% 60%;
    --cyber-dim: 0 0% 20%;
  }

  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
    font-family: system-ui, -apple-system, sans-serif;
  }
}
```

- [ ] **Step 2: Add JetBrains Mono font import to `index.html`**

Add inside `<head>` before the GA script:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
```

- [ ] **Step 3: Update Tailwind config with new tokens**

In `tailwind.config.js`, add to the `extend` section:

```js
fontFamily: {
  mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
},
colors: {
  cyber: {
    green: 'hsl(var(--cyber-green))',
    cyan: 'hsl(var(--cyber-cyan))',
    magenta: 'hsl(var(--cyber-magenta))',
    amber: 'hsl(var(--cyber-amber))',
    red: 'hsl(var(--cyber-red))',
    dim: 'hsl(var(--cyber-dim))',
  },
},
```

- [ ] **Step 4: Verify the dev server still compiles**

Run: `cd /Users/worthy/TestCode/personal && npx vite build 2>&1 | tail -5`

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/index.css tailwind.config.js index.html
git commit -m "feat: replace theme with cyberpunk color system and monospace typography"
```

---

## Task 2: TypeScript Types & API Client

**Files:**
- Create: `src/types/analytics.ts`
- Create: `src/lib/api.ts`
- Create: `src/hooks/useAnalytics.ts`

Define the data contracts and fetching layer before building any UI.

- [ ] **Step 1: Create analytics types**

Create `src/types/analytics.ts`:

```typescript
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
```

- [ ] **Step 2: Create API client**

Create `src/lib/api.ts`:

```typescript
import type {
  OverviewStats,
  ProjectAnalytics,
  ProjectDetailAnalytics,
  PageViews,
  BlogPostMeta,
  BlogPost,
} from '@/types/analytics';

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
};
```

- [ ] **Step 3: Create useFetch hook**

Create `src/hooks/useAnalytics.ts`:

```typescript
import { useState, useEffect } from 'react';

export function useFetch<T>(fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetcher()
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  return { data, loading, error };
}
```

- [ ] **Step 4: Commit**

```bash
git add src/types/analytics.ts src/lib/api.ts src/hooks/useAnalytics.ts
git commit -m "feat: add analytics types, API client, and useFetch hook"
```

---

## Task 3: Backend — Multi-Property Analytics & Blog API

**Files:**
- Create: `backend/analytics.py`
- Create: `backend/blog.py`
- Modify: `backend/main.py`
- Modify: `backend/requirements.txt`
- Create: `blog/.gitkeep`

- [ ] **Step 1: Add Python dependencies**

Append to `backend/requirements.txt`:

```
python-frontmatter==1.1.0
markdown==3.7
```

- [ ] **Step 2: Create `backend/analytics.py`**

```python
import os
import time
from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import (
    DateRange,
    Dimension,
    Metric,
    RunReportRequest,
)
from google.oauth2 import service_account

CREDENTIALS_PATH = "/app/ga.json"
CACHE_TTL = 300  # 5 minutes

_cache: dict[str, tuple[float, any]] = {}


def _get_client() -> BetaAnalyticsDataClient:
    if os.path.exists(CREDENTIALS_PATH):
        creds = service_account.Credentials.from_service_account_file(CREDENTIALS_PATH)
    else:
        raise RuntimeError("ga.json credentials file not found")
    return BetaAnalyticsDataClient(credentials=creds)


def _cached(key: str, fetcher):
    now = time.time()
    if key in _cache:
        ts, val = _cache[key]
        if now - ts < CACHE_TTL:
            return val
    val = fetcher()
    _cache[key] = (now, val)
    return val


def _get_property_ids() -> dict[str, str]:
    return {
        "portfolio": os.getenv("GA4_PROPERTY_ID", ""),
        "coderview": os.getenv("GA4_CODERVIEW_PROPERTY_ID", ""),
        "streamclout": os.getenv("GA4_STREAMCLOUT_PROPERTY_ID", ""),
    }


def _run_report(property_id: str, metrics: list[str], dimensions: list[str] | None = None,
                start_date: str = "30daysAgo", end_date: str = "today") -> list[dict]:
    client = _get_client()
    request = RunReportRequest(
        property=f"properties/{property_id}",
        date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
        metrics=[Metric(name=m) for m in metrics],
        dimensions=[Dimension(name=d) for d in (dimensions or [])],
    )
    response = client.run_report(request)
    rows = []
    for row in response.rows:
        entry = {}
        for i, dim in enumerate(dimensions or []):
            entry[dim] = row.dimension_values[i].value
        for i, met in enumerate(metrics):
            entry[met] = row.metric_values[i].value
        rows.append(entry)
    return rows


def get_overview() -> dict:
    def fetch():
        props = _get_property_ids()
        portfolio_id = props["portfolio"]
        if not portfolio_id:
            return {
                "total_visitors_30d": 0,
                "visitors_this_week": 0,
                "weekly_trend_pct": 0,
                "project_count": 4,
                "post_count": 0,
            }

        month_rows = _run_report(portfolio_id, ["screenPageViews"])
        total_30d = int(month_rows[0]["screenPageViews"]) if month_rows else 0

        week_rows = _run_report(portfolio_id, ["screenPageViews"], start_date="7daysAgo")
        this_week = int(week_rows[0]["screenPageViews"]) if week_rows else 0

        prev_week_rows = _run_report(portfolio_id, ["screenPageViews"],
                                      start_date="14daysAgo", end_date="7daysAgo")
        prev_week = int(prev_week_rows[0]["screenPageViews"]) if prev_week_rows else 0

        trend = round(((this_week - prev_week) / prev_week * 100), 1) if prev_week > 0 else 0

        return {
            "total_visitors_30d": total_30d,
            "visitors_this_week": this_week,
            "weekly_trend_pct": trend,
            "project_count": 4,
            "post_count": 0,
        }

    return _cached("overview", fetch)


def get_project_analytics() -> list[dict]:
    def fetch():
        props = _get_property_ids()
        projects = []
        for slug in ["coderview", "streamclout"]:
            prop_id = props.get(slug, "")
            if not prop_id:
                projects.append({"slug": slug, "views_30d": 0, "sparkline": [], "source": f"{slug}_ga4"})
                continue

            total_rows = _run_report(prop_id, ["screenPageViews"])
            views_30d = int(total_rows[0]["screenPageViews"]) if total_rows else 0

            daily_rows = _run_report(prop_id, ["screenPageViews"], dimensions=["date"])
            daily_rows.sort(key=lambda r: r["date"])
            sparkline = [int(r["screenPageViews"]) for r in daily_rows]

            projects.append({
                "slug": slug,
                "views_30d": views_30d,
                "sparkline": sparkline,
                "source": f"{slug}_ga4",
            })
        return projects

    return _cached("projects", fetch)


def get_project_detail(slug: str) -> dict:
    def fetch():
        props = _get_property_ids()
        prop_id = props.get(slug, "")
        if not prop_id:
            return {"slug": slug, "views_30d": 0, "unique_visitors_30d": 0,
                    "avg_session_duration": "0s", "daily_views": [], "top_sources": []}

        total_rows = _run_report(prop_id, ["screenPageViews", "totalUsers", "averageSessionDuration"])
        views = int(total_rows[0]["screenPageViews"]) if total_rows else 0
        users = int(total_rows[0]["totalUsers"]) if total_rows else 0
        avg_dur_sec = float(total_rows[0]["averageSessionDuration"]) if total_rows else 0
        minutes = int(avg_dur_sec // 60)
        seconds = int(avg_dur_sec % 60)
        avg_dur = f"{minutes}m {seconds}s" if minutes > 0 else f"{seconds}s"

        daily_rows = _run_report(prop_id, ["screenPageViews"], dimensions=["date"])
        daily_rows.sort(key=lambda r: r["date"])
        daily_views = [{"date": r["date"], "views": int(r["screenPageViews"])} for r in daily_rows]

        source_rows = _run_report(prop_id, ["screenPageViews"], dimensions=["sessionSource"])
        source_rows.sort(key=lambda r: int(r["screenPageViews"]), reverse=True)
        top_sources = [{"source": r["sessionSource"], "count": int(r["screenPageViews"])}
                       for r in source_rows[:5]]

        return {
            "slug": slug,
            "views_30d": views,
            "unique_visitors_30d": users,
            "avg_session_duration": avg_dur,
            "daily_views": daily_views,
            "top_sources": top_sources,
        }

    return _cached(f"project_detail_{slug}", fetch)


def get_page_views() -> list[dict]:
    def fetch():
        props = _get_property_ids()
        portfolio_id = props["portfolio"]
        if not portfolio_id:
            return []

        rows = _run_report(portfolio_id, ["screenPageViews"], dimensions=["pagePath"])
        art_blog_paths = ["/art/", "/blog/"]
        results = []
        for row in rows:
            path = row["pagePath"]
            if any(path.startswith(p) for p in art_blog_paths):
                results.append({"path": path, "views_30d": int(row["screenPageViews"])})
        return results

    return _cached("page_views", fetch)
```

- [ ] **Step 3: Create `backend/blog.py`**

```python
import os
import math
import frontmatter
import markdown

BLOG_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "blog")


def _parse_post(filepath: str) -> dict | None:
    try:
        post = frontmatter.load(filepath)
    except Exception:
        return None

    slug = os.path.splitext(os.path.basename(filepath))[0]
    content = post.content
    word_count = len(content.split())
    read_time = f"{max(1, math.ceil(word_count / 200))} min"

    return {
        "slug": slug,
        "title": post.get("title", slug),
        "date": str(post.get("date", "")),
        "description": post.get("description", ""),
        "read_time": read_time,
        "tags": post.get("tags", []),
        "content_md": content,
    }


def list_posts() -> list[dict]:
    if not os.path.isdir(BLOG_DIR):
        return []

    posts = []
    for fname in os.listdir(BLOG_DIR):
        if not fname.endswith(".md"):
            continue
        filepath = os.path.join(BLOG_DIR, fname)
        parsed = _parse_post(filepath)
        if parsed:
            meta = {k: v for k, v in parsed.items() if k != "content_md"}
            posts.append(meta)

    posts.sort(key=lambda p: p["date"], reverse=True)
    return posts


def get_post(slug: str) -> dict | None:
    filepath = os.path.join(BLOG_DIR, f"{slug}.md")
    if not os.path.isfile(filepath):
        return None

    parsed = _parse_post(filepath)
    if not parsed:
        return None

    content_html = markdown.markdown(
        parsed.pop("content_md"),
        extensions=["fenced_code", "tables", "toc"],
    )
    parsed["content_html"] = content_html
    return parsed
```

- [ ] **Step 4: Rewrite `backend/main.py`**

Replace the entire contents of `backend/main.py`:

```python
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://worthyrae.com",
        "https://www.worthyrae.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def health():
    return {"status": "ok"}


@app.get("/api/analytics/overview")
async def analytics_overview():
    from analytics import get_overview
    return get_overview()


@app.get("/api/analytics/projects")
async def analytics_projects():
    from analytics import get_project_analytics
    return {"projects": get_project_analytics()}


@app.get("/api/analytics/project/{slug}")
async def analytics_project_detail(slug: str):
    from analytics import get_project_detail
    return get_project_detail(slug)


@app.get("/api/analytics/pages")
async def analytics_pages():
    from analytics import get_page_views
    return {"pages": get_page_views()}


@app.get("/api/blog")
async def blog_list():
    from blog import list_posts
    return {"posts": list_posts()}


@app.get("/api/blog/{slug}")
async def blog_detail(slug: str):
    from blog import get_post
    post = get_post(slug)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
```

- [ ] **Step 5: Create empty blog directory**

```bash
mkdir -p /Users/worthy/TestCode/personal/blog
touch /Users/worthy/TestCode/personal/blog/.gitkeep
```

- [ ] **Step 6: Commit**

```bash
git add backend/ blog/.gitkeep
git commit -m "feat: expand backend with multi-property GA4 analytics and blog API"
```

---

## Task 4: Dashboard UI — Sparkline, Hero, StatsTicker

**Files:**
- Create: `src/components/Dashboard/Sparkline.tsx`
- Create: `src/components/Dashboard/Hero.tsx`
- Create: `src/components/Dashboard/StatsTicker.tsx`

- [ ] **Step 1: Create Sparkline component**

Create `src/components/Dashboard/Sparkline.tsx`:

```tsx
interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}

export default function Sparkline({ data, color = '#00aaff', width = 80, height = 24 }: SparklineProps) {
  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const padding = 2;

  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = padding + ((max - val) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
    </svg>
  );
}
```

- [ ] **Step 2: Create Hero component**

Create `src/components/Dashboard/Hero.tsx`:

```tsx
import { Link } from 'react-router-dom';
import ContactForm from '@/components/global/ContactForm';

export default function Hero() {
  return (
    <section className="relative min-h-[70vh] flex items-end overflow-hidden">
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover hidden md:block"
      >
        <source
          src="https://portfolio-worthy.s3.amazonaws.com/livestream-demo.mp4"
          type="video/mp4"
        />
      </video>
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover md:hidden"
      >
        <source
          src="https://portfolio-worthy.s3.amazonaws.com/ai-architecture-demo.mp4"
          type="video/mp4"
        />
      </video>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#08080c]/30 via-transparent to-[#08080c]" />

      {/* Nav */}
      <nav className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-4">
        <Link to="/" className="font-mono text-sm font-bold text-white tracking-widest">WR</Link>
        <div className="hidden md:flex items-center gap-6 font-mono text-xs">
          <a href="#websites" className="text-cyber-cyan hover:opacity-80 transition-opacity">websites</a>
          <a href="#art" className="text-cyber-magenta hover:opacity-80 transition-opacity">art</a>
          <a href="#blog" className="text-cyber-amber hover:opacity-80 transition-opacity">blog</a>
          <ContactForm compact />
        </div>
      </nav>

      {/* Hero content */}
      <div className="relative z-10 w-full flex items-end justify-between px-6 pb-10">
        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-none">
            WORTHY RAE
          </h1>
          <p className="font-mono text-xs text-white/40 tracking-[0.25em] mt-2">
            ENGINEER · ARTIST · BUILDER
          </p>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <a
            href="https://portfolio-worthy.s3.amazonaws.com/Worthy_Rae_Resume.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-white/10 border border-white/20 rounded text-white font-mono text-xs hover:bg-white/20 transition-colors"
          >
            RESUME ↓
          </a>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Create StatsTicker component**

Create `src/components/Dashboard/StatsTicker.tsx`:

```tsx
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
```

- [ ] **Step 4: Commit**

```bash
git add src/components/Dashboard/
git commit -m "feat: add Sparkline, Hero, and StatsTicker dashboard components"
```

---

## Task 5: Dashboard UI — ProjectCard, ArtCard, Panels

**Files:**
- Create: `src/components/Dashboard/ProjectCard.tsx`
- Create: `src/components/Dashboard/ArtCard.tsx`
- Create: `src/components/Dashboard/WebsitesPanel.tsx`
- Create: `src/components/Dashboard/ArtPanel.tsx`
- Create: `src/components/Dashboard/BlogPanel.tsx`

- [ ] **Step 1: Create ProjectCard**

Create `src/components/Dashboard/ProjectCard.tsx`:

```tsx
import { Link } from 'react-router-dom';
import Sparkline from './Sparkline';

interface ProjectCardProps {
  slug: string;
  title: string;
  description: string;
  mediaUrl: string;
  mediaType: 'video' | 'image';
  views: number;
  sparkline: number[];
  tags: string[];
  link: string;
}

export default function ProjectCard({
  title, description, mediaUrl, mediaType, views, sparkline, tags, link,
}: ProjectCardProps) {
  return (
    <Link
      to={link}
      className="block bg-white/[0.02] border border-cyber-cyan/10 rounded-md overflow-hidden hover:border-cyber-cyan/30 transition-colors group"
    >
      <div className="h-40 bg-gradient-to-br from-[#0a1628] to-[#0f2440] overflow-hidden">
        {mediaType === 'video' ? (
          <video
            src={mediaUrl}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <img
            src={mediaUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">{title}</h3>
          <span className="text-[10px] font-mono text-cyber-green">● live</span>
        </div>
        <p className="text-xs text-muted mt-1">{description}</p>
        <div className="mt-3 flex items-center justify-between">
          <div className="font-mono">
            <span className="text-xl font-bold text-cyber-cyan">{views.toLocaleString()}</span>
            <span className="text-[10px] text-cyber-dim ml-1">views</span>
          </div>
          <Sparkline data={sparkline} />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-2 py-0.5 bg-cyber-cyan/10 text-cyber-cyan rounded font-mono"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Create ArtCard**

Create `src/components/Dashboard/ArtCard.tsx`:

```tsx
import { Link } from 'react-router-dom';

interface ArtCardProps {
  title: string;
  description: string;
  imageUrl: string;
  views: number;
  link: string;
}

export default function ArtCard({ title, description, imageUrl, views, link }: ArtCardProps) {
  return (
    <Link
      to={link}
      className="block bg-white/[0.02] border border-cyber-magenta/10 rounded-md overflow-hidden hover:border-cyber-magenta/30 transition-colors group"
    >
      <div className="h-48 overflow-hidden">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </div>
      <div className="p-4">
        <h3 className="text-base font-bold text-white">{title}</h3>
        <p className="text-xs text-muted mt-1">{description}</p>
        <div className="mt-2 font-mono text-xs text-cyber-magenta">
          {views.toLocaleString()} views
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 3: Create WebsitesPanel**

Create `src/components/Dashboard/WebsitesPanel.tsx`:

```tsx
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
```

- [ ] **Step 4: Create ArtPanel**

Create `src/components/Dashboard/ArtPanel.tsx`:

```tsx
import { useFetch } from '@/hooks/useAnalytics';
import { api } from '@/lib/api';
import ArtCard from './ArtCard';

const ART_META = [
  {
    slug: 'ai-architecture',
    title: 'AI Architecture',
    description: 'StyleGAN-generated architectural spaces',
    imageUrl: 'https://portfolio-worthy.s3.amazonaws.com/ai-architecture-hero.png',
    link: '/art/ai-architecture',
  },
  {
    slug: 'livestream-art',
    title: 'Livestream Art',
    description: 'Computer vision Abbey Road transformation',
    imageUrl: 'https://portfolio-worthy.s3.amazonaws.com/livestream-art-hero.png',
    link: '/art/livestream-art',
  },
];

export default function ArtPanel() {
  const { data } = useFetch(api.getPageViews);

  return (
    <section id="art" className="px-6 py-8">
      <div className="flex items-center gap-3 mb-5">
        <span className="font-mono text-[10px] text-cyber-magenta tracking-[0.2em]">■ ART</span>
        <span className="font-mono text-[10px] text-cyber-dim">2 pieces</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ART_META.map((art) => {
          const pageData = data?.pages.find((p) => p.path.includes(art.slug));
          return (
            <ArtCard
              key={art.slug}
              title={art.title}
              description={art.description}
              imageUrl={art.imageUrl}
              views={pageData?.views_30d ?? 0}
              link={art.link}
            />
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Create BlogPanel**

Create `src/components/Dashboard/BlogPanel.tsx`:

```tsx
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
```

- [ ] **Step 6: Commit**

```bash
git add src/components/Dashboard/
git commit -m "feat: add ProjectCard, ArtCard, and section panel components"
```

---

## Task 6: Footer, Home Page, and New Routes

**Files:**
- Create: `src/components/Layout/Footer.tsx`
- Create: `src/pages/Home.tsx`
- Create: `src/pages/ArtPage.tsx`
- Create: `src/pages/BlogPage.tsx`
- Modify: `src/App.tsx`
- Delete: `src/components/projects/CountryDensity.tsx`

- [ ] **Step 1: Install DOMPurify for safe HTML rendering in blog**

```bash
cd /Users/worthy/TestCode/personal && npm install dompurify && npm install -D @types/dompurify
```

- [ ] **Step 2: Create Footer**

Create `src/components/Layout/Footer.tsx`:

```tsx
export default function Footer() {
  return (
    <footer className="border-t border-white/[0.05] px-6 py-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex gap-5 font-mono text-xs text-cyber-dim">
        <a href="https://open.spotify.com/user/worthybrae" target="_blank" rel="noopener noreferrer" className="hover:text-muted transition-colors">
          spotify
        </a>
        <a href="https://linkedin.com/in/worthyrae" target="_blank" rel="noopener noreferrer" className="hover:text-muted transition-colors">
          linkedin
        </a>
        <a href="https://github.com/worthybrae" target="_blank" rel="noopener noreferrer" className="hover:text-muted transition-colors">
          github
        </a>
        <a href="https://letterboxd.com/worthybrae" target="_blank" rel="noopener noreferrer" className="hover:text-muted transition-colors">
          letterboxd
        </a>
      </div>
      <div className="font-mono text-[10px] text-cyber-dim/60">
        powered by GA4 · built with react + fastapi
      </div>
    </footer>
  );
}
```

- [ ] **Step 3: Create Home page**

Create `src/pages/Home.tsx`:

```tsx
import Hero from '@/components/Dashboard/Hero';
import StatsTicker from '@/components/Dashboard/StatsTicker';
import WebsitesPanel from '@/components/Dashboard/WebsitesPanel';
import ArtPanel from '@/components/Dashboard/ArtPanel';
import BlogPanel from '@/components/Dashboard/BlogPanel';
import Footer from '@/components/Layout/Footer';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#08080c]">
      <Hero />
      <StatsTicker />
      <WebsitesPanel />
      <div className="mx-6 h-px bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />
      <ArtPanel />
      <div className="mx-6 h-px bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />
      <BlogPanel />
      <Footer />
    </div>
  );
}
```

- [ ] **Step 4: Create ArtPage**

Create `src/pages/ArtPage.tsx`:

```tsx
import { useParams, Link } from 'react-router-dom';
import AIArchitecture from '@/components/projects/AIArchitecture';
import LivestreamArt from '@/components/projects/LivestreamArt';

const ART_COMPONENTS: Record<string, React.ComponentType> = {
  'ai-architecture': AIArchitecture,
  'livestream-art': LivestreamArt,
};

export default function ArtPage() {
  const { slug } = useParams<{ slug: string }>();
  const Component = slug ? ART_COMPONENTS[slug] : null;

  if (!Component) {
    return (
      <div className="min-h-screen bg-[#08080c] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Not Found</h1>
          <Link to="/" className="text-cyber-cyan font-mono text-sm mt-4 inline-block">← back to dashboard</Link>
        </div>
      </div>
    );
  }

  return <Component />;
}
```

- [ ] **Step 5: Create BlogPage with DOMPurify sanitization**

Create `src/pages/BlogPage.tsx`:

```tsx
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
```

- [ ] **Step 6: Update App.tsx with new routes**

Replace the entire contents of `src/App.tsx`:

```tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from '@/pages/Home';
import Coderview from '@/components/projects/Coderview';
import StreamClout from '@/components/projects/Streamclout';
import ArtPage from '@/pages/ArtPage';
import BlogPage from '@/pages/BlogPage';

function App() {
  return (
    <Router basename="/">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/projects/coderview" element={<Coderview />} />
        <Route path="/projects/streamclout" element={<StreamClout />} />
        <Route path="/art/:slug" element={<ArtPage />} />
        <Route path="/blog/:slug" element={<BlogPage />} />
      </Routes>
    </Router>
  );
}

export default App;
```

- [ ] **Step 7: Delete CountryDensity**

```bash
rm /Users/worthy/TestCode/personal/src/components/projects/CountryDensity.tsx
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add Home, ArtPage, BlogPage, Footer, update routing, remove CountryDensity"
```

---

## Task 7: Update Header for Project/Art Detail Pages

**Files:**
- Modify: `src/components/global/Header.tsx`
- Modify: `src/components/global/PageTemplate.tsx`

The global Header is no longer in App.tsx. Project/art detail pages need their own header.

- [ ] **Step 1: Rewrite Header.tsx**

Replace `src/components/global/Header.tsx` with:

```tsx
import { Link } from 'react-router-dom';
import ContactForm from './ContactForm';

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#08080c]/80 backdrop-blur-md border-b border-white/[0.05]">
      <div className="flex items-center justify-between px-6 py-3">
        <Link to="/" className="font-mono text-sm font-bold text-white tracking-widest hover:text-cyber-cyan transition-colors">
          WR
        </Link>
        <div className="flex items-center gap-6 font-mono text-xs">
          <Link to="/#websites" className="text-cyber-cyan hover:opacity-80 transition-opacity hidden md:inline">
            websites
          </Link>
          <Link to="/#art" className="text-cyber-magenta hover:opacity-80 transition-opacity hidden md:inline">
            art
          </Link>
          <Link to="/#blog" className="text-cyber-amber hover:opacity-80 transition-opacity hidden md:inline">
            blog
          </Link>
          <ContactForm compact />
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Add Header import and render in PageTemplate.tsx**

At the top of `src/components/global/PageTemplate.tsx`, add:

```tsx
import Header from './Header';
```

Then add `<Header />` as the first element in the returned JSX, before the hero section. Also add `pt-12` to the top-level container to account for the fixed header.

- [ ] **Step 3: Commit**

```bash
git add src/components/global/Header.tsx src/components/global/PageTemplate.tsx
git commit -m "feat: update Header with cyberpunk styling, add to PageTemplate"
```

---

## Task 8: Update Project Pages — Remove CountryDensity Refs, Add Stats

**Files:**
- Modify: `src/components/projects/Coderview.tsx`
- Modify: `src/components/projects/Streamclout.tsx`
- Modify: `src/components/projects/AIArchitecture.tsx`
- Modify: `src/components/projects/LivestreamArt.tsx`
- Modify: `src/components/global/PageTemplate.tsx`

- [ ] **Step 1: Remove CountryDensity from relatedProjects in all project files**

In each of the four remaining project files, find the `relatedProjects` array and remove any entry referencing `country-density`. Also update art project links from `/projects/ai-architecture` to `/art/ai-architecture` and `/projects/livestream-art` to `/art/livestream-art`.

- [ ] **Step 2: Add analytics stats header to PageTemplate**

Add a `projectSlug?: string` prop to the `ProjectProps` interface in `src/components/global/PageTemplate.tsx`.

Add these imports at the top:

```tsx
import { useFetch } from '@/hooks/useAnalytics';
import { api } from '@/lib/api';
```

Add a `StatsHeader` sub-component inside the file:

```tsx
function StatsHeader({ slug }: { slug: string }) {
  const { data, loading } = useFetch(() => api.getProjectDetail(slug));

  if (loading || !data) return null;

  return (
    <div className="max-w-3xl mx-auto px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs">
      <div>
        <div className="text-cyber-dim">Views (30d)</div>
        <div className="text-xl font-bold text-cyber-cyan mt-1">{data.views_30d.toLocaleString()}</div>
      </div>
      <div>
        <div className="text-cyber-dim">Unique Visitors</div>
        <div className="text-xl font-bold text-cyber-cyan mt-1">{data.unique_visitors_30d.toLocaleString()}</div>
      </div>
      <div>
        <div className="text-cyber-dim">Avg Session</div>
        <div className="text-xl font-bold text-cyber-cyan mt-1">{data.avg_session_duration}</div>
      </div>
      <div>
        <div className="text-cyber-dim">Top Source</div>
        <div className="text-xl font-bold text-cyber-cyan mt-1">{data.top_sources[0]?.source ?? '—'}</div>
      </div>
    </div>
  );
}
```

Render `{projectSlug && <StatsHeader slug={projectSlug} />}` right after the hero section in the main component.

- [ ] **Step 3: Pass projectSlug from project components**

In `src/components/projects/Coderview.tsx`, add `projectSlug="coderview"` to the MediumStyleProject (or CustomMediumStyleProject) props.

In `src/components/projects/Streamclout.tsx`, add `projectSlug="streamclout"` to the MediumStyleProject props.

- [ ] **Step 4: Commit**

```bash
git add src/components/projects/ src/components/global/PageTemplate.tsx
git commit -m "feat: add analytics stats header, remove CountryDensity references, update art links"
```

---

## Task 9: Cleanup — Title, Deps, Typography Plugin

**Files:**
- Modify: `index.html`
- Modify: `package.json`
- Modify: `tailwind.config.js`

- [ ] **Step 1: Update page title**

In `index.html`, change:
```html
<title>Worthy Rae | Portfolio</title>
```
to:
```html
<title>Worthy Rae</title>
```

- [ ] **Step 2: Remove unused packages**

```bash
cd /Users/worthy/TestCode/personal && npm uninstall @vercel/analytics @supabase/supabase-js
```

- [ ] **Step 3: Install typography plugin**

```bash
npm install @tailwindcss/typography
```

Add to `tailwind.config.js` plugins array:

```js
plugins: [
  require("tailwindcss-animate"),
  require("@tailwindcss/typography"),
],
```

- [ ] **Step 4: Commit**

```bash
git add index.html package.json package-lock.json tailwind.config.js
git commit -m "chore: update title, remove unused deps, add typography plugin"
```

---

## Task 10: Update ContactForm & Environment Config

**Files:**
- Modify: `src/components/global/ContactForm.tsx`
- Modify: `backend/.env.example`

- [ ] **Step 1: Update ContactForm styling for dark theme**

In `src/components/global/ContactForm.tsx`, update the `DialogContent` to include cyberpunk styling:
- Dialog wrapper: add `className="bg-[#0f0f15] border-white/[0.1] text-white"` to `DialogContent`
- Input fields: add `className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-muted"`
- Submit button: `className="bg-cyber-cyan text-black font-mono hover:bg-cyber-cyan/80"`
- Labels: add `className="text-muted font-mono text-xs"`

- [ ] **Step 2: Update .env.example**

Replace `backend/.env.example`:

```
GA4_PROPERTY_ID=your_portfolio_property_id
GA4_CODERVIEW_PROPERTY_ID=your_coderview_property_id
GA4_STREAMCLOUT_PROPERTY_ID=your_streamclout_property_id
```

- [ ] **Step 3: Commit**

```bash
git add src/components/global/ContactForm.tsx backend/.env.example
git commit -m "feat: update ContactForm for cyberpunk theme, update env example"
```

---

## Task 11: Delete Dead Code & Final Build Verification

- [ ] **Step 1: Delete unused VisitorCount component**

```bash
rm /Users/worthy/TestCode/personal/src/components/global/VisitorCount.tsx
```

- [ ] **Step 2: Check for remaining CountryDensity references**

```bash
grep -r "CountryDensity\|country-density\|country_density" /Users/worthy/TestCode/personal/src/ --include="*.tsx" --include="*.ts"
```

Remove any references found.

- [ ] **Step 3: Check for remaining VisitorCount references**

```bash
grep -r "VisitorCount" /Users/worthy/TestCode/personal/src/ --include="*.tsx" --include="*.ts"
```

Remove any imports found.

- [ ] **Step 4: Run full build**

```bash
cd /Users/worthy/TestCode/personal && npm run build
```

Expected: Clean build, no TypeScript errors.

- [ ] **Step 5: Verify backend starts**

```bash
cd /Users/worthy/TestCode/personal/backend && pip install -r requirements.txt && python -c "from blog import list_posts; print(list_posts())"
```

Expected: `[]` (empty list, no errors).

- [ ] **Step 6: Commit cleanup**

```bash
git add -A
git commit -m "chore: remove dead code, verify clean build"
```
