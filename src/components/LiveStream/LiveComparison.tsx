import { useEffect, useRef, useState, type RefObject } from 'react'
import { attachHls, type StreamHandle } from './hlsAdapter'
import './live-comparison.css'

export function LiveComparison({ baseUrl, editedVideo, editedHandle }: {
  baseUrl: string; editedVideo: RefObject<HTMLVideoElement>; editedHandle: RefObject<StreamHandle>
}) {
  const [split, setSplit] = useState(50)
  const [dragging, setDragging] = useState(false)
  const [synced, setSynced] = useState(false)
  const [error, setError] = useState('')
  const raw = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    if (!raw.current) return
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
      setSynced(false); setError('Camera comparison could not load. Reload the page to try again.')
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
  }, [baseUrl, editedHandle, editedVideo])

  return <>
    <video ref={raw} muted playsInline aria-label="Raw Abbey Road livestream" className="live-comparison-raw" style={{clipPath:`inset(0 ${100-split}% 0 0)`,opacity:synced?1:0}} />
    <div className={`live-comparison-divider ${dragging ? 'is-dragging' : ''}`} style={{left:`${split}%`}} role="slider" tabIndex={0}
      aria-label="Raw camera versus drawing" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(split)}
      aria-valuetext={`${Math.round(split)} percent raw camera`} aria-describedby="live-comparison-status"
      onKeyDown={event=>{
        const values: Record<string,number> = {ArrowLeft:split-1,ArrowDown:split-1,ArrowRight:split+1,ArrowUp:split+1,Home:0,End:100}
        if (event.key in values) {event.preventDefault();setSplit(Math.max(0,Math.min(100,values[event.key])))}
      }}
      onPointerDown={event=>{event.preventDefault();setDragging(true);event.currentTarget.setPointerCapture(event.pointerId);event.currentTarget.focus()}}
      onPointerUp={()=>setDragging(false)}
      onPointerCancel={()=>setDragging(false)}
      onLostPointerCapture={()=>setDragging(false)}
      onPointerMove={event=>{
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
        const bounds=event.currentTarget.parentElement!.getBoundingClientRect()
        setSplit(Math.max(0,Math.min(100,(event.clientX-bounds.left)/bounds.width*100)))
      }}><span aria-hidden="true">↔</span>
      {error && <small className="live-comparison-error">{error}</small>}
    </div>
    <span id="live-comparison-status" className="sr-only">{error || (synced?'Raw camera on the left, drawing on the right. Drag the divider or use the arrow keys.':'Synchronizing camera…')}</span>
  </>
}
