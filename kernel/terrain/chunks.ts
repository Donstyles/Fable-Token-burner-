/**
 * Terrain chunks with levels of detail (DESIGN.md 15): the heightfield cut into square chunks,
 * each exported at full resolution and at every second and fourth vertex. Chunks carry a
 * skirt, an apron hanging from their border and facing out, so the cracks between
 * neighbouring chunks at different detail levels never show the sky.
 */
import { ROLE } from '../elements/roles';
import type { ColouredMeshData, TerrainBase } from './mesh';

export interface TerrainChunk {
  /** `t:<ci>:<cj>:<lod>` */
  name: string;
  ci: number;
  cj: number;
  lod: number;
  mesh: ColouredMeshData;
}

export const LOD_STEPS = [1, 2, 4] as const;

export function terrainChunks(v: TerrainBase, chunkCells: number, skirt = 12): TerrainChunk[] {
  const hf = v.height;
  if (hf.cells % chunkCells !== 0) throw new Error('chunkCells must divide the grid');
  const per = hf.cells / chunkCells;
  const out: TerrainChunk[] = [];
  for (let cj = 0; cj < per; cj++) {
    for (let ci = 0; ci < per; ci++) {
      LOD_STEPS.forEach((step, lod) => {
        const m = chunkCells / step;
        const positions: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const colors: number[] = [];
        const indices: number[] = [];
        const materials: number[] = [];
        const vertex = (i: number, j: number, drop: number): number => {
          const x = hf.x(i);
          const z = hf.z(j);
          positions.push(x, hf.get(i, j) - drop, z);
          normals.push(...hf.normal(i, j));
          const k = (j * hf.n + i) * 3;
          colors.push(v.splat[k]!, v.splat[k + 1]!, v.splat[k + 2]!);
          return positions.length / 3 - 1;
        };
        const grid: number[] = [];
        for (let b = 0; b <= m; b++) {
          for (let a = 0; a <= m; a++) {
            grid.push(vertex(ci * chunkCells + a * step, cj * chunkCells + b * step, 0));
          }
        }
        const at = (a: number, b: number): number => grid[b * (m + 1) + a]!;
        for (let b = 0; b < m; b++) {
          for (let a = 0; a < m; a++) {
            const p = at(a, b);
            const q = at(a + 1, b);
            const r = at(a, b + 1);
            const s = at(a + 1, b + 1);
            indices.push(p, r, q, q, r, s);
            materials.push(ROLE.terrain, ROLE.terrain);
          }
        }
        // Skirts along the four borders, wound outward: a crack seen from one side is filled
        // by the skirt of the chunk across it. Each hangs `skirt` metres below the lowest that
        // any detail level's border comes along its stretch (talk-world critic, round 14: the
        // sky showed through the far seams as a dashed line; the skirts faced in, away from
        // the eye, and coarse and fine borders part by up to 80 m round the cave's knoll).
        const coarsest = LOD_STEPS[LOD_STEPS.length - 1]!;
        const edge = (along: (k: number) => [number, number], flip: boolean): void => {
          const heightAt = (t: number): number => {
            const [a, b] = along(t / step);
            return hf.get(ci * chunkCells + a * step, cj * chunkCells + b * step);
          };
          // Between two of this level's vertices, any level's border is a blend of heights in
          // the coarsest cells round them, so the lowest of those heights bounds it from below.
          const low: number[] = [];
          for (let k = 0; k < m; k++) {
            let lo = Infinity;
            const t1 = Math.ceil(((k + 1) * step) / coarsest) * coarsest;
            for (let t = Math.floor((k * step) / coarsest) * coarsest; t <= t1; t++) {
              lo = Math.min(lo, heightAt(t));
            }
            low.push(lo);
          }
          const top: number[] = [];
          const bottom: number[] = [];
          for (let k = 0; k <= m; k++) {
            const [a, b] = along(k);
            top.push(at(a, b));
            const i = ci * chunkCells + a * step;
            const j = cj * chunkCells + b * step;
            const lowest = Math.min(low[k - 1] ?? Infinity, low[k] ?? Infinity);
            bottom.push(vertex(i, j, hf.get(i, j) - lowest + skirt));
          }
          for (let k = 0; k < m; k++) {
            const t0 = top[k]!;
            const t1 = top[k + 1]!;
            const b0 = bottom[k]!;
            const b1 = bottom[k + 1]!;
            if (flip) indices.push(t0, t1, b0, t1, b1, b0);
            else indices.push(t0, b0, t1, t1, b0, b1);
            materials.push(ROLE.terrain, ROLE.terrain);
          }
        };
        edge((k) => [k, 0], true);
        edge((k) => [k, m], false);
        edge((k) => [0, k], false);
        edge((k) => [m, k], true);
        out.push({
          name: `t:${ci}:${cj}:${lod}`,
          ci,
          cj,
          lod,
          mesh: { positions, normals, uvs, indices, materials, colors },
        });
      });
    }
  }
  return out;
}
