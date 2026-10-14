import type { MeshData } from './mesh';
import type { Vec3 } from './math';

/** Signed volume by the divergence theorem; positive for outward-facing closed meshes. */
export function signedVolume(m: MeshData): number {
  let v = 0;
  for (let i = 0; i < m.indices.length; i += 3) {
    const a = vertex(m, m.indices[i] ?? 0);
    const b = vertex(m, m.indices[i + 1] ?? 0);
    const c = vertex(m, m.indices[i + 2] ?? 0);
    v +=
      (a[0] * (b[1] * c[2] - b[2] * c[1]) -
        a[1] * (b[0] * c[2] - b[2] * c[0]) +
        a[2] * (b[0] * c[1] - b[1] * c[0])) /
      6;
  }
  return v;
}

/**
 * Watertight check on positions (vertices are duplicated per face, so edges are matched
 * by rounded coordinates): every directed edge must have exactly one opposite.
 */
export function isWatertight(m: MeshData, precision = 1e-6): boolean {
  const key = (i: number): string => {
    const p = vertex(m, i);
    return p.map((x) => Math.round(x / precision)).join(',');
  };
  const edges = new Map<string, number>();
  for (let i = 0; i < m.indices.length; i += 3) {
    const k = [key(m.indices[i] ?? 0), key(m.indices[i + 1] ?? 0), key(m.indices[i + 2] ?? 0)];
    for (let e = 0; e < 3; e++) {
      const a = k[e] ?? '';
      const b = k[(e + 1) % 3] ?? '';
      if (a === b) continue;
      edges.set(`${a}|${b}`, (edges.get(`${a}|${b}`) ?? 0) + 1);
    }
  }
  for (const [e, count] of edges) {
    if (count !== 1) return false;
    const [a, b] = e.split('|');
    if (edges.get(`${b}|${a}`) !== 1) return false;
  }
  return true;
}

export function vertex(m: MeshData, i: number): Vec3 {
  return [m.positions[i * 3] ?? 0, m.positions[i * 3 + 1] ?? 0, m.positions[i * 3 + 2] ?? 0];
}
