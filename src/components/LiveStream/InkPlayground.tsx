import { useEffect, useRef, useState } from 'react'
import looks from './inkLooks.json'
import './ink-playground.css'

type Look = { id: string; name: string; description: string; params: Record<string, number> }
const lineworks: Look[] = looks.linework
const motions: Look[] = looks.motion

export function InkPlayground({ id = 'ink-playground' }: { id?: string }) {
  const [linework, setLinework] = useState(lineworks[1])
  const [motion, setMotion] = useState(motions[1])
  const [started, setStarted] = useState(false)
  const [status, setStatus] = useState('Choose a style to explore the recorded sample.')
  const video = useRef<HTMLVideoElement>(null)
  const root = useRef<HTMLDivElement>(null)
  const onScreen = useRef(true)
  const position = useRef(0)
  const readySource = useRef('')
  const url = `/media/ink-studies/${linework.id}-${motion.id}.mp4`

  useEffect(() => {
    const pauseIfHidden = () => {
      if (document.visibilityState === 'hidden' || !onScreen.current) video.current?.pause()
    }
    document.addEventListener('visibilitychange', pauseIfHidden)
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => {
      onScreen.current = entry.isIntersecting
      pauseIfHidden()
    })
    if (root.current) observer?.observe(root.current)
    return () => { observer?.disconnect(); document.removeEventListener('visibilitychange', pauseIfHidden) }
  }, [])

  function select(kind: 'linework' | 'motion', value: Look) {
    position.current = video.current?.currentTime ?? 0
    if (kind === 'linework') setLinework(value)
    else setMotion(value)
    setStarted(true)
    setStatus('Loading the selected study…')
  }

  function ready() {
    if (readySource.current === url) return
    readySource.current = url
    setStatus(`${linework.name} lines. ${motion.name} motion. Recorded sample.`)
    if (onScreen.current && document.visibilityState !== 'hidden') {
      void video.current?.play()?.catch(() => setStatus('Sample ready. Press play to watch.'))
    }
  }

  function control(label: string, options: Look[], selected: Look, kind: 'linework' | 'motion') {
    return <fieldset className="ink-study-control">
      <legend>{label}</legend>
      <div className="ink-study-options">{options.map(option => <label key={option.id}>
        <input type="radio" name={`ink-${kind}`} value={option.id} checked={selected.id === option.id}
          onChange={() => select(kind, option)} />
        <span>{option.name}</span>
      </label>)}</div>
      <p>{selected.description}</p>
    </fieldset>
  }

  return <section id={id} className="ink-playground" aria-labelledby="ink-playground-title">
    <h2 id="ink-playground-title">Play with the painting</h2>
    <p className="ink-study-intro">One street, nine studies. Change the marks and the way they move.</p>
    <div ref={root} className="ink-study-picture">
      {started ? <video key={url} ref={video} src={url} controls loop muted playsInline preload="auto"
        aria-label={`${linework.name} ${motion.name} recorded painting`}
        onLoadedMetadata={() => {
          const el = video.current
          if (el && Number.isFinite(el.duration)) el.currentTime = position.current % el.duration
        }}
        onCanPlay={ready}
        onError={() => setStatus('This sample could not load. Try another style or reload the page.')} />
        : <button className="ink-study-start" onClick={() => { setStarted(true); setStatus('Loading the recorded sample…') }}>
          <img src="/media/ink-studies/poster.jpg" alt="Fine white contours of the Abbey Road crossing on charcoal" loading="lazy" />
          <span>Explore recorded sample <span aria-hidden="true">▷</span></span>
        </button>}
    </div>
    <div className="ink-study-caption"><span>Recorded sample · 1080p</span><span>No lasting trails</span></div>
    <div className="ink-study-controls">
      {control('Linework', lineworks, linework, 'linework')}
      {control('Motion', motions, motion, 'motion')}
    </div>
    <p className="ink-study-status" role="status">{status}</p>
    <p className="ink-study-note">These controls switch between nine rendered versions of the same six-second recording. The live painting above keeps its own settings.</p>
    <details className="ink-study-details"><summary>What shapes the drawing?</summary>
      <dl>
        <div><dt>Detail threshold</dt><dd>Decides which edges become marks. Higher values leave a quieter drawing.</dd></div>
        <div><dt>Line weight &amp; body</dt><dd>Control the brightness and softer edges of each stroke.</dd></div>
        <div><dt>Flow amplitude</dt><dd>Controls how far the lines bend away from the camera image.</dd></div>
        <div><dt>Flow frequency &amp; period</dt><dd>Control the spacing of the waves and how quickly they move.</dd></div>
      </dl>
      <a href={url.replace('.mp4', '.json')} download>Download this study’s settings</a>
    </details>
  </section>
}
