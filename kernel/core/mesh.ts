import { mat4, v3, type Mat4, type Vec2, type Vec3 } from './math';

/**
 * Flat-shaded triangle mesh with per-triangle material ids. Every face gets its own
 * vertices (hard edges everywhere), which is the low-poly look the design asks for, and
 * keeps the kernel free of normal-smoothing bookkeeping. UVs default to a world-unit
 * planar projection by dominant normal axis, so textures tile per metre on any face.
 */
export interface MeshData {
  positions: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
  /** One material id per triangle. */
  materials: number[];
  /** Per vertex: 0 = explicit UV, otherwise the planar world-unit scale to recompute with. */
  uvScales?: number[];
}

export interface FaceOptions {
  material?: number;
  /** Metres per texture repeat for the default planar UVs. */
  uvScale?: number;
  /** Explicit UVs, one per point, overriding the planar projection. */
  uvs?: Vec2[];
  /**
   * Keep a zero-area triangle instead of dropping it. Boolean output uses them to resolve
   * T-junctions, and dropping them would open the mesh.
   */
  keepDegenerate?: boolean;
}

export class MeshBuilder {
  positions: number[] = [];
  normals: number[] = [];
  uvs: number[] = [];
  indices: number[] = [];
  materials: number[] = [];
  /** Per vertex: 0 = explicit UV, otherwise the planar scale; see refreshAutoUVs(). */
  uvScales: number[] = [];

  get triangleCount(): number {
    return this.indices.length / 3;
  }

  get vertexCount(): number {
    return this.positions.length / 3;
  }

  /** Planar world-unit UV for a point on a face with the given normal. */
  static planarUV(p: Vec3, n: Vec3, scale: number): Vec2 {
    const ax = Math.abs(n[0]);
    const ay = Math.abs(n[1]);
    const az = Math.abs(n[2]);
    const s = 1 / Math.max(scale, 1e-6);
    if (ay >= ax && ay >= az) return [p[0] * s, p[2] * s];
    if (ax >= az) return [p[2] * s, p[1] * s];
    return [p[0] * s, p[1] * s];
  }

  /**
   * Add a planar convex-or-concave polygon as triangles (ear clipping). Points are in
   * counter-clockwise order seen from the side the normal points to.
   */
  addFace(points: Vec3[], opts: FaceOptions = {}): this {
    if (points.length < 3) return this;
    let n = polygonNormal(points);
    if (v3.length(n) < 1e-12) {
      if (!opts.keepDegenerate || points.length !== 3) return this;
      n = [0, 1, 0];
    }
    const tris = points.length === 3 ? [[0, 1, 2]] : earClip(points, n);
    const base = this.vertexCount;
    const material = opts.material ?? 0;
    const scale = opts.uvScale ?? 1;
    points.forEach((p, i) => {
      const explicit = opts.uvs?.[i];
      const uv = explicit ?? MeshBuilder.planarUV(p, n, scale);
      this.positions.push(p[0], p[1], p[2]);
      this.normals.push(n[0], n[1], n[2]);
      this.uvs.push(uv[0], uv[1]);
      this.uvScales.push(explicit ? 0 : scale);
    });
    for (const [a, b, c] of tris) {
      this.indices.push(base + (a ?? 0), base + (b ?? 0), base + (c ?? 0));
      this.materials.push(material);
    }
    return this;
  }

  /** Add a quad given in counter-clockwise order. */
  addQuad(a: Vec3, b: Vec3, c: Vec3, d: Vec3, opts: FaceOptions = {}): this {
    return this.addFace([a, b, c, d], opts);
  }

  /** Append another mesh, optionally transformed. Mirroring transforms flip winding. */
  append(other: MeshData | MeshBuilder, transform?: Mat4): this {
    const base = this.vertexCount;
    const mirrored = transform ? mat4.det3(transform) < 0 : false;
    for (let i = 0; i < other.positions.length; i += 3) {
      let p: Vec3 = [
        other.positions[i] ?? 0,
        other.positions[i + 1] ?? 0,
        other.positions[i + 2] ?? 0,
      ];
      let n: Vec3 = [other.normals[i] ?? 0, other.normals[i + 1] ?? 0, other.normals[i + 2] ?? 0];
      if (transform) {
        p = mat4.transformPoint(transform, p);
        n = v3.normalize(mat4.transformDirection(transform, n));
      }
      this.positions.push(p[0], p[1], p[2]);
      this.normals.push(n[0], n[1], n[2]);
    }
    // Loops, not spreads: a cave mesh has more entries than the call stack allows.
    for (let i = 0; i < other.uvs.length; i++) this.uvs.push(other.uvs[i] ?? 0);
    const count = other.positions.length / 3;
    for (let i = 0; i < count; i++) this.uvScales.push(other.uvScales?.[i] ?? 0);
    for (let i = 0; i < other.indices.length; i += 3) {
      const a = (other.indices[i] ?? 0) + base;
      const b = (other.indices[i + 1] ?? 0) + base;
      const c = (other.indices[i + 2] ?? 0) + base;
      if (mirrored) this.indices.push(a, c, b);
      else this.indices.push(a, b, c);
    }
    for (let i = 0; i < other.materials.length; i++) this.materials.push(other.materials[i] ?? 0);
    if (transform) this.refreshAutoUVs(base);
    return this;
  }

  /** Recompute planar world-unit UVs for auto-UV vertices from index `from` on. */
  refreshAutoUVs(from = 0): this {
    for (let v = from; v < this.vertexCount; v++) {
      const scale = this.uvScales[v] ?? 0;
      if (scale <= 0) continue;
      const i = v * 3;
      const uv = MeshBuilder.planarUV(
        [this.positions[i] ?? 0, this.positions[i + 1] ?? 0, this.positions[i + 2] ?? 0],
        [this.normals[i] ?? 0, this.normals[i + 1] ?? 0, this.normals[i + 2] ?? 0],
        scale,
      );
      this.uvs[v * 2] = uv[0];
      this.uvs[v * 2 + 1] = uv[1];
    }
    return this;
  }

  transform(m: Mat4): this {
    const mirrored = mat4.det3(m) < 0;
    for (let i = 0; i < this.positions.length; i += 3) {
      const p = mat4.transformPoint(m, [
        this.positions[i] ?? 0,
        this.positions[i + 1] ?? 0,
        this.positions[i + 2] ?? 0,
      ]);
      const n = v3.normalize(
        mat4.transformDirection(m, [
          this.normals[i] ?? 0,
          this.normals[i + 1] ?? 0,
          this.normals[i + 2] ?? 0,
        ]),
      );
      this.positions[i] = p[0];
      this.positions[i + 1] = p[1];
      this.positions[i + 2] = p[2];
      this.normals[i] = n[0];
      this.normals[i + 1] = n[1];
      this.normals[i + 2] = n[2];
    }
    if (mirrored) this.flipWinding();
    this.refreshAutoUVs();
    return this;
  }

  translate(x: number, y: number, z: number): this {
    return this.transform(mat4.translation(x, y, z));
  }

  rotateY(angle: number): this {
    return this.transform(mat4.rotationY(angle));
  }

  /** Reverse triangle winding (normals untouched; use flip() to turn a solid inside out). */
  flipWinding(): this {
    for (let i = 0; i < this.indices.length; i += 3) {
      const b = this.indices[i + 1] ?? 0;
      this.indices[i + 1] = this.indices[i + 2] ?? 0;
      this.indices[i + 2] = b;
    }
    return this;
  }

  /** Turn the surface inside out: reverse winding and negate normals. */
  flip(): this {
    this.flipWinding();
    for (let i = 0; i < this.normals.length; i++) this.normals[i] = -(this.normals[i] ?? 0);
    return this;
  }

  /** Recompute every face normal from its triangle (after transforms that skew). */
  recomputeFlatNormals(): this {
    for (let i = 0; i < this.indices.length; i += 3) {
      const ia = (this.indices[i] ?? 0) * 3;
      const ib = (this.indices[i + 1] ?? 0) * 3;
      const ic = (this.indices[i + 2] ?? 0) * 3;
      const a: Vec3 = [
        this.positions[ia] ?? 0,
        this.positions[ia + 1] ?? 0,
        this.positions[ia + 2] ?? 0,
      ];
      const b: Vec3 = [
        this.positions[ib] ?? 0,
        this.positions[ib + 1] ?? 0,
        this.positions[ib + 2] ?? 0,
      ];
      const c: Vec3 = [
        this.positions[ic] ?? 0,
        this.positions[ic + 1] ?? 0,
        this.positions[ic + 2] ?? 0,
      ];
      const n = v3.normalize(v3.cross(v3.sub(b, a), v3.sub(c, a)));
      for (const k of [ia, ib, ic]) {
        this.normals[k] = n[0];
        this.normals[k + 1] = n[1];
        this.normals[k + 2] = n[2];
      }
    }
    return this;
  }

  /**
   * Average the normals of all vertices sharing a position (within `precision`), for
   * organic surfaces such as cave rock. Planar UVs follow the new normals.
   */
  smoothNormals(precision = 1e-5): this {
    const sums = new Map<string, Vec3>();
    const keys: string[] = [];
    for (let v = 0; v < this.vertexCount; v++) {
      const i = v * 3;
      const key = [this.positions[i], this.positions[i + 1], this.positions[i + 2]]
        .map((x) => Math.round((x ?? 0) / precision))
        .join(',');
      keys.push(key);
      const sum = sums.get(key) ?? [0, 0, 0];
      sum[0] += this.normals[i] ?? 0;
      sum[1] += this.normals[i + 1] ?? 0;
      sum[2] += this.normals[i + 2] ?? 0;
      sums.set(key, sum);
    }
    for (let v = 0; v < this.vertexCount; v++) {
      const n = v3.normalize(sums.get(keys[v] ?? '') ?? [0, 1, 0]);
      this.normals[v * 3] = n[0];
      this.normals[v * 3 + 1] = n[1];
      this.normals[v * 3 + 2] = n[2];
    }
    return this.refreshAutoUVs();
  }

  bounds(): { min: Vec3; max: Vec3 } {
    const min: Vec3 = [Infinity, Infinity, Infinity];
    const max: Vec3 = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < this.positions.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        const v = this.positions[i + k] ?? 0;
        if (v < (min[k] ?? 0)) min[k] = v;
        if (v > (max[k] ?? 0)) max[k] = v;
      }
    }
    return { min, max };
  }

  toMeshData(): MeshData {
    return {
      positions: [...this.positions],
      normals: [...this.normals],
      uvs: [...this.uvs],
      indices: [...this.indices],
      materials: [...this.materials],
      uvScales: [...this.uvScales],
    };
  }

  static from(data: MeshData): MeshBuilder {
    const b = new MeshBuilder();
    b.append(data);
    return b;
  }
}

/** Newell's method: robust normal for a planar polygon in any orientation. */
export function polygonNormal(points: Vec3[]): Vec3 {
  let x = 0;
  let y = 0;
  let z = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i] ?? [0, 0, 0];
    const q = points[(i + 1) % points.length] ?? [0, 0, 0];
    x += (p[1] - q[1]) * (p[2] + q[2]);
    y += (p[2] - q[2]) * (p[0] + q[0]);
    z += (p[0] - q[0]) * (p[1] + q[1]);
  }
  return v3.normalize([x, y, z]);
}

/** Ear clipping for a simple polygon given its normal. Returns index triples. */
export function earClip(points: Vec3[], normal: Vec3): number[][] {
  // Project to 2D in the polygon's plane.
  const ax = Math.abs(normal[0]);
  const ay = Math.abs(normal[1]);
  const az = Math.abs(normal[2]);
  const to2: (p: Vec3) => Vec2 =
    ay >= ax && ay >= az
      ? (p) => (normal[1] > 0 ? [p[0], -p[2]] : [p[0], p[2]])
      : ax >= az
        ? (p) => (normal[0] > 0 ? [p[2], p[1]] : [-p[2], p[1]])
        : (p) => (normal[2] > 0 ? [p[0], p[1]] : [-p[0], p[1]]);
  const pts = points.map(to2);
  const n = pts.length;
  const idx = [...Array(n).keys()];
  const out: number[][] = [];
  const area2 = (a: Vec2, b: Vec2, c: Vec2): number =>
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const inside = (p: Vec2, a: Vec2, b: Vec2, c: Vec2): boolean =>
    area2(a, b, p) >= -1e-12 && area2(b, c, p) >= -1e-12 && area2(c, a, p) >= -1e-12;
  let guard = 0;
  while (idx.length > 3 && guard++ < 10_000) {
    let clipped = false;
    for (let i = 0; i < idx.length; i++) {
      const i0 = idx[(i + idx.length - 1) % idx.length] ?? 0;
      const i1 = idx[i] ?? 0;
      const i2 = idx[(i + 1) % idx.length] ?? 0;
      const a = pts[i0] ?? [0, 0];
      const b = pts[i1] ?? [0, 0];
      const c = pts[i2] ?? [0, 0];
      if (area2(a, b, c) <= 1e-12) continue; // reflex or degenerate
      let ear = true;
      for (const j of idx) {
        if (j === i0 || j === i1 || j === i2) continue;
        if (inside(pts[j] ?? [0, 0], a, b, c)) {
          ear = false;
          break;
        }
      }
      if (!ear) continue;
      out.push([i0, i1, i2]);
      idx.splice(i, 1);
      clipped = true;
      break;
    }
    if (!clipped) break; // degenerate input: fall back to a fan
  }
  if (idx.length === 3) out.push([idx[0] ?? 0, idx[1] ?? 0, idx[2] ?? 0]);
  else if (idx.length > 3)
    for (let i = 1; i < idx.length - 1; i++) out.push([idx[0] ?? 0, idx[i] ?? 0, idx[i + 1] ?? 0]);
  return out;
}
