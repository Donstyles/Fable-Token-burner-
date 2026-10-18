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

/**
 * The lowest height, in metres above the model's foot, at which a slice 0.2 m deep spans at
 * least three fifths of the model's width and depth: where the walls begin, under any posts,
 * steps or stray points.
 */
function wallBase(doc: Document, scale: number): number {
  const pts: [number, number, number][] = [];
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const m = node.getWorldMatrix();
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION');
      if (!pos) continue;
      const v = [0, 0, 0];
      for (let i = 0; i < pos.getCount(); i++) {
        const [x, y, z] = pos.getElement(i, v) as [number, number, number];
        pts.push([
          (m[0] * x + m[4] * y + m[8] * z + m[12]) * scale,
          (m[1] * x + m[5] * y + m[9] * z + m[13]) * scale,
          (m[2] * x + m[6] * y + m[10] * z + m[14]) * scale,
        ]);
      }
    }
  }
  if (!pts.length) return 0;
  const extent = (band: [number, number, number][]): [number, number] => {
    let [a0, a1, b0, b1] = [Infinity, -Infinity, Infinity, -Infinity];
    for (const [x, , z] of band) {
      a0 = Math.min(a0, x);
      a1 = Math.max(a1, x);
      b0 = Math.min(b0, z);
      b1 = Math.max(b1, z);
    }
    return [a1 - a0, b1 - b0];
  };
  const foot = Math.min(...pts.map((p) => p[1]));
  const [w, d] = extent(pts);
  for (let h = 0; h < 3; h += 0.1) {
    const band = pts.filter((p) => p[1] - foot >= h && p[1] - foot < h + 0.2);
    if (!band.length) continue;
    const [bw, bd] = extent(band);
    if (bw >= 0.6 * w && bd >= 0.6 * d) return Math.round(h * 10) / 10;
  }
  return 0;
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
    if (spec.kind === 'building') measure.base = wallBase(doc, scale);
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
