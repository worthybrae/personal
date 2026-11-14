import { useEffect, useRef } from 'react';
import { getDuotoneColor } from '@/components/Dashboard/color';

// Same clock as the portrait and the background terrain, so the name shifts
// through the palette in step with them.
const SPEED_DIVISOR = 6750;
const STEP_MS = 120;

function gradientAt(ts: number): string {
  const t = ts / SPEED_DIVISOR;
  const stops = [0.45, 0.75, 1].map((v) => {
    const c = getDuotoneColor(v, t);
    return `rgb(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)})`;
  });
  return `linear-gradient(90deg, ${stops.join(', ')})`;
}

/** The About page heading, filled with the site's live duotone like the
 *  canvas titles instead of plain white. */
export function AboutName({ fontFamily }: { fontFamily: string }) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.backgroundImage = gradientAt(performance.now());
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    let last = 0;
    const tick = (ts: number) => {
      if (ts - last >= STEP_MS) {
        last = ts;
        el.style.backgroundImage = gradientAt(ts);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <h1
      ref={ref}
      className="text-2xl md:text-3xl uppercase tracking-wider font-normal text-center"
      style={{ fontFamily, color: 'transparent', backgroundClip: 'text', WebkitBackgroundClip: 'text' }}
    >
      WORTHY RAE
    </h1>
  );
}
