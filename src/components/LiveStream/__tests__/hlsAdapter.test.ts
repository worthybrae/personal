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
    static isSupported = () => false
    static Events = { ERROR: 'error' }

    constructor(options: unknown) {
      hls.constructor(options)
    }

    currentLevel = -1
    levels = [{details:{fragments:[{url:'https://example.com/api/raw-segments/pair.ts',start:20,duration:6.006}]}}]
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

  it('maps matching segment IDs before playback starts, independent of timeline origins', () => {
    const video = document.createElement('video')
    Object.defineProperty(video, 'canPlayType', {value:()=>''})
    video.currentTime=22
    const handle=attachHls(video,'https://example.com/api/stream',vi.fn())
    expect(handle.position?.()).toEqual({id:'pair.ts',offset:2})
    expect(handle.timeFor?.({id:'pair.ts',offset:3})).toBe(23)
    expect(handle.timeFor?.({id:'missing.ts',offset:3})).toBeNull()
    handle.destroy()
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
