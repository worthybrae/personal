# Work Detail Pages Design — Video Showcases

## Overview

Redesign the `/work` section so that clicking a project from the terrain menu navigates to a dedicated detail page (`/work/:slug`) showing the project name and MAU as terrain-masked ASCII text with a looping promotional video below.

## Routing

**New routes:**
- `/work/coderview` → Coderview detail page
- `/work/streamclout` → StreamClout detail page

**Existing routes (unchanged):**
- `/work` — terrain menu showing all project names as clickable labels
- `/` — home (WORTHY RAE terrain text)

**Navigation behavior:**
- Clicking a project name on `/work` navigates to `/work/:slug`
- W logo → `/` (home)
- `+` menu → shows WORK/ART/BLOG labels
- Browser back button → `/work`

## Project Data

Static metadata config (extend existing pattern):

```ts
interface ProjectMeta {
  slug: string;
  name: string;          // e.g. 'CODERVIEW'
  url: string;           // external link to live site
  videoUrl?: string;     // AWS S3 MP4 URL, optional
}
```

MAU stat fetched from existing analytics API (`api.getProjects()`).

**Current projects:**
- `coderview` — https://www.coderview-ai.com/
- `streamclout` — https://streamclout.io

## Detail Page Layout

Centered stack composition:

1. **Terrain-masked project name** — rendered by the canvas mask system, centered, same font size as menu labels
2. **Terrain-masked MAU stat** — below the name, slightly smaller font (e.g., "12,450 MAU")
3. **Looping video** — DOM element overlaid on canvas, positioned below the terrain text
4. **External link** — small DOM element near the name ("visit →") that opens the live site in a new tab

## Terrain Animation Changes

**On `/work` (menu state — existing behavior):**
- `buildContentTitleMask` renders all project names stacked vertically
- Names are clickable (hit regions navigate to `/work/:slug`)

**On `/work/:slug` (detail state — new):**
- `buildContentTitleMask` renders only:
  - The project name (centered, same font weight/size as menu labels)
  - The MAU stat below it (smaller font, e.g., 60-70% of name size)
- Name terrain text has a hit region that opens the external URL in a new tab
- No other clickable labels in the terrain

**Transition:** Crossfade (~300-400ms). When route changes from `/work` to `/work/:slug`:
- Track a `maskOpacity` value (0→1) that multiplies the mask brightness during rendering
- On route change: `maskOpacity` lerps to 0 over ~150ms, mask rebuilds for new state, then lerps back to 1 over ~250ms
- Video element uses CSS `opacity` + `transition` to fade in after the mask has settled (~100ms delay)
- Simple opacity transition, no zoom or spatial animation

## Video Element

**Implementation:**
- Native `<video>` element: `autoplay`, `muted`, `loop`, `playsInline`
- No playback controls shown
- Source: self-hosted MP4 on AWS S3

**Styling:**
- Max width: `min(540px, calc(100vw - 80px))`
- Aspect ratio: determined by source video (CSS `object-fit: cover` if needed)
- Centered horizontally
- Positioned below terrain text area
- Subtle border-radius (~8px) and soft box-shadow for depth
- Fades in with the page crossfade (opacity 0→1 over 300-400ms, slightly delayed ~100ms after terrain text settles)

**Graceful degradation:**
- If `videoUrl` is undefined/null for a project, no video element renders — page shows just name + MAU terrain text

## Component Changes

**`src/App.tsx`:**
- Add route: `/work/:slug` → `<Home />`

**`src/pages/Home.tsx`:**
- Extract slug from route params when on `/work/:slug`
- Pass project detail info to terrain animation config
- Render video overlay element when on a detail page

**`src/components/Dashboard/useTerrainAnimation.ts`:**
- Extend `contentSubItemsRef` or add new ref to handle detail state (single project name + MAU as mask text)
- Add crossfade opacity lerp when mask content changes

**`src/components/Dashboard/ContentSection.tsx`:**
- When on detail page: render `<video>` element and "visit →" link
- Position video below terrain text using same absolute positioning pattern as current MAU display

**New file — `src/lib/projects.ts`:**
- Static project metadata array (slug, name, url, videoUrl)
- Exported for use by Home and ContentSection

## Files to Modify

- `src/App.tsx` — add `/work/:slug` route
- `src/pages/Home.tsx` — handle slug param, pass detail config
- `src/components/Dashboard/useTerrainAnimation.ts` — detail mask state, crossfade lerp
- `src/components/Dashboard/ContentSection.tsx` — video element + external link

## Files to Create

- `src/lib/projects.ts` — project metadata config
