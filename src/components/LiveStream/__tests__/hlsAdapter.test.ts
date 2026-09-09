import { beforeEach, describe, expect, it, vi } from 'vitest'

const hls = vi.hoisted(() => ({
  constructor: vi.fn(),
  loadSource: vi.fn(),
  attachMedia: vi.fn(),
  on: vi.fn(),
  destroy: vi.fn(),
}))

vi.mock('hls.js', () => {
  class HlsMock {
    static Events = { ERROR: 'error' }

    constructor(options: unknown) {
      hls.constructor(options)
    }

    loadSource = hls.loadSource
    attachMedia = hls.attachMedia
    on = hls.on
    destroy = hls.destroy
  }

  return { default: HlsMock }
})

import { attachHls } from '../hlsAdapter'

describe('attachHls', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('forwards native playback errors and removes its listener when destroyed', () => {
    const video = document.createElement('video')
    const load = vi.spyOn(video, 'load').mockImplementation(() => undefined)
    const onFatal = vi.fn()
    Object.defineProperty(video, 'canPlayType', { value: () => 'probably' })

    const handle = attachHls(video, 'https://live.worthyrae.com/api/stream', onFatal)

    expect(video.src).toBe('https://live.worthyrae.com/api/stream')
    expect(hls.constructor).not.toHaveBeenCalled()

    video.dispatchEvent(new Event('error'))
    expect(onFatal).toHaveBeenCalledOnce()

    handle.destroy()

    expect(video.getAttribute('src')).toBeNull()
    expect(load).toHaveBeenCalledOnce()
    video.dispatchEvent(new Event('error'))
    expect(onFatal).toHaveBeenCalledOnce()
  })

  it('attaches hls.js and forwards fatal playback errors', () => {
    const video = document.createElement('video')
    const onFatal = vi.fn()
    Object.defineProperty(video, 'canPlayType', { value: () => '' })

    const handle = attachHls(video, 'https://live.worthyrae.com/api/stream', onFatal)

    expect(hls.constructor).toHaveBeenCalledWith({
      lowLatencyMode: false,
      liveSyncDuration: 18,
    })
    expect(hls.loadSource).toHaveBeenCalledOnce()
    expect(hls.loadSource).toHaveBeenCalledWith('https://live.worthyrae.com/api/stream')
    expect(hls.attachMedia).toHaveBeenCalledOnce()
    expect(hls.attachMedia).toHaveBeenCalledWith(video)
    expect(hls.on).toHaveBeenCalledOnce()
    expect(hls.on).toHaveBeenCalledWith('error', expect.any(Function))

    const errorHandler = hls.on.mock.calls[0]?.[1] as (_event: string, data: { fatal: boolean }) => void
    errorHandler('error', { fatal: false })
    expect(onFatal).not.toHaveBeenCalled()
    errorHandler('error', { fatal: true })
    expect(onFatal).toHaveBeenCalledOnce()

    handle.destroy()
    expect(hls.destroy).toHaveBeenCalledOnce()
  })
})
