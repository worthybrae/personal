import { useRef, useCallback, useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTerrainAnimation, type LabelId } from '@/components/Dashboard/useTerrainAnimation';
import { getProject, PROJECTS } from '@/lib/projects';

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
  const detailRef = useRef<{ name: string; mau: string } | null>(null);

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
    </div>
  );
}
