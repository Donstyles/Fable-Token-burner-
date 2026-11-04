/**
 * The dialogue view-model (DESIGN.md 16.7): what the talk panel shows for a villager, given the
 * state, and what choosing a topic says and does. A quest topic walks its stages: choosing it
 * on the offer takes the quest, on the ready stage it feeds the quest log the talk event, ends
 * the quest and pays the reward. Pure functions over the state; `dialogue.ts` draws them, and
 * the runtime reports the notices on the status line.
 */
import { type DialogueDef, NO_ROOM_FOR_IT, type QuestStage, type Topic } from '../game/dialogue';
import { gridHas, removeItem } from '../game/inventory';
import { itemDef } from '../game/items';
import type { NpcDef } from '../game/monsters';
import { takeNote } from '../game/notes';
import {
  currentObjective,
  handleQuestEvent,
  pendingDeliveries,
  type QuestChange,
  type QuestDef,
  questEntry,
  type QuestLog,
  startQuest,
} from '../game/quests';
import { type GameState, giveItem, grantReward, type RewardOutcome } from '../game/state';

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

/** Whether a topic is on offer now: its condition on a quest's state, if it has one. */
export function topicOffered(state: GameState, topic: Topic): boolean {
  if (!topic.when) return true;
  const entry = questEntry(state.quests, topic.when.quest);
  const is = !entry ? 'untaken' : entry.state === 'done' ? 'done' : 'active';
  return is === topic.when.is;
}

/** The topics on offer now (DESIGN.md 17.20). */
export function offeredTopics(state: GameState, def: DialogueDef): Topic[] {
  return def.topics.filter((t) => topicOffered(state, t));
}

function questTopics(state: GameState, def: DialogueDef): Extract<Topic, { kind: 'quest' }>[] {
  return offeredTopics(state, def).filter(
    (t): t is Extract<Topic, { kind: 'quest' }> => t.kind === 'quest',
  );
}

/** The topic id under which a delivery for a quest is offered. */
export const deliveryTopic = (quest: string): string => `deliver:${quest}`;

/** The member carrying an item and where in their pack, or null. */
function carrier(state: GameState, item: string): { member: number; index: number } | null {
  for (const [member, c] of state.party.entries()) {
    const index = gridHas(c.grid, item as never);
    if (index >= 0) return { member, index };
  }
  return null;
}

/**
 * The things the party carries for this person: a topic each, by its quest, while the party
 * has the thing and the quest wants it handed over now.
 */
export function deliveryRows(state: GameState, def: DialogueDef, quests: QuestDefs): TopicRow[] {
  return pendingDeliveries(state.quests, quests, def.npc)
    .filter((d) => carrier(state, d.objective.item) !== null)
    .map((d) => ({
      id: deliveryTopic(d.quest.id),
      label: d.objective.label ?? itemDef(d.objective.item).name,
    }));
}

export function dialogueView(
  state: GameState,
  npc: NpcDef,
  def: DialogueDef,
  quests: QuestDefs,
): DialogueView {
  // A villager waiting for news greets with it.
  let greeting = def.greeting;
  for (const t of questTopics(state, def)) {
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
    topics: [
      ...deliveryRows(state, def, quests),
      ...offeredTopics(state, def).map((t) => ({ id: t.id, label: t.label })),
    ],
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

/** Pay what a finished quest pays and say so. */
function settle(state: GameState, outcome: TopicOutcome, quests: QuestDefs): void {
  for (const change of outcome.changes) {
    if (change.kind === 'quest-done') {
      if (change.reward) outcome.reward = grantReward(state, change.reward);
      outcome.notices.push(questNotice(change, quests));
    }
  }
}

/**
 * Hand over the thing a quest has the party carrying for this person: it leaves the pack, the
 * quest moves on, and they answer with the objective's reply.
 */
function deliver(
  state: GameState,
  def: DialogueDef,
  quests: QuestDefs,
  questId: string,
): TopicOutcome | null {
  const wanted = pendingDeliveries(state.quests, quests, def.npc).find(
    (d) => d.quest.id === questId,
  );
  if (!wanted) return null;
  const held = carrier(state, wanted.objective.item);
  if (!held) return null;
  removeItem(state.party[held.member]!.grid, held.index);
  const outcome: TopicOutcome = {
    text: wanted.objective.reply ?? 'Thank you. I had given up hoping for it.',
    notices: [],
    changes: handleQuestEvent(state.quests, quests, {
      kind: 'deliver',
      item: wanted.objective.item,
      npc: def.npc,
    }),
    reward: null,
  };
  for (const change of outcome.changes) {
    if (change.kind === 'objective-done') outcome.notices.push(questNotice(change, quests));
  }
  settle(state, outcome, quests);
  return outcome;
}

/** Hand the party what a quest gives on taking it; false, with nothing given, when no pack has room. */
function handOver(state: GameState, q: QuestDef): boolean {
  const given: { member: number; index: number }[] = [];
  for (const id of q.gives ?? []) {
    const order = [state.selected, ...state.party.keys()];
    const taker = order.find((i) => state.party[i] !== undefined && giveItem(state.party[i]!, id));
    if (taker === undefined) {
      for (const g of given.reverse()) removeItem(state.party[g.member]!.grid, g.index);
      return false;
    }
    given.push({ member: taker, index: state.party[taker]!.grid.items.length - 1 });
  }
  return true;
}

export function chooseTopic(
  state: GameState,
  def: DialogueDef,
  quests: QuestDefs,
  topicId: string,
): TopicOutcome | null {
  if (topicId.startsWith('deliver:')) return deliver(state, def, quests, topicId.slice(8));
  const topic = def.topics.find((t) => t.id === topicId);
  if (!topic || !topicOffered(state, topic)) return null;
  const outcome: TopicOutcome = { text: '', notices: [], changes: [], reward: null };
  switch (topic.kind) {
    case 'say':
      outcome.text = topic.text;
      // MM6 noted what it was told in its book of notes, and said so.
      if (topic.note && takeNote(state, def.npc, topic.id)) outcome.notices.push('Note added');
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
          // A thing to carry comes with the quest; without room for it, neither is taken.
          if (!handOver(state, q)) {
            outcome.text = NO_ROOM_FOR_IT;
            return outcome;
          }
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
          settle(state, outcome, quests);
          return outcome;
        }
        case 'done':
          outcome.text = topic.done;
          return outcome;
      }
    }
  }
}

/**
 * Whether the talk panel's words run past their box above and below (a pixel of slack for
 * rounding), so the gold marks at its corners show which way there is more to read.
 */
export function scrollMarks(
  scrollTop: number,
  clientHeight: number,
  scrollHeight: number,
): { up: boolean; down: boolean } {
  return { up: scrollTop > 1, down: scrollTop + clientHeight < scrollHeight - 1 };
}

/**
 * Where a tap on the words turns to: on by the box less one line, so the last line read stays
 * in sight, a line at the least, and never past the end.
 */
export function nextPage(
  scrollTop: number,
  clientHeight: number,
  scrollHeight: number,
  line: number,
): number {
  const end = Math.max(0, scrollHeight - clientHeight);
  return Math.min(end, scrollTop + Math.max(line, clientHeight - line));
}

/**
 * The height of a box of words that holds whole lines only: as many lines of `line` pixels as
 * fit in `room` with the box's padding, two at the least and `most` at the most, so the last
 * line in view is never cut through.
 */
export function wholeLines(room: number, line: number, pad: number, most: number): number {
  const fit = Math.floor((room - pad) / line);
  return Math.max(2, Math.min(most, fit)) * line + pad;
}
