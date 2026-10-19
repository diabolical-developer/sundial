/**
 * Procedural mountains, shared by the app's sky, the widgets, the empty states and the icon renderer.
 * Ridgelines come from midpoint displacement (the classic fractal-terrain trick), with a fixed seed so
 * the range is the same on every launch. Drawn once into a 1200 × 100 box; callers scale it to fit.
 */

export const LAND_W = 1200;
export const LAND_H = 100;

/** Small, fast, seedable random numbers (mulberry32). */
function random(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Ridge heights from 0 (lowest) to 1 (highest peak). `n` must be a power of two. */
function ridge(seed: number, n: number, roughness: number) {
  const r = random(seed);
  const h = new Array<number>(n + 1).fill(0);
  h[0] = r();
  h[n] = r();
  let step = n;
  let amp = 1;
  while (step > 1) {
    const half = step / 2;
    for (let i = half; i < n; i += step) h[i] = (h[i - half] + h[i + half]) / 2 + (r() - 0.5) * amp;
    amp *= roughness;
    step = half;
  }
  const lo = Math.min(...h);
  const hi = Math.max(...h);
  return h.map((v) => (v - lo) / (hi - lo || 1));
}

const f = (n: number) => Math.round(n * 10) / 10;

/** A filled ridge between y = `top` (peaks) and y = `bottom` (lowest saddle). */
function ridgePath(seed: number, n: number, roughness: number, top: number, bottom: number) {
  const h = ridge(seed, n, roughness);
  const pts = h.map((v, i) => `${f((i / n) * LAND_W)} ${f(top + (1 - v) * (bottom - top))}`);
  return { d: `M0 ${LAND_H} L${pts.join(' L')} L${LAND_W} ${LAND_H} Z`, h };
}

/** A gentle ridge with a line of pines along it. */
function treelinePath(seed: number) {
  const n = 32;
  const top = 66;
  const bottom = 82;
  const { d, h } = ridgePath(seed, n, 0.42, top, bottom);
  const yAt = (x: number) => {
    const p = (x / LAND_W) * n;
    const i = Math.min(n - 1, Math.floor(p));
    const v = h[i] + (h[i + 1] - h[i]) * (p - i);
    return top + (1 - v) * (bottom - top);
  };
  const r = random(seed * 7 + 1);
  let trees = '';
  for (let x = 2; x < LAND_W; x += 3 + r() * 7) {
    const th = 9 + r() * 13 * (r() < 0.15 ? 1.45 : 1);
    const tw = th * (0.38 + r() * 0.12);
    const y = yAt(x) + 2;
    // A pine: three stacked tiers, narrower toward the tip.
    trees +=
      `M${f(x - tw / 2)} ${f(y)} L${f(x)} ${f(y - th)} L${f(x + tw / 2)} ${f(y)} Z ` +
      `M${f(x - tw * 0.62)} ${f(y - th * 0.18)} L${f(x)} ${f(y - th * 0.78)} L${f(x + tw * 0.62)} ${f(y - th * 0.18)} Z `;
  }
  return `${d} ${trees}`;
}

/** Far range (tall, sharp), a second range, rolling middle hills, near treeline. */
export const LANDSCAPE = {
  far: ridgePath(11, 128, 0.58, 2, 50).d,
  ridge: ridgePath(41, 128, 0.55, 22, 62).d,
  mid: ridgePath(29, 64, 0.5, 42, 74).d,
  near: treelinePath(5),
};

/** Blend two #RRGGBB colours (0 = a, 1 = b). */
export function mix(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

/**
 * A transform that fits the 1200 × 100 landscape into a band `width` × `height`, scaling uniformly
 * and cropping the sides (like "cover"), anchored to the bottom.
 */
export function fitLandscape(width: number, height: number, y = 0) {
  const s = Math.max(height / LAND_H, width / LAND_W);
  const x = (width - LAND_W * s) / 2;
  return { scale: s, x, y: y + height - LAND_H * s };
}
