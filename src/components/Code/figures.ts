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
