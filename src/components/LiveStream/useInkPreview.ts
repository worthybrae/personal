import { useEffect, useRef, useState } from 'react'

export function useInkPreview(enabled: boolean, width: number, params: Record<string, number>) {
  const video = useRef<HTMLVideoElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const region = useRef<HTMLDivElement>(null)
  const settings = useRef(params)
  const version = useRef(0)
  const requestFrame = useRef<() => void>(() => {})
  const [error, setError] = useState('')
  const [playbackError, setPlaybackError] = useState('')
  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [metrics, setMetrics] = useState({ fps: 0, milliseconds: 0 })
  useEffect(() => { settings.current = params; version.current++; requestFrame.current() }, [params])

  useEffect(() => {
    if (!enabled) return
    const source = video.current
    const output = canvas.current
    if (!source || !output) return
    setError(''); setPlaybackError(''); setReady(false); setMetrics({ fps: 0, milliseconds: 0 })
    if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap === 'undefined') {
      setError('This browser cannot run the interactive renderer. The recorded studies below still work.')
      return
    }
    const height = Math.round(width * 9 / 16)
    output.width = width; output.height = height
    const context = output.getContext('2d')
    if (!context) { setError('The preview surface is unavailable.'); return }
    const worker = new Worker(new URL('./inkPreview.worker.ts', import.meta.url), { type: 'module' })
    let disposed = false, initialized = false, busy = false, onScreen = true, dirty = false
    let callback = 0, videoCallback = 0, mediaTime = 0, timeout = 0, windowStart = performance.now(), count = 0, lastTime = -1
    const visible = () => onScreen && document.visibilityState !== 'hidden'
    const stop = () => { source.pause(); setPlaying(false) }
    const fail = (message: string) => { initialized = false; stop(); setError(message); worker.terminate(); clearTimeout(timeout) }
    async function capture() {
      if (disposed || !initialized || busy || !visible() || source!.readyState < 2) return
      busy = true; dirty = false
      const time = source!.paused ? Math.floor(source!.currentTime * 30000 / 1001) * 1001 / 30000 : mediaTime
      const revision = version.current
      try {
        const bitmap = await createImageBitmap(source!)
        if (disposed) { bitmap.close(); return }
        worker.postMessage({ type: 'frame', bitmap, time, version: revision, params: settings.current }, [bitmap])
        timeout = window.setTimeout(() => fail('This device took too long to render. Try the recorded studies.'), 15000)
      } catch { busy = false; if (!disposed) fail('The camera sample could not be read. Try the recorded studies below.') }
    }
    requestFrame.current = () => { dirty = true; void capture() }
    function tick() {
      if (disposed) return
      mediaTime = Math.floor(source!.currentTime * 30000 / 1001) * 1001 / 30000
      if (!source!.paused && mediaTime !== lastTime) void capture()
      callback = requestAnimationFrame(tick)
    }
    function decodedFrame(_now: number, metadata: VideoFrameCallbackMetadata) {
      if (disposed) return
      mediaTime = metadata.mediaTime
      if (!source!.paused && mediaTime !== lastTime) void capture()
      videoCallback = source!.requestVideoFrameCallback(decodedFrame)
    }
    worker.onmessage = ({ data }) => {
      if (disposed) return
      if (data.type === 'ready') { clearTimeout(timeout); initialized = true; setReady(true); void capture(); return }
      if (data.type === 'error') { fail(data.message); return }
      if (data.type !== 'frame') return
      clearTimeout(timeout); busy = false
      context!.putImageData(new ImageData(new Uint8ClampedArray(data.buffer), width, height), 0, 0)
      if (data.time !== lastTime) count++
      lastTime = data.time
      const now = performance.now()
      if (now - windowStart >= 1000) {
        setMetrics({ fps: count * 1000 / (now - windowStart), milliseconds: data.milliseconds })
        count = 0; windowStart = now
      } else if (source!.paused) setMetrics({ fps: 0, milliseconds: data.milliseconds })
      if (data.version !== version.current || dirty) void capture()
    }
    worker.onerror = () => fail('The drawing engine stopped. Try the recorded studies.')
    const loaded = () => { dirty = true; void capture() }
    const play = () => {setPlaying(true);setPlaybackError('')}
    const pause = () => {setPlaying(false);dirty = true;void capture()}
    const visibility = () => { if (!visible()) stop(); else {dirty = true;void capture()} }
    source.addEventListener('loadeddata', loaded)
    source.addEventListener('seeked', loaded)
    source.addEventListener('play', play)
    source.addEventListener('pause', pause)
    document.addEventListener('visibilitychange', visibility)
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting
      visibility()
    })
    if (region.current) observer?.observe(region.current)
    worker.postMessage({ type: 'init', width, height })
    timeout = window.setTimeout(() => fail('The drawing engine could not start. Try the recorded studies below.'), 15000)
    if (typeof source.requestVideoFrameCallback === 'function') videoCallback = source.requestVideoFrameCallback(decodedFrame)
    else callback = requestAnimationFrame(tick)
    return () => {
      disposed = true; requestFrame.current = () => {}; source.pause(); worker.terminate()
      clearTimeout(timeout); cancelAnimationFrame(callback); observer?.disconnect()
      if (videoCallback && typeof source.cancelVideoFrameCallback === 'function') source.cancelVideoFrameCallback(videoCallback)
      source.removeEventListener('loadeddata', loaded); source.removeEventListener('seeked', loaded)
      source.removeEventListener('play', play); source.removeEventListener('pause', pause)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [enabled, width])

  function togglePlayback() {
    const source = video.current
    if (!source) return
    if (source.paused) void source.play().then(() => setPlaybackError('')).catch(() => setPlaybackError('Playback could not start. Try pressing Play again.'))
    else source.pause()
  }
  return { video, canvas, region, error, playbackError, ready, playing, metrics, togglePlayback }
}
