export type LivePhase = 'fallback' | 'waking' | 'buffering' | 'live' | 'recovering' | 'unavailable'

export interface LiveStatus {
  state: 'starting' | 'live' | 'unavailable'
  buffer_count: number
  ready: boolean
  last_segment_at: number
}

const liveStates = new Set<LiveStatus['state']>(['starting', 'live', 'unavailable'])

function isLiveState(value: unknown): value is LiveStatus['state'] {
  return typeof value === 'string' && liveStates.has(value as LiveStatus['state'])
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function parseLiveStatus(value: unknown): LiveStatus | null {
  if (!isRecord(value)) {
    return null
  }

  const { state, buffer_count, ready, last_segment_at } = value

  if (
    !isLiveState(state) ||
    !isFiniteNumber(buffer_count) ||
    typeof ready !== 'boolean' ||
    !isFiniteNumber(last_segment_at)
  ) {
    return null
  }

  return { state, buffer_count, ready, last_segment_at }
}

export function retryDelay(attempt: number): number {
  return Math.min(2_000 * 2 ** Math.max(0, attempt), 30_000)
}
