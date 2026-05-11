import { useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getArtPiece } from '@/lib/art';
import { useTerrainAnimation } from '@/components/Dashboard/useTerrainAnimation';

const monoFont = "'JetBrains Mono', 'Courier New', monospace";
const headerFont = "'Arial Black','Impact','Helvetica Neue',sans-serif";

export default function ArtPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const piece = getArtPiece(slug!);

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

  if (!piece) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="font-mono text-xs text-white/40">Piece not found</p>
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
            ART
          </div>

          <div
            className="font-black text-4xl md:text-5xl uppercase tracking-tight text-white"
            style={{ fontFamily: headerFont }}
          >
            {piece.name}
          </div>

          <div
            className="text-xs md:text-sm uppercase tracking-wider mt-2 text-white/30"
            style={{ fontFamily: monoFont }}
          >
            {piece.description}
          </div>

          <div className="mt-6">
            <video
              className="w-full rounded-lg shadow-lg shadow-black/30"
              src={piece.videoUrl}
              autoPlay
              muted
              loop
              playsInline
            />
          </div>
        </div>
      </div>
    </div>
  );
}
