import { useEffect, useState } from 'react'
import type { LivePhase } from './liveStreamState'

const londonTime = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
  timeZoneName: 'short',
})

export function LondonClock({ active, phase = 'fallback' }: { active: boolean; phase?: LivePhase }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    if (!active) return
    setNow(new Date())
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [active])

  return <div className="pointer-events-none absolute left-4 bottom-4 bg-black/60 px-3 py-2 text-left font-mono text-xs leading-relaxed text-white/80">
    <span className="block text-[10px] tracking-widest text-white/50">ABBEY ROAD · LONDON</span>
    <div className="flex items-center gap-3">
      <time dateTime={now.toISOString()} className="shrink-0 tabular-nums">{londonTime.format(now)}</time>
      {phase !== 'fallback' && <span aria-live="polite" className="flex items-center gap-2 text-[10px] tracking-widest">
        {phase === 'live' && <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-red-500 motion-safe:animate-pulse" />}
        <span>{phase === 'live' ? 'LIVE' : phase === 'waking' || phase === 'buffering' ? 'STARTING LIVE FEED' : 'LIVE FEED UNAVAILABLE · RETRYING'}</span>
      </span>}
    </div>
  </div>
}
