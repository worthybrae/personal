import { describe, expect, it } from 'vitest'
import { parseLiveStatus, retryDelay } from '../liveStreamState'

describe('parseLiveStatus', () => {
  it('accepts the public backend shape', () => {
    expect(parseLiveStatus({ state: 'live', buffer_count: 3, ready: true, last_segment_at: 42 }))
      .toEqual({ state: 'live', buffer_count: 3, ready: true, last_segment_at: 42 })
  })

  it('rejects malformed status payloads', () => {
    expect(parseLiveStatus({ state: 'live', ready: 'yes' })).toBeNull()
    expect(parseLiveStatus({ state: 'unknown', buffer_count: 3, ready: true, last_segment_at: 42 })).toBeNull()
    expect(parseLiveStatus({ state: 'live', buffer_count: Number.NaN, ready: true, last_segment_at: 42 })).toBeNull()
    expect(parseLiveStatus({ state: 'live', buffer_count: 3, ready: true, last_segment_at: Infinity })).toBeNull()
    expect(parseLiveStatus([])).toBeNull()
    expect(parseLiveStatus(null)).toBeNull()
  })
})

describe('retryDelay', () => {
  it('starts at two seconds and caps at thirty seconds', () => {
    expect(retryDelay(0)).toBe(2_000)
    expect(retryDelay(2)).toBe(8_000)
    expect(retryDelay(20)).toBe(30_000)
  })
})
