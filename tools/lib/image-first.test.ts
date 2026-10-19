import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import {
  assertImageFirst,
  creatureItems,
  makeBatch,
  PROP_CONCEPT_STYLE,
  propItems,
  type Batch,
  type BatchItem,
} from './batch';
import { refuseTextTo3d } from './meshy';
import { propAssetIds } from './run-props';

/** Owner, 2026-10-17 and 2026-10-19: "Never ever do text to 3d. No exceptions." */
describe('never text-to-3D', () => {
  it('makes a prop as a concept picture, then image-to-3D from it', () => {
    const items = propItems({ id: 'tree-oak-01', prompt: 'A great old oak.', polycount: 800 });
    expect(items.map((i) => i.step)).toEqual(['text-to-image', 'image-to-3d']);
    expect(items[0]!.params['ai_model']).toBe('nano-banana-2-lite');
    expect(items[0]!.params['prompt']).toBe(`A great old oak. ${PROP_CONCEPT_STYLE}`);
    expect(items[1]!.input).toBe('tree-oak-01.png');
    expect(items[1]!.params['target_polycount']).toBe(800);
  });

  it('will not make a batch with a text-to-3D step', () => {
    const bad = {
      ...propItems({ id: 'x', prompt: 'x', polycount: 500 })[1]!,
      step: 'text-to-3d-preview',
    };
    expect(() => makeBatch(99, 'bad', [bad as unknown as BatchItem])).toThrow(/never/);
  });

  it('refuses to run the old text-to-3D batches', async () => {
    for (const file of ['003-trees.json', '004-buildings.json']) {
      const batch = JSON.parse(await readFile(`pipeline/batches/${file}`, 'utf8')) as Batch;
      expect(() => assertImageFirst(batch)).toThrow(/text-to-3D is never used/);
    }
  });

  it('refuses a text-to-3D call at the Meshy client, whatever the types said', () => {
    expect(() => refuseTextTo3d(['text-to-3d', 'create', '--prompt', 'a tree'])).toThrow(/refused/);
    expect(() => refuseTextTo3d(['download', '--resource', 'text-to-3d'])).toThrow(/refused/);
    expect(() => refuseTextTo3d(['image-to-3d', 'create', '--image-url', 'a.png'])).not.toThrow();
  });

  it('tells props from humanoids in a batch', () => {
    const batch = makeBatch(99, 'mixed', [
      ...propItems({ id: 'rock-01', prompt: 'A boulder.', polycount: 300 }),
      ...creatureItems({ id: 'goblin', height: 1.2, prompt: 'A goblin.' }),
    ]);
    expect(propAssetIds(batch)).toEqual(['rock-01']);
  });
});
