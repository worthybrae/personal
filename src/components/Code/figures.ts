/** An SVG path through the readings, lifting the pen over missing ones (-1). */
export function linePath(values: number[], at: (i: number, v: number) => readonly [number, number]): string {
  let d = '';
  let pen = false;
  values.forEach((v, i) => {
    if (v < 0) {
      pen = false;
      return;
    }
    const [x, y] = at(i, v);
    d += `${pen ? 'L' : 'M'}${+x.toFixed(1)},${+y.toFixed(1)}`;
    pen = true;
  });
  return d;
}

/** Index of the series whose reading at `day` lies nearest `value`, or -1
 *  when none has a reading that day. */
export function nearestSeries(series: number[][], day: number, value: number): number {
  let best = -1;
  let gap = Infinity;
  series.forEach((s, i) => {
    const v = s[day];
    if (v === undefined || v < 0) return;
    const g = Math.abs(v - value);
    if (g < gap) {
      gap = g;
      best = i;
    }
  });
  return best;
}

/** Spreads marks wanting to sit at `want` (in input order) so that no two
 *  are closer than `gap`, keeping their order and staying inside
 *  [min, max] when they fit. Returns the positions in input order. */
export function spreadApart(want: number[], gap: number, min: number, max: number): number[] {
  const order = want.map((_, i) => i).sort((a, b) => want[a] - want[b]);
  const at = order.map((i) => Math.min(Math.max(want[i], min), max));
  for (let k = 1; k < at.length; k++) at[k] = Math.max(at[k], at[k - 1] + gap);
  if (at.length) at[at.length - 1] = Math.min(at[at.length - 1], max);
  for (let k = at.length - 2; k >= 0; k--) at[k] = Math.min(at[k], at[k + 1] - gap);
  if (at.length && at[0] < min) {
    at[0] = min;
    for (let k = 1; k < at.length; k++) at[k] = Math.max(at[k], at[k - 1] + gap);
  }
  const out = new Array<number>(want.length);
  order.forEach((i, k) => { out[i] = at[k]; });
  return out;
}

/** Plays as a short figure: 2.3M, 640K, 900. */
export function shortCount(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}K`;
  return String(Math.round(n));
}
