/**
 * Measure every Meshy prop in assets/props (DESIGN.md 10.3): the model's box at its nominal
 * height from kernel/terrain/props.ts, written to assets/props/catalogue.json for the terrain
 * kernel (footprints for the village) and the runtime (the scale to metres). Trees and
 * bushes also get a far-detail copy, `<id>.lod.glb`, simplified to a third of the triangles
 * with its textures stripped (the runtime draws it with the full model's material).
 *
 *   npm run props:catalogue
 */
import { access, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NodeIO, getBounds, type Document } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { simplify, weld } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import { PROPS, type PropCatalogue, type PropMeasure } from '../kernel/terrain/props';

const PROP_DIR = 'assets/props';
const LOD_RATIO = 0.3;

function triangles(doc: Document): number {
  let n = 0;
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const idx = prim.getIndices();
      n += idx ? idx.getCount() / 3 : prim.getAttribute('POSITION')!.getCount() / 3;
    }
  }
  return n;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  await MeshoptSimplifier.ready;
  const catalogue: PropCatalogue = {};
  const missing: string[] = [];
  for (const id of Object.keys(PROPS).sort()) {
    const spec = PROPS[id]!;
    const file = join(PROP_DIR, id, `${id}.glb`);
    if (!(await exists(file))) {
      missing.push(id);
      continue;
    }
    const doc = await io.read(file);
    const scene = doc.getRoot().listScenes()[0];
    if (!scene) throw new Error(`${file}: no scene`);
    const { min, max } = getBounds(scene);
    const height = max[1] - min[1];
    if (!(height > 0)) throw new Error(`${file}: no height`);
    const scale = spec.height / height;
    const measure: PropMeasure = {
      size: [(max[0] - min[0]) * scale, spec.height, (max[2] - min[2]) * scale],
      min: [min[0] * scale, min[1] * scale, min[2] * scale],
      scale,
      triangles: triangles(doc),
    };
    if (spec.kind === 'tree' || spec.kind === 'bush') {
      const lod = join(PROP_DIR, id, `${id}.lod.glb`);
      await doc.transform(
        weld(),
        simplify({ simplifier: MeshoptSimplifier, ratio: LOD_RATIO, error: 0.1 }),
      );
      for (const material of doc.getRoot().listMaterials()) material.setBaseColorTexture(null);
      for (const texture of doc.getRoot().listTextures()) texture.dispose();
      await io.write(lod, doc);
      measure.lodTriangles = triangles(doc);
    }
    catalogue[id] = measure;
    const [w, h, d] = measure.size;
    console.info(
      `${id}: ${w.toFixed(1)} × ${h.toFixed(1)} × ${d.toFixed(1)} m, ${measure.triangles} tris` +
        (measure.lodTriangles ? `, far ${measure.lodTriangles}` : ''),
    );
  }
  await writeFile(join(PROP_DIR, 'catalogue.json'), `${JSON.stringify(catalogue, null, 2)}\n`);
  console.info(`catalogue: ${Object.keys(catalogue).length} models`);
  if (missing.length) console.info(`not yet generated: ${missing.join(', ')}`);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
