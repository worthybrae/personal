import type { MusicTrack } from '@/types/music';

export function formatDuration(s: number): string {
  const total = Math.floor(s);
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

// Unified search over title + artist: every whitespace-separated token must
// appear somewhere in "title artist", so "travis 3 wayz" matches a track
// whose words span both fields.
export function filterTracks(tracks: MusicTrack[], query: string): MusicTrack[] {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return tracks;
  return tracks.filter((t) => {
    const haystack = `${t.title} ${t.artist}`.toLowerCase();
    return tokens.every((tok) => haystack.includes(tok));
  });
}

// Fisher-Yates permutation of [0, n)
export function shuffledQueue(n: number): number[] {
  const q = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [q[i], q[j]] = [q[j], q[i]];
  }
  return q;
}
