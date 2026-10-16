import { describe, expect, it } from 'vitest';
import {
  activeQuests,
  completedQuests,
  createQuestLog,
  currentObjective,
  handleQuestEvent,
  type QuestDef,
  questEntry,
  startQuest,
} from './quests';

const QUESTS: Record<string, QuestDef> = {
  bandits: {
    id: 'bandits',
    title: 'Bandits on the road',
    text: 'The innkeeper wants the bandits gone.',
    objectives: [
      { kind: 'talk', npc: 'innkeeper', text: 'Hear the innkeeper out.' },
      { kind: 'kill', monster: 'bandit', count: 3, text: 'Kill three bandits.' },
      { kind: 'reach', point: 'bandit-camp', text: 'Find their camp.' },
      { kind: 'deliver', item: 'copper-ring', npc: 'innkeeper', text: 'Return the ring.' },
    ],
    reward: { gold: 100, xp: 500 },
  },
  errand: {
    id: 'errand',
    title: 'An errand',
    text: 'Talk to the innkeeper.',
    objectives: [{ kind: 'talk', npc: 'innkeeper', text: 'Talk.' }],
  },
};

describe('quest log', () => {
  it('starts a quest once and walks its objectives in order', () => {
    const log = createQuestLog();
    expect(startQuest(log, QUESTS['bandits']!)).toBe(true);
    expect(startQuest(log, QUESTS['bandits']!)).toBe(false);
    const entry = questEntry(log, 'bandits')!;
    expect(currentObjective(entry, QUESTS['bandits']!)?.kind).toBe('talk');
    // A kill before the talk does nothing.
    expect(handleQuestEvent(log, QUESTS, { kind: 'kill', monster: 'bandit' })).toEqual([]);
    expect(handleQuestEvent(log, QUESTS, { kind: 'talk', npc: 'innkeeper' })).toEqual([
      { kind: 'objective-done', quest: 'bandits', step: 0 },
    ]);
    expect(handleQuestEvent(log, QUESTS, { kind: 'kill', monster: 'wolf' })).toEqual([]);
    expect(handleQuestEvent(log, QUESTS, { kind: 'kill', monster: 'bandit' })).toEqual([
      { kind: 'progress', quest: 'bandits', step: 1, progress: 1, count: 3 },
    ]);
    handleQuestEvent(log, QUESTS, { kind: 'kill', monster: 'bandit' });
    expect(handleQuestEvent(log, QUESTS, { kind: 'kill', monster: 'bandit' })).toEqual([
      { kind: 'objective-done', quest: 'bandits', step: 1 },
    ]);
    expect(entry.progress).toBe(0);
    expect(handleQuestEvent(log, QUESTS, { kind: 'reach', point: 'bandit-camp' })).toHaveLength(1);
    expect(
      handleQuestEvent(log, QUESTS, { kind: 'deliver', item: 'copper-ring', npc: 'guard' }),
    ).toEqual([]);
    expect(
      handleQuestEvent(log, QUESTS, { kind: 'deliver', item: 'copper-ring', npc: 'innkeeper' }),
    ).toEqual([
      { kind: 'objective-done', quest: 'bandits', step: 3 },
      { kind: 'quest-done', quest: 'bandits', reward: { gold: 100, xp: 500 } },
    ]);
    expect(entry.state).toBe('done');
    expect(currentObjective(entry, QUESTS['bandits']!)).toBeNull();
    expect(handleQuestEvent(log, QUESTS, { kind: 'talk', npc: 'innkeeper' })).toEqual([]);
  });

  it('drives several quests from one event and lists them by state', () => {
    const log = createQuestLog();
    startQuest(log, QUESTS['bandits']!);
    startQuest(log, QUESTS['errand']!);
    const changes = handleQuestEvent(log, QUESTS, { kind: 'talk', npc: 'innkeeper' });
    expect(changes).toHaveLength(3);
    expect(changes[2]).toEqual({ kind: 'quest-done', quest: 'errand' });
    expect(activeQuests(log).map((e) => e.id)).toEqual(['bandits']);
    expect(completedQuests(log).map((e) => e.id)).toEqual(['errand']);
  });
});
