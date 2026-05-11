import { useFetch } from '@/hooks/useAnalytics';
import { api } from '@/lib/api';

export default function SpotifyRecord() {
  const { data } = useFetch(() => api.getSpotifyNowPlaying());

  if (!data || !data.track) {
    return (
      <div className="font-mono text-xs text-white/30 py-4">
        <span className="text-[#22c55e]/50 text-[9px] tracking-[2px] uppercase">♪ OFFLINE</span>
      </div>
    );
  }

  const progressPct = data.duration_ms > 0 ? data.progress_ms / data.duration_ms : 0;
  const barLen = 18;
  const filled = Math.round(progressPct * barLen);
  const progressBar = '▓'.repeat(filled) + '░'.repeat(barLen - filled);

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-5">
      {/* Spinning Record */}
      <div
        className={`w-[100px] h-[100px] md:w-[120px] md:h-[120px] rounded-full border-2 border-[#22c55e]/30 flex items-center justify-center ${data.is_playing ? 'animate-[spin_3s_linear_infinite]' : ''}`}
        style={{
          background: `radial-gradient(circle, #111 30%, #0a0e14 31%, #0a0e14 44%, rgba(34,197,94,0.08) 45%, rgba(34,197,94,0.04) 60%, #0a0e14 61%, #0a0e14 74%, rgba(34,197,94,0.06) 75%, rgba(34,197,94,0.02) 90%, #0a0e14 91%)`,
        }}
      >
        <div className="w-9 h-9 rounded-full border border-[#22c55e]/30 overflow-hidden flex items-center justify-center bg-[#1a1a2e]">
          {data.album_art_url ? (
            <img src={data.album_art_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-1 h-1 rounded-full bg-[#22c55e]" />
          )}
        </div>
      </div>

      {/* Track Info */}
      <div className="font-mono">
        <div className="text-[#22c55e] text-[9px] tracking-[2px] uppercase">
          {data.is_playing ? 'NOW PLAYING' : 'LAST PLAYED'}
        </div>
        <div className="text-white text-sm font-bold mt-1.5 max-w-[200px] truncate">
          {data.track}
        </div>
        <div className="text-white/40 text-xs mt-0.5">{data.artist}</div>
        {data.is_playing && (
          <div className="text-white/30 text-[10px] mt-2.5 font-mono">
            <span className="text-[#22c55e]/60">{progressBar}</span>{' '}
            {formatTime(data.progress_ms)} / {formatTime(data.duration_ms)}
          </div>
        )}
      </div>
    </div>
  );
}
