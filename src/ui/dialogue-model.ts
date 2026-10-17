/**
 * The dialogue view-model (DESIGN.md 16.7): what the talk panel shows for a villager, given the
 * state, and what choosing a topic says and does. A quest topic walks its stages: choosing it
 * on the offer takes the quest, on the ready stage it feeds the quest log the talk event, ends
 * the quest and pays the reward. Pure functions over the state; `dialogue.ts` draws them, and
 * the runtime reports the notices on the status line.
 */
import type { DialogueDef, QuestStage, Topic } from '../game/dialogue';
import type { NpcDef } from '../game/monsters';
import {
  currentObjective,
  handleQuestEvent,
  type QuestChange,
  type QuestDef,
  questEntry,
  type QuestLog,
  startQuest,
} from '../game/quests';
import { type GameState, grantReward, type RewardOutcome } from '../game/state';

export interface TopicRow {
  id: string;
  label: string;
}

export interface DialogueView {
  name: string;
  role: string;
  greeting: string;
  topics: TopicRow[];
}

export interface TopicOutcome {
  text: string;
  /** Lines for the status line: a quest taken, progress, a reward. */
  notices: string[];
  changes: QuestChange[];
  reward: RewardOutcome | null;
}

type QuestDefs = Readonly<Record<string, QuestDef>>;

/** Where a quest stands with the villager who gives it. */
export function questStage(log: QuestLog, def: QuestDef, npc: string): QuestStage {
  const entry = questEntry(log, def.id);
  if (!entry) return 'offer';
  if (entry.state === 'done') return 'done';
  const objective = currentObjective(entry, def);
  return objective?.kind === 'talk' && objective.npc === npc ? 'ready' : 'active';
}

function questTopics(def: DialogueDef): Extract<Topic, { kind: 'quest' }>[] {
  return def.topics.filter((t): t is Extract<Topic, { kind: 'quest' }> => t.kind === 'quest');
}

export function dialogueView(
  state: GameState,
  npc: NpcDef,
  def: DialogueDef,
  quests: QuestDefs,
): DialogueView {
  // A villager waiting for news greets with it.
  let greeting = def.greeting;
  for (const t of questTopics(def)) {
    const q = quests[t.quest];
    if (q && questStage(state.quests, q, def.npc) === 'ready') {
      greeting = t.greetReady;
      break;
    }
  }
  return {
    name: npc.name,
    role: def.role,
    greeting,
    topics: def.topics.map((t) => ({ id: t.id, label: t.label })),
  };
}

/** The status line for a change in the quest log. */
export function questNotice(change: QuestChange, quests: QuestDefs): string {
  const def = quests[change.quest];
  const title = def?.title ?? change.quest;
  switch (change.kind) {
    case 'progress': {
      const objective = def?.objectives[change.step];
      const what = objective?.text ?? 'progress';
      return `${title}: ${what} (${change.progress} of ${change.count})`;
    }
    case 'objective-done': {
      const next = def?.objectives[change.step + 1];
      return next ? `${title}: ${next.text}` : `${title}: done`;
    }
    case 'quest-done': {
      const r = change.reward;
      const parts: string[] = [];
      if (r?.gold) parts.push(`${r.gold} gold`);
      if (r?.xp) parts.push(`${r.xp} experience`);
      return parts.length
        ? `Quest complete: ${title} (${parts.join(', ')})`
        : `Quest complete: ${title}`;
    }
  }
}

function progressSuffix(state: GameState, def: QuestDef): string {
  const entry = questEntry(state.quests, def.id);
  const objective = entry ? currentObjective(entry, def) : null;
  if (!entry || !objective || objective.kind !== 'kill') return '';
  return ` (${entry.progress} of ${objective.count} so far)`;
}

export function chooseTopic(
  state: GameState,
  def: DialogueDef,
  quests: QuestDefs,
  topicId: string,
): TopicOutcome | null {
  const topic = def.topics.find((t) => t.id === topicId);
  if (!topic) return null;
  const outcome: TopicOutcome = { text: '', notices: [], changes: [], reward: null };
  switch (topic.kind) {
    case 'say':
      outcome.text = topic.text;
      return outcome;
    case 'rumours': {
      // Each asking brings the next rumour; the count lives in the flags so a save keeps it.
      const key = `rumour:${def.npc}`;
      const n = state.flags[key] ?? 0;
      outcome.text = topic.lines[n % topic.lines.length] ?? '';
      state.flags[key] = n + 1;
      return outcome;
    }
    case 'quest': {
      const q = quests[topic.quest];
      if (!q) {
        outcome.text = topic.done;
        return outcome;
      }
      switch (questStage(state.quests, q, def.npc)) {
        case 'offer':
          startQuest(state.quests, q);
          outcome.text = topic.offer;
          outcome.notices.push(`Quest taken: ${q.title}`);
          return outcome;
        case 'active':
          outcome.text = topic.active + progressSuffix(state, q);
          return outcome;
        case 'ready': {
          outcome.changes = handleQuestEvent(state.quests, quests, {
            kind: 'talk',
            npc: def.npc,
          });
          outcome.text = topic.ready;
          for (const change of outcome.changes) {
            if (change.kind === 'quest-done') {
              if (change.reward) outcome.reward = grantReward(state, change.reward);
              outcome.notices.push(questNotice(change, quests));
            }
          }
          return outcome;
        }
        case 'done':
          outcome.text = topic.done;
          return outcome;
      }
    }
  }
}
