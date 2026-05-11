# Work Detail Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add route-based project detail pages (`/work/:slug`) that show project name + MAU as terrain-masked text with a looping promotional video below.

**Architecture:** Extend the existing terrain canvas system to handle a "detail" state — when on `/work/:slug`, the mask renders a single project name + MAU stat instead of all project names. A `<video>` DOM element is positioned below the terrain text via the existing `ContentSection` overlay pattern. Crossfade is achieved by lerping a `maskOpacity` multiplier during route transitions.

**Tech Stack:** React, React Router, Canvas 2D, HTML5 Video, TypeScript

---

### Task 1: Create Project Metadata Config

**Files:**
- Create: `src/lib/projects.ts`

- [ ] **Step 1: Create project metadata file**

```ts
// src/lib/projects.ts

export interface ProjectMeta {
  slug: string;
  name: string;
  url: string;
  videoUrl?: string;
}

export const PROJECTS: ProjectMeta[] = [
  {
    slug: 'coderview',
    name: 'CODERVIEW',
    url: 'https://www.coderview-ai.com/',
    // videoUrl: 'https://your-bucket.s3.amazonaws.com/coderview-promo.mp4',
  },
  {
    slug: 'streamclout',
    name: 'STREAMCLOUT',
    url: 'https://streamclout.io',
    // videoUrl: 'https://your-bucket.s3.amazonaws.com/streamclout-promo.mp4',
  },
];

export function getProject(slug: string): ProjectMeta | undefined {
  return PROJECTS.find((p) => p.slug === slug);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/projects.ts
git commit -m "feat: add project metadata config"
```

---

### Task 2: Add Route and Wire Up Slug Detection

**Files:**
- Modify: `src/App.tsx:9` (add route)
- Modify: `src/pages/Home.tsx:7-13` (extend `pageFromPath` to handle detail slugs)

- [ ] **Step 1: Add `/work/:slug` route to App.tsx**

In `src/App.tsx`, add a new route after the existing `/work` route:

```tsx
<Route path="/work/:slug" element={<Home />} />
```

The full Routes block becomes:

```tsx
<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/menu" element={<Home />} />
  <Route path="/work" element={<Home />} />
  <Route path="/work/:slug" element={<Home />} />
  <Route path="/art" element={<Home />} />
  <Route path="/blog" element={<Home />} />
  <Route path="/blog/:slug" element={<BlogPage />} />
</Routes>
```

- [ ] **Step 2: Extend Home.tsx to detect detail page**

In `src/pages/Home.tsx`, import `useParams` and update the page logic:

```tsx
import { useRef, useCallback, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTerrainAnimation, type LabelId } from '@/components/Dashboard/useTerrainAnimation';
import { getProject } from '@/lib/projects';

type Page = 'home' | 'menu' | LabelId | 'work-detail';

function pageFromPath(path: string): Page {
  if (path === '/menu') return 'menu';
  if (path.startsWith('/work/')) return 'work-detail';
  if (path === '/work') return 'work';
  if (path === '/art') return 'art';
  if (path === '/blog') return 'blog';
  return 'home';
}
```

- [ ] **Step 3: Pass detail state to terrain config**

Still in `src/pages/Home.tsx`, after the `page` detection, add detail-specific refs:

```tsx
export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { slug } = useParams<{ slug?: string }>();
  const page = pageFromPath(location.pathname);

  const isContent = page === 'work' || page === 'art' || page === 'blog' || page === 'work-detail';

  const contentOpenRef = useRef(isContent);
  contentOpenRef.current = isContent;

  // For detail pages, activeLabel is still 'work' (content is open)
  const activeLabelRef = useRef<LabelId | null>(isContent ? (page === 'work-detail' ? 'work' : (page as LabelId)) : null);
  activeLabelRef.current = isContent ? (page === 'work-detail' ? 'work' : (page as LabelId)) : null;

  const scrollTargetRef = useRef(page === 'home' ? 0 : 1);
  scrollTargetRef.current = page === 'home' ? 0 : 1;

  const scrollProgressRef = useRef(page === 'home' ? 0 : 1);

  // Detail page state
  const project = page === 'work-detail' && slug ? getProject(slug) : null;
  const detailRef = useRef<{ name: string; mau: string } | null>(null);

  const contentSubItems = useMemo(() => {
    if (page === 'work-detail' && project) {
      // Detail mode: empty sub-items (detail mask handles the text)
      return [];
    }
    if (page === 'work') {
      return [
        { text: 'CODERVIEW', url: 'https://www.coderview-ai.com/' },
        { text: 'STREAMCLOUT', url: 'https://streamclout.io' },
      ];
    }
    return [];
  }, [page, project]);
  const contentSubItemsRef = useRef(contentSubItems);
  contentSubItemsRef.current = contentSubItems;

  const handleLabelClick = useCallback(
    (label: LabelId) => navigate(`/${label}`),
    [navigate],
  );
  const handleLogoClick = useCallback(() => navigate('/'), [navigate]);
  const handleMenuClick = useCallback(() => navigate('/menu'), [navigate]);
  const handleSubItemClick = useCallback(
    (url: string) => {
      // If on /work and clicking a project name, navigate to detail page
      if (page === 'work') {
        const slug = url === 'https://www.coderview-ai.com/' ? 'coderview' : 'streamclout';
        navigate(`/work/${slug}`);
      } else {
        window.open(url, '_blank');
      }
    },
    [page, navigate],
  );

  const config = useMemo(
    () => ({
      onLabelClick: handleLabelClick,
      onLogoClick: handleLogoClick,
      onMenuClick: handleMenuClick,
      onSubItemClick: handleSubItemClick,
      contentOpenRef,
      activeLabelRef,
      scrollTargetRef,
      contentSubItemsRef,
      detailRef,
    }),
    [handleLabelClick, handleLogoClick, handleMenuClick, handleSubItemClick],
  );

  useTerrainAnimation(canvasRef, scrollProgressRef, config);

  return (
    <div>
      <canvas ref={canvasRef} className="fixed inset-0 w-full h-full" />
      {page === 'work-detail' && project && (
        <WorkDetailOverlay project={project} detailRef={detailRef} />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/pages/Home.tsx
git commit -m "feat: add /work/:slug route and detail page detection"
```

---

### Task 3: Add Detail Mask to Terrain Animation

**Files:**
- Modify: `src/components/Dashboard/useTerrainAnimation.ts:17-24` (extend TerrainConfig interface)
- Modify: `src/components/Dashboard/useTerrainAnimation.ts:235-303` (modify `buildContentTitleMask`)

- [ ] **Step 1: Extend TerrainConfig to accept detail state**

In `src/components/Dashboard/useTerrainAnimation.ts`, update the `TerrainConfig` interface:

```ts
export interface TerrainConfig {
  speedDivisor?: number;
  showNameMask?: boolean;
  contrast?: number;
  onLabelClick?: (label: LabelId) => void;
  onLogoClick?: () => void;
  onMenuClick?: () => void;
  onSubItemClick?: (url: string) => void;
  contentOpenRef?: React.RefObject<boolean>;
  activeLabelRef?: React.RefObject<LabelId | null>;
  scrollTargetRef?: React.RefObject<number>;
  contentSubItemsRef?: React.RefObject<{ text: string; url: string }[]>;
  detailRef?: React.MutableRefObject<{ name: string; mau: string } | null>;
}
```

- [ ] **Step 2: Modify `buildContentTitleMask` to handle detail state**

When `detailRef.current` is set (non-null), the mask should render the project name centered with the MAU stat below it in a smaller font. Modify `buildContentTitleMask` (starting around line 235):

```ts
function buildContentTitleMask(label: string) {
  if (!canvas) return;
  const items = contentSubItemsRef?.current;
  const detail = config.detailRef?.current;
  const hasItems = items && items.length > 0;

  const off = document.createElement('canvas');
  off.width = canvas.width;
  off.height = canvas.height;
  const o = off.getContext('2d')!;
  o.fillStyle = '#000';
  o.fillRect(0, 0, off.width, off.height);

  const newBounds: { x: number; y: number; w: number; h: number }[] = [];
  const bioDpr = canvas.width / window.innerWidth;
  const cutMaxW = Math.min(672, window.innerWidth - 48) * bioDpr;
  const cutMaxH = (window.innerHeight - 100) * bioDpr;
  const cutCX = canvas.width / 2;
  const cutCY = canvas.height * 0.53;
  const isPortrait = canvas.height > canvas.width;

  const titleH = isPortrait ? cutMaxW * 0.22 : cutMaxH * 0.1;

  o.fillStyle = '#fff';
  o.textAlign = 'center';
  o.textBaseline = 'middle';

  if (detail) {
    // Detail mode: project name centered + MAU below in smaller font
    const nameFont = `900 ${titleH}px 'Arial Black','Impact','Helvetica Neue',sans-serif`;
    const mauFont = `900 ${titleH * 0.45}px 'Arial Black','Impact','Helvetica Neue',sans-serif`;

    // Name
    o.font = nameFont;
    const nameY = cutCY - titleH * 0.4;
    o.fillText(detail.name, cutCX, nameY, cutMaxW * 0.9);
    const nameTw = o.measureText(detail.name).width;
    newBounds.push({
      x: cutCX - nameTw / 2,
      y: nameY - titleH * 0.55,
      w: Math.min(nameTw, cutMaxW * 0.9),
      h: titleH * 1.1,
    });

    // MAU stat
    o.font = mauFont;
    const mauY = nameY + titleH * 0.85;
    o.fillText(detail.mau, cutCX, mauY, cutMaxW * 0.9);
    const mauTw = o.measureText(detail.mau).width;
    newBounds.push({
      x: cutCX - mauTw / 2,
      y: mauY - titleH * 0.25,
      w: Math.min(mauTw, cutMaxW * 0.9),
      h: titleH * 0.5,
    });
  } else if (hasItems) {
    // Existing: render sub-items stacked
    o.font = `900 ${titleH}px 'Arial Black','Impact','Helvetica Neue',sans-serif`;
    const totalH = items.length * titleH * 1.3;
    const startY = cutCY - totalH / 2 + titleH * 0.65;
    for (let i = 0; i < items.length; i++) {
      const ly = startY + i * titleH * 1.3;
      o.fillText(items[i].text.toUpperCase(), cutCX, ly, cutMaxW * 0.9);
      const tw = o.measureText(items[i].text.toUpperCase()).width;
      newBounds.push({
        x: cutCX - tw / 2,
        y: ly - titleH * 0.55,
        w: Math.min(tw, cutMaxW * 0.9),
        h: titleH * 1.1,
      });
    }
  } else {
    o.font = `900 ${titleH}px 'Arial Black','Impact','Helvetica Neue',sans-serif`;
    o.fillText(label.toUpperCase(), cutCX, cutCY, cutMaxW * 0.9);
  }

  subItemBoundsRef.current = newBounds;

  contentTitleMaskRef.current = {
    data: o.getImageData(0, 0, off.width, off.height).data,
    width: off.width,
    height: off.height,
  };

  // Bake to grid
  const mask = contentTitleMaskRef.current;
  contentTitleGrid = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    const py = Math.floor(r * charH);
    for (let c = 0; c < cols; c++) {
      const px = Math.floor(c * charW);
      const idx = r * cols + c;
      if (px < mask.width && py < mask.height) {
        const offset = (py * mask.width + px) * 4;
        contentTitleGrid[idx] = mask.data[offset] > 128 ? 1 : 0;
      }
    }
  }
}
```

- [ ] **Step 3: Track detail state changes to trigger mask rebuild**

In the `draw()` function, alongside the existing `currentLabel` / `subItemsKey` change detection (around line 436), add detail tracking:

```ts
const currentLabel = activeLabelRef?.current ?? null;
const subItems = contentSubItemsRef?.current ?? [];
const subItemsKey = subItems.map(s => s.text).join('|');
const detail = config.detailRef?.current;
const detailKey = detail ? `${detail.name}|${detail.mau}` : '';

if (currentLabel !== lastContentLabel || subItemsKey !== lastSubItemsKey || detailKey !== lastDetailKey) {
  lastContentLabel = currentLabel;
  lastSubItemsKey = subItemsKey;
  lastDetailKey = detailKey;
  if (currentLabel) buildContentTitleMask(currentLabel);
}
```

Add `let lastDetailKey = '';` alongside `lastContentLabel` and `lastSubItemsKey` declarations (around line 233).

- [ ] **Step 4: Make detail name clickable (opens external URL)**

In the `onClick` handler (line 665), when on a detail page and clicking the name bounds, open external URL:

```ts
const onClick = (e: MouseEvent) => {
  const hit = hitTest(e.clientX, e.clientY);
  if (hit === 'logo') {
    onLogoClick?.();
  } else if (hit === 'menu') {
    onMenuClick?.();
  } else if (typeof hit === 'string' && hit.startsWith('sub:')) {
    const idx = parseInt(hit.slice(4));
    const items = contentSubItemsRef?.current;
    const detail = config.detailRef?.current;
    if (detail && idx === 0) {
      // Detail mode: clicking the name opens external URL
      // Find project URL from items or use onSubItemClick
      config.onSubItemClick?.('');
    } else if (items?.[idx]?.url) {
      if (config.onSubItemClick) {
        config.onSubItemClick(items[idx].url);
      } else {
        window.open(items[idx].url, '_blank');
      }
    }
  } else if (typeof hit === 'number') {
    onLabelClick?.(LABELS[hit].toLowerCase() as LabelId);
  }
};
```

- [ ] **Step 5: Commit**

```bash
git add src/components/Dashboard/useTerrainAnimation.ts
git commit -m "feat: terrain animation detail mask for project name + MAU"
```

---

### Task 4: Add Crossfade Transition

**Files:**
- Modify: `src/components/Dashboard/useTerrainAnimation.ts` (add maskOpacity lerp in draw loop)

- [ ] **Step 1: Add maskOpacity state variable**

Near the existing `contentProgress` variable (around line 366), add:

```ts
let maskOpacity = 1;
let maskOpacityTarget = 1;
let pendingMaskRebuild = false;
```

- [ ] **Step 2: Trigger crossfade on mask content change**

Replace the existing mask change detection block with one that fades out, rebuilds, then fades in:

```ts
const currentLabel = activeLabelRef?.current ?? null;
const subItems = contentSubItemsRef?.current ?? [];
const subItemsKey = subItems.map(s => s.text).join('|');
const detail = config.detailRef?.current;
const detailKey = detail ? `${detail.name}|${detail.mau}` : '';

if (currentLabel !== lastContentLabel || subItemsKey !== lastSubItemsKey || detailKey !== lastDetailKey) {
  // Content changed — if already showing content, fade out first
  if (lastContentLabel !== null && contentTitleFade > 0.5) {
    maskOpacityTarget = 0;
    pendingMaskRebuild = true;
  } else {
    // First content load — just build immediately
    lastContentLabel = currentLabel;
    lastSubItemsKey = subItemsKey;
    lastDetailKey = detailKey;
    if (currentLabel) buildContentTitleMask(currentLabel);
  }
}

// Lerp maskOpacity toward target
maskOpacity += (maskOpacityTarget - maskOpacity) * 0.08;
if (Math.abs(maskOpacity - maskOpacityTarget) < 0.01) maskOpacity = maskOpacityTarget;

// When fade-out completes, rebuild mask and fade back in
if (pendingMaskRebuild && maskOpacity < 0.02) {
  lastContentLabel = currentLabel;
  lastSubItemsKey = subItemsKey;
  lastDetailKey = detailKey;
  if (currentLabel) buildContentTitleMask(currentLabel);
  maskOpacityTarget = 1;
  pendingMaskRebuild = false;
}
```

- [ ] **Step 3: Apply maskOpacity to content title rendering**

In the content title rendering section (around line 556), multiply the scatter threshold by `maskOpacity`:

```ts
// Content: scatter-reveal in, scatter-dissolve out (white on exit)
if (contentTitleFade > 0 && contentTitleGrid[idx]) {
  let h2 = ((c + 17) * 374761393 + (r + 31) * 668265263) | 0;
  h2 = ((h2 ^ (h2 >>> 13)) * 1274126177) | 0;
  const hash2 = ((h2 ^ (h2 >>> 16)) & 0x7fff) / 0x7fff;
  const effectiveFade = contentTitleFade * maskOpacity;
  if (effectiveFade >= hash2) {
    const isClosing = contentTarget === 0;
    if (isClosing) {
      gridColors[idx] = COLOR_LEVELS;
    } else if (hoveredSubItem >= 0) {
      const hb = subBounds[hoveredSubItem];
      const cellPx = c * charW;
      if (hb && cellPx >= hb.x && cellPx < hb.x + hb.w && py >= hb.y && py < hb.y + hb.h) {
        gridColors[idx] = COLOR_LEVELS;
      } else {
        gridSkip[idx] = 1;
      }
    } else {
      gridSkip[idx] = 1;
    }
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/Dashboard/useTerrainAnimation.ts
git commit -m "feat: add crossfade transition between terrain mask states"
```

---

### Task 5: Build the Video Overlay Component

**Files:**
- Modify: `src/pages/Home.tsx` (add `WorkDetailOverlay` component)

- [ ] **Step 1: Create `WorkDetailOverlay` component in Home.tsx**

Add this component at the bottom of `src/pages/Home.tsx`:

```tsx
import { useFetch } from '@/hooks/useAnalytics';
import { api } from '@/lib/api';
import { type ProjectMeta } from '@/lib/projects';

interface WorkDetailOverlayProps {
  project: ProjectMeta;
  detailRef: React.MutableRefObject<{ name: string; mau: string } | null>;
}

function WorkDetailOverlay({ project, detailRef }: WorkDetailOverlayProps) {
  const { data: projects } = useFetch(() => api.getProjects());
  const analytics = projects?.projects.find((p) => p.slug === project.slug);
  const mau = analytics ? analytics.views_30d.toLocaleString() : '—';

  // Update the terrain detail ref so the mask renders name + MAU
  detailRef.current = { name: project.name, mau: `${mau} MAU` };

  // Compute video position — below the terrain text
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cutH = vh - 100;
  const isPortrait = vh > vw;
  const maxCutW = Math.min(672, vw - 48);
  const titleH = isPortrait ? maxCutW * 0.22 : cutH * 0.1;
  const cutCY = vh * 0.53;
  const videoTop = cutCY + titleH * 0.8;

  return (
    <div
      className="fixed z-20 left-1/2 -translate-x-1/2 transition-opacity duration-500"
      style={{
        top: `${videoTop}px`,
        width: `min(540px, calc(100vw - 80px))`,
        opacity: 1,
      }}
    >
      {project.videoUrl && (
        <video
          className="w-full rounded-lg shadow-lg shadow-black/30"
          src={project.videoUrl}
          autoPlay
          muted
          loop
          playsInline
        />
      )}
      <a
        href={project.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-center mt-3 text-white/50 hover:text-white text-sm font-mono transition-colors"
      >
        visit {project.name.toLowerCase()} →
      </a>
    </div>
  );
}
```

- [ ] **Step 2: Add delayed fade-in for the video**

Wrap the video container with a state-driven opacity for the delayed entrance:

```tsx
import { useState, useEffect } from 'react';

function WorkDetailOverlay({ project, detailRef }: WorkDetailOverlayProps) {
  const [visible, setVisible] = useState(false);
  const { data: projects } = useFetch(() => api.getProjects());
  const analytics = projects?.projects.find((p) => p.slug === project.slug);
  const mau = analytics ? analytics.views_30d.toLocaleString() : '—';

  detailRef.current = { name: project.name, mau: `${mau} MAU` };

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 400);
    return () => clearTimeout(timer);
  }, []);

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cutH = vh - 100;
  const isPortrait = vh > vw;
  const maxCutW = Math.min(672, vw - 48);
  const titleH = isPortrait ? maxCutW * 0.22 : cutH * 0.1;
  const cutCY = vh * 0.53;
  const videoTop = cutCY + titleH * 0.8;

  return (
    <div
      className={`fixed z-20 left-1/2 -translate-x-1/2 transition-opacity duration-500 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        top: `${videoTop}px`,
        width: `min(540px, calc(100vw - 80px))`,
      }}
    >
      {project.videoUrl && (
        <video
          className="w-full rounded-lg shadow-lg shadow-black/30"
          src={project.videoUrl}
          autoPlay
          muted
          loop
          playsInline
        />
      )}
      <a
        href={project.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-center mt-3 text-white/50 hover:text-white text-sm font-mono transition-colors"
      >
        visit {project.name.toLowerCase()} →
      </a>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/Home.tsx
git commit -m "feat: add WorkDetailOverlay with video and external link"
```

---

### Task 6: Update Sub-Item Click to Navigate to Detail Pages

**Files:**
- Modify: `src/components/Dashboard/useTerrainAnimation.ts:665-678` (click handler)
- Modify: `src/pages/Home.tsx` (sub-item click routing)

- [ ] **Step 1: Replace direct `window.open` with `onSubItemClick` callback**

In `useTerrainAnimation.ts`, update the click handler to always use the callback when available:

```ts
const onClick = (e: MouseEvent) => {
  const hit = hitTest(e.clientX, e.clientY);
  if (hit === 'logo') {
    onLogoClick?.();
  } else if (hit === 'menu') {
    onMenuClick?.();
  } else if (typeof hit === 'string' && hit.startsWith('sub:')) {
    const idx = parseInt(hit.slice(4));
    const items = contentSubItemsRef?.current;
    if (items?.[idx]?.url) {
      if (config.onSubItemClick) {
        config.onSubItemClick(items[idx].url);
      } else {
        window.open(items[idx].url, '_blank');
      }
    }
  } else if (typeof hit === 'number') {
    onLabelClick?.(LABELS[hit].toLowerCase() as LabelId);
  }
};
```

- [ ] **Step 2: Implement routing logic in Home.tsx `handleSubItemClick`**

In `src/pages/Home.tsx`, the `handleSubItemClick` maps project URLs to slugs for navigation:

```tsx
import { PROJECTS } from '@/lib/projects';

const handleSubItemClick = useCallback(
  (url: string) => {
    if (page === 'work') {
      // On work menu: navigate to detail page
      const project = PROJECTS.find((p) => p.url === url);
      if (project) {
        navigate(`/work/${project.slug}`);
      }
    } else {
      window.open(url, '_blank');
    }
  },
  [page, navigate],
);
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Dashboard/useTerrainAnimation.ts src/pages/Home.tsx
git commit -m "feat: route sub-item clicks to detail pages on /work"
```

---

### Task 7: Clean Up and Reset Detail State on Navigation Away

**Files:**
- Modify: `src/pages/Home.tsx` (clear detailRef when not on detail page)

- [ ] **Step 1: Clear detailRef when navigating away from detail page**

In `src/pages/Home.tsx`, ensure `detailRef` is null when not on a detail page. Add this after the `detailRef` declaration:

```tsx
const detailRef = useRef<{ name: string; mau: string } | null>(null);

// Clear detail state when not on a detail page
if (page !== 'work-detail') {
  detailRef.current = null;
}
```

- [ ] **Step 2: Verify the full navigation flow works**

Test manually:
1. `/` → shows WORTHY RAE terrain
2. Scroll/navigate to `/work` → shows CODERVIEW / STREAMCLOUT as terrain text
3. Click CODERVIEW → crossfades to CODERVIEW + MAU terrain text, video fades in below
4. Click W logo → navigates home, terrain resets
5. Navigate to `/work/coderview` directly → shows detail page immediately

- [ ] **Step 3: Commit**

```bash
git add src/pages/Home.tsx
git commit -m "feat: clear detail state on navigation away from project page"
```

---

### Task 8: Handle Missing Video Gracefully

**Files:**
- Modify: `src/pages/Home.tsx` (WorkDetailOverlay)

- [ ] **Step 1: Ensure layout works without video**

The `WorkDetailOverlay` component already conditionally renders the video (`{project.videoUrl && ...}`). When no video exists, only the "visit →" link shows below the terrain text. Verify the layout still looks good without video:

```tsx
// In WorkDetailOverlay, adjust so link is always visible
// and spacing works with or without video:
return (
  <div
    className={`fixed z-20 left-1/2 -translate-x-1/2 transition-opacity duration-500 ${
      visible ? 'opacity-100' : 'opacity-0'
    }`}
    style={{
      top: `${videoTop}px`,
      width: `min(540px, calc(100vw - 80px))`,
    }}
  >
    {project.videoUrl ? (
      <video
        className="w-full rounded-lg shadow-lg shadow-black/30"
        src={project.videoUrl}
        autoPlay
        muted
        loop
        playsInline
      />
    ) : null}
    <a
      href={project.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`block text-center text-white/50 hover:text-white text-sm font-mono transition-colors ${
        project.videoUrl ? 'mt-3' : 'mt-0'
      }`}
    >
      visit {project.name.toLowerCase()} →
    </a>
  </div>
);
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Home.tsx
git commit -m "feat: handle missing video gracefully in work detail"
```
