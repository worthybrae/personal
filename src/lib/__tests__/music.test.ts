import { describe, it, expect } from 'vitest';
import { formatDuration, filterTracks, shuffledQueue } from '../music';
import type { MusicTrack } from '@/types/music';

const t = (id: string, title: string, artist = ''): MusicTrack =>
  ({ id, title, duration_s: 100, size_bytes: 1, ext: 'mp3', artist, album: '', has_art: false });

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
  const tracks = [
    t('a', 'Midnight Drums', 'Travis Scott'),
    t('b', 'drums at dawn', 'Mick Jenkins'),
    t('c', 'Sunset', 'Drake'),
  ];
  it('returns all tracks for empty/whitespace query', () => {
    expect(filterTracks(tracks, '')).toEqual(tracks);
    expect(filterTracks(tracks, '   ')).toEqual(tracks);
  });
  it('matches case-insensitive substrings in the title', () => {
    expect(filterTracks(tracks, 'DRUMS').map(x => x.id)).toEqual(['a', 'b']);
  });
  it('matches by artist', () => {
    expect(filterTracks(tracks, 'drake').map(x => x.id)).toEqual(['c']);
    expect(filterTracks(tracks, 'MICK').map(x => x.id)).toEqual(['b']);
  });
  it('matches tokens spanning title and artist', () => {
    expect(filterTracks(tracks, 'travis drums').map(x => x.id)).toEqual(['a']);
    expect(filterTracks(tracks, 'drums travis').map(x => x.id)).toEqual(['a']);
  });
  it('returns empty for no match', () => {
    expect(filterTracks(tracks, 'zzz')).toEqual([]);
    expect(filterTracks(tracks, 'drums drake')).toEqual([]);
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
