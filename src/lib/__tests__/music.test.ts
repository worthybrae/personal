import { describe, it, expect } from 'vitest';
import { formatDuration, filterTracks, shuffledQueue } from '../music';
import type { MusicTrack } from '@/types/music';

const t = (id: string, title: string): MusicTrack =>
  ({ id, title, duration_s: 100, size_bytes: 1, ext: 'mp3', artist: '', album: '', has_art: false });

describe('formatDuration', () => {
  it('formats m:ss', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(59)).toBe('0:59');
    expect(formatDuration(61)).toBe('1:01');
    expect(formatDuration(600)).toBe('10:00');
  });
  it('floors fractional seconds', () => {
    expect(formatDuration(61.9)).toBe('1:01');
  });
});

describe('filterTracks', () => {
  const tracks = [t('a', 'Midnight Drums'), t('b', 'drums at dawn'), t('c', 'Sunset')];
  it('returns all tracks for empty/whitespace query', () => {
    expect(filterTracks(tracks, '')).toEqual(tracks);
    expect(filterTracks(tracks, '   ')).toEqual(tracks);
  });
  it('matches case-insensitive substrings', () => {
    expect(filterTracks(tracks, 'DRUMS').map(x => x.id)).toEqual(['a', 'b']);
  });
  it('returns empty for no match', () => {
    expect(filterTracks(tracks, 'zzz')).toEqual([]);
  });
});

describe('shuffledQueue', () => {
  it('is a permutation of 0..n-1', () => {
    const q = shuffledQueue(50);
    expect([...q].sort((x, y) => x - y)).toEqual(Array.from({ length: 50 }, (_, i) => i));
  });
  it('handles n=0 and n=1', () => {
    expect(shuffledQueue(0)).toEqual([]);
    expect(shuffledQueue(1)).toEqual([0]);
  });
});
