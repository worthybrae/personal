import { useEffect, useRef, useState, type RefObject } from 'react'
import { attachHls, type StreamHandle } from './hlsAdapter'
import './live-comparison.css'

export function LiveComparison({ baseUrl, editedVideo, editedHandle }: {
  baseUrl: string; editedVideo: RefObject<HTMLVideoElement>; editedHandle: RefObject<StreamHandle>
}) {
  const [enabled, setEnabled] = useState(false)
  const [split, setSplit] = useState(50)
  const [synced, setSynced] = useState(false)
  const [error, setError] = useState('')
  const raw = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    if (!enabled || !raw.current) return
    const video = raw.current
    let disposed = false
    let starting = false
    setSynced(false); setError('')
    if (!editedHandle.current?.position) {
      setError('Live comparison needs a browser with Media Source support, such as Chrome or Firefox.')
      return
    }
    let handle: StreamHandle | null = null
    let timer = 0
    function fail() {
      if (disposed) return
      setSynced(false); setError('Camera comparison could not load. Close it and try again.')
      clearInterval(timer); handle?.destroy(); handle = null
    }
    try { handle = attachHls(video, `${baseUrl.replace(/\/+$/, '')}/api/raw-stream`, fail) }
    catch { fail(); return }
    function sync() {
      const edited = editedVideo.current
      const position = editedHandle.current?.position?.()
      const target = position && handle?.timeFor?.(position)
      if (!edited || target == null || video.readyState < 2 || edited.readyState < 2) { setSynced(false); return }
      const drift = target - video.currentTime
      if (Math.abs(drift) > 0.12) {
        setSynced(false)
        if (!video.seeking && Array.from({length:video.seekable.length}, (_, i) => i).some(i => target >= video.seekable.start(i) && target < video.seekable.end(i))) video.currentTime = target
      } else {
        setSynced(!video.seeking)
        video.playbackRate = Math.abs(drift) > 0.025 ? (drift > 0 ? 1.03 : 0.97) : 1
      }
      if (edited.paused) video.pause()
      else if (video.paused && !starting) {
        starting = true
        void video.play().catch(fail).finally(() => { starting = false })
      }
    }
    timer = window.setInterval(sync, 100)
    return () => { disposed = true; clearInterval(timer); video.pause(); handle?.destroy() }
  }, [enabled, baseUrl, editedHandle, editedVideo])

  return <>
    {enabled && <>
      <video ref={raw} muted playsInline aria-label="Raw Abbey Road livestream" className="live-comparison-raw" style={{clipPath:`inset(0 ${100-split}% 0 0)`,opacity:synced?1:0}} />
      {synced && <div className="live-comparison-divider" style={{left:`${split}%`}} aria-hidden="true"
        onPointerDown={event=>{event.currentTarget.setPointerCapture(event.pointerId)}}
        onPointerMove={event=>{
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
          const bounds=event.currentTarget.parentElement!.getBoundingClientRect()
          setSplit(Math.max(0,Math.min(100,(event.clientX-bounds.left)/bounds.width*100)))
        }}><span>↔</span></div>}
    </>}
    <div className="live-comparison-controls">
      <button onClick={() => setEnabled(value => !value)} aria-pressed={enabled}>{enabled?'Close comparison':'Compare camera'}</button>
      {enabled && <>
        <label className="live-comparison-slider"><span>Raw camera</span><input aria-label="Raw camera versus drawing" type="range" min="0" max="100" value={split} onChange={event=>setSplit(Number(event.target.value))}/><span>Drawing</span></label>
        {!synced && <span role="status">{error || 'Synchronizing camera…'}</span>}
      </>}
    </div>
  </>
}
