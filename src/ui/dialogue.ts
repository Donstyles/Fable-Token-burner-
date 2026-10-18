/**
 * The talk panel (DESIGN.md 16.7): a villager's name and calling under a window the runtime
 * draws their living face through, their words, and the topics to ask about. Plain DOM in
 * the house style; what is said and done comes from `dialogue-model.ts`. The runtime says
 * where the window is (for the bust), mouths the words and pauses the world meanwhile.
 */
import './dialogue.css';
import type { DialogueDef } from '../game/dialogue';
import type { NpcDef } from '../game/monsters';
import type { QuestDef } from '../game/quests';
import type { GameState } from '../game/state';
import { toLocalRect } from '../app/orientation';
import { chooseTopic, dialogueView } from './dialogue-model';
import { el } from './dom';
import { PX } from './pixel-text';

export interface DialogueHooks {
  /** The villager says something: play the talk clip. */
  onSpeak(): void;
  /** The window's page rectangle (CSS pixels), after layout and whenever it moves. */
  onWindow(rect: DOMRect): void;
  /** A line for the status bar: a quest taken, a reward paid. */
  notice(text: string): void;
  onClose(): void;
}

export interface Dialogue {
  open(npc: NpcDef, def: DialogueDef): void;
  close(): void;
  isOpen(): boolean;
  /** The villager spoken with, or null. */
  current(): string | null;
  /** Ask about a topic by id, as a tap would; false when closed or unknown. */
  choose(id: string): boolean;
  /** The words shown, for tests. */
  text(): string;
  dispose(): void;
}

interface Open {
  npc: NpcDef;
  def: DialogueDef;
  root: HTMLElement;
  wood: HTMLElement;
  frame: HTMLElement;
  window: HTMLElement;
  text: HTMLElement;
  topics: HTMLElement;
  observer: ResizeObserver | null;
}

export function createDialogue(
  uiLayer: HTMLElement,
  state: GameState,
  quests: Readonly<Record<string, QuestDef>>,
  hooks: DialogueHooks,
): Dialogue {
  let open_: Open | null = null;

  const measure = (): void => {
    if (!open_) return;
    // The well 96 CSS pixels square (talk-world critic, round 14: it had grown to 97) on the
    // grid the canvas and the UI share: the canvas's pixels are one CSS pixel, the UI's one
    // and a half, so the hole snaps to three (round 15: on the UI's grid alone the bust's
    // last row doubled and the foot's bevel thinned to a device pixel). The frame moves with
    // the hole, so its bevel rings it evenly.
    open_.frame.style.translate = '';
    const raw = open_.window.getBoundingClientRect();
    const snap = (v: number): number => Math.round(v / (2 * PX)) * 2 * PX;
    const hole = new DOMRect(snap(raw.x), snap(raw.y), 96, 96);
    // The mask is cut in the planks' own pixels, which the rotated phone layout turns.
    const woodRect = open_.wood.getBoundingClientRect();
    const local = toLocalRect(hole, woodRect);
    const at = toLocalRect(new DOMRect(raw.x, raw.y, 96, 96), woodRect);
    open_.frame.style.translate = `${local.x - at.x}px ${local.y - at.y}px`;
    open_.wood.style.setProperty('--hole-x', `${local.x}px`);
    open_.wood.style.setProperty('--hole-y', `${local.y}px`);
    open_.wood.style.setProperty('--hole-w', `${local.w}px`);
    open_.wood.style.setProperty('--hole-h', `${local.h}px`);
    hooks.onWindow(hole);
  };

  function unmount(notify: boolean): void {
    if (!open_) return;
    open_.observer?.disconnect();
    window.removeEventListener('resize', measure);
    open_.root.remove();
    open_ = null;
    if (notify) hooks.onClose();
  }

  function say(words: string): void {
    if (!open_) return;
    open_.text.textContent = words;
    open_.text.scrollTop = 0;
    hooks.onSpeak();
  }

  function choose(id: string): boolean {
    if (!open_) return false;
    const outcome = chooseTopic(state, open_.def, quests, id);
    if (!outcome) return false;
    say(outcome.text);
    for (const line of outcome.notices) hooks.notice(line);
    for (const b of open_.topics.children)
      b.classList.toggle('said', (b as HTMLElement).dataset['topic'] === id);
    return true;
  }

  function open(npc: NpcDef, def: DialogueDef): void {
    unmount(false);
    const view = dialogueView(state, npc, def, quests);
    const root = el('div', 'dlg');
    const wood = el('div', 'dlg-wood');
    const frame = el('div', 'dlg-frame');
    frame.dataset['paint'] = 'frame';
    const window_ = el('div', 'dlg-window');
    window_.dataset['paint'] = 'speckle';
    frame.appendChild(window_);
    const plate = el('div', 'dlg-plate');
    // "Greta the Goodwife", as MM6 named its people, in one line under the window.
    plate.append(el('h2', 'dlg-name', view.name), el('span', 'dlg-role', `the ${view.role}`));
    const side = el('div', 'dlg-side');
    const text = el('div', 'dlg-text');
    const topics = el('div', 'dlg-topics');
    for (const t of view.topics) {
      const b = el('button', 'dlg-topic', t.label);
      b.type = 'button';
      b.dataset['topic'] = t.id;
      b.addEventListener('click', (e) => {
        e.preventDefault();
        choose(t.id);
      });
      topics.appendChild(b);
    }
    // Farewell ends the list as a line of it (critics, round 8: MM6 had no gold pill).
    const foot = el('div', 'dlg-foot');
    const bye = el('button', 'dlg-bye', 'Farewell');
    bye.type = 'button';
    bye.addEventListener('click', (e) => {
      e.preventDefault();
      unmount(true);
    });
    foot.appendChild(bye);
    side.append(text, topics, foot);
    wood.append(frame, plate, side);
    root.appendChild(wood);
    uiLayer.appendChild(root);
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    observer?.observe(wood);
    window.addEventListener('resize', measure);
    open_ = { npc, def, root, wood, frame, window: window_, text, topics, observer };
    measure();
    requestAnimationFrame(measure);
    say(view.greeting);
  }

  return {
    open,
    close: () => unmount(true),
    isOpen: () => open_ !== null,
    current: () => open_?.npc.id ?? null,
    choose,
    text: () => open_?.text.textContent ?? '',
    dispose: () => unmount(false),
  };
}
