import { describe, expect, it } from 'vitest';
import { DIALOGUES, QUESTS } from './dialogue';
import { freshState } from './fixtures';
import { gridHas } from './inventory';
import { MONSTERS, NPCS } from './monsters';
import { handleQuestEvent, questEntry } from './quests';
import { chooseTopic, deliveryTopic, dialogueView } from '../ui/dialogue-model';

/**
 * The campaign walks (docs/CAMPAIGN.md): the thread's eleven steps taken in order on a fresh
 * state, each gate opening on the step before, each carried thing produced somewhere, every
 * person's quest offered when the sheet says and not before. A broken link in the chain fails
 * here, not in the owner's hands.
 */
const talk = (state: ReturnType<typeof freshState>, npc: string, topic: string) => {
  const def = DIALOGUES[npc]!;
  const out = chooseTopic(state, def, QUESTS, topic);
  expect(out, `${npc}: ${topic}`).not.toBeNull();
  return out!;
};
const offered = (state: ReturnType<typeof freshState>, npc: string): string[] =>
  dialogueView(state, NPCS[npc]!, DIALOGUES[npc]!, QUESTS).topics.map((t) => t.id);
const kill = (state: ReturnType<typeof freshState>, monster: string, n = 1) => {
  for (let i = 0; i < n; i++) handleQuestEvent(state.quests, QUESTS, { kind: 'kill', monster });
  // The campaign's carried things come off the body (treasure.ts `carried`).
  const carried = MONSTERS[monster]!.carries;
  if (carried)
    state.party[0]!.grid.items.push({
      item: { id: carried, identified: true, broken: false },
      x: 0,
      y: 0,
    });
};
const give = (state: ReturnType<typeof freshState>, npc: string, quest: string) =>
  talk(state, npc, deliveryTopic(quest));
const done = (state: ReturnType<typeof freshState>, quest: string) =>
  questEntry(state.quests, quest)?.state === 'done';

describe('the campaign walks end to end (docs/CAMPAIGN.md)', () => {
  it('every carried thing is produced before it is asked for', () => {
    const produced = new Set<string>();
    for (const m of Object.values(MONSTERS)) if (m.carries) produced.add(m.carries);
    for (const q of Object.values(QUESTS)) for (const id of q.gives ?? []) produced.add(id);
    // What chests hold is in the dungeon scripts, read as text.
    const scripts = import.meta.glob('../../levels/*/level.ts', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;
    expect(Object.keys(scripts).length).toBeGreaterThanOrEqual(8);
    for (const text of Object.values(scripts)) {
      for (const m of text.matchAll(/'([a-z-]+)'/g)) produced.add(m[1]!);
    }
    for (const q of Object.values(QUESTS)) {
      for (const o of q.objectives) {
        if (o.kind === 'deliver')
          expect(produced.has(o.item), `${q.id} wants ${o.item}`).toBe(true);
      }
    }
  });

  it('the thread opens step by step and ends at the First Door', () => {
    const state = freshState();
    // Step 1: Gullhaven's errands stand open; the reeve has no brigands yet, Maren no king.
    expect(offered(state, 'villager-man')).toContain('sheep');
    expect(offered(state, 'reeve')).not.toContain('brigands');
    expect(offered(state, 'villager-woman')).not.toContain('king');
    expect(offered(state, 'anselm')).not.toContain('door');
    talk(state, 'villager-man', 'sheep');
    kill(state, 'bandit', 3);
    talk(state, 'villager-man', 'sheep');
    expect(done(state, 'tobins-sheep')).toBe(true);
    expect(offered(state, 'reeve')).toContain('brigands');
    talk(state, 'villager-woman', 'goblins');
    kill(state, 'goblin-scout', 2);
    talk(state, 'villager-woman', 'goblins');
    expect(offered(state, 'villager-woman')).toContain('king');

    // Step 2: the Old Halls; the Warden's seal comes off him.
    talk(state, 'villager-man', 'halls');
    kill(state, 'skeleton-warrior', 5);
    kill(state, 'skeleton-warden');
    talk(state, 'villager-man', 'halls');
    expect(done(state, 'the-old-halls')).toBe(true);
    expect(gridHas(state.party[0]!.grid, 'seal-of-the-halls')).toBeGreaterThanOrEqual(0);

    // Step 3: Anselm reads the seal and sends the party west; Wyn has nothing to ask yet.
    expect(offered(state, 'novice')).not.toContain('chart');
    talk(state, 'anselm', 'seal');
    give(state, 'anselm', 'the-seal-and-the-stone');
    expect(done(state, 'the-seal-and-the-stone')).toBe(true);
    expect(gridHas(state.party[0]!.grid, 'seal-of-the-halls')).toBe(-1);
    expect(offered(state, 'anselm')).toContain('west');
    expect(offered(state, 'novice')).toContain('chart');

    // Step 4: the warren, a side door.
    talk(state, 'villager-woman', 'king');
    kill(state, 'goblin-grik');
    talk(state, 'villager-woman', 'king');
    expect(done(state, 'the-goblin-king')).toBe(true);

    // Steps 5 and 6: Harrowmere; the chart comes out of Orrin's den.
    talk(state, 'novice', 'chart');
    expect(offered(state, 'novice')).not.toContain('seal');
    talk(state, 'granger', 'orrin');
    kill(state, 'bandit-captain');
    talk(state, 'granger', 'orrin');
    state.party[0]!.grid.items.push({
      item: { id: 'sea-kings-chart', identified: true, broken: false },
      x: 2,
      y: 0,
    });
    give(state, 'novice', 'the-chart');
    expect(done(state, 'the-chart')).toBe(true);
    expect(offered(state, 'novice')).toContain('seal');

    // Step 7: the barrow; the knights first, then the king, then his seal to Wyn.
    talk(state, 'novice', 'knights');
    kill(state, 'skeleton-knight', 2);
    talk(state, 'novice', 'knights');
    expect(offered(state, 'novice')).toContain('king');
    talk(state, 'novice', 'king');
    kill(state, 'barrow-king');
    talk(state, 'novice', 'king');
    talk(state, 'novice', 'seal');
    give(state, 'novice', 'the-second-seal');
    expect(done(state, 'the-second-seal')).toBe(true);
    expect(offered(state, 'novice')).toContain('north');

    // Steps 8 to 10: the Mire; Oddo's chain.
    expect(offered(state, 'brother')).not.toContain('sunken');
    talk(state, 'brother', 'abbey');
    kill(state, 'the-abbot');
    talk(state, 'brother', 'abbey');
    expect(offered(state, 'brother')).toEqual(expect.arrayContaining(['confession', 'sunken']));
    talk(state, 'brother', 'confession');
    give(state, 'brother', 'the-confession');
    talk(state, 'brother', 'sunken');
    kill(state, 'the-drowned-warden');
    talk(state, 'brother', 'sunken');
    expect(offered(state, 'brother')).toContain('seal');
    talk(state, 'brother', 'seal');
    give(state, 'brother', 'the-third-seal');
    expect(done(state, 'the-third-seal')).toBe(true);

    // Step 11: Anselm gives the three seals back and the Sea King falls.
    expect(offered(state, 'anselm')).toContain('door');
    const before = state.gold;
    const offer = talk(state, 'anselm', 'door');
    expect(offer.notices).toEqual(['Quest taken: The First Door']);
    for (const seal of ['seal-of-the-halls', 'seal-of-the-barrow', 'seal-of-the-deep']) {
      expect(
        state.party.some((c) => gridHas(c.grid, seal as never) >= 0),
        `the party carries ${seal}`,
      ).toBe(true);
    }
    kill(state, 'the-sea-king');
    const paid = talk(state, 'anselm', 'door');
    expect(paid.reward?.gold).toBe(2000);
    expect(state.gold).toBeGreaterThan(before);
    expect(done(state, 'the-first-door')).toBe(true);
    // Twenty-two quests exist; the thread's ten are done.
    expect(Object.keys(QUESTS).length).toBeGreaterThanOrEqual(22);
  });
});
