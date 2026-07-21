import type { MusicTrack } from '@/types/music';

export function formatDuration(s: number): string {
  const total = Math.floor(s);
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function filterTracks(tracks: MusicTrack[], query: string): MusicTrack[] {
  const q = query.trim().toLowerCase();
  if (!q) return tracks;
  return tracks.filter((t) => t.title.toLowerCase().includes(q));
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
