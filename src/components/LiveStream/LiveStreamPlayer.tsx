import { useEffect, useRef, useState } from 'react'
import { attachHls, type StreamHandle } from './hlsAdapter'
import { parseLiveStatus, retryDelay, type LivePhase } from './liveStreamState'

export interface LiveStreamPlayerProps {
  fallbackUrl: string
  baseUrl?: string
  attachStream?: typeof attachHls
  fill?: boolean
}

const POLL_INTERVAL_MS = 2_000
const STALL_CHECK_INTERVAL_MS = 5_000
const ATTEMPT_DEADLINE_MS = 90_000
const CROSSFADE_DURATION_MS = 500

export function LiveStreamPlayer({
  fallbackUrl,
  baseUrl,
  attachStream = attachHls,
  fill = false,
}: LiveStreamPlayerProps) {
  const [phase, setPhase] = useState<LivePhase>(baseUrl ? 'waking' : 'fallback')
  const [liveVideoVisible, setLiveVideoVisible] = useState(false)
  const liveVideoRef = useRef<HTMLVideoElement>(null)
  const onCanPlayRef = useRef<() => void>(() => undefined)

  useEffect(() => {
    if (!baseUrl) {
      setPhase('fallback')
      setLiveVideoVisible(false)
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
    let attemptDeadlineTimer: ReturnType<typeof setTimeout> | null = null
    let crossfadeTimer: ReturnType<typeof setTimeout> | null = null
    let retryAttempt = 0
    let attemptTimedOut = false
    let canPlayHandled = false
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

    const clearCrossfadeTimer = () => {
      if (crossfadeTimer !== null) {
        clearTimeout(crossfadeTimer)
        crossfadeTimer = null
      }
    }

    const clearAttemptDeadline = () => {
      if (attemptDeadlineTimer !== null) {
        clearTimeout(attemptDeadlineTimer)
        attemptDeadlineTimer = null
      }
    }

    const abortRequest = () => {
      requestController?.abort()
      requestController = null
    }

    const destroyStream = () => {
      clearStallTimer()
      clearCrossfadeTimer()
      attached = false
      canPlayHandled = false
      const currentHandle = handle
      handle = null
      currentHandle?.destroy()
      if (!disposed) {
        setLiveVideoVisible(false)
      }
    }

    const recover = (unavailable = false) => {
      if (disposed) {
        return
      }

      abortRequest()
      clearPollTimer()
      clearRetryTimer()
      clearAttemptDeadline()
      destroyStream()
      setPhase(unavailable ? 'unavailable' : 'recovering')

      const delay = retryDelay(retryAttempt)
      retryAttempt += 1
      retryTimer = setTimeout(() => {
        retryTimer = null
        beginAttempt()
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
      if (disposed || !attached || canPlayHandled || !video) {
        return
      }

      canPlayHandled = true
      void video.play().catch(() => recover())
      attemptTimedOut = false
      retryAttempt = 0
      clearAttemptDeadline()
      setLiveVideoVisible(true)
      startStallChecks(video)
      crossfadeTimer = setTimeout(() => {
        crossfadeTimer = null
        if (!disposed && attached) {
          setPhase('live')
        }
      }, CROSSFADE_DURATION_MS)
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
          recover(attemptTimedOut)
          return
        }

        if (status.ready) {
          attachLiveStream()
          return
        }

        if (!attemptTimedOut) {
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
          recover(attemptTimedOut)
        }
      }
    }

    function beginAttempt() {
      if (disposed) {
        return
      }

      attemptTimedOut = false
      clearAttemptDeadline()
      attemptDeadlineTimer = setTimeout(() => {
        attemptDeadlineTimer = null
        attemptTimedOut = true
        recover(true)
      }, ATTEMPT_DEADLINE_MS)
      void pollStatus()
    }

    setLiveVideoVisible(false)
    setPhase('waking')
    beginAttempt()

    return () => {
      disposed = true
      onCanPlayRef.current = () => undefined
      abortRequest()
      clearPollTimer()
      clearRetryTimer()
      clearStallTimer()
      clearCrossfadeTimer()
      clearAttemptDeadline()
      destroyStream()
    }
  }, [attachStream, baseUrl])

  return (
    <div
      data-testid="live-stream-player"
      className={`relative overflow-hidden bg-black ${fill ? 'h-full w-full' : 'aspect-video'}`}
    >
      <video
        data-testid="fallback-video"
        src={fallbackUrl}
        autoPlay
        loop
        muted
        playsInline
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
          liveVideoVisible ? 'opacity-0' : 'opacity-100'
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
            liveVideoVisible ? 'opacity-100' : 'opacity-0'
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
