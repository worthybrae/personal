/** The median reading of each day across the series; -1 means no reading,
 *  in and out, so the days stay where they are. */
export function medianByDay(series: number[][]): number[] {
  const days = Math.max(...series.map((s) => s.length));
  const out: number[] = [];
  for (let d = 0; d < days; d++) {
    const v = series.map((s) => s[d]).filter((x) => x !== undefined && x >= 0).sort((a, b) => a - b);
    if (v.length === 0) {
      out.push(-1);
      continue;
    }
    const mid = Math.floor(v.length / 2);
    out.push(v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2);
  }
  return out;
}

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
