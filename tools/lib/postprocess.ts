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
  /** Boundary loops (open edges) per size class: a cloak hem is expected, a chest hole is not. */
  openLoops: { vertices: number; extent: number }[];
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
      for (const loop of findOpenLoops(positions, indices.getArray() as Uint16Array | Uint32Array)
        .loops) {
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
