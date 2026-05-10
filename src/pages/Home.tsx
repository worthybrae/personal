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
