import { useEffect, useState } from 'react'

const londonTime = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
  timeZoneName: 'short',
})

export function LondonClock({ active }: { active: boolean }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    if (!active) return
    setNow(new Date())
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [active])

  return <div className="pointer-events-none absolute left-4 bottom-14 bg-black/60 px-3 py-2 text-left font-mono text-xs leading-relaxed text-white/80">
    <span className="block text-[10px] tracking-widest text-white/50">ABBEY ROAD · LONDON NOW</span>
    <time dateTime={now.toISOString()} className="tabular-nums">{londonTime.format(now)}</time>
  </div>
}
