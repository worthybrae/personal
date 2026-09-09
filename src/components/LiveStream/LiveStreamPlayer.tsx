import { useEffect, useRef, useState } from 'react'
import { attachHls, type StreamHandle } from './hlsAdapter'
import { parseLiveStatus, retryDelay, type LivePhase } from './liveStreamState'

export interface LiveStreamPlayerProps {
  fallbackUrl: string
  baseUrl?: string
  attachStream?: typeof attachHls
}

const POLL_INTERVAL_MS = 2_000
const STALL_CHECK_INTERVAL_MS = 5_000
const STARTUP_TIMEOUT_MS = 90_000

export function LiveStreamPlayer({
  fallbackUrl,
  baseUrl,
  attachStream = attachHls,
}: LiveStreamPlayerProps) {
  const [phase, setPhase] = useState<LivePhase>(baseUrl ? 'waking' : 'fallback')
  const liveVideoRef = useRef<HTMLVideoElement>(null)
  const onCanPlayRef = useRef<() => void>(() => undefined)

  useEffect(() => {
    if (!baseUrl) {
      setPhase('fallback')
      return
    }

    const liveBaseUrl = baseUrl.replace(/\/+$/, '')
    let disposed = false
    let attached = false
    let handle: StreamHandle | null = null
    let requestController: AbortController | null = null
    let pollTimer: ReturnType<typeof setTimeout> | null = null
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    let stallTimer: ReturnType<typeof setInterval> | null = null
    let startupTimer: ReturnType<typeof setTimeout> | null = null
    let retryAttempt = 0
    let hasReachedLive = false
    let startupTimedOut = false
    let lastPlaybackTime = 0
    let unchangedChecks = 0

    const clearPollTimer = () => {
      if (pollTimer !== null) {
        clearTimeout(pollTimer)
        pollTimer = null
      }
    }

    const clearRetryTimer = () => {
      if (retryTimer !== null) {
        clearTimeout(retryTimer)
        retryTimer = null
      }
    }

    const clearStallTimer = () => {
      if (stallTimer !== null) {
        clearInterval(stallTimer)
        stallTimer = null
      }
    }

    const abortRequest = () => {
      requestController?.abort()
      requestController = null
    }

    const destroyStream = () => {
      clearStallTimer()
      attached = false
      const currentHandle = handle
      handle = null
      currentHandle?.destroy()
    }

    const recover = (unavailable = false) => {
      if (disposed) {
        return
      }

      abortRequest()
      clearPollTimer()
      clearRetryTimer()
      destroyStream()
      setPhase(unavailable ? 'unavailable' : 'recovering')

      const delay = retryDelay(retryAttempt)
      retryAttempt += 1
      retryTimer = setTimeout(() => {
        retryTimer = null
        void pollStatus()
      }, delay)
    }

    const startStallChecks = (video: HTMLVideoElement) => {
      clearStallTimer()
      lastPlaybackTime = video.currentTime
      unchangedChecks = 0
      stallTimer = setInterval(() => {
        if (video.currentTime === lastPlaybackTime) {
          unchangedChecks += 1
          if (unchangedChecks >= 2) {
            recover()
          }
          return
        }

        lastPlaybackTime = video.currentTime
        unchangedChecks = 0
      }, STALL_CHECK_INTERVAL_MS)
    }

    onCanPlayRef.current = () => {
      const video = liveVideoRef.current
      if (disposed || !attached || !video) {
        return
      }

      void video.play().catch(() => recover())
      hasReachedLive = true
      startupTimedOut = false
      retryAttempt = 0
      if (startupTimer !== null) {
        clearTimeout(startupTimer)
        startupTimer = null
      }
      setPhase('live')
      startStallChecks(video)
    }

    const attachLiveStream = () => {
      const video = liveVideoRef.current
      if (disposed || attached || !video) {
        return
      }

      attached = true
      setPhase('buffering')
      try {
        handle = attachStream(video, `${liveBaseUrl}/api/stream`, () => recover())
      } catch {
        attached = false
        recover()
      }
    }

    async function pollStatus() {
      if (disposed) {
        return
      }

      const controller = new AbortController()
      requestController = controller

      try {
        const response = await fetch(`${liveBaseUrl}/api/live/status`, {
          cache: 'no-store',
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error('Live status request failed')
        }

        const status = parseLiveStatus(await response.json())
        if (disposed || controller.signal.aborted) {
          return
        }
        requestController = null

        if (!status || status.state === 'unavailable') {
          recover(startupTimedOut)
          return
        }

        if (status.ready) {
          attachLiveStream()
          return
        }

        if (!startupTimedOut) {
          setPhase(status.buffer_count > 0 ? 'buffering' : 'waking')
        }
        clearPollTimer()
        pollTimer = setTimeout(() => {
          pollTimer = null
          void pollStatus()
        }, POLL_INTERVAL_MS)
      } catch {
        if (!disposed && !controller.signal.aborted) {
          requestController = null
          recover(startupTimedOut)
        }
      }
    }

    setPhase('waking')
    startupTimer = setTimeout(() => {
      startupTimer = null
      if (!hasReachedLive) {
        startupTimedOut = true
        recover(true)
      }
    }, STARTUP_TIMEOUT_MS)
    void pollStatus()

    return () => {
      disposed = true
      onCanPlayRef.current = () => undefined
      abortRequest()
      clearPollTimer()
      clearRetryTimer()
      clearStallTimer()
      if (startupTimer !== null) {
        clearTimeout(startupTimer)
        startupTimer = null
      }
      destroyStream()
    }
  }, [attachStream, baseUrl])

  const isLive = phase === 'live'

  return (
    <div className="relative aspect-video overflow-hidden bg-black">
      <video
        data-testid="fallback-video"
        src={fallbackUrl}
        autoPlay
        loop
        muted
        playsInline
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
          isLive ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {baseUrl && (
        <video
          ref={liveVideoRef}
          data-testid="live-video"
          muted
          playsInline
          onCanPlay={() => onCanPlayRef.current()}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
            isLive ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {baseUrl && phase !== 'fallback' && (
        <div
          aria-live="polite"
          className="absolute left-3 top-3 bg-black/70 px-2 py-1 font-mono text-xs tracking-widest text-white"
        >
          {phase === 'live' && 'LIVE'}
          {(phase === 'waking' || phase === 'buffering') && 'STARTING LIVE FEED'}
          {(phase === 'recovering' || phase === 'unavailable') &&
            'LIVE FEED UNAVAILABLE · RETRYING'}
        </div>
      )}
    </div>
  )
}
