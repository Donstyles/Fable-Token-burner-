import { describe, expect, it } from 'vitest';
import { DIALOGUES, QUESTS } from '../game/dialogue';
import { freshState } from '../game/fixtures';
import { NPCS } from '../game/monsters';
import { handleQuestEvent, questEntry } from '../game/quests';
import { gridHas } from '../game/inventory';
import {
  chooseTopic,
  deliveryTopic,
  dialogueView,
  nextPage,
  questNotice,
  questStage,
  scrollMarks,
  wholeLines,
} from './dialogue-model';

const tobin = DIALOGUES['villager-man']!;
const maren = DIALOGUES['villager-woman']!;
const reeve = DIALOGUES['reeve']!;
const ida = DIALOGUES['ida']!;
const garrick = DIALOGUES['woodcutter']!;
const anselm = DIALOGUES['anselm']!;

describe('dialogue view', () => {
  it('names the villager, their role, the greeting and every topic', () => {
    const v = dialogueView(freshState(), NPCS['villager-man']!, tobin, QUESTS);
    expect(v.name).toBe('Old Tobin');
    expect(v.role).toBe('Farmer');
    expect(v.greeting).toMatch(/farm gate/);
    expect(v.topics.map((t) => t.label)).toEqual([
      'The sheep',
      'The hills',
      'The old halls',
      'Rumours',
    ]);
  });

  it('greets with the news when the party comes back with the quest done', () => {
    const state = freshState();
    chooseTopic(state, tobin, QUESTS, 'sheep');
    for (let i = 0; i < 3; i++)
      handleQuestEvent(state.quests, QUESTS, { kind: 'kill', monster: 'bandit' });
    const v = dialogueView(state, NPCS['villager-man']!, tobin, QUESTS);
    expect(v.greeting).toMatch(/Back already/);
  });
});

describe('quest topics', () => {
  it('offers, then reports progress, then pays on the return', () => {
    const state = freshState();
    const gold = state.gold;
    expect(questStage(state.quests, QUESTS['tobins-sheep']!, 'villager-man')).toBe('offer');

    const offer = chooseTopic(state, tobin, QUESTS, 'sheep')!;
    expect(offer.text).toMatch(/hundred and fifty gold/);
    expect(offer.notices).toEqual(["Quest taken: Tobin's Sheep"]);
    expect(questEntry(state.quests, 'tobins-sheep')?.state).toBe('active');
    expect(questStage(state.quests, QUESTS['tobins-sheep']!, 'villager-man')).toBe('active');

    // Asked again while the bandits still walk the road: the count so far.
    handleQuestEvent(state.quests, QUESTS, { kind: 'kill', monster: 'bandit' });
    const active = chooseTopic(state, tobin, QUESTS, 'sheep')!;
    expect(active.text).toMatch(/1 of 3 so far/);
    expect(active.notices).toEqual([]);

    // Goblins are not bandits; the count stays.
    handleQuestEvent(state.quests, QUESTS, { kind: 'kill', monster: 'goblin-scout' });
    handleQuestEvent(state.quests, QUESTS, { kind: 'kill', monster: 'bandit' });
    handleQuestEvent(state.quests, QUESTS, { kind: 'kill', monster: 'bandit' });
    expect(questStage(state.quests, QUESTS['tobins-sheep']!, 'villager-man')).toBe('ready');

    const ready = chooseTopic(state, tobin, QUESTS, 'sheep')!;
    expect(ready.text).toMatch(/the road is mine again/);
    expect(ready.reward?.gold).toBe(150);
    expect(state.gold).toBe(gold + 150);
    expect(ready.reward?.xp.reduce((a, b) => a + b, 0)).toBe(2400);
    expect(ready.notices).toEqual(["Quest complete: Tobin's Sheep (150 gold, 2400 experience)"]);
    expect(questEntry(state.quests, 'tobins-sheep')?.state).toBe('done');

    const done = chooseTopic(state, tobin, QUESTS, 'sheep')!;
    expect(done.text).toMatch(/both eyes shut/);
    expect(state.gold).toBe(gold + 150);
  });

  it('a villager is not told of a quest that waits at another', () => {
    const state = freshState();
    chooseTopic(state, maren, QUESTS, 'goblins');
    handleQuestEvent(state.quests, QUESTS, { kind: 'kill', monster: 'goblin-scout' });
    handleQuestEvent(state.quests, QUESTS, { kind: 'kill', monster: 'goblin-scout' });
    // Tobin's talk does nothing for Maren's quest.
    handleQuestEvent(state.quests, QUESTS, { kind: 'talk', npc: 'villager-man' });
    expect(questStage(state.quests, QUESTS['goblins-in-the-hills']!, 'villager-woman')).toBe(
      'ready',
    );
    const paid = chooseTopic(state, maren, QUESTS, 'goblins')!;
    expect(paid.reward?.gold).toBe(80);
  });
});

describe('what people say changes with what the party has done (DESIGN.md 17.20)', () => {
  const labels = (state: ReturnType<typeof freshState>, def: typeof reeve) =>
    dialogueView(state, NPCS[def.npc]!, def, QUESTS).topics.map((t) => t.label);

  it('the reeve sends the party to Tobin, then waits, then has brigands for it', () => {
    const state = freshState();
    expect(labels(state, reeve)).toEqual(['The coast road', 'The town', 'Rumours']);
    expect(chooseTopic(state, reeve, QUESTS, 'road')!.text).toMatch(/Old Tobin/);
    // A topic not on offer cannot be chosen.
    expect(chooseTopic(state, reeve, QUESTS, 'brigands')).toBeNull();
    expect(chooseTopic(state, reeve, QUESTS, 'road-working')).toBeNull();
    chooseTopic(state, tobin, QUESTS, 'sheep');
    expect(labels(state, reeve)).toEqual(['The coast road', 'The town', 'Rumours']);
    expect(chooseTopic(state, reeve, QUESTS, 'road-working')!.text).toMatch(/Tobin’s coin/);
    for (let i = 0; i < 3; i++)
      handleQuestEvent(state.quests, QUESTS, { kind: 'kill', monster: 'bandit' });
    chooseTopic(state, tobin, QUESTS, 'sheep');
    expect(labels(state, reeve)).toEqual(['The brigands', 'The town', 'Rumours']);
    const offer = chooseTopic(state, reeve, QUESTS, 'brigands')!;
    expect(offer.notices).toEqual(["Quest taken: The Brigands' Camp"]);
    for (let i = 0; i < 3; i++)
      handleQuestEvent(state.quests, QUESTS, { kind: 'kill', monster: 'brigand' });
    const gold = state.gold;
    const paid = chooseTopic(state, reeve, QUESTS, 'brigands')!;
    expect(paid.reward?.gold).toBe(250);
    expect(state.gold).toBe(gold + 250);
  });

  it('Anselm speaks of the dead as the halls quest stands', () => {
    const state = freshState();
    expect(chooseTopic(state, anselm, QUESTS, 'dead')!.text).toMatch(/Tobin, I hear, pays/);
    chooseTopic(state, tobin, QUESTS, 'halls');
    expect(chooseTopic(state, anselm, QUESTS, 'dead')).toBeNull();
    expect(chooseTopic(state, anselm, QUESTS, 'dead-working')!.text).toMatch(/carry a light/);
    expect(labels(state, anselm)).toEqual(['The shrines', 'The old stone', 'The dead', 'Rumours']);
  });
});

describe('a thing carried for someone', () => {
  it('comes with the quest, is offered to the one it is for, and leaves the pack when given', () => {
    const state = freshState();
    expect(labels(state, garrick)).toEqual(['The wood', 'Gullhaven', 'Rumours']);
    const offer = chooseTopic(state, ida, QUESTS, 'letter')!;
    expect(offer.notices).toEqual(['Quest taken: A Letter for Garrick']);
    expect(gridHas(state.party[state.selected]!.grid, 'letter')).toBeGreaterThanOrEqual(0);
    // Garrick now has a topic for it, at the head of his list.
    const view = dialogueView(state, NPCS['woodcutter']!, garrick, QUESTS);
    expect(view.topics[0]).toEqual({
      id: deliveryTopic('a-letter-for-garrick'),
      label: 'A letter from Ida',
    });
    // Ida herself is not offered her own letter.
    expect(labels(state, ida)[0]).toBe('A letter');
    const given = chooseTopic(state, garrick, QUESTS, deliveryTopic('a-letter-for-garrick'))!;
    expect(given.text).toMatch(/come down to the square myself/);
    expect(given.notices).toEqual([
      'A Letter for Garrick: Tell Ida at the stalls that Garrick has it',
    ]);
    expect(state.party.every((c) => gridHas(c.grid, 'letter') < 0)).toBe(true);
    expect(labels(state, garrick)).toEqual(['The wood', 'Gullhaven', 'Rumours']);
    // Given once; a second asking finds nothing to give.
    expect(chooseTopic(state, garrick, QUESTS, deliveryTopic('a-letter-for-garrick'))).toBeNull();
    // Ida pays on the party's return.
    const gold = state.gold;
    const view2 = dialogueView(state, NPCS['ida']!, ida, QUESTS);
    expect(view2.greeting).toMatch(/Did he read it/);
    const paid = chooseTopic(state, ida, QUESTS, 'letter')!;
    expect(paid.reward?.gold).toBe(60);
    expect(state.gold).toBe(gold + 60);
    expect(questEntry(state.quests, 'a-letter-for-garrick')?.state).toBe('done');
  });

  it('is not taken when no pack has room for it', () => {
    const state = freshState();
    for (const c of state.party) {
      c.grid.items = [];
      // Fill every cell of every pack.
      for (let y = 0; y < c.grid.height; y++)
        for (let x = 0; x < c.grid.width; x++)
          c.grid.items.push({
            item: { id: 'potion-healing', identified: true, broken: false },
            x,
            y,
          });
    }
    const out = chooseTopic(state, ida, QUESTS, 'letter')!;
    expect(out.text).toMatch(/no room for it/);
    expect(out.notices).toEqual([]);
    expect(questEntry(state.quests, 'a-letter-for-garrick')).toBeUndefined();
  });

  function labels(state: ReturnType<typeof freshState>, def: typeof garrick): string[] {
    return dialogueView(state, NPCS[def.npc]!, def, QUESTS).topics.map((t) => t.label);
  }
});

describe('talk and rumours', () => {
  it('plain talk says its line and changes nothing but the note it makes, once', () => {
    const state = freshState();
    const out = chooseTopic(state, tobin, QUESTS, 'hills')!;
    expect(out.text).toMatch(/goblins/);
    // MM6 noted what it was told in its book of notes, and said so (books-model.ts).
    expect(out.notices).toEqual(['Note added']);
    const before = JSON.stringify(state);
    const again = chooseTopic(state, tobin, QUESTS, 'hills')!;
    expect(again.notices).toEqual([]);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('rumours come in turn and the turn is kept in the flags', () => {
    const state = freshState();
    const first = chooseTopic(state, maren, QUESTS, 'rumours')!.text;
    const second = chooseTopic(state, maren, QUESTS, 'rumours')!.text;
    const third = chooseTopic(state, maren, QUESTS, 'rumours')!.text;
    const again = chooseTopic(state, maren, QUESTS, 'rumours')!.text;
    expect(new Set([first, second, third]).size).toBe(3);
    expect(again).toBe(first);
    expect(state.flags['rumour:villager-woman']).toBe(4);
  });

  it('an unknown topic is null', () => {
    expect(chooseTopic(freshState(), tobin, QUESTS, 'weather')).toBeNull();
  });
});

describe('quest notices', () => {
  it('names the quest, the count, the next objective and the reward', () => {
    expect(
      questNotice(
        { kind: 'progress', quest: 'tobins-sheep', step: 0, progress: 2, count: 3 },
        QUESTS,
      ),
    ).toBe("Tobin's Sheep: Drive three bandits off the coast road (2 of 3)");
    expect(questNotice({ kind: 'objective-done', quest: 'tobins-sheep', step: 0 }, QUESTS)).toBe(
      "Tobin's Sheep: Tell Old Tobin at his farm gate",
    );
    expect(
      questNotice(
        { kind: 'quest-done', quest: 'goblins-in-the-hills', reward: { gold: 80 } },
        QUESTS,
      ),
    ).toBe('Quest complete: Goblins in the Hills (80 gold)');
  });
});

describe('the words box', () => {
  it('marks more above and below only when the line runs past the box', () => {
    expect(scrollMarks(0, 88, 88)).toEqual({ up: false, down: false });
    expect(scrollMarks(0, 88, 89)).toEqual({ up: false, down: false });
    expect(scrollMarks(0, 88, 140)).toEqual({ up: false, down: true });
    expect(scrollMarks(30, 88, 140)).toEqual({ up: true, down: true });
    expect(scrollMarks(52, 88, 140)).toEqual({ up: true, down: false });
  });

  it('turns a box less a line on a tap, and stops at the end', () => {
    expect(nextPage(0, 88, 200, 22)).toBe(66);
    expect(nextPage(66, 88, 200, 22)).toBe(112);
    expect(nextPage(112, 88, 200, 22)).toBe(112);
    expect(nextPage(0, 88, 88, 22)).toBe(0);
    // A box hardly a line tall still moves a line.
    expect(nextPage(0, 30, 200, 22)).toBe(22);
  });

  it('holds whole lines only, two at the least and eight at the most', () => {
    // The phone with its insets leaves 112 pixels beside four topics: four lines, not four
    // and a half.
    expect(wholeLines(112, 22, 8, 8)).toBe(96);
    expect(wholeLines(118, 22, 8, 8)).toBe(118);
    expect(wholeLines(139, 22, 8, 8)).toBe(118);
    expect(wholeLines(20, 22, 8, 8)).toBe(52);
    expect(wholeLines(1000, 22, 8, 8)).toBe(184);
  });
});
