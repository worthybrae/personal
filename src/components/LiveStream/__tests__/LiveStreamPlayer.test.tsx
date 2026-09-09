import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { attachHls, StreamHandle } from '../hlsAdapter'
import { LiveStreamPlayer } from '../LiveStreamPlayer'

const fallbackUrl = 'https://portfolio-worthy.s3.us-east-1.amazonaws.com/abbey_road_best.mp4'
const baseUrl = 'https://live.worthyrae.com'

const startingStatus = {
  state: 'starting',
  buffer_count: 1,
  ready: false,
  last_segment_at: 1,
} as const

const readyStatus = {
  state: 'live',
  buffer_count: 3,
  ready: true,
  last_segment_at: 2,
} as const

function response(body: unknown): Response {
  return {
    ok: true,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response
}

function streamDouble() {
  const handle: StreamHandle = { destroy: vi.fn() }
  const attachStream = vi.fn<typeof attachHls>(() => handle)
  return { attachStream, handle }
}

async function renderAttachedPlayer() {
  const stream = streamDouble()
  vi.mocked(fetch).mockResolvedValue(response(readyStatus))
  const view = render(
    <LiveStreamPlayer fallbackUrl={fallbackUrl} baseUrl={baseUrl} attachStream={stream.attachStream} />,
  )
  await vi.advanceTimersByTimeAsync(0)
  return { ...view, ...stream }
}

describe('LiveStreamPlayer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn())
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('renders the fallback while the first status request is pending', () => {
    vi.mocked(fetch).mockImplementation(() => new Promise(() => undefined))

    render(<LiveStreamPlayer fallbackUrl={fallbackUrl} baseUrl={baseUrl} />)

    const fallback = screen.getByTestId('fallback-video')
    expect(fallback).toHaveAttribute('src', fallbackUrl)
    expect(fallback).toHaveAttribute('loop')
    expect(screen.getByText('STARTING LIVE FEED')).toBeInTheDocument()
  })

  it('fills its parent when requested without forcing an aspect ratio', () => {
    vi.mocked(fetch).mockImplementation(() => new Promise(() => undefined))

    render(<LiveStreamPlayer fallbackUrl={fallbackUrl} baseUrl={baseUrl} fill />)

    const root = screen.getByTestId('live-stream-player')
    expect(root).toHaveClass('h-full', 'w-full')
    expect(root).not.toHaveClass('aspect-video')
  })

  it('keeps the inline aspect ratio by default', () => {
    vi.mocked(fetch).mockImplementation(() => new Promise(() => undefined))

    render(<LiveStreamPlayer fallbackUrl={fallbackUrl} baseUrl={baseUrl} />)

    expect(screen.getByTestId('live-stream-player')).toHaveClass('aspect-video')
  })

  it('polls status until ready and attaches the live playlist', async () => {
    const { attachStream } = streamDouble()
    vi.mocked(fetch)
      .mockResolvedValueOnce(response(startingStatus))
      .mockResolvedValueOnce(response(readyStatus))

    render(<LiveStreamPlayer fallbackUrl={fallbackUrl} baseUrl={baseUrl} attachStream={attachStream} />)
    await vi.advanceTimersByTimeAsync(0)
    expect(fetch).toHaveBeenCalledWith(`${baseUrl}/api/live/status`, expect.objectContaining({ cache: 'no-store' }))
    expect(attachStream).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(2_000)

    expect(attachStream).toHaveBeenCalledOnce()
    expect(attachStream).toHaveBeenCalledWith(
      expect.any(HTMLVideoElement),
      `${baseUrl}/api/stream`,
      expect.any(Function),
    )
  })

  it('does not reveal live video before canplay', async () => {
    await renderAttachedPlayer()

    expect(screen.getByTestId('live-video')).toHaveClass('opacity-0')
    expect(screen.queryByText('LIVE')).not.toBeInTheDocument()
    expect(screen.getByText('STARTING LIVE FEED')).toBeInTheDocument()
  })

  it('reveals live video on canplay and shows LIVE only after the crossfade', async () => {
    await renderAttachedPlayer()
    const liveVideo = screen.getByTestId('live-video') as HTMLVideoElement

    fireEvent.canPlay(liveVideo)

    expect(liveVideo.play).toHaveBeenCalledOnce()
    expect(liveVideo).toHaveClass('opacity-100')
    expect(screen.queryByText('LIVE')).not.toBeInTheDocument()
    expect(screen.getByText('STARTING LIVE FEED')).toBeInTheDocument()

    await vi.advanceTimersByTimeAsync(499)
    expect(screen.queryByText('LIVE')).not.toBeInTheDocument()

    await vi.advanceTimersByTimeAsync(1)
    expect(screen.getByText('LIVE')).toBeInTheDocument()
    expect(screen.queryByText('STARTING LIVE FEED')).not.toBeInTheDocument()
  })

  it('keeps the fallback opaque beneath visible live video and through recovery', async () => {
    const { attachStream, handle } = await renderAttachedPlayer()
    const fallbackVideo = screen.getByTestId('fallback-video')
    const liveVideo = screen.getByTestId('live-video')

    fireEvent.canPlay(liveVideo)

    expect(liveVideo).toHaveClass('opacity-100')
    expect(fallbackVideo).toHaveClass('opacity-100')

    act(() => attachStream.mock.calls[0]?.[2]())

    expect(handle.destroy).toHaveBeenCalledOnce()
    expect(liveVideo).toHaveClass('opacity-0')
    expect(fallbackVideo).toHaveClass('opacity-100')
  })

  it('keeps fallback and shows retrying after ninety seconds', async () => {
    vi.mocked(fetch).mockResolvedValue(response(startingStatus))

    render(<LiveStreamPlayer fallbackUrl={fallbackUrl} baseUrl={baseUrl} />)
    await vi.advanceTimersByTimeAsync(90_000)

    expect(screen.getByTestId('fallback-video')).toHaveClass('opacity-100')
    expect(screen.getByTestId('live-video')).toHaveClass('opacity-0')
    expect(screen.getByText('LIVE FEED UNAVAILABLE · RETRYING')).toBeInTheDocument()
  })

  it('bounds every hanging status attempt after the first timeout', async () => {
    const signals: AbortSignal[] = []
    vi.mocked(fetch).mockImplementation((_input, init) => {
      signals.push(init?.signal as AbortSignal)
      return new Promise(() => undefined)
    })

    const { unmount } = render(<LiveStreamPlayer fallbackUrl={fallbackUrl} baseUrl={baseUrl} />)
    expect(signals).toHaveLength(1)

    await vi.advanceTimersByTimeAsync(90_000)
    expect(signals[0]?.aborted).toBe(true)

    await vi.advanceTimersByTimeAsync(2_000)
    expect(signals).toHaveLength(2)
    expect(signals[1]?.aborted).toBe(false)

    await vi.advanceTimersByTimeAsync(90_000)
    expect(signals[1]?.aborted).toBe(true)
    expect(screen.getByText('LIVE FEED UNAVAILABLE · RETRYING')).toBeInTheDocument()

    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('times out a retry stream that never reaches canplay after prior live playback', async () => {
    const firstHandle: StreamHandle = { destroy: vi.fn() }
    const secondHandle: StreamHandle = { destroy: vi.fn() }
    const handles = [firstHandle, secondHandle]
    let attachment = 0
    const attachStream = vi.fn<typeof attachHls>(() => handles[attachment++] as StreamHandle)
    vi.mocked(fetch).mockResolvedValue(response(readyStatus))

    const { unmount } = render(
      <LiveStreamPlayer fallbackUrl={fallbackUrl} baseUrl={baseUrl} attachStream={attachStream} />,
    )
    await vi.advanceTimersByTimeAsync(0)
    fireEvent.canPlay(screen.getByTestId('live-video'))
    await vi.advanceTimersByTimeAsync(500)
    expect(screen.getByText('LIVE')).toBeInTheDocument()

    act(() => attachStream.mock.calls[0]?.[2]())
    expect(firstHandle.destroy).toHaveBeenCalledOnce()

    await vi.advanceTimersByTimeAsync(2_000)
    expect(attachStream).toHaveBeenCalledTimes(2)
    expect(secondHandle.destroy).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(90_000)
    expect(secondHandle.destroy).toHaveBeenCalledOnce()
    expect(screen.getByText('LIVE FEED UNAVAILABLE · RETRYING')).toBeInTheDocument()

    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('returns to fallback after a fatal HLS error', async () => {
    const { attachStream, handle } = await renderAttachedPlayer()
    const liveVideo = screen.getByTestId('live-video')
    fireEvent.canPlay(liveVideo)
    const recover = attachStream.mock.calls[0]?.[2]

    act(() => recover?.())

    expect(handle.destroy).toHaveBeenCalledOnce()
    expect(liveVideo).toHaveClass('opacity-0')
    expect(screen.getByTestId('fallback-video')).toHaveClass('opacity-100')
    expect(screen.getByText('LIVE FEED UNAVAILABLE · RETRYING')).toBeInTheDocument()
  })

  it('returns to fallback when live playback stops progressing', async () => {
    const { handle } = await renderAttachedPlayer()
    const liveVideo = screen.getByTestId('live-video') as HTMLVideoElement
    Object.defineProperty(liveVideo, 'currentTime', { value: 12, writable: true })
    fireEvent.canPlay(liveVideo)

    await vi.advanceTimersByTimeAsync(10_000)

    expect(handle.destroy).toHaveBeenCalledOnce()
    expect(liveVideo).toHaveClass('opacity-0')
    expect(screen.getByText('LIVE FEED UNAVAILABLE · RETRYING')).toBeInTheDocument()
  })

  it('clears timers and destroys the stream on unmount', async () => {
    const { unmount, handle } = await renderAttachedPlayer()
    fireEvent.canPlay(screen.getByTestId('live-video'))

    unmount()

    expect(handle.destroy).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('aborts a pending status request on unmount', () => {
    let requestSignal: AbortSignal | undefined
    vi.mocked(fetch).mockImplementation((_input, init) => {
      requestSignal = init?.signal ?? undefined
      return new Promise(() => undefined)
    })

    const { unmount } = render(<LiveStreamPlayer fallbackUrl={fallbackUrl} baseUrl={baseUrl} />)
    expect(requestSignal?.aborted).toBe(false)

    unmount()

    expect(requestSignal?.aborted).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('uses fallback only when baseUrl is absent', () => {
    render(<LiveStreamPlayer fallbackUrl={fallbackUrl} />)

    expect(screen.getByTestId('fallback-video')).toHaveAttribute('src', fallbackUrl)
    expect(screen.queryByTestId('live-video')).not.toBeInTheDocument()
    expect(screen.queryByText('STARTING LIVE FEED')).not.toBeInTheDocument()
    expect(screen.queryByText('LIVE FEED UNAVAILABLE · RETRYING')).not.toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })
})
