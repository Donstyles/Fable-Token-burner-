/**
 * GLB post-process for Meshy output (DESIGN.md 10.1 step 5), on gltf-transform: clips renamed
 * to the project's standard names, duplicate data merged, unused data pruned, textures scaled
 * to the character texture size. `inspectGlb` reports what `validate` checks.
 */
import { mkdir, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import { NodeIO, Primitive, type Document } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, textureCompress } from '@gltf-transform/functions';
import sharp from 'sharp';

/** Characters at 1998 texel density: one 512 map reads correctly under the retro filter. */
export const CHARACTER_TEXTURE_SIZE = 512;

export interface GlbReport {
  triangles: number;
  clips: string[];
  textures: { name: string; width: number; height: number }[];
  bytes: number;
  /**
   * Boundary loops (open edges). A loop backed by geometry within a few centimetres (a hair
   * piece over the scalp) is covered; an uncovered small loop is a see-through gap.
   */
  openLoops: { vertices: number; extent: number; covered: boolean }[];
}

function io(): NodeIO {
  return new NodeIO().registerExtensions(ALL_EXTENSIONS);
}

export function countTriangles(doc: Document): number {
  let n = 0;
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const indices = prim.getIndices();
      const count = indices ? indices.getCount() : (prim.getAttribute('POSITION')?.getCount() ?? 0);
      const mode = prim.getMode();
      if (mode === Primitive.Mode.TRIANGLES) n += count / 3;
      else if (mode === Primitive.Mode.TRIANGLE_STRIP || mode === Primitive.Mode.TRIANGLE_FAN) {
        n += Math.max(0, count - 2);
      }
    }
  }
  return n;
}

export function report(doc: Document, bytes: number): GlbReport {
  const root = doc.getRoot();
  const openLoops: GlbReport['openLoops'] = [];
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const position = prim.getAttribute('POSITION');
      const indices = prim.getIndices();
      if (!position || !indices || prim.getMode() !== Primitive.Mode.TRIANGLES) continue;
      const positions = position.getArray() as Float32Array;
      const indexArray = indices.getArray() as Uint16Array | Uint32Array;
      for (const loop of findOpenLoops(positions, indexArray).loops) {
        const min = [Infinity, Infinity, Infinity];
        const max = [-Infinity, -Infinity, -Infinity];
        for (const v of loop.verts) {
          for (let k = 0; k < 3; k++) {
            min[k] = Math.min(min[k]!, positions[v * 3 + k]!);
            max[k] = Math.max(max[k]!, positions[v * 3 + k]!);
          }
        }
        openLoops.push({
          vertices: loop.verts.size,
          extent: Math.max(max[0]! - min[0]!, max[1]! - min[1]!, max[2]! - min[2]!),
          covered: loopIsCovered(positions, indexArray, loop),
        });
      }
    }
  }
  return {
    openLoops,
    triangles: countTriangles(doc),
    clips: root.listAnimations().map((a) => a.getName()),
    textures: root.listTextures().map((t) => {
      const size = t.getSize();
      return { name: t.getName(), width: size?.[0] ?? 0, height: size?.[1] ?? 0 };
    }),
    bytes,
  };
}

export async function inspectGlb(path: string): Promise<GlbReport> {
  const doc = await io().read(path);
  return report(doc, (await stat(path)).size);
}

/**
 * Meshy's animation GLB carries the textured, rigged mesh and one clip per requested action
 * in request order; the clips get the standard names in that order.
 */
export async function postProcessCharacter(
  input: string,
  output: string,
  clipNames: readonly string[],
): Promise<GlbReport> {
  const doc = await io().read(input);
  const clips = doc.getRoot().listAnimations();
  if (clips.length !== clipNames.length) {
    throw new Error(
      `${input}: ${clips.length} clip(s), expected ${clipNames.length} (${clipNames.join(', ')})`,
    );
  }
  clips.forEach((clip, i) => clip.setName(clipNames[i] ?? clip.getName()));
  await doc.transform(
    dedup(),
    prune(),
    textureCompress({
      encoder: sharp,
      targetFormat: 'png',
      resize: [CHARACTER_TEXTURE_SIZE, CHARACTER_TEXTURE_SIZE],
    }),
  );
  await mkdir(dirname(output), { recursive: true });
  await io().write(output, doc);
  return inspectGlb(output);
}

/** A prop's GLB: no clips to name; dedup, prune and shrink the textures. */
export async function postProcessProp(
  input: string,
  output: string,
  textureSize = CHARACTER_TEXTURE_SIZE,
): Promise<GlbReport> {
  const doc = await io().read(input);
  await doc.transform(
    dedup(),
    prune(),
    textureCompress({ encoder: sharp, targetFormat: 'png', resize: [textureSize, textureSize] }),
  );
  await mkdir(dirname(output), { recursive: true });
  await io().write(output, doc);
  return inspectGlb(output);
}

/**
 * Open boundary loops of a mesh, welded by position so UV seams do not count. Meshy's smart
 * topology delivers separated parts; a small loop at the front is a gap between parts (the
 * bandit, batch 001, had four of 6–18 cm), a large one is a sheet's border (a cloak hem).
 * Gaps are not patched: the owner's call (2026-10-15) is to regenerate from a cleaner
 * reference, so `validate` reports them and the pipeline keeps Meshy's mesh as delivered.
 */
export function findOpenLoops(
  positions: Float32Array,
  indices: Uint16Array | Uint32Array,
): { directed: [number, number][]; loops: { edges: [number, number][]; verts: Set<number> }[] } {
  // Weld by exact position so UV seams do not count as open edges.
  const welded = new Map<string, number>();
  const vmap = new Int32Array(positions.length / 3);
  for (let i = 0; i < vmap.length; i++) {
    const k = `${positions[i * 3]},${positions[i * 3 + 1]},${positions[i * 3 + 2]}`;
    const first = welded.get(k);
    if (first === undefined) welded.set(k, i);
    vmap[i] = first ?? i;
  }
  const count = new Map<string, number>();
  const directed = new Map<string, [number, number]>();
  const edgeKey = (a: number, b: number): string => (a < b ? `${a}_${b}` : `${b}_${a}`);
  for (let t = 0; t < indices.length; t += 3) {
    const tri = [indices[t]!, indices[t + 1]!, indices[t + 2]!];
    for (let e = 0; e < 3; e++) {
      const a = tri[e]!;
      const b = tri[(e + 1) % 3]!;
      const k = edgeKey(vmap[a]!, vmap[b]!);
      count.set(k, (count.get(k) ?? 0) + 1);
      directed.set(k, [a, b]);
    }
  }
  const open: [number, number][] = [];
  for (const [k, n] of count) if (n === 1) open.push(directed.get(k)!);
  // Group open edges into loops by welded vertex.
  const adjacency = new Map<number, [number, number][]>();
  for (const edge of open) {
    for (const v of [vmap[edge[0]]!, vmap[edge[1]]!]) {
      const list = adjacency.get(v) ?? [];
      list.push(edge);
      adjacency.set(v, list);
    }
  }
  const seenEdge = new Set<[number, number]>();
  const loops: { edges: [number, number][]; verts: Set<number> }[] = [];
  for (const start of open) {
    if (seenEdge.has(start)) continue;
    const edges: [number, number][] = [];
    const verts = new Set<number>();
    const stack = [start];
    seenEdge.add(start);
    while (stack.length) {
      const edge = stack.pop()!;
      edges.push(edge);
      for (const v of [edge[0], edge[1]]) {
        verts.add(v);
        for (const next of adjacency.get(vmap[v]!) ?? []) {
          if (!seenEdge.has(next)) {
            seenEdge.add(next);
            stack.push(next);
          }
        }
      }
    }
    loops.push({ edges, verts });
  }
  return { directed: open, loops };
}

/**
 * Whether an open loop is backed by other geometry. Points just inside the rim are tested
 * along the loop's plane normal, both ways, for a surface within `depth` metres: a hair
 * piece's border lies on the scalp and a cuff on the wrist (covered); a gap between a belt
 * and the body shows the inside of the mesh, far away (not covered). Rim triangles are
 * skipped by the ray test.
 */
export function loopIsCovered(
  positions: Float32Array,
  indices: Uint16Array | Uint32Array,
  loop: { edges: [number, number][]; verts: Set<number> },
  depth = 0.08,
): boolean {
  const centre = [0, 0, 0];
  for (const v of loop.verts) {
    for (let k = 0; k < 3; k++) centre[k]! += positions[v * 3 + k]! / loop.verts.size;
  }
  const rim = new Set<number>();
  const edgeSet = new Set(loop.edges.map(([a, b]) => `${a}_${b}`));
  for (let t = 0; t < indices.length; t += 3) {
    const tri = [indices[t]!, indices[t + 1]!, indices[t + 2]!];
    for (let e = 0; e < 3; e++) {
      if (edgeSet.has(`${tri[e]}_${tri[(e + 1) % 3]}`)) rim.add(t / 3);
    }
  }
  // The loop's plane normal by Newell's method over the chained rim.
  const next = new Map<number, number>();
  for (const [a, b] of loop.edges) next.set(a, b);
  const start = loop.edges[0]?.[0];
  if (start === undefined) return false;
  const chain: number[] = [];
  const visited = new Set<number>();
  for (let v: number | undefined = start; v !== undefined && !visited.has(v); v = next.get(v)) {
    visited.add(v);
    chain.push(v);
  }
  let nx = 0;
  let ny = 0;
  let nz = 0;
  for (let i = 0; i < chain.length; i++) {
    const a = chain[i]! * 3;
    const b = chain[(i + 1) % chain.length]! * 3;
    nx += (positions[a + 1]! - positions[b + 1]!) * (positions[a + 2]! + positions[b + 2]!);
    ny += (positions[a + 2]! - positions[b + 2]!) * (positions[a]! + positions[b]!);
    nz += (positions[a]! - positions[b]!) * (positions[a + 1]! + positions[b + 1]!);
  }
  const len = Math.hypot(nx, ny, nz);
  if (len === 0) return false;
  const dir = [nx / len, ny / len, nz / len];
  let hits = 0;
  for (const v of chain) {
    // A little inside the rim, so the ray starts on the opening rather than on the edge.
    const p = [0, 1, 2].map(
      (k) => positions[v * 3 + k]! + 0.15 * (centre[k]! - positions[v * 3 + k]!),
    );
    const backed =
      rayHitsMesh(positions, indices, p, dir, depth, rim) ||
      rayHitsMesh(
        positions,
        indices,
        p,
        dir.map((d) => -d),
        depth,
        rim,
      );
    if (backed) hits++;
  }
  return hits >= chain.length * 0.8;
}

/** Möller–Trumbore over every triangle not in `skip`; true when a hit lies within `maxT`. */
function rayHitsMesh(
  positions: Float32Array,
  indices: Uint16Array | Uint32Array,
  origin: number[],
  dir: number[],
  maxT: number,
  skip: Set<number>,
): boolean {
  const EPS = 1e-7;
  for (let t = 0; t < indices.length; t += 3) {
    if (skip.has(t / 3)) continue;
    const a = indices[t]! * 3;
    const b = indices[t + 1]! * 3;
    const c = indices[t + 2]! * 3;
    const e1 = [
      positions[b]! - positions[a]!,
      positions[b + 1]! - positions[a + 1]!,
      positions[b + 2]! - positions[a + 2]!,
    ];
    const e2 = [
      positions[c]! - positions[a]!,
      positions[c + 1]! - positions[a + 1]!,
      positions[c + 2]! - positions[a + 2]!,
    ];
    const p = [
      dir[1]! * e2[2]! - dir[2]! * e2[1]!,
      dir[2]! * e2[0]! - dir[0]! * e2[2]!,
      dir[0]! * e2[1]! - dir[1]! * e2[0]!,
    ];
    const det = e1[0]! * p[0]! + e1[1]! * p[1]! + e1[2]! * p[2]!;
    if (Math.abs(det) < EPS) continue;
    const inv = 1 / det;
    const s = [
      origin[0]! - positions[a]!,
      origin[1]! - positions[a + 1]!,
      origin[2]! - positions[a + 2]!,
    ];
    const u = (s[0]! * p[0]! + s[1]! * p[1]! + s[2]! * p[2]!) * inv;
    if (u < 0 || u > 1) continue;
    const q = [
      s[1]! * e1[2]! - s[2]! * e1[1]!,
      s[2]! * e1[0]! - s[0]! * e1[2]!,
      s[0]! * e1[1]! - s[1]! * e1[0]!,
    ];
    const v = (dir[0]! * q[0]! + dir[1]! * q[1]! + dir[2]! * q[2]!) * inv;
    if (v < 0 || u + v > 1) continue;
    const hitT = (e2[0]! * q[0]! + e2[1]! * q[1]! + e2[2]! * q[2]!) * inv;
    if (hitT > 1e-4 && hitT <= maxT) return true;
  }
  return false;
}
