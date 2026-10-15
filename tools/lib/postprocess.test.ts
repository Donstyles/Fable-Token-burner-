import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Document, NodeIO } from '@gltf-transform/core';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CHARACTER_TEXTURE_SIZE, inspectGlb, postProcessCharacter } from './postprocess';

/** A textured triangle with two clips and an oversized texture, the shape Meshy returns. */
async function fixture(path: string): Promise<void> {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const position = doc
    .createAccessor()
    .setType('VEC3')
    .setArray(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0]))
    .setBuffer(buffer);
  const indices = doc
    .createAccessor()
    .setType('SCALAR')
    .setArray(new Uint16Array([0, 1, 2, 1, 3, 2]))
    .setBuffer(buffer);
  const uv = doc
    .createAccessor()
    .setType('VEC2')
    .setArray(new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]))
    .setBuffer(buffer);
  // Not a solid colour: prune() would bake that into the material factor and drop the texture.
  const size = 2048;
  const pixels = Buffer.alloc(size * size * 3);
  for (let i = 0; i < pixels.length; i++) pixels[i] = (i * 2654435761) >>> 24;
  const png = await sharp(pixels, { raw: { width: size, height: size, channels: 3 } })
    .png()
    .toBuffer();
  const texture = doc.createTexture('skin').setImage(png).setMimeType('image/png');
  const material = doc.createMaterial('skin').setBaseColorTexture(texture);
  const prim = doc
    .createPrimitive()
    .setAttribute('POSITION', position)
    .setAttribute('TEXCOORD_0', uv)
    .setIndices(indices)
    .setMaterial(material);
  const node = doc.createNode('body').setMesh(doc.createMesh('body').addPrimitive(prim));
  doc.createScene('scene').addChild(node);
  for (const name of ['Animation_0', 'Animation_1']) {
    const input = doc
      .createAccessor()
      .setType('SCALAR')
      .setArray(new Float32Array([0, 1]))
      .setBuffer(buffer);
    const output = doc
      .createAccessor()
      .setType('VEC3')
      .setArray(new Float32Array([0, 0, 0, 0, 1, 0]))
      .setBuffer(buffer);
    const sampler = doc.createAnimationSampler().setInput(input).setOutput(output);
    const channel = doc
      .createAnimationChannel()
      .setTargetNode(node)
      .setTargetPath('translation')
      .setSampler(sampler);
    doc.createAnimation(name).addSampler(sampler).addChannel(channel);
  }
  await new NodeIO().write(path, doc);
}

describe('character post-process', () => {
  let dir = '';
  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'ftb-postprocess-'));
    await fixture(join(dir, 'in.glb'));
  });
  afterAll(() => rm(dir, { recursive: true, force: true }));

  it('renames clips in order and scales textures to the character size', async () => {
    const before = await inspectGlb(join(dir, 'in.glb'));
    expect(before.clips).toEqual(['Animation_0', 'Animation_1']);
    expect(before.textures[0]?.width).toBe(2048);

    const report = await postProcessCharacter(join(dir, 'in.glb'), join(dir, 'out', 'c.glb'), [
      'idle',
      'walk',
    ]);
    expect(report.clips).toEqual(['idle', 'walk']);
    expect(report.triangles).toBe(2);
    expect(report.textures).toEqual([
      { name: 'skin', width: CHARACTER_TEXTURE_SIZE, height: CHARACTER_TEXTURE_SIZE },
    ]);
    expect(report.bytes).toBeLessThan(before.bytes);
  });

  it('refuses a clip count that does not match the standard set', async () => {
    await expect(
      postProcessCharacter(join(dir, 'in.glb'), join(dir, 'out', 'bad.glb'), ['idle']),
    ).rejects.toThrow(/1 clip\(s\)|2 clip\(s\)/);
  });
});
