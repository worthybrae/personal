import { useState } from 'react'
import definitions from './inkParams.json'
import looks from './inkLooks.json'
import { useInkPreview } from './useInkPreview'
import { InkPlayground } from './InkPlayground'
import './ink-studio.css'

type Params = Record<string, number>
const initial: Params = { ...Object.fromEntries(definitions.map(p => [p.id, p.default])), ...looks.base }
const groups = [
  { title: 'Contours', ids: ['fine_threshold','broad_threshold','fine_weight','broad_weight','smoothing','subpixel','stroke_body'] },
  { title: 'Flow', ids: ['warp_amplitude','warp_frequency','warp_period'] },
  { title: 'Memory', ids: ['trail_strength','trail_half_life'] },
  { title: 'Charcoal & light', ids: ['charcoal','highlight'] },
]
const help: Record<string, string> = {
  fine_threshold: 'Higher values keep fewer fine details.', broad_threshold: 'Filters the broader outlines. Enable broad line weight to see them.',
  fine_weight: 'Brightness of the fine contour strokes.', broad_weight: 'Adds larger outlines from a second, smoother pass.',
  smoothing: 'A wider average quiets texture and small details.', subpixel: 'Shares strokes between neighboring pixels for smoother edges.',
  stroke_body: 'Adds softer coverage around the strongest part of each stroke.',
  warp_amplitude: 'How far the drawing bends. Zero leaves the camera geometry intact.', warp_frequency: 'Higher values pack more waves into the image.',
  warp_period: 'Seconds per wave cycle. Lower values move faster.', trail_strength: 'Visibility of the marks left behind by moving outlines. Zero turns memory off.',
  trail_half_life: 'Seconds for an old mark to lose half its brightness.', charcoal: 'Brightness of the background.', highlight: 'Brightness of the strongest lines.',
}

export function InkStudio() {
  const [params, setParams] = useState<Params>(initial)
  const [enabled, setEnabled] = useState(false)
  const width = 960
  const [camera, setCamera] = useState(false)
  const [message, setMessage] = useState('Start the studio to try any combination of settings.')
  const preview = useInkPreview(enabled, width, params)
  function update(id: string, value: number) { setParams(previous=>({...previous,[id]:value})) }
  return <section className="public-ink-studio" id="ink-playground" aria-labelledby="public-ink-title">
    <header><h2 id="public-ink-title">Shape the drawing</h2><p>The drawing step is where the image changes. Try it on this recorded sample: adjust the contours, contrast, or distortion and see how an individual frame is transformed before it would be encoded back into video.</p></header>
    <div className="public-ink-workspace">
      <div className="public-ink-preview-column">
        <div className="public-ink-preview-sticky">
          <div ref={preview.region} className="public-ink-picture">
            {enabled ? <>
              <video ref={preview.video} src="/media/ink-studio/source.mp4" muted loop playsInline preload="auto"
                aria-label="Recorded camera source" className={camera?'public-ink-camera':'public-ink-camera public-ink-concealed'}
                onError={()=>setMessage('The camera recording could not load. Try the recorded studies below.')} />
              <canvas ref={preview.canvas} role="img" aria-label="Interactive Rust-rendered drawing" className={camera?'public-ink-concealed':''}/>
              {!preview.ready && !preview.error && <div className="public-ink-loading">Loading the drawing engine…</div>}
            </> : <button className="public-ink-start" onClick={()=>{setEnabled(true);setMessage("Adjust a slider to redraw this frame, or press Play to watch it move.");}}>
              <img src="/media/ink-studies/poster.jpg" loading="lazy" alt="Abbey Road outlined in white on charcoal"/>
              <span>Start interactive studio ▷</span>
            </button>}
          </div>
          <div className="public-ink-playback">
            <button disabled={!preview.ready || !!preview.error} onClick={preview.togglePlayback}>{preview.playing?'Pause':'Play'}</button>
            <button disabled={!enabled} aria-pressed={camera} onClick={()=>setCamera(!camera)}>{camera?'Show drawing':'Show camera'}</button>
          </div>
          <p className="public-ink-metrics">Recorded sample · {width} × {Math.round(width*9/16)}{preview.ready && <> · {preview.metrics.milliseconds.toFixed(1)} ms/render{preview.playing && <> · {preview.metrics.fps.toFixed(1)} preview fps</>}</>}</p>
          <p className="public-ink-notice" role="status">{preview.error || preview.playbackError || message}</p>
          <p className="public-ink-note">Pause to study a detail; the sliders still redraw the frame. The preview runs at 540p to keep drawing responsive. Playback speed depends on your device.</p>
        </div>
      </div>
      <aside className="public-ink-controls" aria-label="Drawing parameters">
        <h3>The marks</h3>
        <div className="public-ink-presets"><span>Starting points</span>
          {(['linework','motion'] as const).map(kind=><div key={kind} className="public-ink-preset-row" aria-label={kind}>{looks[kind].map(look=><button key={look.id} aria-pressed={Object.entries(look.params).every(([id,value])=>Math.abs(params[id]-value)<0.0001)} onClick={()=>setParams(previous=>({...previous,...look.params}))}>{look.name}</button>)}</div>)}
        </div>
        <div className="public-ink-parameter-groups">{groups.map(group=><fieldset key={group.title}><legend>{group.title}</legend>{group.ids.map(id=>{
          const def=definitions.find(p=>p.id===id)!
          const inactive=(id==='broad_threshold' && params.broad_weight===0)||(id==='trail_half_life' && params.trail_strength===0)
          return <label className={`public-ink-slider ${inactive?'public-ink-inactive':''}`} key={id}>
            <span>{def.name}<output aria-hidden="true">{params[id].toFixed(Math.max(0,Math.ceil(-Math.log10(def.step))))}</output></span>
            <input aria-label={def.name} type="range" min={def.min} max={def.max} step={def.step} value={params[id]} aria-describedby={`help-${id}`} onChange={e=>update(id,Number(e.target.value))}/>
            <small id={`help-${id}`}>{help[id]}{inactive && ' Currently inactive.'}</small>
          </label>
        })}</fieldset>)}</div>
      </aside>
    </div>
    {!!preview.error && <InkPlayground id="ink-recorded-studies"/>}
  </section>
}
