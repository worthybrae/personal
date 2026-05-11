# Personal Dashboard Redesign — Single Page with Terrain-Native UI

## Overview

Replace the current multi-page portfolio (separate /apps, /art, /blog routes) with a single-page dashboard. The ASCII terrain animation is the persistent global background. Content lives in a tabbed panel that snaps into view on scroll — styled in the terrain's visual language (monospace, box-drawing characters, ASCII data viz, color-synced accents).

## Page Structure

Two snap-scroll sections on a single page:

### Section 1 — Hero (100vh)

Full-viewport ASCII terrain with "WORTHY RAE" name mask, exactly as it exists today. No changes to the hero. A subtle scroll indicator (↓ or similar) hints that content exists below.

### Section 2 — Content (100vh, snap-scrolls into view)

A tab bar at the top with four tabs: `[ OVERVIEW ]` `[ WEBSITES ]` `[ ART ]` `[ BLOG ]`. The active tab's content renders below in a scrollable panel. The terrain continues behind everything — content has semi-transparent backgrounds that let the terrain show through at the edges.

CSS `scroll-snap-type: y mandatory` on the page container. Each section is `scroll-snap-align: start` with `height: 100vh`.

## Global Terrain Canvas

One single canvas element renders the ASCII terrain for the entire page. It is `position: fixed` covering the full viewport. Both the hero section and the content section sit on top of it via z-index.

The terrain uses the existing `useTerrainAnimation` hook with `showNameMask: true`. The name mask ("WORTHY RAE") renders at all times — it's part of the terrain's identity and remains visible behind the semi-transparent content layer when scrolled to section 2. This is intentional: the terrain is one continuous living surface.

The terrain runs at the hero's current settings: `speedDivisor: 4000`, `contrast: 8`. No need for a slower variant since it's one continuous canvas.

## Tab Bar

Styled as terminal brackets in monospace:

```
[ OVERVIEW ]  [ WEBSITES ]  [ ART ]  [ BLOG ]
```

- Active tab: text glows with its accent color, bracket borders become visible, subtle background tint
- Inactive tabs: muted gray text, dim brackets
- Font: same monospace family as terrain (`JetBrains Mono` / `Courier New`)
- Tab state managed in React (`useState`), no URL routing
- On mobile: tabs are horizontally scrollable if they overflow

### Tab Accent Colors

- OVERVIEW: cyber-cyan (`#06b6d4`)
- WEBSITES: cyber-cyan (`#06b6d4`)
- ART: cyber-magenta (`#d946ef`)
- BLOG: cyber-amber (`#eab308`)

## Tab: OVERVIEW

A combined dashboard showing stats, music, and films. Content arranged vertically, not in a rigid card grid. Elements float against the terrain with minimal borders.

### Stats Block

- **Total MAU**: Large monospace number with subtle text-shadow glow. Trend percentage below (green ▲ / red ▼).
- **Per-project breakdown**: ASCII horizontal bar chart using `█` and `░` characters. Each project on its own line: name, bar, count.
- **7-day sparkline**: Character sparkline using `▁▂▃▄▅▆▇█` below the bar chart.

Data source: existing `/api/analytics/overview` and `/api/analytics/projects` endpoints.

### Spotify — Now Playing

A spinning vinyl record rendered in CSS:
- Concentric rings (CSS `radial-gradient`) simulating record grooves
- Center circle can display album art (small, circular crop) or a simple dot
- Record spins via CSS `animation: spin 3s linear infinite` when music is playing, stops when paused
- Adjacent text: "NOW PLAYING" label (green, small caps), track title (white, bold), artist name (muted)
- Below: progress bar using `▓` (elapsed) and `░` (remaining) characters with timestamps
- If nothing is playing: show "OFFLINE" or last played track with record stopped

Data source: new `/api/spotify/now-playing` endpoint.

### Letterboxd — Recently Watched

A horizontal film strip:
- 3-5 recent films displayed as small poster rectangles in a row
- Film strip border on top and bottom (solid lines)
- Sprocket holes rendered as small squares (`◻`) on the edges of the strip
- Each poster shows: film title (small text) and star rating (★★★★½) at the bottom
- Posters have a dark gradient background; if poster images are available from Letterboxd, display them
- CRT scanline overlay (optional CSS effect) on the poster images

Data source: new `/api/letterboxd/recent` endpoint (parses RSS feed).

## Tab: WEBSITES

Vertical list of project entries, each rendered with box-drawing characters:

```
┌──────────────────────────────────────┐
│ CodeView ····················· ▲ 12% │
│ AI-powered career development        │
│                                      │
│ visitors 892   7d ▁▂▃▂▅▆█           │
│ coderview.io →                       │
└──────────────────────────────────────┘
```

Each project shows:
- **Name** (white, bold) with dot-leader to trend arrow (green ▲ up / red ▼ down)
- **Description** (muted gray, one line)
- **Visitor count** (white) with **7-day ASCII sparkline** (cyan)
- **External link** (cyan, → suffix)

Box borders drawn with `┌─┐│└─┘` characters in dark gray (`#444`). Content inside uses the terrain's monospace font.

Data source: existing `/api/analytics/projects` endpoint for stats. Project metadata (name, description, URL) is hardcoded:
- CodeView — AI-powered career development platform — coderview.io
- StreamClout — Real-time Spotify streaming analytics — streamclout.com

## Tab: ART

Vertical list of art pieces, each with inline video in an ASCII frame:

```
┌──────────────────────────────────────┐
│ ┌──────────────────────────────────┐ │
│ │         ▶ video plays here       │ │
│ │        (scanline overlay)        │ │
│ └──────────────────────────────────┘ │
│ AI Architecture                      │
│ StyleGAN-generated architectural     │
│ spaces — neural networks dreaming    │
│ of buildings                         │
└──────────────────────────────────────┘
```

Each art piece shows:
- **Inline video** (autoplay, muted, loop, playsInline) with a CRT scanline overlay (CSS `repeating-linear-gradient` of thin semi-transparent black lines)
- **Title** (white, bold)
- **Description** (muted gray, 2-3 lines)

Magenta (`#d946ef`) accent for box borders. Video frames are nested box-drawing borders.

Art pieces (hardcoded metadata):
- AI Architecture — StyleGAN-generated architectural spaces — video: S3 URL
- Livestream Art — Computer vision Abbey Road transformation — video: S3 URL

## Tab: BLOG

Vertical list of blog post entries:

```
┌──────────────────────────────────────┐
│ 2026-05-08 ·························│
│ Building a Terrain Engine            │
│ How I built an ASCII terrain         │
│ renderer with Perlin noise...        │
│ read →  4 min                        │
└──────────────────────────────────────┘
```

Each post shows:
- **Date** (amber, small) with dot-leader fill
- **Title** (white, bold)
- **Description** (muted gray, 2 lines)
- **"read →"** link (amber) with read time (muted)

Amber (`#eab308`) accent for box borders. Clicking a post navigates to `/blog/:slug` — the blog detail page renders with the terrain background (using TerrainLayout, which already exists).

Data source: existing `/api/blog` endpoint.

## Visual Design Principles

- **Everything is monospace** — `JetBrains Mono`, `Courier New`, monospace. Same font family as the terrain characters.
- **Box-drawing borders** — `┌─┐│└─┘` instead of CSS `border`. Rendered as text content, not CSS borders. Dark gray (`#444`) for inactive, accent-colored for active/hovered.
- **ASCII data visualization** — bar charts (`█████░░░░`), sparklines (`▁▂▃▅█`), progress bars (`▓▓▓▓░░░`). No SVG or Canvas charts.
- **Content backgrounds** — semi-transparent dark (`rgba(8,8,12,0.75)`) with `backdrop-filter: blur(8px)`. Content fades into the terrain at boundaries rather than hard card edges.
- **Accent colors pulse** — subtle CSS animation that shifts opacity or brightness on accent-colored elements, synced to a slow rhythm (not necessarily synced to terrain palette cycle, which would require coupling canvas and DOM).
- **Numbers count up** — MAU and visitor counts animate from 0 to their value on first reveal (simple JS counter, ~1s duration).
- **Hover states** — box borders brighten to accent color on hover. Links gain a subtle glow.

## New Backend Endpoints

### `GET /api/spotify/now-playing`

Returns the currently playing track or the most recently played track.

Response:
```json
{
  "is_playing": true,
  "track": "Midnight City",
  "artist": "M83",
  "album": "Hurry Up, We're Dreaming",
  "album_art_url": "https://i.scdn.co/image/...",
  "progress_ms": 154000,
  "duration_ms": 242000
}
```

Implementation: Use Spotify Web API with client credentials flow + user authorization. Requires a one-time OAuth flow to get a refresh token. The backend stores the refresh token and uses it to get access tokens for the `/v1/me/player/currently-playing` endpoint. Falls back to `/v1/me/player/recently-played` if nothing is playing.

Cache: 30-second TTL (don't poll Spotify too aggressively).

### `GET /api/spotify/top-tracks`

Returns top 5 recently played tracks.

Response:
```json
{
  "tracks": [
    { "track": "Song Name", "artist": "Artist", "album_art_url": "..." },
    ...
  ]
}
```

Implementation: Spotify `/v1/me/top/tracks?time_range=short_term&limit=5` endpoint.

Cache: 5-minute TTL.

### `GET /api/letterboxd/recent`

Returns last 5 films from Letterboxd RSS feed.

Response:
```json
{
  "films": [
    {
      "title": "Anora",
      "year": 2024,
      "rating": 4.0,
      "url": "https://letterboxd.com/stingray7/film/anora/",
      "poster_url": "https://...",
      "watched_date": "2026-05-09"
    },
    ...
  ]
}
```

Implementation: Parse RSS feed at `https://letterboxd.com/stingray7/rss/`. Extract film entries, parse title/year/rating from the feed items. For poster images, scrape the `<description>` field which contains an `<img>` tag, or use TMDB API as fallback.

Cache: 15-minute TTL.

## Routing Changes

**Keep:**
- `/` — single page (hero + tabbed content)
- `/blog/:slug` — blog detail page (wrapped in TerrainLayout)

**Remove:**
- `/apps` — content now in WEBSITES tab
- `/art` — content now in ART tab
- `/blog` (list page) — content now in BLOG tab

**Remove files:**
- `src/pages/AppsPage.tsx`
- `src/pages/ArtListPage.tsx`
- `src/pages/BlogListPage.tsx`

**Update:**
- `src/App.tsx` — remove `/apps`, `/art`, `/blog` routes
- `src/components/global/Header.tsx` — remove nav links (or remove Header entirely since navigation is now via tabs)

## Component Structure

```
src/
  components/
    Dashboard/
      AsciiHero.tsx            — remove: canvas moves to Home.tsx as global element
      useTerrainAnimation.ts   — existing (no changes)
      color.ts                 — existing (no changes)
      noise.ts                 — existing (no changes)
      TabBar.tsx               — new: [ OVERVIEW ] [ WEBSITES ] ... navigation
      TabPanel.tsx             — new: container for tab content, scrollable
      OverviewPanel.tsx        — new: stats + spotify + letterboxd
      WebsitesPanel.tsx        — new: project list with ASCII borders
      ArtPanel.tsx             — new: art pieces with video + scanlines
      BlogPanel.tsx            — new: blog post list with ASCII borders
      SpotifyRecord.tsx        — new: spinning vinyl record component
      FilmStrip.tsx            — new: letterboxd film strip component
      AsciiBox.tsx             — new: reusable box-drawing border wrapper
      AsciiChart.tsx           — new: ASCII bar chart + sparkline renderer
    Layout/
      TerrainLayout.tsx        — existing (used by /blog/:slug)
  pages/
    Home.tsx                   — update: hero section + content section + global canvas
    BlogPage.tsx               — existing (no changes)
  lib/
    api.ts                     — update: add spotify + letterboxd endpoints
  types/
    analytics.ts               — update: add spotify + letterboxd types
  hooks/
    useAnalytics.ts            — existing (reuse for all data fetching)
```

## Mobile Considerations

- Tab bar scrolls horizontally with `-webkit-overflow-scrolling: touch`
- Content panels stack vertically, full width
- Spotify record scales to ~80px diameter on small screens
- Film strip shows 3 films instead of 5
- Box-drawing borders use full width, text wraps naturally within
- Snap scroll works the same — swipe up from hero to content
- Terrain runs at mobile-optimized settings (existing: capped DPR, throttled frame rate)
