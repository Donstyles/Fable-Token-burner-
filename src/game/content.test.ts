import { describe, expect, it } from 'vitest';
import { VILLAGE_HOUSES } from './content';

describe('village houses', () => {
  it('each opens a room of its own, and each room belongs to a house (DESIGN 17.8)', () => {
    // The rooms as src/world/room.ts finds them, but those made ahead of their house (seen in
    // the dev build with ?room=<id>): the guilds of the other schools and the homes, until a
    // town has them.
    const ahead = [
      'guild-light',
      'guild-dark',
      'guild-fire',
      'guild-water',
      'guild-earth',
      'guild-spirit',
      'home-poor',
      'home-town',
      'home-rich',
      'chamber',
      'chamber-still',
    ];
    const rooms = Object.keys(import.meta.glob('../../assets/rooms/*.json'))
      .map((path) => path.slice(path.lastIndexOf('/') + 1, -'.json'.length))
      .filter((id) => !ahead.includes(id))
      .sort();
    expect(rooms).toEqual(Object.keys(VILLAGE_HOUSES).sort());
    for (const [key, ref] of Object.entries(VILLAGE_HOUSES)) expect(ref.house.id).toBe(key);
  });
});
