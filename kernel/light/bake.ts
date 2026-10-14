import { v3, type Vec3 } from '../core/math';
import { MeshBuilder, type MeshData } from '../core/mesh';

/**
 * Baked per-vertex lighting (DESIGN.md 11.6): the level's static lights are evaluated at
 * every vertex with shadow rays against the geometry, and stored as a vertex colour. Big
 * flat faces are first cut along a world grid so the light has vertices to vary across;
 * cutting on global planes keeps neighbouring faces split at the same points, so Gouraud
 * interpolation never shows a seam.
 */
export interface BakeLight {
  position: Vec3;
  color: [number, number, number];
  range: number;
  intensity: number;
}

export interface BakeOptions {
  /** Light reaching every vertex regardless of lights; dungeons are dark beyond torch range. */
  ambient: [number, number, number];
  /** Grid spacing for the pre-bake subdivision, metres. */
  cell: number;
  /** Geometry that casts shadows; defaults to the mesh being lit. */
  occluder?: MeshData;
  /** Upper bound for a channel; keeps hot spots for bloom without blowing out. */
  maxValue?: number;
}

/** Mesh with an RGB colour per vertex. */
export interface LitMeshData extends MeshData {
  colors: number[];
}

type Poly = { p: Vec3; uv: [number, number]; n: Vec3 }[];

/** Clip a convex polygon by the plane axis = value, returning the parts on each side. */
function splitPoly(poly: Poly, axis: number, value: number): [Poly, Poly] {
  const below: Poly = [];
  const above: Poly = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    const da = (a.p[axis] ?? 0) - value;
    const db = (b.p[axis] ?? 0) - value;
    if (da <= 0) below.push(a);
    if (da >= 0) above.push(a);
    if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
      const t = da / (da - db);
      const m = {
        p: v3.lerp(a.p, b.p, t),
        uv: [a.uv[0] + (b.uv[0] - a.uv[0]) * t, a.uv[1] + (b.uv[1] - a.uv[1]) * t] as [
          number,
          number,
        ],
        n: v3.normalize(v3.lerp(a.n, b.n, t)),
      };
      below.push(m);
      above.push(m);
    }
  }
  return [below, above];
}

/** Cut every triangle along the world grid planes spaced `cell` apart on all three axes. */
export function subdivide(mesh: MeshData, cell: number): MeshData {
  const out = new MeshBuilder();
  const pos = (i: number): Vec3 => [
    mesh.positions[i * 3] ?? 0,
    mesh.positions[i * 3 + 1] ?? 0,
    mesh.positions[i * 3 + 2] ?? 0,
  ];
  const uv = (i: number): [number, number] => [mesh.uvs[i * 2] ?? 0, mesh.uvs[i * 2 + 1] ?? 0];
  const nrm = (i: number): Vec3 => [
    mesh.normals[i * 3] ?? 0,
    mesh.normals[i * 3 + 1] ?? 0,
    mesh.normals[i * 3 + 2] ?? 0,
  ];
  const eps = 1e-6;
  for (let t = 0; t < mesh.indices.length / 3; t++) {
    const ia = mesh.indices[t * 3] ?? 0;
    const ib = mesh.indices[t * 3 + 1] ?? 0;
    const ic = mesh.indices[t * 3 + 2] ?? 0;
    const material = mesh.materials[t] ?? 0;
    const scale = mesh.uvScales?.[ia] ?? 0;
    const corners: Poly = [
      { p: pos(ia), uv: uv(ia), n: nrm(ia) },
      { p: pos(ib), uv: uv(ib), n: nrm(ib) },
      { p: pos(ic), uv: uv(ic), n: nrm(ic) },
    ];
    let polys: Poly[] = [corners];
    // Triangles already smaller than the grid (cave rock) are kept whole.
    const longest = Math.max(
      v3.distance(corners[0]!.p, corners[1]!.p),
      v3.distance(corners[1]!.p, corners[2]!.p),
      v3.distance(corners[2]!.p, corners[0]!.p),
    );
    for (let axis = 0; axis < 3 && longest > cell * 0.75; axis++) {
      const next: Poly[] = [];
      for (const poly of polys) {
        let lo = Infinity;
        let hi = -Infinity;
        for (const v of poly) {
          lo = Math.min(lo, v.p[axis]!);
          hi = Math.max(hi, v.p[axis]!);
        }
        let pieces = [poly];
        const first = Math.floor(lo / cell) + 1;
        const last = Math.ceil(hi / cell) - 1;
        for (let k = first; k <= last; k++) {
          const value = k * cell;
          if (value <= lo + eps || value >= hi - eps) continue;
          const after: Poly[] = [];
          for (const piece of pieces) {
            const [b, a] = splitPoly(piece, axis, value);
            if (b.length >= 3) after.push(b);
            if (a.length >= 3) after.push(a);
          }
          pieces = after;
        }
        next.push(...pieces);
      }
      polys = next;
    }
    const startV = out.vertexCount;
    for (const poly of polys) {
      const explicit = poly.map((v) => v.uv);
      // Fan triangulation; the pieces are convex.
      for (let i = 1; i + 1 < poly.length; i++) {
        const tri = [poly[0]!, poly[i]!, poly[i + 1]!];
        out.addFace(
          tri.map((v) => v.p),
          {
            material,
            uvs: [explicit[0]!, explicit[i]!, explicit[i + 1]!],
            keepDegenerate: true,
          },
        );
      }
    }
    // Carry the source normals (interpolated for smooth meshes; slivers would otherwise get
    // a noisy one) and the planar UV scale.
    let k = startV;
    for (const poly of polys) {
      for (let i = 1; i + 1 < poly.length; i++) {
        for (const v of [poly[0]!, poly[i]!, poly[i + 1]!]) {
          out.normals[k * 3] = v.n[0];
          out.normals[k * 3 + 1] = v.n[1];
          out.normals[k * 3 + 2] = v.n[2];
          out.uvScales[k] = scale;
          k++;
        }
      }
    }
  }
  return out.toMeshData();
}

/** Triangle BVH for shadow rays. */
export class TriangleBVH {
  private readonly nodeMin: number[] = [];
  private readonly nodeMax: number[] = [];
  private readonly nodeLeft: number[] = [];
  private readonly nodeRight: number[] = [];
  private readonly nodeStart: number[] = [];
  private readonly nodeCount: number[] = [];
  private readonly order: number[];
  private readonly tris: Float64Array;

  constructor(mesh: MeshData) {
    const n = mesh.indices.length / 3;
    this.tris = new Float64Array(n * 9);
    const centroids = new Float64Array(n * 3);
    for (let t = 0; t < n; t++) {
      for (let k = 0; k < 3; k++) {
        const i = mesh.indices[t * 3 + k] ?? 0;
        for (let c = 0; c < 3; c++) {
          const v = mesh.positions[i * 3 + c] ?? 0;
          this.tris[t * 9 + k * 3 + c] = v;
          centroids[t * 3 + c] = (centroids[t * 3 + c] ?? 0) + v / 3;
        }
      }
    }
    this.order = Array.from({ length: n }, (_, i) => i);
    if (n > 0) this.build(0, n, centroids);
  }

  private build(start: number, end: number, centroids: Float64Array): number {
    const id = this.nodeMin.length / 3;
    const min: Vec3 = [Infinity, Infinity, Infinity];
    const max: Vec3 = [-Infinity, -Infinity, -Infinity];
    for (let i = start; i < end; i++) {
      const t = this.order[i] ?? 0;
      for (let k = 0; k < 9; k++) {
        const v = this.tris[t * 9 + k] ?? 0;
        const c = k % 3;
        if (v < min[c]!) min[c] = v;
        if (v > max[c]!) max[c] = v;
      }
    }
    this.nodeMin.push(...min);
    this.nodeMax.push(...max);
    this.nodeLeft.push(-1);
    this.nodeRight.push(-1);
    this.nodeStart.push(start);
    this.nodeCount.push(end - start);
    if (end - start <= 4) return id;
    const ext = v3.sub(max, min);
    const axis = ext[0] >= ext[1] && ext[0] >= ext[2] ? 0 : ext[1] >= ext[2] ? 1 : 2;
    const slice = this.order.slice(start, end);
    slice.sort((a, b) => (centroids[a * 3 + axis] ?? 0) - (centroids[b * 3 + axis] ?? 0));
    for (let i = 0; i < slice.length; i++) this.order[start + i] = slice[i]!;
    const mid = (start + end) >> 1;
    this.nodeCount[id] = 0;
    this.nodeLeft[id] = this.build(start, mid, centroids);
    this.nodeRight[id] = this.build(mid, end, centroids);
    return id;
  }

  /** True when the open segment from `a` to `b` crosses any triangle. */
  occluded(a: Vec3, b: Vec3): boolean {
    if (this.nodeMin.length === 0) return false;
    const d = v3.sub(b, a);
    const inv: Vec3 = [1 / d[0], 1 / d[1], 1 / d[2]];
    const stack = [0];
    while (stack.length) {
      const id = stack.pop()!;
      if (!this.hitsBox(id, a, inv)) continue;
      const count = this.nodeCount[id] ?? 0;
      if (count > 0) {
        const start = this.nodeStart[id] ?? 0;
        for (let i = start; i < start + count; i++) {
          if (this.hitsTriangle(this.order[i] ?? 0, a, d)) return true;
        }
      } else {
        stack.push(this.nodeLeft[id] ?? 0, this.nodeRight[id] ?? 0);
      }
    }
    return false;
  }

  private hitsBox(id: number, a: Vec3, inv: Vec3): boolean {
    let tmin = 0;
    let tmax = 1;
    for (let c = 0; c < 3; c++) {
      const lo = ((this.nodeMin[id * 3 + c] ?? 0) - a[c]!) * inv[c]!;
      const hi = ((this.nodeMax[id * 3 + c] ?? 0) - a[c]!) * inv[c]!;
      tmin = Math.max(tmin, Math.min(lo, hi));
      tmax = Math.min(tmax, Math.max(lo, hi));
    }
    return tmax >= tmin;
  }

  private hitsTriangle(t: number, a: Vec3, d: Vec3): boolean {
    const o = t * 9;
    const p0: Vec3 = [this.tris[o]!, this.tris[o + 1]!, this.tris[o + 2]!];
    const e1: Vec3 = [
      this.tris[o + 3]! - p0[0],
      this.tris[o + 4]! - p0[1],
      this.tris[o + 5]! - p0[2],
    ];
    const e2: Vec3 = [
      this.tris[o + 6]! - p0[0],
      this.tris[o + 7]! - p0[1],
      this.tris[o + 8]! - p0[2],
    ];
    const h = v3.cross(d, e2);
    const det = v3.dot(e1, h);
    if (Math.abs(det) < 1e-12) return false;
    const inv = 1 / det;
    const s = v3.sub(a, p0);
    const u = inv * v3.dot(s, h);
    if (u < 0 || u > 1) return false;
    const q = v3.cross(s, e1);
    const v = inv * v3.dot(d, q);
    if (v < 0 || u + v > 1) return false;
    const tt = inv * v3.dot(e2, q);
    return tt > 1e-4 && tt < 1 - 1e-4;
  }
}

/** Light every vertex of `mesh` (after grid subdivision) from `lights`, with shadows. */
export function bakeVertexLight(
  mesh: MeshData,
  lights: BakeLight[],
  opts: BakeOptions,
): LitMeshData {
  const fine = subdivide(mesh, opts.cell);
  const bvh = new TriangleBVH(opts.occluder ?? mesh);
  const cap = opts.maxValue ?? 2;
  const colors: number[] = new Array<number>(fine.positions.length).fill(0);
  const n = fine.positions.length / 3;
  for (let v = 0; v < n; v++) {
    const p: Vec3 = [
      fine.positions[v * 3]!,
      fine.positions[v * 3 + 1]!,
      fine.positions[v * 3 + 2]!,
    ];
    const nrm: Vec3 = [fine.normals[v * 3]!, fine.normals[v * 3 + 1]!, fine.normals[v * 3 + 2]!];
    let r = opts.ambient[0];
    let g = opts.ambient[1];
    let b = opts.ambient[2];
    const origin = v3.add(p, v3.scale(nrm, 0.03));
    for (const l of lights) {
      const toLight = v3.sub(l.position, p);
      const d = v3.length(toLight);
      if (d >= l.range || d < 1e-6) continue;
      const ndl = v3.dot(nrm, toLight) / d;
      if (ndl <= 0) continue;
      const falloff = 1 - d / l.range;
      const att = falloff * falloff * l.intensity * ndl;
      if (att < 1e-4) continue;
      if (bvh.occluded(origin, l.position)) continue;
      r += l.color[0] * att;
      g += l.color[1] * att;
      b += l.color[2] * att;
    }
    colors[v * 3] = Math.min(cap, r);
    colors[v * 3 + 1] = Math.min(cap, g);
    colors[v * 3 + 2] = Math.min(cap, b);
  }
  return { ...fine, colors };
}
