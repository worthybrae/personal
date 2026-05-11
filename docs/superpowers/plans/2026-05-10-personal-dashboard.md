# Personal Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the multi-page portfolio with a single-page dashboard featuring snap-scroll from hero to tabbed content (Overview/Websites/Art/Blog), with terrain-native ASCII UI, spinning Spotify vinyl, and Letterboxd film strip.

**Architecture:** One global fixed canvas renders the ASCII terrain. The page has two snap-scroll sections: hero (100vh) and content (100vh). Content uses React tab state (no routing) with four panels. Three new backend endpoints serve Spotify now-playing, Spotify top tracks, and Letterboxd recent films. All UI uses monospace fonts, box-drawing characters, and ASCII data visualization.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, FastAPI, Spotify Web API, Letterboxd RSS, existing GA4 analytics

**Spec:** `docs/superpowers/specs/2026-05-10-personal-dashboard-design.md`

---

## File Structure

### Backend (new files)

| File | Responsibility |
|------|---------------|
| `backend/spotify.py` | Spotify API client — OAuth token management, now-playing, top tracks |
| `backend/letterboxd.py` | Letterboxd RSS parser — fetch and parse recent films |

### Backend (modified files)

| File | Change |
|------|--------|
| `backend/main.py` | Add 3 new endpoints: `/api/spotify/now-playing`, `/api/spotify/top-tracks`, `/api/letterboxd/recent` |
| `backend/requirements.txt` | Add `spotipy` and `feedparser` dependencies |

### Frontend (new files)

| File | Responsibility |
|------|---------------|
| `src/components/Dashboard/TabBar.tsx` | Terminal-style `[ TAB ]` navigation with accent colors |
| `src/components/Dashboard/OverviewPanel.tsx` | Stats + Spotify + Letterboxd combined view |
| `src/components/Dashboard/WebsitesPanel.tsx` | Project list with ASCII borders and live stats |
| `src/components/Dashboard/ArtPanel.tsx` | Art pieces with video and CRT scanline overlay |
| `src/components/Dashboard/BlogPanel.tsx` | Blog post list with ASCII borders |
| `src/components/Dashboard/SpotifyRecord.tsx` | Spinning vinyl record with now-playing info |
| `src/components/Dashboard/FilmStrip.tsx` | Letterboxd film strip with sprocket holes |
| `src/components/Dashboard/AsciiBox.tsx` | Reusable box-drawing character border wrapper |
| `src/components/Dashboard/AsciiChart.tsx` | ASCII bar chart and sparkline renderer |
| `src/components/Dashboard/ContentSection.tsx` | The snap-scroll content section (tabs + active panel) |

### Frontend (modified files)

| File | Change |
|------|--------|
| `src/pages/Home.tsx` | Restructure: global fixed canvas + hero section + content section with snap scroll |
| `src/App.tsx` | Remove `/apps`, `/art`, `/blog` routes; keep `/` and `/blog/:slug` |
| `src/lib/api.ts` | Add `getSpotifyNowPlaying`, `getSpotifyTopTracks`, `getLetterboxdRecent` |
| `src/types/analytics.ts` | Add `SpotifyNowPlaying`, `SpotifyTopTracks`, `LetterboxdFilm` types |

### Frontend (delete files)

| File | Reason |
|------|--------|
| `src/pages/AppsPage.tsx` | Content moved to WebsitesPanel tab |
| `src/pages/ArtListPage.tsx` | Content moved to ArtPanel tab |
| `src/pages/BlogListPage.tsx` | Content moved to BlogPanel tab |
| `src/components/Dashboard/AsciiHero.tsx` | Canvas moves to Home.tsx as global element |
| `src/components/global/Header.tsx` | Navigation now via tab bar, no header needed |

---

## Task 1: Spotify Backend Integration

**Files:**
- Create: `backend/spotify.py`
- Modify: `backend/main.py`
- Modify: `backend/requirements.txt`

- [ ] **Step 1: Add dependencies to requirements.txt**

Add `spotipy` and `httpx` to `backend/requirements.txt`:

```
spotipy==2.24.0
httpx==0.28.1
```

Run: `cd /Users/worthy/TestCode/personal/backend && pip install -r requirements.txt`

- [ ] **Step 2: Create `backend/spotify.py`**

```python
import os
import time
import spotipy
from spotipy.oauth2 import SpotifyOAuth

# ---------------------------------------------------------------------------
# Cache
# ---------------------------------------------------------------------------
_cache: dict = {}
_NOW_PLAYING_TTL = 30  # seconds
_TOP_TRACKS_TTL = 300  # 5 minutes


def _cached(key: str, ttl: int, fn):
    now = time.time()
    entry = _cache.get(key)
    if entry and now - entry["ts"] < ttl:
        return entry["val"]
    val = fn()
    _cache[key] = {"val": val, "ts": now}
    return val


# ---------------------------------------------------------------------------
# Spotify client
# ---------------------------------------------------------------------------
_sp: spotipy.Spotify | None = None


def _get_client() -> spotipy.Spotify:
    global _sp
    if _sp is None:
        auth_manager = SpotifyOAuth(
            client_id=os.getenv("SPOTIFY_CLIENT_ID", ""),
            client_secret=os.getenv("SPOTIFY_CLIENT_SECRET", ""),
            redirect_uri=os.getenv("SPOTIFY_REDIRECT_URI", "http://localhost:8000/api/spotify/callback"),
            scope="user-read-currently-playing user-read-recently-played user-top-read",
            cache_path=os.path.join(os.path.dirname(__file__), ".spotify_cache"),
        )
        _sp = spotipy.Spotify(auth_manager=auth_manager)
    return _sp


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_now_playing() -> dict:
    return _cached("now_playing", _NOW_PLAYING_TTL, _get_now_playing_impl)


def _get_now_playing_impl() -> dict:
    sp = _get_client()

    try:
        current = sp.current_user_playing_track()
        if current and current.get("item"):
            item = current["item"]
            album_images = item.get("album", {}).get("images", [])
            return {
                "is_playing": current.get("is_playing", False),
                "track": item.get("name", ""),
                "artist": ", ".join(a["name"] for a in item.get("artists", [])),
                "album": item.get("album", {}).get("name", ""),
                "album_art_url": album_images[0]["url"] if album_images else "",
                "progress_ms": current.get("progress_ms", 0),
                "duration_ms": item.get("duration_ms", 0),
            }
    except Exception:
        pass

    # Fallback: most recently played
    try:
        recent = sp.current_user_recently_played(limit=1)
        items = recent.get("items", [])
        if items:
            item = items[0]["track"]
            album_images = item.get("album", {}).get("images", [])
            return {
                "is_playing": False,
                "track": item.get("name", ""),
                "artist": ", ".join(a["name"] for a in item.get("artists", [])),
                "album": item.get("album", {}).get("name", ""),
                "album_art_url": album_images[0]["url"] if album_images else "",
                "progress_ms": 0,
                "duration_ms": item.get("duration_ms", 0),
            }
    except Exception:
        pass

    return {
        "is_playing": False,
        "track": "",
        "artist": "",
        "album": "",
        "album_art_url": "",
        "progress_ms": 0,
        "duration_ms": 0,
    }


def get_top_tracks() -> dict:
    return _cached("top_tracks", _TOP_TRACKS_TTL, _get_top_tracks_impl)


def _get_top_tracks_impl() -> dict:
    sp = _get_client()

    try:
        results = sp.current_user_top_tracks(limit=5, time_range="short_term")
        tracks = []
        for item in results.get("items", []):
            album_images = item.get("album", {}).get("images", [])
            tracks.append({
                "track": item.get("name", ""),
                "artist": ", ".join(a["name"] for a in item.get("artists", [])),
                "album_art_url": album_images[0]["url"] if album_images else "",
            })
        return {"tracks": tracks}
    except Exception:
        return {"tracks": []}
```

- [ ] **Step 3: Add Spotify endpoints to `backend/main.py`**

Add these endpoints after the existing blog endpoints in `backend/main.py`:

```python
@app.get("/api/spotify/now-playing")
async def spotify_now_playing():
    from spotify import get_now_playing
    return get_now_playing()


@app.get("/api/spotify/top-tracks")
async def spotify_top_tracks():
    from spotify import get_top_tracks
    return get_top_tracks()


@app.get("/api/spotify/callback")
async def spotify_callback(code: str):
    """One-time OAuth callback to capture refresh token."""
    from spotify import _get_client
    _get_client()  # triggers token exchange
    return {"status": "authenticated"}
```

- [ ] **Step 4: Verify backend starts**

Run: `cd /Users/worthy/TestCode/personal/backend && python -c "from spotify import get_now_playing; print('import ok')"`
Expected: `import ok` (no import errors)

- [ ] **Step 5: Commit**

```bash
git add backend/spotify.py backend/main.py backend/requirements.txt
git commit -m "feat: add Spotify now-playing and top-tracks backend endpoints"
```

---

## Task 2: Letterboxd Backend Integration

**Files:**
- Create: `backend/letterboxd.py`
- Modify: `backend/main.py`
- Modify: `backend/requirements.txt`

- [ ] **Step 1: Add feedparser to requirements.txt**

Add to `backend/requirements.txt`:

```
feedparser==6.0.11
```

Run: `cd /Users/worthy/TestCode/personal/backend && pip install feedparser`

- [ ] **Step 2: Create `backend/letterboxd.py`**

```python
import re
import time
import feedparser

# ---------------------------------------------------------------------------
# Cache
# ---------------------------------------------------------------------------
_cache: dict = {}
_CACHE_TTL = 900  # 15 minutes

LETTERBOXD_RSS = "https://letterboxd.com/stingray7/rss/"


def _cached(key: str, fn):
    now = time.time()
    entry = _cache.get(key)
    if entry and now - entry["ts"] < _CACHE_TTL:
        return entry["val"]
    val = fn()
    _cache[key] = {"val": val, "ts": now}
    return val


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_recent_films() -> dict:
    return _cached("recent_films", _get_recent_films_impl)


def _get_recent_films_impl() -> dict:
    try:
        feed = feedparser.parse(LETTERBOXD_RSS)
        films = []

        for entry in feed.entries[:5]:
            title_raw = entry.get("title", "")
            # Letterboxd RSS titles are like "Film Name, 2024 - ★★★★"
            title = title_raw
            year = None
            rating = 0.0

            # Extract year
            year_match = re.search(r",\s*(\d{4})", title_raw)
            if year_match:
                year = int(year_match.group(1))
                title = title_raw[:year_match.start()].strip()

            # Extract star rating
            star_match = re.search(r"[★½]+", title_raw)
            if star_match:
                stars = star_match.group(0)
                rating = stars.count("★") + (0.5 if "½" in stars else 0.0)

            # Extract poster URL from description HTML
            poster_url = ""
            description = entry.get("summary", "")
            img_match = re.search(r'<img\s+src="([^"]+)"', description)
            if img_match:
                poster_url = img_match.group(1)

            # Extract watched date
            watched_date = ""
            if hasattr(entry, "published"):
                watched_date = entry.published[:10] if len(entry.published) >= 10 else entry.published

            films.append({
                "title": title,
                "year": year,
                "rating": rating,
                "url": entry.get("link", ""),
                "poster_url": poster_url,
                "watched_date": watched_date,
            })

        return {"films": films}
    except Exception:
        return {"films": []}
```

- [ ] **Step 3: Add Letterboxd endpoint to `backend/main.py`**

Add after the Spotify endpoints:

```python
@app.get("/api/letterboxd/recent")
async def letterboxd_recent():
    from letterboxd import get_recent_films
    return get_recent_films()
```

- [ ] **Step 4: Test the Letterboxd endpoint**

Run: `cd /Users/worthy/TestCode/personal/backend && python -c "from letterboxd import get_recent_films; import json; print(json.dumps(get_recent_films(), indent=2))"`
Expected: JSON with `films` array containing entries from the RSS feed (titles, ratings, poster URLs)

- [ ] **Step 5: Commit**

```bash
git add backend/letterboxd.py backend/main.py backend/requirements.txt
git commit -m "feat: add Letterboxd recent films backend endpoint via RSS"
```

---

## Task 3: Frontend Types and API Client

**Files:**
- Modify: `src/types/analytics.ts`
- Modify: `src/lib/api.ts`

- [ ] **Step 1: Add Spotify and Letterboxd types to `src/types/analytics.ts`**

Append to the end of the file:

```typescript
export interface SpotifyNowPlaying {
  is_playing: boolean;
  track: string;
  artist: string;
  album: string;
  album_art_url: string;
  progress_ms: number;
  duration_ms: number;
}

export interface SpotifyTopTracks {
  tracks: {
    track: string;
    artist: string;
    album_art_url: string;
  }[];
}

export interface LetterboxdFilm {
  title: string;
  year: number | null;
  rating: number;
  url: string;
  poster_url: string;
  watched_date: string;
}

export interface LetterboxdRecent {
  films: LetterboxdFilm[];
}
```

- [ ] **Step 2: Add API methods to `src/lib/api.ts`**

Add imports for new types:

```typescript
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
```

Add new methods to the `api` object:

```typescript
export const api = {
  // ... existing methods unchanged ...
  getSpotifyNowPlaying: () => fetchJSON<SpotifyNowPlaying>('/spotify/now-playing'),
  getSpotifyTopTracks: () => fetchJSON<SpotifyTopTracks>('/spotify/top-tracks'),
  getLetterboxdRecent: () => fetchJSON<LetterboxdRecent>('/letterboxd/recent'),
};
```

- [ ] **Step 3: Verify build**

Run: `cd /Users/worthy/TestCode/personal && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add src/types/analytics.ts src/lib/api.ts
git commit -m "feat: add Spotify and Letterboxd types and API methods"
```

---

## Task 4: AsciiBox Component

A reusable component that renders box-drawing character borders around content.

**Files:**
- Create: `src/components/Dashboard/AsciiBox.tsx`

- [ ] **Step 1: Create `src/components/Dashboard/AsciiBox.tsx`**

```tsx
import { type ReactNode } from 'react';

interface AsciiBoxProps {
  children: ReactNode;
  accentColor?: string;
  className?: string;
}

export default function AsciiBox({ children, accentColor = '#444', className = '' }: AsciiBoxProps) {
  return (
    <div
      className={`font-mono text-xs relative group ${className}`}
      style={{ color: accentColor }}
    >
      <div className="transition-colors group-hover:text-current" style={{ color: '#444' }}>
        {/* Top border */}
        <div className="select-none overflow-hidden whitespace-nowrap group-hover:text-[var(--accent)]" style={{ '--accent': accentColor } as React.CSSProperties}>
          ┌{'─'.repeat(60)}┐
        </div>

        {/* Content area */}
        <div className="relative">
          {/* Left border characters */}
          <div className="absolute left-0 top-0 bottom-0 select-none">
            {/* Rendered per-line by content */}
          </div>
          <div className="px-4 py-3 text-white">
            {children}
          </div>
        </div>

        {/* Bottom border */}
        <div className="select-none overflow-hidden whitespace-nowrap">
          └{'─'.repeat(60)}┘
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/worthy/TestCode/personal && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/components/Dashboard/AsciiBox.tsx
git commit -m "feat: add AsciiBox component with box-drawing borders"
```

---

## Task 5: AsciiChart Component

Renders ASCII horizontal bar charts and sparklines.

**Files:**
- Create: `src/components/Dashboard/AsciiChart.tsx`

- [ ] **Step 1: Create `src/components/Dashboard/AsciiChart.tsx`**

```tsx
const SPARK_CHARS = '▁▂▃▄▅▆▇█';

interface SparklineProps {
  data: number[];
  color?: string;
}

export function Sparkline({ data, color = '#06b6d4' }: SparklineProps) {
  if (data.length === 0) return null;
  const max = Math.max(...data, 1);
  const chars = data.map((v) => {
    const idx = Math.round((v / max) * (SPARK_CHARS.length - 1));
    return SPARK_CHARS[idx];
  });

  return (
    <span className="font-mono text-sm tracking-tight" style={{ color }}>
      {chars.join('')}
    </span>
  );
}

interface AsciiBarProps {
  label: string;
  value: number;
  maxValue: number;
  barWidth?: number;
  color?: string;
}

export function AsciiBar({ label, value, maxValue, barWidth = 20, color = '#06b6d4' }: AsciiBarProps) {
  const filled = maxValue > 0 ? Math.round((value / maxValue) * barWidth) : 0;
  const empty = barWidth - filled;

  return (
    <div className="font-mono text-xs flex items-center gap-2">
      <span className="w-24 text-right" style={{ color }}>
        {label}
      </span>
      <span style={{ color }}>
        {'█'.repeat(filled)}{'░'.repeat(empty)}
      </span>
      <span className="text-white/40">{value.toLocaleString()}</span>
    </div>
  );
}

interface CountUpProps {
  value: number;
  className?: string;
}

export function CountUp({ value, className = '' }: CountUpProps) {
  // Simple display — animation can be added via CSS or useEffect later
  return (
    <span className={`font-mono tabular-nums ${className}`}>
      {value.toLocaleString()}
    </span>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/worthy/TestCode/personal && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/components/Dashboard/AsciiChart.tsx
git commit -m "feat: add AsciiChart with sparkline, bar chart, and count-up"
```

---

## Task 6: SpotifyRecord Component

The spinning vinyl record with now-playing info.

**Files:**
- Create: `src/components/Dashboard/SpotifyRecord.tsx`

- [ ] **Step 1: Create `src/components/Dashboard/SpotifyRecord.tsx`**

```tsx
import { useFetch } from '@/hooks/useAnalytics';
import { api } from '@/lib/api';

export default function SpotifyRecord() {
  const { data } = useFetch(() => api.getSpotifyNowPlaying());

  if (!data || !data.track) {
    return (
      <div className="font-mono text-xs text-white/30 py-4">
        <span className="text-[#22c55e]/50 text-[9px] tracking-[2px] uppercase">♪ OFFLINE</span>
      </div>
    );
  }

  const progressPct = data.duration_ms > 0 ? data.progress_ms / data.duration_ms : 0;
  const barLen = 18;
  const filled = Math.round(progressPct * barLen);
  const progressBar = '▓'.repeat(filled) + '░'.repeat(barLen - filled);

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-5">
      {/* Spinning Record */}
      <div
        className={`w-[100px] h-[100px] md:w-[120px] md:h-[120px] rounded-full border-2 border-[#22c55e]/30 flex items-center justify-center ${data.is_playing ? 'animate-[spin_3s_linear_infinite]' : ''}`}
        style={{
          background: `radial-gradient(circle, #111 30%, #0a0e14 31%, #0a0e14 44%, rgba(34,197,94,0.08) 45%, rgba(34,197,94,0.04) 60%, #0a0e14 61%, #0a0e14 74%, rgba(34,197,94,0.06) 75%, rgba(34,197,94,0.02) 90%, #0a0e14 91%)`,
        }}
      >
        {/* Center — album art or dot */}
        <div className="w-9 h-9 rounded-full border border-[#22c55e]/30 overflow-hidden flex items-center justify-center bg-[#1a1a2e]">
          {data.album_art_url ? (
            <img src={data.album_art_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-1 h-1 rounded-full bg-[#22c55e]" />
          )}
        </div>
      </div>

      {/* Track Info */}
      <div className="font-mono">
        <div className="text-[#22c55e] text-[9px] tracking-[2px] uppercase">
          {data.is_playing ? 'NOW PLAYING' : 'LAST PLAYED'}
        </div>
        <div className="text-white text-sm font-bold mt-1.5 max-w-[200px] truncate">
          {data.track}
        </div>
        <div className="text-white/40 text-xs mt-0.5">{data.artist}</div>
        {data.is_playing && (
          <div className="text-white/30 text-[10px] mt-2.5 font-mono">
            <span className="text-[#22c55e]/60">{progressBar}</span>{' '}
            {formatTime(data.progress_ms)} / {formatTime(data.duration_ms)}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/worthy/TestCode/personal && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/components/Dashboard/SpotifyRecord.tsx
git commit -m "feat: add SpotifyRecord component with spinning vinyl and now-playing"
```

---

## Task 7: FilmStrip Component

Letterboxd recent watches as a horizontal film strip.

**Files:**
- Create: `src/components/Dashboard/FilmStrip.tsx`

- [ ] **Step 1: Create `src/components/Dashboard/FilmStrip.tsx`**

```tsx
import { useFetch } from '@/hooks/useAnalytics';
import { api } from '@/lib/api';

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <span className="text-[#f97316] text-[8px]">
      {'★'.repeat(full)}{half ? '½' : ''}
    </span>
  );
}

export default function FilmStrip() {
  const { data } = useFetch(() => api.getLetterboxdRecent());

  if (!data || data.films.length === 0) {
    return (
      <div className="font-mono text-xs text-white/30 py-4">
        <span className="text-[#f97316]/50 text-[9px] tracking-[2px] uppercase">NO RECENT FILMS</span>
      </div>
    );
  }

  const films = data.films.slice(0, 5);

  return (
    <div>
      <div className="text-[#f97316] text-[9px] font-mono tracking-[2px] uppercase mb-3">
        RECENTLY WATCHED
      </div>
      {/* Film strip */}
      <div className="flex items-center justify-start">
        <div className="border-t-[3px] border-b-[3px] border-white/15 py-0.5 flex">
          {/* Left sprockets */}
          <div className="flex flex-col justify-between px-1 select-none">
            <span className="text-white/15 text-[6px] leading-none">◻◻◻</span>
            <span className="text-white/15 text-[6px] leading-none">◻◻◻</span>
          </div>

          {/* Film frames */}
          <div className="flex gap-1.5">
            {films.map((film) => (
              <a
                key={film.url}
                href={film.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-[52px] h-[72px] rounded-sm border border-[#f97316]/20 flex flex-col items-center justify-end p-1 relative overflow-hidden group hover:border-[#f97316]/50 transition-colors"
                style={{
                  background: film.poster_url
                    ? `url(${film.poster_url}) center/cover`
                    : 'linear-gradient(135deg, #2a1a0a, #1a0a00)',
                }}
              >
                {/* CRT scanline overlay */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)',
                  }}
                />
                {/* Info at bottom */}
                <div className="relative z-10 w-full text-center" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
                  <div className="text-[#f97316] text-[7px] truncate font-mono">{film.title}</div>
                  <StarRating rating={film.rating} />
                </div>
              </a>
            ))}
          </div>

          {/* Right sprockets */}
          <div className="flex flex-col justify-between px-1 select-none">
            <span className="text-white/15 text-[6px] leading-none">◻◻◻</span>
            <span className="text-white/15 text-[6px] leading-none">◻◻◻</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/worthy/TestCode/personal && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/components/Dashboard/FilmStrip.tsx
git commit -m "feat: add FilmStrip component with Letterboxd recent watches"
```

---

## Task 8: TabBar Component

Terminal-style tab navigation with bracket styling.

**Files:**
- Create: `src/components/Dashboard/TabBar.tsx`

- [ ] **Step 1: Create `src/components/Dashboard/TabBar.tsx`**

```tsx
const TABS = [
  { id: 'overview', label: 'OVERVIEW', color: '#06b6d4' },
  { id: 'websites', label: 'WEBSITES', color: '#06b6d4' },
  { id: 'art', label: 'ART', color: '#d946ef' },
  { id: 'blog', label: 'BLOG', color: '#eab308' },
] as const;

export type TabId = (typeof TABS)[number]['id'];

interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export default function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <div className="flex overflow-x-auto scrollbar-hide font-mono text-xs md:text-sm">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="px-3 md:px-4 py-2 whitespace-nowrap transition-colors shrink-0"
            style={{
              color: isActive ? tab.color : '#555',
            }}
          >
            <span style={{ color: isActive ? tab.color + '80' : '#333' }}>[ </span>
            <span
              className="transition-all"
              style={{
                textShadow: isActive ? `0 0 10px ${tab.color}40` : 'none',
              }}
            >
              {tab.label}
            </span>
            <span style={{ color: isActive ? tab.color + '80' : '#333' }}> ]</span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/worthy/TestCode/personal && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/components/Dashboard/TabBar.tsx
git commit -m "feat: add TabBar component with terminal-style bracket tabs"
```

---

## Task 9: OverviewPanel Component

Combined stats, Spotify, and Letterboxd view.

**Files:**
- Create: `src/components/Dashboard/OverviewPanel.tsx`

- [ ] **Step 1: Create `src/components/Dashboard/OverviewPanel.tsx`**

```tsx
import { useFetch } from '@/hooks/useAnalytics';
import { api } from '@/lib/api';
import { Sparkline, AsciiBar, CountUp } from './AsciiChart';
import SpotifyRecord from './SpotifyRecord';
import FilmStrip from './FilmStrip';

export default function OverviewPanel() {
  const { data: overview } = useFetch(() => api.getOverview());
  const { data: projects } = useFetch(() => api.getProjects());

  const projectList = projects?.projects ?? [];
  const maxViews = Math.max(...projectList.map((p) => p.views_30d), 1);

  return (
    <div className="space-y-8 py-4">
      {/* Stats */}
      <div>
        <div className="text-[#06b6d4] text-[9px] font-mono tracking-[3px] uppercase mb-3">
          MONTHLY ACTIVE USERS
        </div>
        <div className="flex items-baseline gap-3">
          <CountUp
            value={overview?.total_visitors_30d ?? 0}
            className="text-white text-4xl md:text-5xl font-bold tracking-wider"
            />
          {overview && overview.weekly_trend_pct !== 0 && (
            <span
              className="text-xs font-mono"
              style={{ color: overview.weekly_trend_pct > 0 ? '#22c55e' : '#ef4444' }}
            >
              {overview.weekly_trend_pct > 0 ? '▲' : '▼'} {Math.abs(overview.weekly_trend_pct)}%
            </span>
          )}
        </div>

        {/* Per-project bars */}
        <div className="mt-4 space-y-1">
          {projectList.map((p) => (
            <AsciiBar
              key={p.slug}
              label={p.slug}
              value={p.views_30d}
              maxValue={maxViews}
            />
          ))}
        </div>

        {/* Sparkline */}
        {projectList.length > 0 && projectList[0].sparkline.length > 0 && (
          <div className="mt-3 font-mono text-[10px] text-white/30">
            <span className="text-white/20 mr-1">7d:</span>
            <Sparkline data={projectList[0].sparkline} />
          </div>
        )}
      </div>

      {/* Spotify */}
      <SpotifyRecord />

      {/* Letterboxd */}
      <FilmStrip />
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/worthy/TestCode/personal && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/components/Dashboard/OverviewPanel.tsx
git commit -m "feat: add OverviewPanel with stats, Spotify, and Letterboxd"
```

---

## Task 10: WebsitesPanel Component

Project list with box-drawing borders and live stats.

**Files:**
- Create: `src/components/Dashboard/WebsitesPanel.tsx`

- [ ] **Step 1: Create `src/components/Dashboard/WebsitesPanel.tsx`**

```tsx
import { useFetch } from '@/hooks/useAnalytics';
import { api } from '@/lib/api';
import { Sparkline } from './AsciiChart';
import AsciiBox from './AsciiBox';

const PROJECT_META: Record<string, { name: string; description: string; url: string; displayUrl: string }> = {
  coderview: {
    name: 'CodeView',
    description: 'AI-powered career development platform',
    url: 'https://github.com/worthybrae/coderview',
    displayUrl: 'coderview.io',
  },
  streamclout: {
    name: 'StreamClout',
    description: 'Real-time Spotify streaming analytics',
    url: 'https://github.com/worthybrae/streamclout',
    displayUrl: 'streamclout.com',
  },
};

export default function WebsitesPanel() {
  const { data: projects } = useFetch(() => api.getProjects());

  const projectList = projects?.projects ?? [];

  return (
    <div className="space-y-4 py-4">
      {projectList.map((project) => {
        const meta = PROJECT_META[project.slug];
        if (!meta) return null;

        const trend = project.sparkline;
        const trendDir = trend.length >= 2 && trend[trend.length - 1] >= trend[trend.length - 2];

        return (
          <AsciiBox key={project.slug} accentColor="#06b6d4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-white font-bold text-sm">{meta.name}</span>
                <span
                  className="text-xs"
                  style={{ color: trendDir ? '#22c55e' : '#ef4444' }}
                >
                  {trendDir ? '▲' : '▼'}
                </span>
              </div>
              <div className="text-white/40 text-xs">{meta.description}</div>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-white/50 text-xs">visitors</span>
                <span className="text-white text-sm font-bold">{project.views_30d.toLocaleString()}</span>
                <span className="text-white/30 text-xs">7d</span>
                <Sparkline data={project.sparkline} />
              </div>
              <a
                href={meta.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#06b6d4] text-xs hover:text-[#06b6d4]/80 transition-colors inline-block mt-1"
              >
                {meta.displayUrl} →
              </a>
            </div>
          </AsciiBox>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/worthy/TestCode/personal && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/components/Dashboard/WebsitesPanel.tsx
git commit -m "feat: add WebsitesPanel with ASCII borders and live stats"
```

---

## Task 11: ArtPanel Component

Art pieces with inline video and CRT scanline overlay.

**Files:**
- Create: `src/components/Dashboard/ArtPanel.tsx`

- [ ] **Step 1: Create `src/components/Dashboard/ArtPanel.tsx`**

```tsx
import AsciiBox from './AsciiBox';

const ART_PIECES = [
  {
    name: 'AI Architecture',
    description: 'StyleGAN-generated architectural spaces — neural networks dreaming of buildings',
    videoUrl: 'https://portfolio-worthy.s3.amazonaws.com/ai-architecture-demo.mp4',
  },
  {
    name: 'Livestream Art',
    description: 'Computer vision Abbey Road transformation — real-time style transfer on live camera feeds',
    videoUrl: 'https://portfolio-worthy.s3.amazonaws.com/livestream-art-demo.mp4',
  },
];

export default function ArtPanel() {
  return (
    <div className="space-y-6 py-4">
      {ART_PIECES.map((piece) => (
        <AsciiBox key={piece.name} accentColor="#d946ef">
          <div>
            {/* Video with CRT scanline overlay */}
            <div className="relative rounded-sm overflow-hidden mb-3">
              <video
                src={piece.videoUrl}
                autoPlay
                muted
                loop
                playsInline
                className="w-full aspect-video object-cover"
              />
              {/* Scanline overlay */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.12) 2px, rgba(0,0,0,0.12) 4px)',
                }}
              />
            </div>
            <div className="text-white font-bold text-sm">{piece.name}</div>
            <div className="text-white/40 text-xs mt-1 leading-relaxed">{piece.description}</div>
          </div>
        </AsciiBox>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/worthy/TestCode/personal && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/components/Dashboard/ArtPanel.tsx
git commit -m "feat: add ArtPanel with inline video and CRT scanline overlay"
```

---

## Task 12: BlogPanel Component

Blog post list with box-drawing borders.

**Files:**
- Create: `src/components/Dashboard/BlogPanel.tsx`

- [ ] **Step 1: Create `src/components/Dashboard/BlogPanel.tsx`**

```tsx
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
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/worthy/TestCode/personal && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/components/Dashboard/BlogPanel.tsx
git commit -m "feat: add BlogPanel with ASCII borders and post list"
```

---

## Task 13: ContentSection Component

The snap-scroll content section that contains the tab bar and active panel.

**Files:**
- Create: `src/components/Dashboard/ContentSection.tsx`

- [ ] **Step 1: Create `src/components/Dashboard/ContentSection.tsx`**

```tsx
import { useState } from 'react';
import TabBar, { type TabId } from './TabBar';
import OverviewPanel from './OverviewPanel';
import WebsitesPanel from './WebsitesPanel';
import ArtPanel from './ArtPanel';
import BlogPanel from './BlogPanel';

const PANELS: Record<TabId, () => JSX.Element> = {
  overview: OverviewPanel,
  websites: WebsitesPanel,
  art: ArtPanel,
  blog: BlogPanel,
};

export default function ContentSection() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const ActivePanel = PANELS[activeTab];

  return (
    <section className="relative z-10 h-screen snap-start flex flex-col">
      {/* Semi-transparent backdrop for readability */}
      <div className="absolute inset-0 bg-[#08080c]/75 backdrop-blur-sm" />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full max-w-2xl mx-auto w-full px-6">
        {/* Tab bar */}
        <div className="pt-6 pb-2">
          <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {/* Active panel — scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0 scrollbar-hide">
          <ActivePanel />
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/worthy/TestCode/personal && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/components/Dashboard/ContentSection.tsx
git commit -m "feat: add ContentSection with tab switching and scrollable panels"
```

---

## Task 14: Restructure Home Page

Replace the current single-component Home with the global canvas + hero + content snap-scroll layout.

**Files:**
- Modify: `src/pages/Home.tsx`
- Delete: `src/components/Dashboard/AsciiHero.tsx`

- [ ] **Step 1: Rewrite `src/pages/Home.tsx`**

```tsx
import { useRef } from 'react';
import { useTerrainAnimation } from '@/components/Dashboard/useTerrainAnimation';
import ContentSection from '@/components/Dashboard/ContentSection';

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useTerrainAnimation(canvasRef);

  return (
    <div className="bg-[#08080c]">
      {/* Global terrain canvas — fixed behind everything */}
      <canvas ref={canvasRef} className="fixed inset-0 w-full h-full" />

      {/* Snap scroll container */}
      <div className="relative z-10 h-screen overflow-y-auto snap-y snap-mandatory">
        {/* Hero section — just the terrain showing through */}
        <section className="h-screen snap-start flex items-end justify-center pb-12">
          <div className="font-mono text-white/20 text-xs animate-pulse select-none">
            ↓ scroll
          </div>
        </section>

        {/* Content section */}
        <ContentSection />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Delete `src/components/Dashboard/AsciiHero.tsx`**

```bash
rm src/components/Dashboard/AsciiHero.tsx
```

- [ ] **Step 3: Verify build**

Run: `cd /Users/worthy/TestCode/personal && npx tsc --noEmit`
Expected: No type errors (AsciiHero is no longer imported anywhere)

- [ ] **Step 4: Commit**

```bash
git add src/pages/Home.tsx
git rm src/components/Dashboard/AsciiHero.tsx
git commit -m "feat: restructure Home with global terrain canvas and snap scroll"
```

---

## Task 15: Update Routes and Clean Up

Remove old page routes and delete unused files.

**Files:**
- Modify: `src/App.tsx`
- Delete: `src/pages/AppsPage.tsx`
- Delete: `src/pages/ArtListPage.tsx`
- Delete: `src/pages/BlogListPage.tsx`
- Delete: `src/components/global/Header.tsx`

- [ ] **Step 1: Rewrite `src/App.tsx`**

```tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from '@/pages/Home';
import BlogPage from '@/pages/BlogPage';

function App() {
  return (
    <Router basename="/">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/blog/:slug" element={<BlogPage />} />
      </Routes>
    </Router>
  );
}

export default App;
```

- [ ] **Step 2: Delete unused page files**

```bash
rm src/pages/AppsPage.tsx src/pages/ArtListPage.tsx src/pages/BlogListPage.tsx src/components/global/Header.tsx
```

- [ ] **Step 3: Verify build**

Run: `cd /Users/worthy/TestCode/personal && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 4: Verify dev server runs**

Run: `cd /Users/worthy/TestCode/personal && npm run dev`
Expected: Vite dev server starts on localhost:5173 without errors. The page shows the terrain hero with a scroll hint, snap-scrolling down reveals the tabbed content section.

- [ ] **Step 5: Commit**

```bash
git rm src/pages/AppsPage.tsx src/pages/ArtListPage.tsx src/pages/BlogListPage.tsx src/components/global/Header.tsx
git add src/App.tsx
git commit -m "feat: simplify routes to / and /blog/:slug, remove old pages and header"
```

---

## Task 16: Add Tailwind Spin Keyframe and Scrollbar Hide

Ensure the `spin` animation works for the record and the scrollbar is hidden.

**Files:**
- Modify: `tailwind.config.js`

- [ ] **Step 1: Check if spin animation exists**

The default Tailwind `animate-spin` uses `animation: spin 1s linear infinite`. Our SpotifyRecord uses `animate-[spin_3s_linear_infinite]` which is an arbitrary value — this works out of the box with Tailwind JIT. No config change needed for spin.

For the scrollbar hiding, add a utility. Modify `tailwind.config.js` — add the `scrollbar-hide` utility via a plugin:

In the `plugins` array, add:

```javascript
plugins: [
  require("tailwindcss-animate"),
  require("@tailwindcss/typography"),
  function({ addUtilities }) {
    addUtilities({
      '.scrollbar-hide': {
        '-ms-overflow-style': 'none',
        'scrollbar-width': 'none',
        '&::-webkit-scrollbar': {
          display: 'none',
        },
      },
    });
  },
]
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/worthy/TestCode/personal && npx tsc --noEmit && npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add tailwind.config.js
git commit -m "feat: add scrollbar-hide utility to Tailwind config"
```

---

## Summary

| Task | Component | Dependencies |
|------|-----------|-------------|
| 1 | Spotify backend | None |
| 2 | Letterboxd backend | None |
| 3 | Frontend types + API | None |
| 4 | AsciiBox | None |
| 5 | AsciiChart | None |
| 6 | SpotifyRecord | Tasks 3, 5 |
| 7 | FilmStrip | Task 3 |
| 8 | TabBar | None |
| 9 | OverviewPanel | Tasks 5, 6, 7 |
| 10 | WebsitesPanel | Tasks 3, 4, 5 |
| 11 | ArtPanel | Task 4 |
| 12 | BlogPanel | Tasks 3, 4 |
| 13 | ContentSection | Tasks 8, 9, 10, 11, 12 |
| 14 | Home restructure | Task 13 |
| 15 | Routes + cleanup | Task 14 |
| 16 | Tailwind config | None |

Tasks 1-5, 7, 8, and 16 have no dependencies and can be executed in any order. Tasks 6+ build on earlier components. Task 14-15 are the final integration steps.
