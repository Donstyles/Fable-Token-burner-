import { describe, expect, it } from 'vitest';
import { NodeIO } from '@gltf-transform/core';
import { LevelBuilder } from '../plan/level';
import { bakeVertexLight } from '../light/bake';
import { buildLevelGlb } from './glb';

describe('glb export', () => {
  it('writes chunks per region and material, a collider and water', async () => {
    const plan = new LevelBuilder('glb');
    plan.hall({ name: 'h', at: [0, 0, 0], size: [20, 6], height: 4 });
    plan.waterPlane({ at: [0, 0.3, 0], size: [4, 4] });
    plan.light([0, 3, 0], [1, 1, 1], 8, 1);
    const level = await plan.build();
    const visual = bakeVertexLight(level.visual, level.lights, {
      ambient: [0.2, 0.2, 0.2],
      cell: 2,
    });
    const glb = await buildLevelGlb({ ...level, visual }, { chunk: 8 });
    expect(glb.byteLength).toBeGreaterThan(1000);
    const doc = await new NodeIO().readBinary(glb);
    const root = doc.getRoot();
    const names = root.listNodes().map((n) => n.getName());
    expect(names).toContain('visual');
    expect(names).toContain('collider');
    expect(names).toContain('water');
    const chunks = names.filter((n) => n.startsWith('chunk:'));
    // 20 m wide hall over 8 m chunks: at least three chunks along x.
    expect(chunks.length).toBeGreaterThanOrEqual(3);
    const materials = root.listMaterials().map((m) => m.getName());
    expect(materials).toContain('role:1');
    expect(materials).toContain('role:2');
    expect(materials).toContain('role:10');
    const chunkMesh = root.listMeshes().find((m) => m.getName().startsWith('chunk:'))!;
    const prim = chunkMesh.listPrimitives()[0]!;
    expect(prim.getAttribute('COLOR_0')).not.toBeNull();
    expect(prim.getAttribute('TEXCOORD_0')).not.toBeNull();
    expect(prim.getIndices()).not.toBeNull();
    const collider = root.listMeshes().find((m) => m.getName() === 'collider')!;
    expect(collider.listPrimitives()[0]!.getAttribute('NORMAL')).toBeNull();
    // Welding merged the per-face duplicate vertices.
    const pos = prim.getAttribute('POSITION')!;
    expect(pos.getCount()).toBeLessThan(prim.getIndices()!.getCount());
  });
});
