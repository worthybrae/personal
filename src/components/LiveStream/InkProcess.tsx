import { useEffect, useRef, useState } from 'react'
import './ink-process.css'

const stages = [
  { name: 'Receive', title: 'Read the next piece of the livestream.', description: 'The camera publishes an HLS playlist: a rolling list of short video files. The service follows that list and fetches new segments in sequence. In this captured example, one segment contains 6.006 seconds of video.', detail: 'HLS playlist → compressed source segment' },
  { name: 'Decode', title: 'Unpack the video into individual frames.', description: 'FFmpeg demuxes the segment and decodes its compressed video into RGB pixel buffers. A six-second segment at this camera’s 29.97 fps contains 180 frames. Frames pass into the renderer as they are decoded, so the whole uncompressed clip does not have to sit in memory.', detail: '6.006 seconds × 29.97 fps = 180 frames' },
  { name: 'Draw', title: 'Transform every frame at full resolution.', description: 'Each 1920 × 1080 frame passes through the Rust drawing effect: brightness, contours, charcoal, and distortion. The current no-trail style uses three workers. Their results are collected in frame order; styles that depend on previous frames run sequentially.', detail: '1920 × 1080 pixels · three bounded workers · original frame order' },
  { name: 'Encode', title: 'Pack the drawings back into video.', description: 'FFmpeg converts the finished frames for H.264 encoding and muxes them into an MPEG-TS segment. Output timestamps continue from the preceding segment. All 180 frames keep their original cadence, so adjacent segments share one playback timeline.', detail: 'Drawn frames → H.264 → MPEG-TS segment' },
  { name: 'Play', title: 'Publish the next segment and keep going.', description: 'The output joins a small rolling buffer and appears in a new HLS playlist. The browser plays those segments in order while the service works on the next one. To sustain playback, processing needs to stay ahead of the video’s duration; the buffer absorbs short variations.', detail: 'Rolling output playlist → browser playback at 29.97 fps' },
]
const frameLabels = ['1', '2', '3', '…', '179', '180']

export function InkProcess() {
  const [stage, setStage] = useState(0)
  const [animate, setAnimate] = useState(false)
  const [visible, setVisible] = useState(false)
  const [pageVisible, setPageVisible] = useState(document.visibilityState !== 'hidden')
  const root = useRef<HTMLElement>(null)
  useEffect(() => {
    const changed = () => setPageVisible(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', changed)
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
    if (root.current) observer?.observe(root.current)
    return () => { observer?.disconnect(); document.removeEventListener('visibilitychange', changed) }
  }, [])
  useEffect(() => {
    if (!animate || !visible || !pageVisible) return
    const timer = window.setInterval(() => setStage(previous => (previous + 1) % stages.length), 2400)
    return () => clearInterval(timer)
  }, [animate, visible, pageVisible])
  const item = stages[stage]
  function select(index: number) { setAnimate(false); setStage(index) }
  return <section ref={root} className="ink-process" aria-labelledby="ink-process-title">
    <h2 id="ink-process-title">A livestream, one segment at a time</h2>
    <p className="ink-process-intro">The camera sends compressed pieces of video. To turn them into this painting, we unpack each piece, redraw its frames, and pack them back into a stream. The image stays at 1920 × 1080, with every source frame preserved at 29.97 fps, roughly 30 frames each second.</p>
    <div className="ink-pipeline" aria-label="Livestream processing pipeline">
      <div className="ink-pipeline-caption"><span>One captured segment · 6.006 seconds</span><button type="button" aria-pressed={animate} onClick={()=>setAnimate(!animate)}>{animate?'Pause walkthrough':'Follow a segment'}</button></div>
      {stages.map((entry,index)=><div key={entry.name} className={`ink-pipeline-row ${stage===index?'ink-pipeline-active':''}`}>
        <button className="ink-pipeline-stage" aria-pressed={stage===index} onClick={()=>select(index)}><span>{index+1}</span>{entry.name}</button>
        <div className="ink-pipeline-content" aria-hidden="true">
          {index===0 && <div className="ink-segments"><span>segment n − 1</span><strong>segment n<small>6.006 s</small></strong><span>segment n + 1</span></div>}
          {index===1 && <div className="ink-frame-strip">{frameLabels.map((label,i)=><span key={i}>▧<small>{label}</small></span>)}</div>}
          {index===2 && <div className="ink-worker-lanes">{[1,2,3].map(n=><span key={n}>worker {n}<small>frame {n} → {n+3} → …</small></span>)}</div>}
          {index===3 && <div className="ink-repack"><span>1 · 2 · 3 · … · 180</span><span>→</span><strong>segment n<small>H.264 / TS</small></strong></div>}
          {index===4 && <div className="ink-playback-line"><span>previous</span><strong>segment n</strong><span>next</span><small>one continuous timeline · 29.97 fps</small></div>}
        </div>
      </div>)}
      <p className="ink-pipeline-footnote">Illustrated sequence, slowed for explanation. Segment lengths vary with the source.</p>
    </div>
    <div className="ink-process-explanation" aria-live={animate?'off':'polite'}><h3>{item.title}</h3><p>{item.description}</p><code>{item.detail}</code></div>
    <p className="ink-process-finish">At 1080p, each frame has just over two million pixels. Keeping only a few decoded frames in flight limits memory use while the workers keep drawing. Resolution, frame cadence, and processing speed are separate: a 30 fps output still needs the renderer to finish each segment before playback catches up.</p>
  </section>
}
