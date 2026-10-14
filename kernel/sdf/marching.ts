import { v3, type Vec3 } from '../core/math';
import { MeshBuilder } from '../core/mesh';
import type { SDF } from './sdf';
import { EDGE_TABLE, TRI_TABLE } from './tables';

export interface MarchOptions {
  min: Vec3;
  max: Vec3;
  /** Cell size in metres. */
  cell: number;
  material?: number;
  uvScale?: number;
  /** Laplacian smoothing passes on the output (0 keeps the raw marching-cubes mesh). */
  smooth?: number;
}

/**
 * Marching cubes over an SDF: produces a flat-shaded surface where the field crosses zero,
 * with the solid on the negative side and faces pointing out of the solid (toward positive
 * values). For a cave carved out of rock, pass the rock's field (negative inside rock) so the
 * visible cave walls face into the cave.
 */
export function marchingCubes(field: SDF, opts: MarchOptions): MeshBuilder {
  const { min, max, cell } = opts;
  const nx = Math.max(1, Math.ceil((max[0] - min[0]) / cell));
  const ny = Math.max(1, Math.ceil((max[1] - min[1]) / cell));
  const nz = Math.max(1, Math.ceil((max[2] - min[2]) / cell));
  const sx = nx + 1;
  const sy = ny + 1;
  const sz = nz + 1;
  const values = new Float32Array(sx * sy * sz);
  const at = (i: number, j: number, k: number): number => i + sx * (j + sy * k);
  for (let k = 0; k < sz; k++)
    for (let j = 0; j < sy; j++)
      for (let i = 0; i < sx; i++) {
        values[at(i, j, k)] = field([min[0] + i * cell, min[1] + j * cell, min[2] + k * cell]);
      }

  // Shared vertices keyed by grid edge so smoothing and welding work.
  const vertexIndex = new Map<string, number>();
  const positions: Vec3[] = [];
  const triangles: number[][] = [];
  const corner = (i: number, j: number, k: number): Vec3 => [
    min[0] + i * cell,
    min[1] + j * cell,
    min[2] + k * cell,
  ];
  const offsets: [number, number, number][] = [
    [0, 0, 0],
    [1, 0, 0],
    [1, 1, 0],
    [0, 1, 0],
    [0, 0, 1],
    [1, 0, 1],
    [1, 1, 1],
    [0, 1, 1],
  ];
  const edgeCorners: [number, number][] = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 4],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
  ];

  for (let k = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        let cube = 0;
        const vals: number[] = [];
        for (let c = 0; c < 8; c++) {
          const o = offsets[c] ?? [0, 0, 0];
          const v = values[at(i + o[0], j + o[1], k + o[2])] ?? 0;
          vals.push(v);
          if (v < 0) cube |= 1 << c;
        }
        const edges = EDGE_TABLE[cube] ?? 0;
        if (edges === 0) continue;
        const edgeVertex: number[] = new Array<number>(12).fill(-1);
        for (let e = 0; e < 12; e++) {
          if (!(edges & (1 << e))) continue;
          const [c0, c1] = edgeCorners[e] ?? [0, 0];
          const o0 = offsets[c0] ?? [0, 0, 0];
          const o1 = offsets[c1] ?? [0, 0, 0];
          const g0 = [i + o0[0], j + o0[1], k + o0[2]];
          const g1 = [i + o1[0], j + o1[1], k + o1[2]];
          const key = `${Math.min(at(g0[0] ?? 0, g0[1] ?? 0, g0[2] ?? 0), at(g1[0] ?? 0, g1[1] ?? 0, g1[2] ?? 0))}:${Math.max(at(g0[0] ?? 0, g0[1] ?? 0, g0[2] ?? 0), at(g1[0] ?? 0, g1[1] ?? 0, g1[2] ?? 0))}`;
          let idx = vertexIndex.get(key);
          if (idx === undefined) {
            const v0 = vals[c0] ?? 0;
            const v1 = vals[c1] ?? 0;
            const t = Math.abs(v1 - v0) < 1e-12 ? 0.5 : v0 / (v0 - v1);
            const p0 = corner(g0[0] ?? 0, g0[1] ?? 0, g0[2] ?? 0);
            const p1 = corner(g1[0] ?? 0, g1[1] ?? 0, g1[2] ?? 0);
            idx = positions.length;
            positions.push(v3.lerp(p0, p1, Math.max(0, Math.min(1, t))));
            vertexIndex.set(key, idx);
          }
          edgeVertex[e] = idx;
        }
        const tri = TRI_TABLE[cube] ?? [];
        for (let t = 0; t < tri.length; t += 3) {
          const a = edgeVertex[tri[t] ?? 0] ?? -1;
          const b = edgeVertex[tri[t + 1] ?? 0] ?? -1;
          const c = edgeVertex[tri[t + 2] ?? 0] ?? -1;
          if (a < 0 || b < 0 || c < 0) continue;
          triangles.push([a, b, c]);
        }
      }

  // Laplacian smoothing on the shared-vertex mesh.
  const passes = opts.smooth ?? 0;
  if (passes > 0 && positions.length > 0) {
    const neighbours: Set<number>[] = positions.map(() => new Set<number>());
    for (const [a, b, c] of triangles as [number, number, number][]) {
      neighbours[a]?.add(b).add(c);
      neighbours[b]?.add(a).add(c);
      neighbours[c]?.add(a).add(b);
    }
    for (let pass = 0; pass < passes; pass++) {
      const next = positions.map((p, i) => {
        const nb = neighbours[i];
        if (!nb || nb.size === 0) return p;
        let acc: Vec3 = [0, 0, 0];
        for (const j of nb) acc = v3.add(acc, positions[j] ?? p);
        return v3.lerp(p, v3.scale(acc, 1 / nb.size), 0.5);
      });
      positions.splice(0, positions.length, ...next);
    }
  }

  const m = new MeshBuilder();
  const face = { material: opts.material ?? 0, uvScale: opts.uvScale ?? 1 };
  for (const [a, b, c] of triangles as [number, number, number][]) {
    const pa = positions[a] ?? [0, 0, 0];
    const pb = positions[b] ?? [0, 0, 0];
    const pc = positions[c] ?? [0, 0, 0];
    // The published tables wind faces toward the solid; reverse so normals point out of it.
    m.addFace([pa, pc, pb], face);
  }
  return m;
}
