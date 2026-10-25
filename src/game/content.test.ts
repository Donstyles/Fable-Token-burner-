import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { VILLAGE_HOUSES } from './content';

describe('village houses', () => {
  it('each opens a room of its own, and each room belongs to a house (DESIGN 17.8)', () => {
    const rooms = readdirSync('assets/rooms')
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.slice(0, -'.json'.length))
      .sort();
    expect(rooms).toEqual(Object.keys(VILLAGE_HOUSES).sort());
    for (const [key, ref] of Object.entries(VILLAGE_HOUSES)) expect(ref.house.id).toBe(key);
  });
});
