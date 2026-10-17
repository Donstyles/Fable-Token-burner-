import { describe, expect, it } from 'vitest';
import { DIALOGUES, QUESTS } from '../game/dialogue';
import { freshState } from '../game/fixtures';
import { NPCS } from '../game/monsters';
import { handleQuestEvent, questEntry } from '../game/quests';
import { chooseTopic, dialogueView, questNotice, questStage } from './dialogue-model';

const henrik = DIALOGUES['villager-man']!;
const greta = DIALOGUES['villager-woman']!;

describe('dialogue view', () => {
  it('names the villager, their role, the greeting and every topic', () => {
    const v = dialogueView(freshState(), NPCS['villager-man']!, henrik, QUESTS);
    expect(v.name).toBe('Old Henrik');
    expect(v.role).toBe('Farmer');
    expect(v.greeting).toMatch(/farm gate/);
    expect(v.topics.map((t) => t.label)).toEqual(['The sheep', 'The pass', 'The barn', 'Rumours']);
  });

  it('greets with the news when the party comes back with the quest done', () => {
    const state = freshState();
    chooseTopic(state, henrik, QUESTS, 'sheep');
    for (let i = 0; i < 3; i++)
      handleQuestEvent(state.quests, QUESTS, { kind: 'kill', monster: 'bandit' });
    const v = dialogueView(state, NPCS['villager-man']!, henrik, QUESTS);
    expect(v.greeting).toMatch(/Back already/);
  });
});

describe('quest topics', () => {
  it('offers, then reports progress, then pays on the return', () => {
    const state = freshState();
    const gold = state.gold;
    expect(questStage(state.quests, QUESTS['henriks-sheep']!, 'villager-man')).toBe('offer');

    const offer = chooseTopic(state, henrik, QUESTS, 'sheep')!;
    expect(offer.text).toMatch(/hundred and fifty gold/);
    expect(offer.notices).toEqual(["Quest taken: Henrik's Sheep"]);
    expect(questEntry(state.quests, 'henriks-sheep')?.state).toBe('active');
    expect(questStage(state.quests, QUESTS['henriks-sheep']!, 'villager-man')).toBe('active');

    // Asked again while the bandits still walk the road: the count so far.
    handleQuestEvent(state.quests, QUESTS, { kind: 'kill', monster: 'bandit' });
    const active = chooseTopic(state, henrik, QUESTS, 'sheep')!;
    expect(active.text).toMatch(/1 of 3 so far/);
    expect(active.notices).toEqual([]);

    // Goblins are not bandits; the count stays.
    handleQuestEvent(state.quests, QUESTS, { kind: 'kill', monster: 'goblin-scout' });
    handleQuestEvent(state.quests, QUESTS, { kind: 'kill', monster: 'bandit' });
    handleQuestEvent(state.quests, QUESTS, { kind: 'kill', monster: 'bandit' });
    expect(questStage(state.quests, QUESTS['henriks-sheep']!, 'villager-man')).toBe('ready');

    const ready = chooseTopic(state, henrik, QUESTS, 'sheep')!;
    expect(ready.text).toMatch(/the road is mine again/);
    expect(ready.reward?.gold).toBe(150);
    expect(state.gold).toBe(gold + 150);
    expect(ready.reward?.xp.reduce((a, b) => a + b, 0)).toBe(300);
    expect(ready.notices).toEqual(["Quest complete: Henrik's Sheep (150 gold, 300 experience)"]);
    expect(questEntry(state.quests, 'henriks-sheep')?.state).toBe('done');

    const done = chooseTopic(state, henrik, QUESTS, 'sheep')!;
    expect(done.text).toMatch(/both eyes shut/);
    expect(state.gold).toBe(gold + 150);
  });

  it('a villager is not told of a quest that waits at another', () => {
    const state = freshState();
    chooseTopic(state, greta, QUESTS, 'goblins');
    handleQuestEvent(state.quests, QUESTS, { kind: 'kill', monster: 'goblin-scout' });
    handleQuestEvent(state.quests, QUESTS, { kind: 'kill', monster: 'goblin-scout' });
    // Henrik's talk does nothing for Greta's quest.
    handleQuestEvent(state.quests, QUESTS, { kind: 'talk', npc: 'villager-man' });
    expect(questStage(state.quests, QUESTS['goblins-at-the-edge']!, 'villager-woman')).toBe(
      'ready',
    );
    const paid = chooseTopic(state, greta, QUESTS, 'goblins')!;
    expect(paid.reward?.gold).toBe(80);
  });
});

describe('talk and rumours', () => {
  it('plain talk says its line and changes nothing', () => {
    const state = freshState();
    const before = JSON.stringify(state);
    const out = chooseTopic(state, henrik, QUESTS, 'pass')!;
    expect(out.text).toMatch(/Nomads/);
    expect(out.notices).toEqual([]);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('rumours come in turn and the turn is kept in the flags', () => {
    const state = freshState();
    const first = chooseTopic(state, greta, QUESTS, 'rumours')!.text;
    const second = chooseTopic(state, greta, QUESTS, 'rumours')!.text;
    const third = chooseTopic(state, greta, QUESTS, 'rumours')!.text;
    const again = chooseTopic(state, greta, QUESTS, 'rumours')!.text;
    expect(new Set([first, second, third]).size).toBe(3);
    expect(again).toBe(first);
    expect(state.flags['rumour:villager-woman']).toBe(4);
  });

  it('an unknown topic is null', () => {
    expect(chooseTopic(freshState(), henrik, QUESTS, 'weather')).toBeNull();
  });
});

describe('quest notices', () => {
  it('names the quest, the count, the next objective and the reward', () => {
    expect(
      questNotice(
        { kind: 'progress', quest: 'henriks-sheep', step: 0, progress: 2, count: 3 },
        QUESTS,
      ),
    ).toBe("Henrik's Sheep: Drive three bandits off the valley road (2 of 3)");
    expect(questNotice({ kind: 'objective-done', quest: 'henriks-sheep', step: 0 }, QUESTS)).toBe(
      "Henrik's Sheep: Tell Old Henrik at his farm gate",
    );
    expect(
      questNotice(
        { kind: 'quest-done', quest: 'goblins-at-the-edge', reward: { gold: 80 } },
        QUESTS,
      ),
    ).toBe('Quest complete: Goblins at the Forest Edge (80 gold)');
  });
});
