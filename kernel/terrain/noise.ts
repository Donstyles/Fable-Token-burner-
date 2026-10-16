/**
 * Deterministic 2D noise for terrain (DESIGN.md 15): gradient noise with fractal sums and a
 * ridged variant for crags and peaks. No dependencies; the same seed gives the same hills on
 * every machine.
 */

function hash(ix: number, iz: number, seed: number): number {
  let h = (ix * 374761393 + iz * 668265263 + seed * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const fade = (t: number): number => t * t * t * (t * (t * 6 - 15) + 10);

/** Gradient noise in [-1, 1] at integer-lattice spacing 1. */
export function gradientNoise(x: number, z: number, seed: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const grad = (gx: number, gz: number, dx: number, dz: number): number => {
    const a = hash(gx, gz, seed) * Math.PI * 2;
    return Math.cos(a) * dx + Math.sin(a) * dz;
  };
  const n00 = grad(ix, iz, fx, fz);
  const n10 = grad(ix + 1, iz, fx - 1, fz);
  const n01 = grad(ix, iz + 1, fx, fz - 1);
  const n11 = grad(ix + 1, iz + 1, fx - 1, fz - 1);
  const u = fade(fx);
  const v = fade(fz);
  const nx0 = n00 + (n10 - n00) * u;
  const nx1 = n01 + (n11 - n01) * u;
  return (nx0 + (nx1 - nx0) * v) * 1.4142;
}

export interface FbmOptions {
  octaves?: number;
  lacunarity?: number;
  gain?: number;
}

/** Fractal sum, roughly in [-1, 1]. `scale` is the wavelength of the first octave in metres. */
export function fbm(x: number, z: number, scale: number, seed: number, o: FbmOptions = {}): number {
  const octaves = o.octaves ?? 5;
  const lacunarity = o.lacunarity ?? 2;
  const gain = o.gain ?? 0.5;
  let amplitude = 1;
  let frequency = 1 / scale;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amplitude * gradientNoise(x * frequency, z * frequency, seed + i * 101);
    norm += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }
  return sum / norm;
}

/** Ridged multifractal in [0, 1]: sharp crests where the noise crosses zero. */
export function ridged(
  x: number,
  z: number,
  scale: number,
  seed: number,
  o: FbmOptions = {},
): number {
  const octaves = o.octaves ?? 4;
  const lacunarity = o.lacunarity ?? 2.1;
  const gain = o.gain ?? 0.5;
  let amplitude = 1;
  let frequency = 1 / scale;
  let sum = 0;
  let norm = 0;
  let weight = 1;
  for (let i = 0; i < octaves; i++) {
    let n = 1 - Math.abs(gradientNoise(x * frequency, z * frequency, seed + i * 211));
    n *= n * weight;
    weight = Math.min(1, Math.max(0, n * 2));
    sum += n * amplitude;
    norm += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }
  return sum / norm;
}

export const smoothstep = (a: number, b: number, t: number): number => {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
};

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
