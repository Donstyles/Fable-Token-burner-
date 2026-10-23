import { describe, expect, it } from 'vitest';
import { DIALOGUES, QUESTS } from '../game/dialogue';
import { freshState } from '../game/fixtures';
import { NPCS } from '../game/monsters';
import { handleQuestEvent, questEntry } from '../game/quests';
import { chooseTopic, dialogueView, questNotice, questStage } from './dialogue-model';

const tobin = DIALOGUES['villager-man']!;
const maren = DIALOGUES['villager-woman']!;

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
    expect(ready.reward?.xp.reduce((a, b) => a + b, 0)).toBe(300);
    expect(ready.notices).toEqual(["Quest complete: Tobin's Sheep (150 gold, 300 experience)"]);
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

describe('talk and rumours', () => {
  it('plain talk says its line and changes nothing', () => {
    const state = freshState();
    const before = JSON.stringify(state);
    const out = chooseTopic(state, tobin, QUESTS, 'hills')!;
    expect(out.text).toMatch(/goblins/);
    expect(out.notices).toEqual([]);
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
