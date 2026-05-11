# Portfolio Redesign: The Dashboard

## Overview

Redesign worthyrae.com from a traditional portfolio into a **live data dashboard** — a cyberpunk-styled command center that presents work across three categories (Websites, Art, Blog) with real-time Google Analytics data pulled from multiple GA4 properties.

The site should feel like a high-end data product: dark, sleek, neon-accented, alive with real numbers.

## Goals

- Restructure content into three clear sections: Websites, Art, Blog
- Surface real GA4 analytics per project (from separate GA4 properties)
- Establish a bold cyberpunk aesthetic that signals taste + technical depth
- Add a blog system (markdown-based, no CMS)
- Remove Country Density project
- Remove Vercel Analytics (redundant)

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS (unchanged)
- **Backend**: FastAPI (Python) — expanded from current single-endpoint setup
- **Analytics**: Google Analytics Data API — three GA4 properties (portfolio, CodeView, StreamClout)
- **Blog**: Markdown files in repo with YAML frontmatter
- **Deployment**: Railway + Docker (unchanged)
- **Charting**: Recharts (already a dependency)

## Color System

| Token       | Hex       | Usage                          |
|-------------|-----------|--------------------------------|
| `bg`        | `#08080c` | Page background                |
| `surface`   | `rgba(255,255,255,0.02)` | Card backgrounds  |
| `border`    | `rgba(255,255,255,0.05)` | Subtle dividers   |
| `cyan`      | `#00aaff` | Websites section accent        |
| `magenta`   | `#ff00aa` | Art section accent             |
| `amber`     | `#ffaa00` | Blog section accent            |
| `green`     | `#00ff88` | Live indicators, positive trends |
| `red`       | `#ff3366` | Negative trends                |
| `text`      | `#e0e0e0` | Primary text                   |
| `muted`     | `#888888` | Secondary text                 |
| `dim`       | `#333333` | Tertiary text, timestamps      |

## Typography

- **Headings**: System sans-serif (or Inter/Geist), bold, tight letter-spacing
- **Data/Labels**: Monospace (JetBrains Mono or system monospace) for counters, stats, tags, nav
- **Body text**: Clean sans-serif, comfortable reading size for blog posts and project descriptions

## Landing Page Layout

Top-to-bottom vertical flow. Single page, no tabs or multi-page navigation needed for the dashboard itself.

### 1. Hero Section

- Full-bleed background video (keep existing desktop/mobile video variants from S3)
- Overlay gradient fading to page background at bottom
- Top nav bar: "WR" logo left, section links right (color-coded: cyan/magenta/amber), contact link
- Bottom-left: "WORTHY RAE" in large bold type + subtitle "ENGINEER · ARTIST · BUILDER"
- Bottom-right: Resume download button + "GET IN TOUCH" button (opens existing Formspree modal)

### 2. Live Stats Ticker

- Thin horizontal bar below hero with green-tinted background
- Left side: green dot + "LIVE", total visitors (30d), weekly visitors with trend arrow and % change
- Right side: project count, post count, last deploy timestamp
- All numbers animate on load (count-up effect)

### 3. Websites Panel

- Section header: cyan "■ WEBSITES" label + project count
- Two project cards in a side-by-side grid (stacks on mobile)
- Each card contains:
  - Screenshot/video preview area (use existing S3 media)
  - Project title + green "● live" badge
  - One-line description
  - **Live view count** (large number) + **30-day sparkline** (small inline chart)
  - Tech stack tags (styled as small pills)
- Cards link to individual project pages

### 4. Art Panel

- Section header: magenta "■ ART" label + piece count
- Two art cards in a side-by-side grid
- Each card contains:
  - Large preview image (use existing S3 media)
  - Title + description
  - View count (from portfolio site GA4, filtered by page path)
- Cards link to individual art pages

### 5. Blog Panel

- Section header: amber "■ BLOG" label + post count
- Empty state: dashed border box with "No posts yet" message
- When posts exist: list of post cards showing title, date, read time, description, view count
- Cards link to individual blog post pages

### 6. Footer

- Social links: Spotify, LinkedIn, GitHub, Letterboxd (monospace style)
- "powered by GA4 · built with react + fastapi" credit line

## Routing

| Path | Page |
|------|------|
| `/` | Dashboard landing page |
| `/projects/:slug` | Individual project deep-dive (CodeView, StreamClout) |
| `/art/:slug` | Individual art piece page (AI Architecture, Livestream Art) |
| `/blog/:slug` | Individual blog post page |

## Individual Project Pages (`/projects/:slug`)

Keep the existing PageTemplate medium-style article layout with these additions:

- **Stats header** at top of page: total views, unique visitors, avg session duration, traffic source breakdown — pulled from that project's own GA4 property
- **30-day traffic chart** below stats header (Recharts area chart)
- Existing content (description, media, tech details) flows below
- Back link to dashboard

## Individual Art Pages (`/art/:slug`)

- Large hero image/video (full-width)
- Title + description
- View count + date
- Leaner than project pages — more visual, less text
- Back link to dashboard

## Individual Blog Pages (`/blog/:slug`)

- Clean markdown-rendered content
- Header: title, date, read time, view count
- Monospace code blocks styled with cyberpunk palette
- Comfortable reading width (~680px max)
- Back link to dashboard

## Backend API

Expand the existing FastAPI backend.

### Endpoints

#### `GET /api/analytics/overview`

Returns aggregate stats for the live ticker.

```json
{
  "total_visitors_30d": 2847,
  "visitors_this_week": 127,
  "weekly_trend_pct": 12.3,
  "project_count": 4,
  "post_count": 0
}
```

Sources data from the portfolio GA4 property.

#### `GET /api/analytics/projects`

Returns per-project analytics by querying each GA4 property.

```json
{
  "projects": [
    {
      "slug": "coderview",
      "views_30d": 1247,
      "sparkline": [45, 52, 38, 61, 55, 48, 72, ...],
      "source": "coderview_ga4"
    },
    {
      "slug": "streamclout",
      "views_30d": 847,
      "sparkline": [32, 28, 41, 35, 44, 39, ...],
      "source": "streamclout_ga4"
    }
  ]
}
```

#### `GET /api/analytics/project/:slug`

Detailed analytics for a single project's GA4 property. Used on individual project pages.

```json
{
  "slug": "coderview",
  "views_30d": 1247,
  "unique_visitors_30d": 892,
  "avg_session_duration": "2m 34s",
  "daily_views": [{"date": "2026-04-08", "views": 45}, ...],
  "top_sources": [{"source": "google", "count": 412}, ...]
}
```

#### `GET /api/analytics/pages`

Returns view counts for art pages and blog posts (from the portfolio GA4 property, filtered by page path).

```json
{
  "pages": [
    {"path": "/art/ai-architecture", "views_30d": 312},
    {"path": "/art/livestream-art", "views_30d": 189},
    {"path": "/blog/first-post", "views_30d": 0}
  ]
}
```

#### `GET /api/blog`

Lists all blog posts (reads markdown files from `blog/` directory).

```json
{
  "posts": [
    {
      "slug": "first-post",
      "title": "My First Post",
      "date": "2026-05-08",
      "description": "Introduction to the blog",
      "read_time": "3 min",
      "tags": ["meta"]
    }
  ]
}
```

#### `GET /api/blog/:slug`

Returns a single blog post's content and metadata.

```json
{
  "slug": "first-post",
  "title": "My First Post",
  "date": "2026-05-08",
  "description": "Introduction to the blog",
  "read_time": "3 min",
  "tags": ["meta"],
  "content_html": "<p>Rendered markdown content...</p>"
}
```

### GA4 Multi-Property Architecture

The backend manages credentials for three GA4 properties:

- **Portfolio** (`GA4_PROPERTY_ID`) — worthyrae.com traffic, used for overview stats and art/blog page views
- **CodeView** (`GA4_CODERVIEW_PROPERTY_ID`) — coderview project analytics
- **StreamClout** (`GA4_STREAMCLOUT_PROPERTY_ID`) — streamclout project analytics

All use the same service account (the service account must be added as a viewer to each GA4 property).

### Caching

All analytics responses are cached in-memory for 5 minutes to avoid hammering the GA4 API. Use a simple dict with TTL — no Redis or external cache needed.

### Blog Post Format

Markdown files in `blog/` directory with YAML frontmatter:

```markdown
---
title: My First Post
date: 2026-05-08
description: Introduction to the blog
tags: [meta]
---

Post content in markdown...
```

The backend reads these files, parses frontmatter with `python-frontmatter`, renders markdown to HTML with `markdown` library, and calculates read time from word count.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GA4_PROPERTY_ID` | Portfolio site GA4 property ID (existing) |
| `GA4_CODERVIEW_PROPERTY_ID` | CodeView GA4 property ID |
| `GA4_STREAMCLOUT_PROPERTY_ID` | StreamClout GA4 property ID |
| `GOOGLE_CREDENTIALS` | Service account JSON (existing, used for all three properties) |
| `PORT` | Railway port (existing) |

## What Gets Removed

- Country Density project page and all references
- `@vercel/analytics` package and Analytics component
- Current landing page featured projects scroll layout
- Current visitor count widget (replaced by live stats ticker)

## Mobile Responsive Behavior

- Hero video uses existing mobile variant
- Stats ticker wraps to two lines
- Project/art card grids stack to single column
- Nav links collapse to a hamburger or minimal layout
- Sparklines still render but smaller

## File Structure Changes

```
src/
  components/
    Dashboard/
      Hero.tsx              — Video hero with overlay
      StatsTicker.tsx       — Live stats bar
      WebsitesPanel.tsx     — Websites section
      ArtPanel.tsx          — Art section
      BlogPanel.tsx         — Blog section
      ProjectCard.tsx       — Reusable project card with sparkline
      ArtCard.tsx           — Art preview card
      BlogPostCard.tsx      — Blog post list item
      Sparkline.tsx         — Small inline chart component
    Layout/
      Header.tsx            — Updated nav (replaces current)
      Footer.tsx            — New footer
    Blog/
      BlogPost.tsx          — Individual blog post renderer
  pages/
    Home.tsx                — Dashboard landing (replaces current LandingPage)
    ProjectPage.tsx         — Enhanced with stats header
    ArtPage.tsx             — New art detail page
    BlogPage.tsx            — Individual blog post page
  hooks/
    useAnalytics.ts         — Fetch and cache analytics data
  lib/
    api.ts                  — API client for backend endpoints
  types/
    analytics.ts            — TypeScript types for API responses
backend/
  main.py                   — Expanded FastAPI app
  analytics.py              — GA4 multi-property query logic + caching
  blog.py                   — Blog post reading/parsing
blog/                       — Markdown blog posts directory
```
