import { Document } from '@gltf-transform/core';
import { describe, expect, it } from 'vitest';
import { findOpenLoops, loopIsCovered, report } from './postprocess';

/** A unit cube missing its +Z face; optionally a plate 2 cm behind the hole, covering it. */
function fixture(withPlate: boolean): Document {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const p = [
    [0, 0, 0],
    [1, 0, 0],
    [1, 1, 0],
    [0, 1, 0],
    [0, 0, 1],
    [1, 0, 1],
    [1, 1, 1],
    [0, 1, 1],
  ];
  const faces = [
    [0, 2, 1, 0, 3, 2],
    [0, 1, 5, 0, 5, 4],
    [1, 2, 6, 1, 6, 5],
    [2, 3, 7, 2, 7, 6],
    [3, 0, 4, 3, 4, 7],
  ].flat();
  if (withPlate) {
    const z = 0.98;
    const base = p.length;
    p.push([-0.5, -0.5, z], [1.5, -0.5, z], [1.5, 1.5, z], [-0.5, 1.5, z]);
    faces.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const position = doc
    .createAccessor()
    .setType('VEC3')
    .setArray(new Float32Array(p.flat()))
    .setBuffer(buffer);
  const indices = doc
    .createAccessor()
    .setType('SCALAR')
    .setArray(new Uint16Array(faces))
    .setBuffer(buffer);
  const prim = doc.createPrimitive().setAttribute('POSITION', position).setIndices(indices);
  doc.createScene().addChild(doc.createNode('m').setMesh(doc.createMesh('m').addPrimitive(prim)));
  return doc;
}

describe('gaps between parts', () => {
  it('reports an open face nothing backs as an uncovered loop', () => {
    const doc = fixture(false);
    const prim = doc.getRoot().listMeshes()[0]!.listPrimitives()[0]!;
    const positions = prim.getAttribute('POSITION')!.getArray() as Float32Array;
    const indices = prim.getIndices()!.getArray() as Uint16Array;
    const { loops } = findOpenLoops(positions, indices);
    expect(loops).toHaveLength(1);
    expect(loops[0]!.verts.size).toBe(4);
    expect(loopIsCovered(positions, indices, loops[0]!)).toBe(false);
    expect(report(doc, 0).openLoops).toEqual([{ vertices: 4, extent: 1, covered: false }]);
  });

  it('treats a loop with geometry a few centimetres behind it as covered', () => {
    const doc = fixture(true);
    const loops = report(doc, 0).openLoops;
    // The hole's rim (4 vertices) is covered by the plate; the plate's own border is not.
    expect(loops.find((l) => l.vertices === 4)?.covered).toBe(true);
    expect(loops.find((l) => l.vertices === 4)).toBeDefined();
  });
});
