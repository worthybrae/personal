// src/components/Layout/TerrainLayout.tsx

import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTerrainAnimation } from '../Dashboard/useTerrainAnimation';

interface TerrainLayoutProps {
  title: string;
  children: React.ReactNode;
}

export default function TerrainLayout({ title, children }: TerrainLayoutProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useTerrainAnimation(canvasRef, {
    speedDivisor: 8000,
    showNameMask: false,
    contrast: 6,
  });

  return (
    <div className="relative min-h-screen bg-[#08080c]">
      {/* Terrain background — fixed so it stays behind while content scrolls */}
      <canvas ref={canvasRef} className="fixed inset-0 w-full h-full" />

      {/* Content layer */}
      <div className="relative z-10 min-h-screen">
        {/* Back link */}
        <div className="fixed top-4 left-6 z-20">
          <Link
            to="/"
            className="font-mono text-xs text-white/60 hover:text-white transition-colors"
          >
            ← home
          </Link>
        </div>

        {/* Page content */}
        <div className="max-w-2xl mx-auto px-6 pt-20 pb-16">
          <h1 className="font-mono text-4xl md:text-5xl font-bold text-white tracking-wider mb-12">
            {title}
          </h1>
          {children}
        </div>
      </div>
    </div>
  );
}
