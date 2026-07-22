import { describe, it, expect } from 'vitest';
import { LruSet } from '../artCache';

describe('LruSet', () => {
  it('has() is false for untouched keys, true after touch', () => {
    const lru = new LruSet(3);
    expect(lru.has('a')).toBe(false);
    lru.touch('a');
    expect(lru.has('a')).toBe(true);
  });

  it('does not evict while under capacity', () => {
    const lru = new LruSet(3);
    expect(lru.touch('a')).toBeNull();
    expect(lru.touch('b')).toBeNull();
    expect(lru.touch('c')).toBeNull();
    expect(lru.size).toBe(3);
    expect(lru.has('a')).toBe(true);
    expect(lru.has('b')).toBe(true);
    expect(lru.has('c')).toBe(true);
  });

  it('evicts the least-recently-used key once capacity is exceeded', () => {
    const lru = new LruSet(2);
    lru.touch('a');
    lru.touch('b');
    const evicted = lru.touch('c'); // 'a' is oldest, untouched since
    expect(evicted).toBe('a');
    expect(lru.has('a')).toBe(false);
    expect(lru.has('b')).toBe(true);
    expect(lru.has('c')).toBe(true);
    expect(lru.size).toBe(2);
  });

  it('re-touching a key refreshes its recency so it is not the next eviction', () => {
    const lru = new LruSet(2);
    lru.touch('a');
    lru.touch('b');
    lru.touch('a'); // 'a' is now MRU, 'b' is now LRU
    const evicted = lru.touch('c');
    expect(evicted).toBe('b');
    expect(lru.has('a')).toBe(true);
    expect(lru.has('b')).toBe(false);
    expect(lru.has('c')).toBe(true);
  });

  it('touch() on an existing key does not change size or evict', () => {
    const lru = new LruSet(2);
    lru.touch('a');
    lru.touch('b');
    const evicted = lru.touch('a');
    expect(evicted).toBeNull();
    expect(lru.size).toBe(2);
  });

  it('delete() removes a key so it no longer counts toward capacity', () => {
    const lru = new LruSet(2);
    lru.touch('a');
    lru.touch('b');
    lru.delete('a');
    expect(lru.has('a')).toBe(false);
    expect(lru.size).toBe(1);
    const evicted = lru.touch('c');
    expect(evicted).toBeNull(); // room again after delete
    expect(lru.size).toBe(2);
  });

  it('evicting a key allows it to be touched fresh again (retry semantics)', () => {
    const lru = new LruSet(1);
    lru.touch('a');
    const evicted = lru.touch('b');
    expect(evicted).toBe('a');
    expect(lru.has('a')).toBe(false);
    // 'a' can be added again as if new
    const evicted2 = lru.touch('a');
    expect(evicted2).toBe('b');
    expect(lru.has('a')).toBe(true);
  });

  it('clamps capacity to at least 1', () => {
    const lru = new LruSet(0);
    const evicted = lru.touch('a');
    expect(evicted).toBeNull();
    expect(lru.has('a')).toBe(true);
    const evicted2 = lru.touch('b');
    expect(evicted2).toBe('a');
  });
});
