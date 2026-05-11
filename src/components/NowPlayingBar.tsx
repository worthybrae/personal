import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api';
import type { SpotifyNowPlaying } from '@/types/analytics';

const monoFont = "'JetBrains Mono', 'Courier New', monospace";

export default function NowPlayingBar() {
  const [data, setData] = useState<SpotifyNowPlaying | null>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const textRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const fetchNowPlaying = () => {
      if (document.visibilityState === 'hidden') return;
      api.getSpotifyNowPlaying().then(setData).catch(() => {});
    };
    fetchNowPlaying();
    intervalRef.current = setInterval(fetchNowPlaying, 30_000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const checkOverflow = useCallback(() => {
    if (textRef.current && containerRef.current) {
      setIsOverflowing(textRef.current.scrollWidth > containerRef.current.clientWidth);
    }
  }, []);

  useEffect(() => {
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [data, checkOverflow]);

  if (!data || !data.track) return null;

  const progress = data.duration_ms > 0
    ? Math.round((data.progress_ms / data.duration_ms) * 100)
    : 0;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.04] px-4 py-2"
      style={{
        background: 'rgba(4, 6, 10, 0.92)',
        backdropFilter: 'blur(12px)',
        fontFamily: monoFont,
      }}
    >
      <div className="max-w-2xl mx-auto flex items-center gap-3">
        {/* Sound wave bars */}
        <div className="flex items-end gap-[2px] h-[14px] shrink-0">
          {[0.7, 0.4, 1, 0.5, 0.8].map((scale, i) => (
            <div
              key={i}
              className="w-[2px] rounded-[1px] origin-bottom"
              style={
                data.is_playing
                  ? {
                      background: '#22c55e',
                      height: `${4 + scale * 10}px`,
                      animation: `soundwave ${0.5 + i * 0.12}s ease-in-out infinite alternate`,
                      animationDelay: `${i * 0.08}s`,
                    }
                  : {
                      background: 'rgba(255, 255, 255, 0.15)',
                      height: `${4 + scale * 6}px`,
                    }
              }
            />
          ))}
        </div>

        {/* Status */}
        <span
          className="text-[8px] tracking-[0.25em] uppercase shrink-0"
          style={{
            color: data.is_playing ? 'rgba(34, 197, 94, 0.5)' : 'rgba(255, 255, 255, 0.2)',
          }}
        >
          {data.is_playing ? 'NOW' : 'LAST'}
        </span>

        {/* Track / Artist — scrolls if text overflows */}
        <div ref={containerRef} className="overflow-hidden min-w-0 flex-1">
          <span
            ref={textRef}
            className={`text-[10px] tracking-[0.08em] uppercase text-white/40 whitespace-nowrap inline-block ${isOverflowing ? 'animate-marquee' : ''}`}
          >
            {data.track}
            <span className="text-white/20"> — {data.artist}</span>
            {isOverflowing && (
              <span className="px-8">
                {data.track}
                <span className="text-white/20"> — {data.artist}</span>
              </span>
            )}
          </span>
        </div>

        {/* Progress bar */}
        {data.is_playing && (
          <div className="hidden sm:flex items-center gap-2 shrink-0 ml-auto">
            <div className="w-16 h-[1px] bg-white/[0.06] relative">
              <div
                className="absolute left-0 top-0 h-full bg-white/20"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
