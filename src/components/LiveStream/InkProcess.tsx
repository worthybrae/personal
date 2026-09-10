import { useEffect, useRef, useState } from 'react'
import './ink-process.css'

const stages = [
  { name: 'Light', title: 'Start with light, not color.', description: 'Every camera pixel becomes a brightness value. Color falls away, leaving the differences in light that will become the drawing.', equation: 'L = 0.299R + 0.587G + 0.114B' },
  { name: 'Smooth', title: 'Quiet the small distractions.', description: 'A small neighborhood average softens camera noise before finding edges. Increasing the smoothing radius quiets texture, but can also remove small details.', equation: 'S = box_average(L, radius)' },
  { name: 'Contours', title: 'Keep the crest of each edge.', description: 'The renderer measures how quickly brightness changes. Thresholds reject weak changes; thinning keeps the strongest part of each edge. Subpixel coverage shares a stroke between neighboring pixels for smoother placement.', equation: 'line = thin(gradient(S), threshold)' },
  { name: 'Memory', title: 'Let a departed line fade.', description: 'Optional memory catches marks where a moving outline used to be. Strength controls their visibility. Half-life is the time it takes a mark to lose half its intensity. The live look starts with memory off.', equation: 'memory = max(departed_line, memory × 2^(−Δt / half_life))' },
  { name: 'Flow', title: 'Bend the finished drawing.', description: 'Sine waves remap the drawing after its contours are made. Amplitude sets the bend, frequency sets the spacing, and period sets the speed. Interpolation keeps the moving strokes smooth.', equation: 'sample_x = x + width × amplitude × sin(phase + x × frequency / width)' },
]

export function InkProcess() {
  const [stage, setStage] = useState(0)
  const [animate, setAnimate] = useState(false)
  const [visible, setVisible] = useState(false)
  const [pageVisible, setPageVisible] = useState(document.visibilityState !== 'hidden')
  useEffect(() => {
    const changed = () => setPageVisible(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', changed)
    return () => document.removeEventListener('visibilitychange', changed)
  }, [])
  const root = useRef<HTMLElement>(null)
  useEffect(() => {
    if (!root.current || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
    observer.observe(root.current)
    return () => observer.disconnect()
  }, [])
  const item = stages[stage]
  return <section ref={root} className={`ink-process ${animate && visible && pageVisible ? 'ink-process-animating' : ''}`} aria-labelledby="ink-process-title">
    <h2 id="ink-process-title">How a street becomes a drawing</h2>
    <p className="ink-process-intro">Follow a single edge through the renderer.</p>
    <div className="ink-process-path" aria-label="Drawing stages">{stages.map((entry, i) => <button key={entry.name} type="button" aria-pressed={stage === i} onClick={() => setStage(i)}>
      {entry.name}{i < stages.length - 1 && <span aria-hidden="true">→</span>}
    </button>)}</div>
    <div className="ink-process-body">
      <div className="ink-process-figure">
        <svg viewBox="0 0 400 220" role="img" aria-label={`Illustration of the ${item.name.toLowerCase()} stage`}>
          <defs><linearGradient id="ink-light-step"><stop offset="0%" stopColor="#292929"/><stop offset="48%" stopColor="#292929"/><stop offset="53%" stopColor="#ddd"/><stop offset="100%" stopColor="#ddd"/></linearGradient></defs>
          <path d="M30 175H370M30 30V175" fill="none" stroke="#555" />
          {stage < 2 && <>
            <rect x="45" y="35" width="310" height="25" fill="url(#ink-light-step)"/>
            <path d={stage === 0 ? 'M45 150L65 145L85 152L105 147L125 151L145 148L165 150L185 149L198 78L215 72L235 78L255 74L275 79L295 72L315 76L355 74' : 'M45 150H165C195 150 192 76 220 76H355'} fill="none" stroke="#ddd" strokeWidth="2"/>
            <text x="45" y="203">Brightness across an edge</text>
          </>}
          {stage === 2 && <>
            <path d="M45 159H160C181 159 184 54 202 54S224 159 245 159H355" fill="none" stroke="#888" strokeWidth="2"/>
            <path d="M45 117H355" stroke="#b5c2a5" strokeDasharray="5 5"/>
            <path d="M202 159V54" stroke="#eee" strokeWidth="3"/>
            <text x="250" y="109">threshold</text><text x="45" y="203">Keep the strongest ridge</text>
          </>}
          {stage === 3 && <>
            {[0.12,0.25,0.5,1].map((opacity,i)=><path key={i} d={`M${80+i*65} 148V85L${100+i*65} 62L${120+i*65} 85V148`} fill="none" stroke="#eee" strokeWidth="2" opacity={opacity} className={i<3?'ink-memory-mark':''}/>) }
            <text x="45" y="203">Past positions fade behind motion</text>
          </>}
          {stage === 4 && <>
            <path d="M50 70H350M50 110H350M50 150H350" stroke="#444" fill="none"/>
            <g className="ink-flow-wave"><path d="M35 70Q75 25 115 70T195 70T275 70T355 70T435 70M35 110Q75 65 115 110T195 110T275 110T355 110T435 110M35 150Q75 105 115 150T195 150T275 150T355 150T435 150" fill="none" stroke="#ddd" strokeWidth="2"/></g>
            <text x="45" y="203">Waves displace the finished lines</text>
          </>}
          <line className="ink-process-scan" x1="45" x2="45" y1="30" y2="175" stroke="#b5c2a5" opacity="0.6" />
        </svg>
        <div className="ink-process-figure-caption"><span>Conceptual illustration</span><button type="button" aria-pressed={animate} onClick={()=>setAnimate(!animate)}>{animate ? 'Pause animation' : 'Animate diagram'}</button></div>
      </div>
      <div className="ink-process-explanation"><h3>{item.title}</h3><p>{item.description}</p><code>{item.equation}</code></div>
    </div>
    <p className="ink-process-finish">Line coverage mixes the charcoal and highlight values before flow bends the finished drawing. The live stream encodes the result as video.</p>
  </section>
}
