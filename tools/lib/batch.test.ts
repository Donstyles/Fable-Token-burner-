import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { check } from 'prettier';
import { describe, expect, it } from 'vitest';
import {
  CREDITS,
  HUMANOID_ACTIONS,
  HUMANOID_CLIPS,
  actionIds,
  batchFileName,
  formatBatch,
  humanoidItems,
  iconItems,
  imageOnlyAssetIds,
  ICON_STYLE,
  makeBatch,
  totalCredits,
  writeBatch,
} from './batch';

describe('batches', () => {
  it('names files by zero-padded number', () => {
    expect(batchFileName(1, 'first-npc')).toBe('001-first-npc.json');
    expect(batchFileName(42, 'props')).toBe('042-props.json');
  });

  it('plans the three Meshy steps for a humanoid with the standard clip set', () => {
    const items = humanoidItems('innkeeper', 1.75, 'innkeeper.png');
    expect(items.map((i) => i.step)).toEqual(['image-to-3d', 'rig', 'animate']);
    expect(items[0]?.params['model_type']).toBe('smart-topology');
    expect(items[0]?.params['ai_model']).toBe('meshy-t2.5');
    expect(items[0]?.params['target_polycount']).toBe(4000);
    expect(items[1]?.params['height_meters']).toBe(1.75);
    expect(items[2]?.params['clips']).toEqual([...HUMANOID_CLIPS]);
    expect(items[2]?.params['action_ids']).toEqual(actionIds(HUMANOID_CLIPS));
    expect(items[2]?.estimatedCredits).toBe(
      CREDITS.animatePerAction.credits * HUMANOID_CLIPS.length,
    );
  });

  it('plans the civilian set for townsfolk', () => {
    const items = humanoidItems('baker', 1.7, 'baker.png', 'civilian');
    expect(items[2]?.params['clips']).toEqual(['idle', 'walk', 'talk']);
    expect(items[2]?.estimatedCredits).toBe(CREDITS.animatePerAction.credits * 3);
  });

  it('maps every clip to a distinct catalog action, at most ten per request', () => {
    const ids = actionIds(HUMANOID_CLIPS);
    expect(ids).toHaveLength(HUMANOID_CLIPS.length);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeLessThanOrEqual(10);
    expect(HUMANOID_ACTIONS.walk.name).toMatch(/walk/i);
    expect(HUMANOID_ACTIONS.run.name).toMatch(/run/i);
  });

  it('writes batch files in the layout the pre-commit formatter expects', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ftb-batch-'));
    try {
      const path = await writeBatch(
        makeBatch(1, 'first-enemy', humanoidItems('bandit', 1.78, 'bandit.png')),
        dir,
      );
      const text = await readFile(path, 'utf8');
      expect(await check(text, { parser: 'json' })).toBe(true);
      expect(text).toContain('"target_formats": ["glb"]');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('starts unapproved with the summed estimate', () => {
    const batch = makeBatch(
      1,
      'first-npc',
      humanoidItems('innkeeper', 1.75, 'innkeeper.png'),
      new Date('2026-10-15'),
    );
    expect(batch.approved).toBe(false);
    expect(batch.created).toBe('2026-10-15');
    expect(batch.estimatedCredits).toBe(totalCredits(batch.items));
    expect(batch.estimatedCredits).toBeGreaterThan(0);
    expect(formatBatch(batch)).toContain('awaiting approval');
  });

  it('plans an icon as one picture on its parchment ground on the cheapest model', () => {
    const items = iconItems({ id: 'fire-bolt', subject: 'a bolt of fire.' });
    expect(items).toHaveLength(1);
    expect(items[0]!.step).toBe('text-to-image');
    expect(items[0]!.params['ai_model']).toBe('nano-banana-2-lite');
    expect(items[0]!.params['remove_background']).toBe(false);
    expect(items[0]!.params['aspect_ratio']).toBe('4:3');
    expect(items[0]!.params['prompt']).toBe(`a bolt of fire. ${ICON_STYLE}`);
    expect(items[0]!.estimatedCredits).toBe(CREDITS.textToImage['nano-banana-2-lite']);
  });

  it('takes a wider picture and Meshy background removal when a spec asks', () => {
    const [item] = iconItems({
      id: 'fire-bolt',
      subject: 'a bolt of fire.',
      aspect: '16:9',
      removeBackground: true,
    });
    expect(item!.params['aspect_ratio']).toBe('16:9');
    expect(item!.params['remove_background']).toBe(true);
  });

  it('tells image-only assets from humanoids', () => {
    const b = makeBatch(9, 'mixed', [
      ...iconItems({ id: 'bless', subject: 'a goblet.' }),
      ...humanoidItems('guard', 1.8, 'guard.png'),
    ]);
    expect(imageOnlyAssetIds(b)).toEqual(['bless']);
  });
});
