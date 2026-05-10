import { useFetch } from '@/hooks/useAnalytics';
import { api } from '@/lib/api';

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <span className="text-[#f97316] text-[8px]">
      {'★'.repeat(full)}{half ? '½' : ''}
    </span>
  );
}

export default function FilmStrip() {
  const { data } = useFetch(() => api.getLetterboxdRecent());

  if (!data || data.films.length === 0) {
    return (
      <div className="font-mono text-xs text-white/30 py-4">
        <span className="text-[#f97316]/50 text-[9px] tracking-[2px] uppercase">NO RECENT FILMS</span>
      </div>
    );
  }

  const films = data.films.slice(0, 5);

  return (
    <div>
      <div className="text-[#f97316] text-[9px] font-mono tracking-[2px] uppercase mb-3">
        RECENTLY WATCHED
      </div>
      <div className="flex items-center justify-start">
        <div className="border-t-[3px] border-b-[3px] border-white/15 py-0.5 flex">
          <div className="flex flex-col justify-between px-1 select-none">
            <span className="text-white/15 text-[6px] leading-none">◻◻◻</span>
            <span className="text-white/15 text-[6px] leading-none">◻◻◻</span>
          </div>
          <div className="flex gap-1.5">
            {films.map((film) => (
              <a
                key={film.url}
                href={film.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-[52px] h-[72px] rounded-sm border border-[#f97316]/20 flex flex-col items-center justify-end p-1 relative overflow-hidden group hover:border-[#f97316]/50 transition-colors"
                style={{
                  background: film.poster_url
                    ? `url(${film.poster_url}) center/cover`
                    : 'linear-gradient(135deg, #2a1a0a, #1a0a00)',
                }}
              >
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)',
                  }}
                />
                <div className="relative z-10 w-full text-center" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
                  <div className="text-[#f97316] text-[7px] truncate font-mono">{film.title}</div>
                  <StarRating rating={film.rating} />
                </div>
              </a>
            ))}
          </div>
          <div className="flex flex-col justify-between px-1 select-none">
            <span className="text-white/15 text-[6px] leading-none">◻◻◻</span>
            <span className="text-white/15 text-[6px] leading-none">◻◻◻</span>
          </div>
        </div>
      </div>
    </div>
  );
}
