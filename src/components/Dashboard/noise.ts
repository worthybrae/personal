// Permutation table — seeded once at module load
const P = new Uint8Array(512);
const G: [number, number][] = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
];

{
  const p: number[] = [];
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    // Fixed seed via simple LCG for determinism
    const j = (i * 16807 + 7) % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) P[i] = p[i & 255];
}

/** 2D Perlin noise */
export function perlin2(x: number, y: number): number {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const dot = (g: number, a: number, b: number) =>
    G[g % 8][0] * a + G[g % 8][1] * b;
  const aa = P[P[X] + Y];
  const ab = P[P[X] + Y + 1];
  const ba = P[P[X + 1] + Y];
  const bb = P[P[X + 1] + Y + 1];
  return (
    dot(aa, xf, yf) +
    u * (dot(ba, xf - 1, yf) - dot(aa, xf, yf)) +
    v *
      (dot(ab, xf, yf - 1) +
        u * (dot(bb, xf - 1, yf - 1) - dot(ab, xf, yf - 1)) -
        (dot(aa, xf, yf) + u * (dot(ba, xf - 1, yf) - dot(aa, xf, yf))))
  );
}

/** Fractal Brownian Motion — 6 octaves, persistence 0.48, lacunarity 2.05 */
export function fbm(x: number, y: number, octaves: number): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * perlin2(x * frequency, y * frequency);
    amplitude *= 0.48;
    frequency *= 2.05;
  }
  return value;
}

/** Ridged noise — 5 octaves with absolute-value inversion */
export function ridged(x: number, y: number, octaves: number): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let prev = 1;
  for (let i = 0; i < octaves; i++) {
    let n = Math.abs(perlin2(x * frequency, y * frequency));
    n = 1 - n;
    n = n * n;
    n *= prev;
    value += n * amplitude;
    prev = n;
    amplitude *= 0.5;
    frequency *= 2.1;
  }
  return value;
}

/** Domain-warped terrain combining FBM and ridged noise with cyclical time */
export function warpedTerrain(x: number, y: number, t: number): number {
  const tx = Math.sin(t * 0.13) * 8 + Math.cos(t * 0.07) * 5;
  const ty = Math.cos(t * 0.11) * 8 + Math.sin(t * 0.09) * 5;
  const tx2 = Math.sin(t * 0.17) * 3;
  const ty2 = Math.cos(t * 0.14) * 3;

  const wx1 = fbm(x + tx, y + ty, 3);
  const wy1 = fbm(x + 5.2 + tx * 0.3, y + 1.3 + ty * 0.5, 3);
  const wx2 = fbm(x + wx1 * 3 + tx2, y + wy1 * 3 + ty2, 4);
  const wy2 = fbm(x + wx1 * 3 + 8.3, y + wy1 * 3 + 2.8 + tx2 * 0.5, 4);

  const wx = x + wx2 * 2;
  const wy = y + wy2 * 2;

  return fbm(wx, wy, 6) * 0.6 + ridged(wx * 0.8 + 20, wy * 0.8 + 20, 5) * 0.8;
}
