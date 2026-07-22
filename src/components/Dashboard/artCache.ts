// src/components/Dashboard/artCache.ts
// Lazy album-art loader for the music tile grid. Images are fetched from the
// stable, browser-cacheable /api/music/art/{id} endpoint (M2) and kept in a
// small in-memory LRU so scrolling fast through the catalog doesn't pile up
// unbounded Image objects. Pure LRU bookkeeping is split into LruSet so it
// can be unit-tested without touching the DOM.

const CACHE_CAPACITY = 150;

/**
 * Tracks recency of a bounded set of string keys. touch() marks a key as
 * most-recently-used and, once the set exceeds capacity, evicts and returns
 * the single least-recently-used key so the caller can clean up whatever
 * data it keyed off of (an Image, a failure flag, etc).
 */
export class LruSet {
  private readonly capacity: number;
  private readonly order: Map<string, true>;

  constructor(capacity: number) {
    this.capacity = Math.max(1, capacity);
    this.order = new Map();
  }

  has(key: string): boolean {
    return this.order.has(key);
  }

  get size(): number {
    return this.order.size;
  }

  /** Marks `key` as most-recently-used. Returns the evicted key, or null if nothing was evicted. */
  touch(key: string): string | null {
    if (this.order.has(key)) this.order.delete(key);
    this.order.set(key, true);
    if (this.order.size > this.capacity) {
      const oldest = this.order.keys().next().value as string;
      this.order.delete(oldest);
      return oldest;
    }
    return null;
  }

  delete(key: string): void {
    this.order.delete(key);
  }
}

const imageCache = new Map<string, HTMLImageElement>();
const inFlight = new Set<string>();
const failed = new Set<string>();
const lru = new LruSet(CACHE_CAPACITY);

function evict(evictedKey: string | null) {
  if (!evictedKey) return;
  imageCache.delete(evictedKey);
  failed.delete(evictedKey);
}

/**
 * Returns the cached, loaded image for `id`, or null if it isn't ready yet
 * (never loaded, still in flight, or previously failed). On a miss that
 * isn't already loading or marked failed, kicks off a load — the browser
 * fetches /api/music/art/{id}, which is small and cacheable per M2.
 * Failed loads are remembered (so a broken/missing track doesn't retry every
 * frame) but are retried automatically once evicted by the LRU.
 */
export function getArt(id: string): HTMLImageElement | null {
  if (!id) return null;

  const cached = imageCache.get(id);
  if (cached) {
    evict(lru.touch(id));
    return cached;
  }

  if (failed.has(id) || inFlight.has(id)) return null;

  inFlight.add(id);
  const img = new Image();
  img.onload = () => {
    inFlight.delete(id);
    imageCache.set(id, img);
    evict(lru.touch(id));
  };
  img.onerror = () => {
    inFlight.delete(id);
    failed.add(id);
    evict(lru.touch(id));
  };
  img.src = `/api/music/art/${id}`;
  return null;
}
