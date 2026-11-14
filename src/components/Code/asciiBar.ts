/** Cells of a `width`-cell bar that `value` fills, against the largest `max`.
 *  Anything above zero keeps at least one cell so it still shows. */
export function filledCells(value: number, max: number, width: number): number {
  if (width <= 0 || max <= 0 || value <= 0) return 0;
  return Math.min(width, Math.max(1, Math.round((value / max) * width)));
}

/** A bar of `width` cells with `filled` of them solid: [solid run, empty run]. */
export function asciiBar(filled: number, width: number): [string, string] {
  const n = Math.max(0, Math.min(filled, width));
  return ['█'.repeat(n), '░'.repeat(width - n)];
}
