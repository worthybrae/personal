import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import type { SpotifyNowPlaying } from '@/types/analytics';

export default function NowPlayingBar() {
  const [data, setData] = useState<SpotifyNowPlaying | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const fetch = () => {
      api.getSpotifyNowPlaying().then(setData).catch(() => {});
    };
    fetch();
    intervalRef.current = setInterval(fetch, 30_000);
    return () => clearInterval(intervalRef.current);
  }, []);

  if (!data || !data.track) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.06] px-4 py-2 flex items-center gap-3 font-mono"
      style={{
        background: 'rgba(10, 14, 20, 0.95)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Sound wave bars */}
      <div className="flex items-end gap-[3px] h-[20px]">
        {[0.8, 0.5, 1, 0.6, 0.9].map((scale, i) => (
          <div
            key={i}
            className="w-[3px] rounded-sm"
            style={
              data.is_playing
                ? {
                    background: '#22c55e',
                    height: `${6 + scale * 14}px`,
                    animation: `soundwave ${0.6 + i * 0.1}s ease-in-out infinite alternate`,
                    animationDelay: `${i * 0.1}s`,
                  }
                : {
                    background: 'rgba(34, 197, 94, 0.4)',
                    height: `${6 + scale * 8}px`,
                  }
            }
          />
        ))}
      </div>

      {/* Status label */}
      <span className="text-[9px] tracking-[2px] uppercase text-[#22c55e]/60 shrink-0">
        {data.is_playing ? 'NOW PLAYING' : 'LAST PLAYED'}
      </span>

      {/* Track info */}
      <span className="text-xs text-white/70 truncate">
        {data.track}
      </span>
      <span className="text-xs text-white/30 truncate hidden sm:inline">
        — {data.artist}
      </span>
    </div>
  );
}
