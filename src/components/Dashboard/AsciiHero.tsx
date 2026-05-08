// src/components/Dashboard/AsciiHero.tsx

import { useRef } from 'react';
import { Link } from 'react-router-dom';
import ContactForm from '@/components/global/ContactForm';
import { useAsciiAnimation } from './useAsciiAnimation';

export default function AsciiHero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useAsciiAnimation(canvasRef);

  return (
    <section className="relative h-screen overflow-hidden bg-[#08080c]">
      {/* Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Nav */}
      <nav className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-4">
        <Link to="/" className="font-mono text-sm font-bold text-white tracking-widest">
          WR
        </Link>
        <div className="hidden md:flex items-center gap-6 font-mono text-xs">
          <a href="#websites" className="text-cyber-cyan hover:opacity-80 transition-opacity">
            websites
          </a>
          <a href="#art" className="text-cyber-magenta hover:opacity-80 transition-opacity">
            art
          </a>
          <a href="#blog" className="text-cyber-amber hover:opacity-80 transition-opacity">
            blog
          </a>
          <a
            href="https://portfolio-worthy.s3.amazonaws.com/resume.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/60 hover:text-white transition-colors"
          >
            resume
          </a>
          <ContactForm compact />
        </div>
      </nav>

      {/* Bottom overlay: subtitle + scroll indicator */}
      <div className="absolute bottom-0 left-0 right-0 z-10 flex flex-col items-center pb-8">
        <p className="font-mono text-xs text-white/30 tracking-[0.25em] mb-6">
          ENGINEER · ARTIST · BUILDER
        </p>
        <div className="w-px h-8 bg-gradient-to-b from-white/20 to-transparent animate-pulse" />
      </div>
    </section>
  );
}
