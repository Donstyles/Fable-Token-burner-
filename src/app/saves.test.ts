import { describe, expect, it } from 'vitest';
import { freshState } from '../game/fixtures';
import { advanceClock } from '../game/time';
import { memorySlots, SLOT_COUNT, SLOTS } from './saves';

describe('save slots (DESIGN 17.14)', () => {
  it('writes a copy of the game into a slot and lists it in slot order with its summary', async () => {
    const store = memorySlots();
    expect(SLOTS).toHaveLength(SLOT_COUNT);
    const state = freshState();
    state.gold = 777;
    advanceClock(state.clock, 90);
    await store.write('slot-3', state, 1000);
    await store.write('slot-1', state, 2000);
    const list = await store.list();
    expect(list.map((r) => r.slot)).toEqual(['slot-1', 'slot-3']);
    const rec = await store.read('slot-3');
    expect(rec?.savedAt).toBe(1000);
    expect(rec?.summary.level).toBe(state.level.id);
    expect(rec?.summary.party.map((p) => p.name)).toEqual(state.party.map((c) => c.name));
    expect(rec?.file.state.gold).toBe(777);
    // A copy, not the game itself: the game moves on, the slot does not.
    state.gold = 1;
    expect((await store.read('slot-3'))?.file.state.gold).toBe(777);
    await store.remove('slot-3');
    expect(await store.read('slot-3')).toBeNull();
  });
});
