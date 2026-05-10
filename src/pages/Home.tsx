import { useRef, useCallback, useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTerrainAnimation, type LabelId } from '@/components/Dashboard/useTerrainAnimation';
import { getProject, PROJECTS, type ProjectMeta } from '@/lib/projects';
import { useFetch } from '@/hooks/useAnalytics';
import { api } from '@/lib/api';

type Page = 'home' | 'menu' | LabelId | 'work-detail';

function pageFromPath(path: string): Page {
  if (path === '/menu') return 'menu';
  if (path.startsWith('/work/')) return 'work-detail';
  if (path === '/work') return 'work';
  if (path === '/art') return 'art';
  if (path === '/blog') return 'blog';
  return 'home';
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { slug } = useParams<{ slug?: string }>();
  const page = pageFromPath(location.pathname);

  const isContent = page === 'work' || page === 'art' || page === 'blog' || page === 'work-detail';

  const contentOpenRef = useRef(isContent);
  contentOpenRef.current = isContent;

  const activeLabelRef = useRef<LabelId | null>(
    isContent ? (page === 'work-detail' ? 'work' : (page as LabelId)) : null
  );
  activeLabelRef.current = isContent ? (page === 'work-detail' ? 'work' : (page as LabelId)) : null;

  const scrollTargetRef = useRef(page === 'home' ? 0 : 1);
  scrollTargetRef.current = page === 'home' ? 0 : 1;

  const scrollProgressRef = useRef(page === 'home' ? 0 : 1);

  // Detail page state
  const project = page === 'work-detail' && slug ? getProject(slug) : null;
  const detailRef = useRef<{ name: string; mau: string; url: string } | null>(null);

  // Clear detail state when not on a detail page
  if (page !== 'work-detail') {
    detailRef.current = null;
  }

  const contentSubItems = useMemo(() => {
    if (page === 'work-detail') {
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
  }, [page]);
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
      if (page === 'work') {
        // On work menu: navigate to detail page
        const proj = PROJECTS.find((p) => p.url === url);
        if (proj) {
          navigate(`/work/${proj.slug}`);
        }
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

interface WorkDetailOverlayProps {
  project: ProjectMeta;
  detailRef: React.MutableRefObject<{ name: string; mau: string; url: string } | null>;
}

function WorkDetailOverlay({ project, detailRef }: WorkDetailOverlayProps) {
  const [visible, setVisible] = useState(false);
  const { data: projects } = useFetch(() => api.getProjects());
  const analytics = projects?.projects.find((p) => p.slug === project.slug);
  const mau = analytics ? analytics.views_30d.toLocaleString() : '—';

  // Update the terrain detail ref so the mask renders name + MAU
  detailRef.current = { name: project.name, mau: `${mau} MAU`, url: project.url };

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
      {project.videoUrl ? (
        project.videoUrl.includes('youtube.com') ? (
          <iframe
            className="w-full rounded-lg shadow-lg shadow-black/30"
            style={{ aspectRatio: '16/9', border: 'none' }}
            src={project.videoUrl}
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        ) : (
          <video
            className="w-full rounded-lg shadow-lg shadow-black/30"
            src={project.videoUrl}
            autoPlay
            muted
            loop
            playsInline
          />
        )
      ) : null}
    </div>
  );
}
