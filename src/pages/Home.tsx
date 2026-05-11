import { useRef, useCallback, useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTerrainAnimation } from '@/components/Dashboard/useTerrainAnimation';
import { PROJECTS } from '@/lib/projects';
import { getProject } from '@/lib/projects';
import { ART_PIECES, getArtPiece } from '@/lib/art';
import { useFetch } from '@/hooks/useAnalytics';
import { api } from '@/lib/api';
import { prepareWithSegments, layoutWithLines, measureLineStats } from '@chenglou/pretext';
import { ExternalLink } from 'lucide-react';
import type { SpotifyNowPlaying } from '@/types/analytics';

type Page = 'home' | 'feed' | 'work-detail' | 'art-detail';

function pageFromPath(path: string): Page {
  if (path === '/feed') return 'feed';
  if (path.startsWith('/work/')) return 'work-detail';
  if (path.startsWith('/art/')) return 'art-detail';
  return 'home';
}

const monoFont = "'JetBrains Mono', 'Courier New', monospace";
const headerFont = "'Arial Black','Impact','Helvetica Neue',sans-serif";

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { slug } = useParams<{ slug?: string }>();
  const page = pageFromPath(location.pathname);

  const isContent = page !== 'home';

  // Delay contentOpen going false until feed content has faded out
  const contentOpenRef = useRef(isContent);
  if (isContent) contentOpenRef.current = true;

  const activeLabelRef = useRef<string | null>(isContent ? 'feed' : null);
  activeLabelRef.current = isContent ? 'feed' : null;

  const scrollTargetRef = useRef(page === 'home' ? 0 : 1);
  scrollTargetRef.current = page === 'home' ? 0 : 1;

  const scrollProgressRef = useRef(page === 'home' ? 0 : 1);
  const meltCompleteRef = useRef(page !== 'home');

  // Track feed closing animation
  const [feedClosing, setFeedClosing] = useState(false);
  const [prevPage, setPrevPage] = useState(page);

  if (prevPage !== page) {
    setPrevPage(page);
    if (prevPage === 'feed' && page === 'home') {
      setFeedClosing(true);
    }
  }

  useEffect(() => {
    if (feedClosing) {
      const meltTimer = setTimeout(() => {
        contentOpenRef.current = false;
      }, 500);
      const unmountTimer = setTimeout(() => setFeedClosing(false), 800);
      return () => { clearTimeout(meltTimer); clearTimeout(unmountTimer); };
    }
    if (!isContent) {
      contentOpenRef.current = false;
    }
  }, [feedClosing, isContent]);

  const showFeed = page === 'feed' || feedClosing;

  // Now-playing: fetch and expose via ref for terrain canvas
  const nowPlayingRef = useRef<{ track: string; artist: string; isPlaying: boolean; playedAt?: string } | null>(null);
  useEffect(() => {
    const fetchNP = () => {
      if (document.visibilityState === 'hidden') return;
      api.getSpotifyNowPlaying().then((d: SpotifyNowPlaying) => {
        nowPlayingRef.current = d.track ? { track: d.track, artist: d.artist, isPlaying: d.is_playing, playedAt: d.played_at } : null;
      }).catch(() => {});
    };
    fetchNP();
    const id = setInterval(fetchNP, 30_000);
    const onVisible = () => { if (document.visibilityState === 'visible') fetchNP(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  const { data: blogData } = useFetch(() => api.getBlogPosts());

  const contentSubItemsRef = useRef<{ text: string; url: string; description?: string; mau?: string; category?: string; icon?: string }[]>([]);

  const feedSubItems = useMemo(() => {
    if (!showFeed) return [];

    const workItems = PROJECTS.map((p) => ({
      text: p.name, url: `/work/${p.slug}`, description: p.description, category: 'WEBSITE', icon: '</>',
    }));

    const artItems = ART_PIECES.map((a) => ({
      text: a.name, url: `/art/${a.slug}`, description: a.description, category: 'ART', icon: '~',
    }));

    const blogItems = (blogData?.posts ?? []).map((b) => ({
      text: b.title.toUpperCase(), url: `/blog/${b.slug}`, description: b.description.toUpperCase(), category: 'BLOG', icon: '>>',
    }));

    return [artItems[0], workItems[1], artItems[1], workItems[0], ...blogItems].filter(Boolean);
  }, [showFeed, blogData]);

  contentSubItemsRef.current = feedSubItems;

  const handleLogoClick = useCallback(() => navigate('/'), [navigate]);
  const handleMenuClick = useCallback(() => navigate('/feed'), [navigate]);
  const handleItemClick = useCallback(
    (url: string) => { navigate(url); },
    [navigate],
  );

  const config = useMemo(
    () => ({
      onLogoClick: handleLogoClick,
      onMenuClick: handleMenuClick,
      onSubItemClick: handleItemClick,
      contentOpenRef,
      activeLabelRef,
      scrollTargetRef,
      contentSubItemsRef,
      meltCompleteRef,
      nowPlayingRef,
    }),
    [handleLogoClick, handleMenuClick, handleItemClick],
  );

  useTerrainAnimation(canvasRef, scrollProgressRef, config);

  // Detail page data
  const project = page === 'work-detail' && slug ? getProject(slug) : null;
  const artPiece = page === 'art-detail' && slug ? getArtPiece(slug) : null;
  return (
    <div>
      <canvas ref={canvasRef} className="fixed inset-0 w-full h-full" />

      {page === 'work-detail' && project && (
        <DetailOverlay>
          <div
            className="text-xs tracking-[0.3em] uppercase mb-2 opacity-40"
            style={{ fontFamily: monoFont }}
          >
            WEBSITE
          </div>
          <div
            className="font-black text-4xl md:text-5xl uppercase tracking-tight text-white"
            style={{ fontFamily: headerFont }}
          >
            {project.name}
          </div>
          <div
            className="text-xs md:text-sm uppercase tracking-wider mt-2 text-white/30"
            style={{ fontFamily: monoFont }}
          >
            {project.description}
          </div>
          <div className="flex justify-center gap-4 mt-4">
            <a href={project.url} target="_blank" rel="noopener noreferrer" className="text-white opacity-30 hover:opacity-70 transition-opacity" title="Visit site">
              <ExternalLink size={20} />
            </a>
          </div>
          <div className="mt-6">
            <MediaBlock videoUrl={project.videoUrl} imageUrl={project.imageUrl} />
          </div>
          <div
            className="text-xs tracking-[0.3em] uppercase mt-10 mb-3 opacity-40 text-left"
            style={{ fontFamily: monoFont }}
          >
            SUMMARY
          </div>
          <PretextSummary text={project.summary} />
          <div
            className="text-xs tracking-[0.3em] uppercase mt-10 mb-3 opacity-40 text-left"
            style={{ fontFamily: monoFont }}
          >
            TOOLS
          </div>
          <TechTags tags={project.tech} />
          <ProjectAnalyticsSection slug={project.slug} />
        </DetailOverlay>
      )}

      {page === 'art-detail' && artPiece && (
        <DetailOverlay>
          <div
            className="text-xs tracking-[0.3em] uppercase mb-2 opacity-40"
            style={{ fontFamily: monoFont }}
          >
            ART
          </div>
          <div
            className="font-black text-4xl md:text-5xl uppercase tracking-tight text-white"
            style={{ fontFamily: headerFont }}
          >
            {artPiece.name}
          </div>
          <div
            className="text-xs md:text-sm uppercase tracking-wider mt-2 text-white/30"
            style={{ fontFamily: monoFont }}
          >
            {artPiece.description}
          </div>
          {artPiece.githubUrl && (
            <div className="flex justify-center gap-4 mt-4">
              <a href={artPiece.githubUrl} target="_blank" rel="noopener noreferrer" className="text-white opacity-30 hover:opacity-70 transition-opacity" title="View source">
                <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" /></svg>
              </a>
            </div>
          )}
          <div className="mt-6">
            <MediaBlock videoUrl={artPiece.videoUrl} imageUrl={artPiece.imageUrl} />
          </div>
          <div
            className="text-xs tracking-[0.3em] uppercase mt-10 mb-3 opacity-40 text-left"
            style={{ fontFamily: monoFont }}
          >
            SUMMARY
          </div>
          <PretextSummary text={artPiece.summary} />
          <div
            className="text-xs tracking-[0.3em] uppercase mt-10 mb-3 opacity-40 text-left"
            style={{ fontFamily: monoFont }}
          >
            TOOLS
          </div>
          <TechTags tags={artPiece.tech} />
        </DetailOverlay>
      )}

    </div>
  );
}

function TechTags({ tags }: { tags: string[] }) {
  return (
    <div className="flex flex-wrap justify-start gap-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className="text-[10px] tracking-[0.2em] uppercase text-white/40 border border-white/10 rounded-full px-3 py-1"
          style={{ fontFamily: monoFont }}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

function DetailOverlay({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`fixed left-0 right-0 bottom-0 z-10 overflow-y-auto transition-opacity duration-500 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ top: '100px', paddingTop: '20px', paddingBottom: '120px' }}
    >
      <div className="max-w-2xl mx-auto px-6 text-center">
        {children}
      </div>
    </div>
  );
}

function MediaBlock({ videoUrl, imageUrl }: { videoUrl?: string; imageUrl?: string }) {
  if (videoUrl) {
    return videoUrl.includes('youtube.com') ? (
      <iframe
        className="w-full rounded-lg shadow-lg shadow-black/30"
        style={{ aspectRatio: '16/9', border: 'none' }}
        src={videoUrl}
        allow="autoplay; encrypted-media"
        allowFullScreen
      />
    ) : (
      <video
        className="w-full rounded-lg shadow-lg shadow-black/30"
        src={videoUrl}
        autoPlay
        muted
        loop
        playsInline
      />
    );
  }
  if (imageUrl) {
    return (
      <img
        className="w-full rounded-lg shadow-lg shadow-black/30"
        src={imageUrl}
        alt=""
      />
    );
  }
  return null;
}

function PretextSummary({ text }: { text: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<{ text: string; width: number }[]>([]);
  const [balancedWidth, setBalancedWidth] = useState(0);
  const fontSize = 14;
  const lineHeight = 22;
  const font = `${fontSize}px JetBrains Mono, Courier New, monospace`;

  useEffect(() => {
    const prepared = prepareWithSegments(text, font);

    const computeLines = () => {
      const maxWidth = containerRef.current?.clientWidth ?? 600;
      const { lineCount } = measureLineStats(prepared, maxWidth);

      // Binary search for the narrowest width that keeps the same line count
      let lo = 100;
      let hi = maxWidth;
      while (hi - lo > 1) {
        const mid = Math.floor((lo + hi) / 2);
        if (measureLineStats(prepared, mid).lineCount <= lineCount) {
          hi = mid;
        } else {
          lo = mid;
        }
      }

      const result = layoutWithLines(prepared, hi, lineHeight);
      setLines(result.lines.map((l) => ({ text: l.text, width: l.width })));
      setBalancedWidth(hi);
    };

    computeLines();
    window.addEventListener('resize', computeLines);
    return () => window.removeEventListener('resize', computeLines);
  }, [text, font]);

  return (
    <div ref={containerRef} className="text-left">
      <div style={{ maxWidth: balancedWidth || undefined }}>
        {lines.map((line, i) => (
          <div
            key={i}
            className="text-white/50"
            style={{
              fontFamily: monoFont,
              fontSize,
              lineHeight: `${lineHeight}px`,
              whiteSpace: 'pre',
            }}
          >
            {line.text || '\u00A0'}
          </div>
        ))}
      </div>
    </div>
  );
}

const monoFontFamily = "'JetBrains Mono', 'Courier New', monospace";

function ProjectAnalyticsSection({ slug }: { slug: string }) {
  const { data } = useFetch(() => api.getProjectDetail(slug));
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (!data || data.daily_views.length === 0) return null;

  const days = data.daily_views;
  const views = days.map((d) => d.views);
  const mid = Math.floor(views.length / 2);
  const prevHalf = views.slice(0, mid).reduce((a, b) => a + b, 0);
  const currHalf = views.slice(mid).reduce((a, b) => a + b, 0);
  const pctChange = prevHalf > 0 ? ((currHalf - prevHalf) / prevHalf) * 100 : 0;
  const pctSign = pctChange >= 0 ? '+' : '';

  const max = Math.max(...views, 1);
  const w = 600;
  const h = 120;
  const pad = 2;
  const padX = 6;

  const coords = views.map((v, i) => ({
    x: padX + (i / (views.length - 1)) * (w - padX * 2),
    y: h - pad - ((v / max) * (h - pad * 2)),
  }));
  const points = coords.map((c) => `${c.x},${c.y}`).join(' ');

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const idx = Math.round(relX * (views.length - 1));
    setHoverIndex(Math.max(0, Math.min(views.length - 1, idx)));
  };

  const hovered = hoverIndex !== null ? { ...coords[hoverIndex], date: days[hoverIndex].date, views: views[hoverIndex] } : null;

  return (
    <div className="mt-10 text-left">
      <div
        className="text-xs tracking-[0.3em] uppercase mb-1 opacity-40"
        style={{ fontFamily: monoFontFamily }}
      >
        ANALYTICS
      </div>
      <div
        className="text-xs text-white/20 mb-3 flex justify-between"
        style={{ fontFamily: monoFontFamily }}
      >
        <span>
          {views.reduce((a, b) => a + b, 0).toLocaleString()} views
          <span className={pctChange >= 0 ? 'text-green-500/60' : 'text-red-500/60'}>
            {' '}{pctSign}{pctChange.toFixed(1)}%
          </span>
        </span>
        <span className="opacity-60">Last 30 days</span>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${w} ${h}`}
        className="w-full"
        preserveAspectRatio="none"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIndex(null)}
        style={{ cursor: 'crosshair' }}
      >
        <polyline
          points={points}
          fill="none"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {hovered && (
          <>
            <line
              x1={hovered.x} y1={0} x2={hovered.x} y2={h}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="1"
            />
            <circle
              cx={hovered.x} cy={hovered.y} r="4"
              fill="white" fillOpacity="0.6"
            />
          </>
        )}
      </svg>
      <div
        className={`text-xs text-white/40 mt-1 flex justify-between ${hovered ? 'visible' : 'invisible'}`}
        style={{ fontFamily: monoFontFamily }}
      >
        <span>{hovered ? new Date(`${hovered.date.slice(0, 4)}-${hovered.date.slice(4, 6)}-${hovered.date.slice(6, 8)}`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '\u00A0'}</span>
        <span>{hovered ? `${hovered.views.toLocaleString()} views` : '\u00A0'}</span>
      </div>
    </div>
  );
}
