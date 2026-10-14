import { v3, type Vec3 } from '../core/math';

/**
 * Signed distance fields for organic shapes (caves, tunnels, chambers). Negative inside.
 * Primitives are composed with smooth unions and perturbed with noise, then surfaced by
 * marching cubes in ./marching.ts.
 */
export type SDF = (p: Vec3) => number;

export const sdf = {
  sphere:
    (c: Vec3, r: number): SDF =>
    (p) =>
      v3.distance(p, c) - r,

  ellipsoid:
    (c: Vec3, radii: Vec3): SDF =>
    (p) => {
      const q: Vec3 = [
        (p[0] - c[0]) / radii[0],
        (p[1] - c[1]) / radii[1],
        (p[2] - c[2]) / radii[2],
      ];
      const k0 = v3.length(q);
      const k1 = v3.length([q[0] / radii[0], q[1] / radii[1], q[2] / radii[2]]);
      return k1 > 1e-9 ? (k0 * (k0 - 1)) / k1 : -Math.min(...radii);
    },

  /** Capsule from a to b with radius r: a straight tunnel segment. */
  capsule:
    (a: Vec3, b: Vec3, r: number): SDF =>
    (p) => {
      const pa = v3.sub(p, a);
      const ba = v3.sub(b, a);
      const h = Math.max(0, Math.min(1, v3.dot(pa, ba) / Math.max(1e-9, v3.dot(ba, ba))));
      return v3.length(v3.sub(pa, v3.scale(ba, h))) - r;
    },

  /** Tunnel along a polyline, radius may vary per vertex. */
  tunnel: (path: Vec3[], radius: number | number[]): SDF => {
    const segs: SDF[] = [];
    for (let i = 0; i < path.length - 1; i++) {
      const r0 = typeof radius === 'number' ? radius : (radius[i] ?? 1);
      const r1 = typeof radius === 'number' ? radius : (radius[i + 1] ?? r0);
      const a = path[i] ?? [0, 0, 0];
      const b = path[i + 1] ?? [0, 0, 0];
      if (Math.abs(r0 - r1) < 1e-9) segs.push(sdf.capsule(a, b, r0));
      else segs.push(sdf.cone(a, b, r0, r1));
    }
    return sdf.union(...segs);
  },

  /** Round cone (capsule with different end radii). */
  cone:
    (a: Vec3, b: Vec3, r1: number, r2: number): SDF =>
    (p) => {
      const ba = v3.sub(b, a);
      const l2 = v3.dot(ba, ba);
      const rr = r1 - r2;
      const a2 = l2 - rr * rr;
      const il2 = 1 / Math.max(1e-9, l2);
      const pa = v3.sub(p, a);
      const y = v3.dot(pa, ba);
      const z = y - l2;
      const x2 = v3.dot(
        v3.sub(v3.scale(pa, l2), v3.scale(ba, y)),
        v3.sub(v3.scale(pa, l2), v3.scale(ba, y)),
      );
      const y2 = y * y * l2;
      const z2 = z * z * l2;
      const k = Math.sign(rr) * rr * rr * x2;
      if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
      if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
      return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
    },

  box:
    (c: Vec3, half: Vec3): SDF =>
    (p) => {
      const q: Vec3 = [
        Math.abs(p[0] - c[0]) - half[0],
        Math.abs(p[1] - c[1]) - half[1],
        Math.abs(p[2] - c[2]) - half[2],
      ];
      const outside = v3.length([Math.max(q[0], 0), Math.max(q[1], 0), Math.max(q[2], 0)]);
      return outside + Math.min(Math.max(q[0], q[1], q[2]), 0);
    },

  /** Half-space below height y (solid ground for everything under a floor level). */
  below:
    (y: number): SDF =>
    (p) =>
      p[1] - y,

  union:
    (...fs: SDF[]): SDF =>
    (p) => {
      let d = Infinity;
      for (const f of fs) d = Math.min(d, f(p));
      return d;
    },

  /** Polynomial smooth union with blend radius k. */
  smoothUnion:
    (k: number, ...fs: SDF[]): SDF =>
    (p) => {
      let d = Infinity;
      for (const f of fs) {
        const b = f(p);
        const h = Math.max(k - Math.abs(d - b), 0) / Math.max(k, 1e-9);
        d = Math.min(d, b) - h * h * k * 0.25;
      }
      return d;
    },

  subtract:
    (a: SDF, b: SDF): SDF =>
    (p) =>
      Math.max(a(p), -b(p)),

  intersect:
    (a: SDF, b: SDF): SDF =>
    (p) =>
      Math.max(a(p), b(p)),

  invert:
    (a: SDF): SDF =>
    (p) =>
      -a(p),

  /** Add value noise to the surface: rock roughness. */
  displace:
    (f: SDF, amplitude: number, frequency: number, seed = 1): SDF =>
    (p) =>
      f(p) +
      amplitude * (fbm3(p[0] * frequency, p[1] * frequency, p[2] * frequency, seed) - 0.5) * 2,
};

/** Deterministic value noise in 3D with fractal octaves, in [0, 1]. */
export function fbm3(x: number, y: number, z: number, seed = 1, octaves = 4): number {
  let v = 0;
  let a = 0.5;
  let f = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    v += a * noise3(x * f + seed * 7.1, y * f + seed * 3.3, z * f + seed * 5.7);
    norm += a;
    a *= 0.5;
    f *= 2.02;
  }
  return v / norm;
}

function hash3(x: number, y: number, z: number): number {
  let h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  h -= Math.floor(h);
  return h;
}

function noise3(x: number, y: number, z: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const sz = fz * fz * (3 - 2 * fz);
  const l = (a: number, b: number, t: number): number => a + (b - a) * t;
  return l(
    l(
      l(hash3(ix, iy, iz), hash3(ix + 1, iy, iz), sx),
      l(hash3(ix, iy + 1, iz), hash3(ix + 1, iy + 1, iz), sx),
      sy,
    ),
    l(
      l(hash3(ix, iy, iz + 1), hash3(ix + 1, iy, iz + 1), sx),
      l(hash3(ix, iy + 1, iz + 1), hash3(ix + 1, iy + 1, iz + 1), sx),
      sy,
    ),
    sz,
  );
}
