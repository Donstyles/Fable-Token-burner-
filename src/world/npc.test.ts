import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { describe, expect, it } from 'vitest';
import type { Character } from './character';
import { Npc } from './npc';

/** A stand-in for a loaded villager: its node and the clips it was told to play. */
function villager(): { character: Character; played: string[] } {
  const played: string[] = [];
  const character = {
    node: { position: new Vector3(0, 0, 0), rotation: new Vector3(0, 0, 0) },
    clips: ['idle', 'walk', 'talk'],
    play: (name: string) => played.push(name),
  } as unknown as Character;
  return { character, played };
}

const def = { id: 'villager-woman', name: 'Greta', character: 'villager-woman', lines: ['Hello'] };

describe('townsfolk', () => {
  it('go back to idle a few seconds after a line', () => {
    const { character, played } = villager();
    const npc = new Npc(def, character);
    npc.say();
    for (let i = 0; i < 100; i++) npc.update(0.05, new Vector3(0, 0, 2));
    expect(played.at(-1)).toBe('idle');
  });

  it('keep talking while the talk panel is open, and idle once it shuts', () => {
    const { character, played } = villager();
    const npc = new Npc(def, character);
    npc.engage(true);
    // Twenty seconds in the panel: never the look-around idle.
    for (let i = 0; i < 400; i++) npc.update(0.05, new Vector3(0, 0, 2));
    expect(played.at(-1)).toBe('talk');
    npc.engage(false);
    npc.update(0.05, new Vector3(0, 0, 2));
    expect(played.at(-1)).toBe('idle');
  });
});
