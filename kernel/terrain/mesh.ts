/** Terrain geometry: the heightfield as a mesh with splat weights as vertex colours. */
import { ROLE } from '../elements/roles';
import type { MeshData } from '../core/mesh';
import type { Heightfield } from './heightfield';

/** What every region's generator produces for the terrain geometry. */
export interface TerrainBase {
  height: Heightfield;
  /** Per vertex: path, scree, snow weights (or the region's equivalents); base is the rest. */
  splat: Float32Array;
}

export interface ColouredMeshData extends MeshData {
  colors: number[];
}

export function terrainMesh(v: TerrainBase): ColouredMeshData {
  const hf = v.height;
  const n = hf.n;
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = hf.x(i);
      const z = hf.z(j);
      positions.push(x, hf.get(i, j), z);
      normals.push(...hf.normal(i, j));
      // World-unit UVs; the material scales them per texture.
      uvs.push(x, z);
      const k = (j * n + i) * 3;
      colors.push(v.splat[k]!, v.splat[k + 1]!, v.splat[k + 2]!);
    }
  }
  const indices: number[] = [];
  const materials: number[] = [];
  for (let j = 0; j < n - 1; j++) {
    for (let i = 0; i < n - 1; i++) {
      const a = j * n + i;
      const b = a + 1;
      const c = a + n;
      const d = c + 1;
      // Counter-clockwise seen from above (+Y), right-handed like the rest of the kernel.
      indices.push(a, c, b, b, c, d);
      materials.push(ROLE.terrain, ROLE.terrain);
    }
  }
  return { positions, normals, uvs, indices, materials, colors };
}

export function appendMesh(into: ColouredMeshData, mesh: MeshData, colour = [0, 0, 0]): void {
  const base = into.positions.length / 3;
  // Loops, not spreads: a forest is hundreds of thousands of values.
  for (const v of mesh.positions) into.positions.push(v);
  for (const v of mesh.normals) into.normals.push(v);
  for (const v of mesh.uvs) into.uvs.push(v);
  for (let i = 0; i < mesh.positions.length / 3; i++) {
    into.colors.push(colour[0] ?? 0, colour[1] ?? 0, colour[2] ?? 0);
  }
  for (const idx of mesh.indices) into.indices.push(idx + base);
  for (const m of mesh.materials) into.materials.push(m);
}
