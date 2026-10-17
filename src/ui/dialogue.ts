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
import { button, el } from './dom';

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
    const hole = open_.window.getBoundingClientRect();
    // The mask is cut in the planks' own pixels, which the rotated phone layout turns.
    const local = toLocalRect(hole, open_.wood.getBoundingClientRect());
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
    frame.appendChild(window_);
    const plate = el('div', 'dlg-plate');
    plate.dataset['paint'] = 'plate';
    plate.append(el('h2', 'dlg-name', view.name), el('div', 'dlg-role', view.role));
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
    const foot = el('div', 'dlg-foot');
    foot.appendChild(button('Farewell', () => unmount(true)));
    side.append(text, topics, foot);
    wood.append(frame, plate, side);
    root.appendChild(wood);
    uiLayer.appendChild(root);
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    observer?.observe(wood);
    window.addEventListener('resize', measure);
    open_ = { npc, def, root, wood, window: window_, text, topics, observer };
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
