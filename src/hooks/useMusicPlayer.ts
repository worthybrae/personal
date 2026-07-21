import { useRef, useCallback, useEffect } from 'react';
import type { MusicTrack } from '@/types/music';
import { shuffledQueue } from '@/lib/music';

export interface MusicPlayerUI {
  title: string;
  isPlaying: boolean;
  progress: number; // 0..1
}

export function useMusicPlayer(tracks: MusicTrack[]) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<number[]>([]);
  const qPosRef = useRef(0);
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;
  const uiRef = useRef<MusicPlayerUI | null>(null);
  // Set when recovering from an expired presigned URL mid-play
  const resumeAtRef = useRef<number | null>(null);

  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      const a = new Audio();
      a.preload = 'auto';
      audioRef.current = a;

      a.addEventListener('timeupdate', () => {
        if (uiRef.current && a.duration > 0) {
          uiRef.current.progress = Math.min(1, Math.max(0, a.currentTime / a.duration));
        }
      });
      a.addEventListener('play', () => { if (uiRef.current) uiRef.current.isPlaying = true; });
      a.addEventListener('pause', () => { if (uiRef.current) uiRef.current.isPlaying = false; });
      a.addEventListener('ended', () => nextRef.current());
      a.addEventListener('loadedmetadata', () => {
        if (resumeAtRef.current != null) {
          a.currentTime = resumeAtRef.current;
          resumeAtRef.current = null;
        }
      });
      a.addEventListener('error', () => {
        // Likely an expired presigned URL: re-request the stream and resume position
        const idx = queueRef.current[qPosRef.current];
        const track = tracksRef.current[idx];
        if (!track || resumeAtRef.current != null) return; // one retry, no loops
        resumeAtRef.current = a.currentTime || 0;
        a.src = `/api/music/stream/${track.id}?r=${Date.now()}`;
        a.play().catch(() => { resumeAtRef.current = null; });
      });
    }
    return audioRef.current;
  }, []);

  const startCurrent = useCallback(() => {
    const idx = queueRef.current[qPosRef.current];
    const track = tracksRef.current[idx];
    if (!track) return;
    const a = getAudio();
    resumeAtRef.current = null;
    uiRef.current = { title: track.title, isPlaying: false, progress: 0 };
    a.src = `/api/music/stream/${track.id}`;
    a.play().catch(() => {});
  }, [getAudio]);

  const playAt = useCallback((index: number) => {
    // Queue = list order starting at the clicked track, wrapping around
    const n = tracksRef.current.length;
    queueRef.current = Array.from({ length: n }, (_, i) => (index + i) % n);
    qPosRef.current = 0;
    startCurrent();
  }, [startCurrent]);

  const playShuffled = useCallback(() => {
    queueRef.current = shuffledQueue(tracksRef.current.length);
    qPosRef.current = 0;
    startCurrent();
  }, [startCurrent]);

  const next = useCallback(() => {
    if (queueRef.current.length === 0) return;
    qPosRef.current = (qPosRef.current + 1) % queueRef.current.length;
    startCurrent();
  }, [startCurrent]);
  const nextRef = useRef(next);
  nextRef.current = next;

  const prev = useCallback(() => {
    if (queueRef.current.length === 0) return;
    const a = getAudio();
    if (a.currentTime > 3) { a.currentTime = 0; return; } // restart track first
    qPosRef.current = (qPosRef.current - 1 + queueRef.current.length) % queueRef.current.length;
    startCurrent();
  }, [getAudio, startCurrent]);

  const toggle = useCallback(() => {
    const a = audioRef.current;
    if (!a || !a.src) return;
    if (a.paused) a.play().catch(() => {}); else a.pause();
  }, []);

  // Stop audio when the component unmounts (route unmount = leaving the SPA shell)
  useEffect(() => () => { audioRef.current?.pause(); }, []);

  return { playAt, playShuffled, toggle, next, prev, uiRef };
}
