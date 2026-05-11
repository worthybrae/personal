import { useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProject } from '@/lib/projects';
import { useFetch } from '@/hooks/useAnalytics';
import { api } from '@/lib/api';
import { useTerrainAnimation } from '@/components/Dashboard/useTerrainAnimation';

const monoFont = "'JetBrains Mono', 'Courier New', monospace";
const headerFont = "'Arial Black','Impact','Helvetica Neue',sans-serif";

export default function ProjectPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const project = getProject(slug!);
  const { data: analyticsData } = useFetch(() => api.getProjects());
  const analytics = analyticsData?.projects.find((p) => p.slug === slug);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const noScroll = useRef(0);
  const contentOpenRef = useRef(true);
  const handleLogoClick = useCallback(() => navigate('/'), [navigate]);
  const handleMenuClick = useCallback(() => navigate('/feed'), [navigate]);

  useTerrainAnimation(canvasRef, noScroll, {
    speedDivisor: 8000,
    showNameMask: false,
    contrast: 6,
    onLogoClick: handleLogoClick,
    onMenuClick: handleMenuClick,
    contentOpenRef,
    skipIntro: true,
  });

  if (!project) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="font-mono text-xs text-white/40">Project not found</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-black">
      <canvas ref={canvasRef} className="fixed inset-0 w-full h-full" />

      <div className="relative z-10 overflow-y-auto" style={{ paddingTop: '120px', paddingBottom: '80px' }}>
        <div className="max-w-2xl mx-auto px-6 text-center">
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

          {analytics && (
            <div
              className="text-xs uppercase tracking-widest mt-1 text-white/20"
              style={{ fontFamily: monoFont }}
            >
              {analytics.views_30d.toLocaleString()} MAU
            </div>
          )}

          {project.videoUrl && (
            <div className="mt-6">
              {project.videoUrl.includes('youtube.com') ? (
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
              )}
            </div>
          )}

          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs tracking-[0.3em] uppercase mt-8 text-white/40 hover:text-white/70 transition-colors"
            style={{ fontFamily: monoFont }}
          >
            visit site →
          </a>
        </div>
      </div>
    </div>
  );
}
