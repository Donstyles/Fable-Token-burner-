import { describe, expect, it } from 'vitest';
import { HUMANOID_CLIPS, actionIds, humanoidItems } from './batch';
import { animateFlags, clipsOf, imageTo3dFlags, rigFlags } from './run';

describe('batch steps as CLI flags', () => {
  const [model, rig, anim] = humanoidItems('innkeeper', 1.65, 'innkeeper.png');

  it('spells out the smart-topology image-to-3d request', () => {
    const flags = imageTo3dFlags(model!.params, 'pipeline/inbox/innkeeper.png');
    const text = flags.join(' ');
    expect(flags.slice(0, 2)).toEqual(['--image-url', 'pipeline/inbox/innkeeper.png']);
    expect(text).toContain('--model-type smart-topology');
    expect(text).toContain('--ai-model meshy-t2.5');
    expect(text).toContain('--target-polycount 4000');
    expect(text).toContain('--pose-mode a-pose');
    expect(text).toContain('--should-texture true');
    expect(text).toContain('--texture-resolution 2k');
    expect(text).toContain('--enable-pbr false');
    expect(text).toContain('--target-formats glb');
    expect(flags[flags.indexOf('--data') + 1]).toBe('{"auto_size":true,"origin_at":"bottom"}');
  });

  it('chains rigging and animation on the previous task ids', () => {
    expect(rigFlags(rig!.params, 'task-model')).toEqual([
      '--input-task-id',
      'task-model',
      '--height-meters',
      '1.65',
    ]);
    expect(animateFlags(anim!.params, 'task-rig')).toEqual([
      '--rig-task-id',
      'task-rig',
      '--action-ids',
      actionIds(HUMANOID_CLIPS).join(','),
    ]);
    expect(clipsOf(anim!.params)).toEqual([...HUMANOID_CLIPS]);
  });
});
