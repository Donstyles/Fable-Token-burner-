/**
 * Talk (DESIGN.md 16.7, 16.34; reference mm6-tavern-talk), as MM6 laid it out: over the
 * right-hand panel a wooden board with the villager's calling at its head, a window the runtime
 * draws their living face through, their name in MM6's blue, the topics to ask about and the
 * gold oval with the door to leave by; their words in a box along the foot of the view. Plain
 * DOM in the house style; what is said and done comes from `dialogue-model.ts`. The runtime
 * says where the window is (for the bust), mouths the words and pauses the world meanwhile.
 */
import './dialogue.css';
import type { DialogueDef } from '../game/dialogue';
import type { NpcDef } from '../game/monsters';
import type { QuestDef } from '../game/quests';
import type { GameState } from '../game/state';
import { toLocalRect } from '../app/orientation';
import { chooseTopic, dialogueView, nextPage, scrollMarks, wholeLines } from './dialogue-model';
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
  /** The panel's cover (panel.ts) the board stands in; without it the board joins the words. */
  cover?: HTMLElement;
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
  /** The words' place in the side, as tall as whole lines of them that fit. */
  said: HTMLElement;
  text: HTMLElement;
  /** The line itself, inside the scrolling box. */
  words: HTMLElement;
  /** A snap point at each line's head (no text, so `text()` reads the words alone). */
  snaps: HTMLElement;
  /** The gold marks at the words' corners: more above, more below. */
  up: HTMLElement;
  down: HTMLElement;
  topics: HTMLElement;
  observer: ResizeObserver | null;
}

/** The most lines the words' box shows before it scrolls, as MM6's box along the view's foot. */
const MAX_LINES = 5;

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
    // grid the canvas and the UI share, one CSS pixel (round 15: off it the bust's last row
    // doubled and the foot's bevel thinned to a device pixel). The frame moves with the hole,
    // so its bevel rings it evenly.
    open_.frame.style.translate = '';
    const raw = open_.window.getBoundingClientRect();
    const snap = (v: number): number => Math.round(v / PX) * PX;
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
    open_.wood.remove();
    open_ = null;
    if (notify) hooks.onClose();
  }

  /**
   * The words' box as tall as whole lines of them, up to MM6's five, so no line is cut through
   * at its foot; a longer speech scrolls in it.
   */
  const fit = (): void => {
    if (!open_) return;
    const { said, text } = open_;
    const line = parseFloat(getComputedStyle(text).lineHeight) || 17;
    const cs = getComputedStyle(said);
    const pad = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
    said.style.maxHeight = '';
    const room = line * MAX_LINES + pad;
    said.style.maxHeight = `${wholeLines(room, line, pad, MAX_LINES)}px`;
  };

  /** The gold marks at the words' corners, after the words or their scroll change. */
  const mark = (): void => {
    if (!open_) return;
    const t = open_.text;
    const m = scrollMarks(t.scrollTop, t.clientHeight, t.scrollHeight);
    open_.up.classList.toggle('shown', m.up);
    open_.down.classList.toggle('shown', m.down);
    // A snap point at the head of every line, so a swipe comes to rest on whole lines.
    const line = parseFloat(getComputedStyle(t).lineHeight) || 22;
    const lines = Math.max(0, Math.floor(open_.words.offsetHeight / line));
    if (open_.snaps.childElementCount !== lines) {
      open_.snaps.replaceChildren(
        ...Array.from({ length: lines }, (_, i) => {
          const snap = el('div', 'dlg-snap');
          snap.style.top = `${i * line}px`;
          return snap;
        }),
      );
    }
  };

  function say(words: string): void {
    if (!open_) return;
    // Each line is read from its start: the box back at the top before and after the words
    // are painted (pixel-text.ts paints them a moment later, a pixel taller or shorter).
    open_.text.scrollTop = 0;
    open_.words.textContent = words;
    fit();
    open_.text.scrollTop = 0;
    mark();
    const text = open_.text;
    requestAnimationFrame(() => {
      if (open_?.text !== text) return;
      text.scrollTop = 0;
      mark();
    });
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
    // The words in their box along the view's foot.
    const root = el('div', 'dlg');
    // The board over the panel: the calling at its head, the window, the name, the topics,
    // the way out.
    const wood = el('div', 'dlg-wood');
    const head = el('div', 'dlg-head', `The ${view.role}`);
    const frame = el('div', 'dlg-frame');
    frame.dataset['paint'] = 'frame';
    const window_ = el('div', 'dlg-window');
    window_.dataset['paint'] = 'speckle';
    frame.appendChild(window_);
    const plate = el('div', 'dlg-plate');
    // The name in MM6's blue under the window, as "Dirk the Innkeep" stood under his.
    plate.append(el('h2', 'dlg-name', view.name));
    // The words wrap in their box and scroll in it when a line is longer than the box holds
    // (owner, 2026-10-23: Old Tobin's thanks lost their end); a gold mark at the box's corner
    // says there is more, a swipe or a tap on the words reads on.
    const said = el('div', 'dlg-said');
    const text = el('div', 'dlg-text');
    const words = el('div', 'dlg-words');
    const snaps = el('div', 'dlg-snaps');
    text.append(words, snaps);
    const up = el('div', 'dlg-more up');
    up.dataset['paint'] = 'arrow-up';
    const down = el('div', 'dlg-more down');
    down.dataset['paint'] = 'arrow-down';
    said.append(text, up, down);
    text.addEventListener('scroll', () => mark(), { passive: true });
    text.addEventListener('click', () => {
      const line = parseFloat(getComputedStyle(text).lineHeight) || 17;
      const to = nextPage(text.scrollTop, text.clientHeight, text.scrollHeight, line);
      if (to !== text.scrollTop) text.scrollTop = to;
    });
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
    // MM6's way out: the gold oval with the door at the board's foot.
    const foot = el('div', 'dlg-foot');
    const bye = el('button', 'ui-btn dlg-bye');
    bye.type = 'button';
    bye.dataset['glyph'] = 'exit';
    bye.title = 'Farewell';
    bye.setAttribute('aria-label', 'Farewell');
    bye.addEventListener('click', (e) => {
      e.preventDefault();
      unmount(true);
    });
    foot.appendChild(bye);
    wood.append(head, frame, plate, topics, foot);
    root.appendChild(said);
    uiLayer.appendChild(root);
    (hooks.cover ?? root).appendChild(wood);
    const observer =
      typeof ResizeObserver === 'function'
        ? new ResizeObserver((entries) => {
            if (entries.some((e) => e.target === wood)) measure();
            // A new line, or the same one painted, may want more lines of the box or fewer.
            fit();
            mark();
          })
        : null;
    observer?.observe(wood);
    // The line changes size as it is painted, and the marks follow.
    observer?.observe(words);
    window.addEventListener('resize', measure);
    open_ = {
      npc,
      def,
      root,
      wood,
      frame,
      window: window_,
      said,
      text,
      words,
      snaps,
      up,
      down,
      topics,
      observer,
    };
    measure();
    fit();
    requestAnimationFrame(() => {
      measure();
      fit();
      mark();
    });
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
