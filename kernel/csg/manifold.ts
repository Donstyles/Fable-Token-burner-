import Module, {
  type Manifold,
  type ManifoldToplevel,
  type Mesh as ManifoldMesh,
} from 'manifold-3d';
import { MeshBuilder, type MeshData } from '../core/mesh';
import type { Vec3 } from '../core/math';

/**
 * Boolean operations through Manifold (the library behind Babylon's CSG2), with per-face
 * material ids carried across the operation via Manifold's run IDs. Inputs must be
 * watertight; outputs are watertight and come back flat-shaded with fresh world UVs.
 */
let toplevel: Promise<ManifoldToplevel> | null = null;

export function manifoldModule(): Promise<ManifoldToplevel> {
  toplevel ??= Module().then((m) => {
    m.setup();
    return m;
  });
  return toplevel;
}

/** Map from Manifold original ID to our material id, shared by all solids in a session. */
const idToMaterial = new Map<number, number>();
const materialToId = new Map<number, number>();

function originalIdFor(wasm: ManifoldToplevel, material: number): number {
  let id = materialToId.get(material);
  if (id === undefined) {
    id = wasm.Manifold.reserveIDs(1);
    materialToId.set(material, id);
    idToMaterial.set(id, material);
  }
  return id;
}

/** Weld duplicated vertices by rounded position and build a Manifold with material runs. */
export function toManifold(wasm: ManifoldToplevel, mesh: MeshData, precision = 1e-5): Manifold {
  const key = (p: Vec3): string => p.map((x) => Math.round(x / precision)).join(',');
  const remap: number[] = [];
  const welded: number[] = [];
  const seen = new Map<string, number>();
  for (let v = 0; v < mesh.positions.length / 3; v++) {
    const p: Vec3 = [
      mesh.positions[v * 3] ?? 0,
      mesh.positions[v * 3 + 1] ?? 0,
      mesh.positions[v * 3 + 2] ?? 0,
    ];
    const k = key(p);
    let idx = seen.get(k);
    if (idx === undefined) {
      idx = welded.length / 3;
      welded.push(p[0], p[1], p[2]);
      seen.set(k, idx);
    }
    remap.push(idx);
  }
  // Group triangles by material into runs.
  const byMaterial = new Map<number, number[]>();
  for (let t = 0; t < mesh.indices.length / 3; t++) {
    const mat = mesh.materials[t] ?? 0;
    let list = byMaterial.get(mat);
    if (!list) {
      list = [];
      byMaterial.set(mat, list);
    }
    list.push(
      remap[mesh.indices[t * 3] ?? 0] ?? 0,
      remap[mesh.indices[t * 3 + 1] ?? 0] ?? 0,
      remap[mesh.indices[t * 3 + 2] ?? 0] ?? 0,
    );
  }
  const tri: number[] = [];
  const runIndex: number[] = [];
  const runOriginalID: number[] = [];
  for (const [mat, list] of byMaterial) {
    runIndex.push(tri.length);
    runOriginalID.push(originalIdFor(wasm, mat));
    tri.push(...list);
  }
  runIndex.push(tri.length);
  const m = new wasm.Mesh({
    numProp: 3,
    vertProperties: new Float32Array(welded),
    triVerts: new Uint32Array(tri),
    runIndex: new Uint32Array(runIndex),
    runOriginalID: new Uint32Array(runOriginalID),
  });
  const solid = wasm.Manifold.ofMesh(m);
  const status = solid.status();
  if (status !== 'NoError') throw new Error(`Manifold rejected the mesh: ${status}`);
  return solid;
}

/** Back to our flat-shaded representation, materials restored from run IDs. */
export function fromManifold(solid: Manifold, uvScale = 1): MeshBuilder {
  const mesh: ManifoldMesh = solid.getMesh();
  const b = new MeshBuilder();
  const numProp = mesh.numProp;
  const vp = mesh.vertProperties;
  const tv = mesh.triVerts;
  const runs = mesh.runIndex;
  const ids = mesh.runOriginalID;
  const pos = (i: number): Vec3 => [
    vp[i * numProp] ?? 0,
    vp[i * numProp + 1] ?? 0,
    vp[i * numProp + 2] ?? 0,
  ];
  for (let r = 0; r < runs.length - 1; r++) {
    const material = idToMaterial.get(ids[r] ?? -1) ?? 0;
    for (let t = runs[r] ?? 0; t < (runs[r + 1] ?? 0); t += 3) {
      b.addFace([pos(tv[t] ?? 0), pos(tv[t + 1] ?? 0), pos(tv[t + 2] ?? 0)], { material, uvScale });
    }
  }
  return b;
}

export type BooleanOp = 'union' | 'subtract' | 'intersect';

/** Convenience: boolean of two meshes, returning a fresh mesh. */
export async function csg(
  op: BooleanOp,
  a: MeshData,
  b: MeshData,
  uvScale = 1,
): Promise<MeshBuilder> {
  const wasm = await manifoldModule();
  const ma = toManifold(wasm, a);
  const mb = toManifold(wasm, b);
  const out = op === 'union' ? ma.add(mb) : op === 'subtract' ? ma.subtract(mb) : ma.intersect(mb);
  const result = fromManifold(out, uvScale);
  ma.delete();
  mb.delete();
  out.delete();
  return result;
}

/** Union of many meshes at once. */
export async function unionAll(meshes: MeshData[], uvScale = 1): Promise<MeshBuilder> {
  const wasm = await manifoldModule();
  const solids = meshes.map((m) => toManifold(wasm, m));
  const out = wasm.Manifold.union(solids);
  const result = fromManifold(out, uvScale);
  for (const s of solids) s.delete();
  out.delete();
  return result;
}
