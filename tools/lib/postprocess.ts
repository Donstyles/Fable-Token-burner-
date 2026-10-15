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
  return {
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
