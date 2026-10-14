import { mat4, v3, type Mat4, type Vec2, type Vec3 } from './math';
import { MeshBuilder } from './mesh';
import { dedupeProfile, ensureCCW, type Profile } from './profile';

export interface SolidOptions {
  material?: number;
  uvScale?: number;
  caps?: boolean;
}

/** Extrude a profile (XY plane) along +Z by `length`. Origin stays at z = 0. */
export function extrude(profile: Profile, length: number, opts: SolidOptions = {}): MeshBuilder {
  const p = ensureCCW(dedupeProfile(profile));
  const m = new MeshBuilder();
  const face = { material: opts.material ?? 0, uvScale: opts.uvScale ?? 1 };
  for (let i = 0; i < p.length; i++) {
    const [x0, y0] = p[i] ?? [0, 0];
    const [x1, y1] = p[(i + 1) % p.length] ?? [0, 0];
    // CCW profile: this order gives an outward normal.
    m.addQuad([x0, y0, 0], [x1, y1, 0], [x1, y1, length], [x0, y0, length], face);
  }
  if (opts.caps !== false) {
    m.addFace(
      p.map(([x, y]) => [x, y, length] as Vec3),
      face,
    );
    m.addFace(
      [...p].reverse().map(([x, y]) => [x, y, 0] as Vec3),
      face,
    );
  }
  return m;
}

/**
 * Sweep a profile along a polyline path with parallel-transport frames. The profile's
 * +Y maps to world up where possible, +X to the path's right.
 */
export function sweep(
  profile: Profile,
  path: Vec3[],
  opts: SolidOptions & { closed?: boolean } = {},
): MeshBuilder {
  const p = ensureCCW(dedupeProfile(profile));
  const m = new MeshBuilder();
  const face = { material: opts.material ?? 0, uvScale: opts.uvScale ?? 1 };
  const n = path.length;
  if (n < 2) return m;
  const closed = opts.closed === true;
  const tangents: Vec3[] = path.map((_, i) => {
    const prev = path[closed ? (i + n - 1) % n : Math.max(0, i - 1)] ?? [0, 0, 0];
    const next = path[closed ? (i + 1) % n : Math.min(n - 1, i + 1)] ?? [0, 0, 0];
    return v3.normalize(v3.sub(next, prev));
  });
  // Initial right vector: perpendicular to the tangent, as horizontal as possible.
  let up: Vec3 = [0, 1, 0];
  const t0 = tangents[0] ?? [0, 0, 1];
  if (Math.abs(v3.dot(t0, up)) > 0.99) up = [0, 0, 1];
  let right = v3.normalize(v3.cross(up, t0));
  let normal = v3.normalize(v3.cross(t0, right));
  const rings: Vec3[][] = [];
  for (let i = 0; i < n; i++) {
    const t = tangents[i] ?? [0, 0, 1];
    if (i > 0) {
      // Parallel transport: rotate the previous frame by the tangent change.
      const prevT = tangents[i - 1] ?? t;
      const axis = v3.cross(prevT, t);
      const s = v3.length(axis);
      const c = v3.dot(prevT, t);
      if (s > 1e-9) {
        const k = v3.scale(axis, 1 / s);
        const rot = (vec: Vec3): Vec3 =>
          v3.add(
            v3.add(v3.scale(vec, c), v3.scale(v3.cross(k, vec), s)),
            v3.scale(k, v3.dot(k, vec) * (1 - c)),
          );
        right = v3.normalize(rot(right));
        normal = v3.normalize(rot(normal));
      }
    }
    const o = path[i] ?? [0, 0, 0];
    rings.push(p.map(([x, y]) => v3.add(o, v3.add(v3.scale(right, x), v3.scale(normal, y)))));
  }
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const r0 = rings[i] ?? [];
    const r1 = rings[(i + 1) % n] ?? [];
    for (let j = 0; j < p.length; j++) {
      const a = r0[j] ?? [0, 0, 0];
      const b = r0[(j + 1) % p.length] ?? [0, 0, 0];
      const c = r1[(j + 1) % p.length] ?? [0, 0, 0];
      const d = r1[j] ?? [0, 0, 0];
      m.addQuad(a, b, c, d, face);
    }
  }
  if (!closed && opts.caps !== false) {
    const first = rings[0] ?? [];
    const last = rings[n - 1] ?? [];
    m.addFace([...first].reverse(), face);
    m.addFace(last, face);
  }
  // Frames from a path can make faces wind either way; fix normals from geometry.
  m.recomputeFlatNormals();
  return m;
}

/**
 * Revolve a profile given as (radius, height) pairs around the Y axis. The profile is a
 * closed outline in the half-plane r ≥ 0; points on the axis are allowed.
 */
export function revolve(
  profile: Profile,
  segments = 16,
  opts: SolidOptions & { angle?: number } = {},
): MeshBuilder {
  const p = ensureCCW(dedupeProfile(profile));
  const m = new MeshBuilder();
  const face = { material: opts.material ?? 0, uvScale: opts.uvScale ?? 1 };
  const angle = opts.angle ?? Math.PI * 2;
  const full = Math.abs(angle - Math.PI * 2) < 1e-9;
  const ring = (i: number): Vec3[] => {
    const a = (angle * i) / segments;
    const c = Math.cos(a);
    const s = Math.sin(a);
    return p.map(([r, y]) => [r * c, y, -r * s] as Vec3);
  };
  for (let i = 0; i < segments; i++) {
    const r0 = ring(i);
    const r1 = ring(full ? (i + 1) % segments : i + 1);
    for (let j = 0; j < p.length; j++) {
      const a = r0[j] ?? [0, 0, 0];
      const b = r1[j] ?? [0, 0, 0];
      const c = r1[(j + 1) % p.length] ?? [0, 0, 0];
      const d = r0[(j + 1) % p.length] ?? [0, 0, 0];
      // Collapse degenerate edges on the axis into triangles.
      const pts = dedupe([a, b, c, d]);
      if (pts.length >= 3) m.addFace(pts, face);
    }
  }
  if (!full && opts.caps !== false) {
    m.addFace([...ring(0)].reverse(), face);
    m.addFace(ring(segments), face);
  }
  m.recomputeFlatNormals();
  return m;
}

/** Stitch rings of equal vertex count into a surface, with optional end caps. */
export function loft(rings: Vec3[][], opts: SolidOptions = {}): MeshBuilder {
  const m = new MeshBuilder();
  const face = { material: opts.material ?? 0, uvScale: opts.uvScale ?? 1 };
  const k = rings[0]?.length ?? 0;
  for (let i = 0; i < rings.length - 1; i++) {
    const r0 = rings[i] ?? [];
    const r1 = rings[i + 1] ?? [];
    for (let j = 0; j < k; j++) {
      m.addQuad(
        r0[j] ?? [0, 0, 0],
        r0[(j + 1) % k] ?? [0, 0, 0],
        r1[(j + 1) % k] ?? [0, 0, 0],
        r1[j] ?? [0, 0, 0],
        face,
      );
    }
  }
  if (opts.caps !== false && rings.length > 1) {
    m.addFace([...(rings[0] ?? [])].reverse(), face);
    m.addFace(rings[rings.length - 1] ?? [], face);
  }
  m.recomputeFlatNormals();
  return m;
}

export function box(
  w: number,
  h: number,
  d: number,
  opts: SolidOptions & { centered?: boolean } = {},
): MeshBuilder {
  const m = extrude(
    [
      [-w / 2, -h / 2],
      [w / 2, -h / 2],
      [w / 2, h / 2],
      [-w / 2, h / 2],
    ],
    d,
    opts,
  );
  // extrude runs 0..d along z; centre it, or sit it on the floor (y from 0) when not centred.
  if (opts.centered === false) m.translate(0, h / 2, -d / 2);
  else m.translate(0, 0, -d / 2);
  return m;
}

export function cylinder(
  r: number,
  h: number,
  segments = 16,
  opts: SolidOptions = {},
): MeshBuilder {
  return revolve(
    [
      [0, 0],
      [r, 0],
      [r, h],
      [0, h],
    ],
    segments,
    opts,
  );
}

/** Repeat a mesh with a transform per copy. */
export function repeat(mesh: MeshBuilder, count: number, at: (i: number) => Mat4): MeshBuilder {
  const out = new MeshBuilder();
  for (let i = 0; i < count; i++) out.append(mesh, at(i));
  return out;
}

export function linearArray(mesh: MeshBuilder, count: number, step: Vec3): MeshBuilder {
  return repeat(mesh, count, (i) => mat4.translation(step[0] * i, step[1] * i, step[2] * i));
}

export function radialArray(mesh: MeshBuilder, count: number, radius: number): MeshBuilder {
  return repeat(mesh, count, (i) => {
    const a = (i / count) * Math.PI * 2;
    return mat4.multiply(mat4.rotationY(a), mat4.translation(radius, 0, 0));
  });
}

export function mirrorX(mesh: MeshBuilder): MeshBuilder {
  return new MeshBuilder().append(mesh, mat4.scaling(-1, 1, 1));
}

function dedupe(points: Vec3[]): Vec3[] {
  const out: Vec3[] = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (last && v3.distance(last, p) < 1e-9) continue;
    out.push(p);
  }
  const first = out[0];
  const last = out[out.length - 1];
  if (first && last && out.length > 1 && v3.distance(first, last) < 1e-9) out.pop();
  return out;
}

export type { Vec2 };
