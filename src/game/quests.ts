/**
 * Quests (Phase 5 step 8). A quest is a definition with a title, its log text and a list of
 * objectives completed in order: talk to someone, kill a number of a monster kind, reach a
 * named point, or hand an item to someone. The log keeps each started quest's state, current
 * step and progress. World events drive it; the state machine answers with what changed and
 * with any reward for the state layer to grant. MM6 quests are flat flags tied to dialogue;
 * ordered objectives are our simplification of that.
 */
import type { ItemId } from './items';

export type QuestObjective =
  | { kind: 'talk'; npc: string; text: string }
  | { kind: 'kill'; monster: string; count: number; text: string }
  | { kind: 'reach'; point: string; text: string }
  | { kind: 'deliver'; item: ItemId; npc: string; text: string };

export interface QuestReward {
  gold?: number;
  xp?: number;
  items?: ItemId[];
}

export interface QuestDef {
  id: string;
  title: string;
  text: string;
  objectives: readonly QuestObjective[];
  reward?: QuestReward;
}

export type QuestEvent =
  | { kind: 'talk'; npc: string }
  | { kind: 'kill'; monster: string }
  | { kind: 'reach'; point: string }
  | { kind: 'deliver'; item: ItemId; npc: string };

export type QuestState = 'active' | 'done';

export interface QuestEntry {
  id: string;
  state: QuestState;
  /** Index of the current objective; equals the objective count when done. */
  step: number;
  /** Kills so far for a kill objective. */
  progress: number;
}

export interface QuestLog {
  entries: QuestEntry[];
}

export type QuestChange =
  | { kind: 'progress'; quest: string; step: number; progress: number; count: number }
  | { kind: 'objective-done'; quest: string; step: number }
  | { kind: 'quest-done'; quest: string; reward?: QuestReward };

export function createQuestLog(): QuestLog {
  return { entries: [] };
}

export function questEntry(log: QuestLog, id: string): QuestEntry | undefined {
  return log.entries.find((e) => e.id === id);
}

/** Add a quest as active; false when it is already in the log. */
export function startQuest(log: QuestLog, def: QuestDef): boolean {
  if (questEntry(log, def.id)) return false;
  log.entries.push({ id: def.id, state: 'active', step: 0, progress: 0 });
  return true;
}

export function currentObjective(entry: QuestEntry, def: QuestDef): QuestObjective | null {
  return entry.state === 'active' ? (def.objectives[entry.step] ?? null) : null;
}

function matches(objective: QuestObjective, event: QuestEvent): boolean {
  switch (objective.kind) {
    case 'talk':
      return event.kind === 'talk' && event.npc === objective.npc;
    case 'kill':
      return event.kind === 'kill' && event.monster === objective.monster;
    case 'reach':
      return event.kind === 'reach' && event.point === objective.point;
    case 'deliver':
      return (
        event.kind === 'deliver' && event.item === objective.item && event.npc === objective.npc
      );
  }
}

/** Feed one world event to every active quest; mutates the log and reports the changes. */
export function handleQuestEvent(
  log: QuestLog,
  defs: Readonly<Record<string, QuestDef>>,
  event: QuestEvent,
): QuestChange[] {
  const changes: QuestChange[] = [];
  for (const entry of log.entries) {
    const def = defs[entry.id];
    if (!def || entry.state !== 'active') continue;
    const objective = currentObjective(entry, def);
    if (!objective || !matches(objective, event)) continue;
    if (objective.kind === 'kill') {
      entry.progress += 1;
      if (entry.progress < objective.count) {
        changes.push({
          kind: 'progress',
          quest: entry.id,
          step: entry.step,
          progress: entry.progress,
          count: objective.count,
        });
        continue;
      }
    }
    changes.push({ kind: 'objective-done', quest: entry.id, step: entry.step });
    entry.step += 1;
    entry.progress = 0;
    if (entry.step >= def.objectives.length) {
      entry.state = 'done';
      const done: QuestChange = { kind: 'quest-done', quest: entry.id };
      if (def.reward) done.reward = def.reward;
      changes.push(done);
    }
  }
  return changes;
}

export function activeQuests(log: QuestLog): QuestEntry[] {
  return log.entries.filter((e) => e.state === 'active');
}

export function completedQuests(log: QuestLog): QuestEntry[] {
  return log.entries.filter((e) => e.state === 'done');
}
