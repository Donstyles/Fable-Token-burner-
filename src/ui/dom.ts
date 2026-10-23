/**
 * Small DOM helpers for the screens (Phase 5 step 10): elements, buttons, tab rows and the
 * modal frame in the house style. Rendering stays thin; what a screen shows and what a tap
 * does to the state come from the pure `*-model.ts` modules next to each screen.
 */
import type { Character } from '../game/character';
import { isConscious } from '../game/character';
import { scrollMarks } from './dialogue-model';

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export interface ButtonOptions {
  className?: string;
  disabled?: boolean;
  /** Shown under the label in a smaller face (a price, a cost, a reason). */
  note?: string;
}

export function button(
  label: string,
  onTap: () => void,
  options: ButtonOptions = {},
): HTMLButtonElement {
  const b = el('button', `ui-btn ${options.className ?? ''}`.trim());
  b.type = 'button';
  b.appendChild(el('span', 'ui-btn-label', label));
  if (options.note !== undefined) b.appendChild(el('span', 'ui-btn-note', options.note));
  if (options.disabled) b.disabled = true;
  b.addEventListener('click', (e) => {
    e.preventDefault();
    onTap();
  });
  return b;
}

export interface Tab<T extends string | number> {
  id: T;
  label: string;
  note?: string;
  className?: string;
}

export function tabRow<T extends string | number>(
  items: readonly Tab<T>[],
  active: T,
  onPick: (id: T) => void,
): HTMLElement {
  const row = el('div', 'ui-tabs');
  for (const t of items) {
    const opts: ButtonOptions = { className: `ui-tab ${t.className ?? ''}`.trim() };
    if (t.note !== undefined) opts.note = t.note;
    const b = button(t.label, () => onPick(t.id), opts);
    if (t.id === active) b.classList.add('active');
    row.appendChild(b);
  }
  return row;
}

/** One tab per party member; fallen members are marked. */
export function memberTabs(
  party: readonly Character[],
  active: number,
  onPick: (index: number) => void,
): HTMLElement {
  return tabRow(
    party.map((c, i) => ({
      id: i,
      label: c.name,
      className: isConscious(c) ? '' : 'down',
    })),
    active,
    onPick,
  );
}

/** A label and a value; values are set in the monospace face. */
export function kv(label: string, value: string | number, className = ''): HTMLElement {
  const row = el('div', `ui-kv ${className}`.trim());
  row.append(el('span', 'ui-k', label), el('span', 'ui-v', String(value)));
  return row;
}

/** A horizontal bar showing `value` of `max`. */
export function bar(value: number, max: number, className: string): HTMLElement {
  const track = el('div', `ui-bar ${className}`.trim());
  track.dataset['paint'] = 'slot';
  const fill = el('div', 'ui-fill');
  fill.dataset['paint'] = className.includes('sp') ? 'bar-sp' : 'bar-hp';
  const pct = max > 0 ? Math.max(0, Math.min(100, (100 * value) / max)) : 0;
  fill.style.width = `${pct}%`;
  track.appendChild(fill);
  return track;
}

export function heading(text: string): HTMLElement {
  return el('h2', 'ui-h', text);
}

export function note(text: string, className = ''): HTMLElement {
  return el('p', `ui-note ${className}`.trim(), text);
}

/**
 * The modal frame, one layout for every screen (owner, 2026-10-23: "Formatting is off
 * everywhere"): the title at the head's left with the screen's own line beside it (`aside`:
 * the spellbook's rank and points, a shop's members); at the foot the message line at the
 * left, the screen's buttons (`bar`: an item's actions) and the close oval at the bottom
 * right, where MM6 put its Exit. The books carry the message in the head, their foot being
 * the painted page edges (screens.ts).
 */
export interface Frame {
  root: HTMLElement;
  aside: HTMLElement;
  bar: HTMLElement;
  body: HTMLElement;
  setTitle(title: string): void;
  message(text: string): void;
}

export function createFrame(title: string, onClose: () => void): Frame {
  const root = el('div', 'ui-modal');
  const panel = el('div', 'ui-panel');
  panel.dataset['paint'] = 'marble-frame';
  const head = el('div', 'ui-head');
  const titleNode = el('h1', 'ui-title', title);
  const aside = el('div', 'ui-aside');
  const say = el('div', 'ui-say');
  say.setAttribute('role', 'status');
  head.append(titleNode, aside);
  const body = el('div', 'ui-body');
  const foot = el('div', 'ui-foot');
  const bar = el('div', 'ui-buttons');
  // MM6 closed its screens with a glyph, not a word: a cross in dark ink on the gold oval,
  // painted on the button's face in whole pixels (paint.ts `drawCross`).
  const close = button('', onClose, { className: 'ui-close' });
  close.setAttribute('aria-label', 'Close');
  close.title = 'Close';
  foot.append(say, bar, close);
  panel.append(head, body, foot);
  root.appendChild(panel);
  return {
    root,
    aside,
    bar,
    body,
    setTitle(t) {
      titleNode.textContent = t;
    },
    message(text) {
      say.textContent = text;
      say.classList.toggle('shown', text.length > 0);
    },
  };
}

/**
 * MM6's scroll marks on every list a screen scrolls (`.scroll`, the talk panel's gold arrows,
 * dialogue.ts): one at the list's top right while there is more above, one at its foot while
 * there is more below. They stand in the body over the list, take no taps, and follow the
 * lists as screens redraw them, their words are painted or the frame changes size. Returns
 * the call that stops them.
 */
export function watchScrolls(body: HTMLElement): () => void {
  const marks = new Map<HTMLElement, { up: HTMLElement; down: HTMLElement }>();
  let pending = 0;
  const mark = (dir: 'up' | 'down'): HTMLElement => {
    const m = el('div', `ui-more ${dir}`);
    m.dataset['paint'] = `arrow-${dir}`;
    m.setAttribute('aria-hidden', 'true');
    return m;
  };
  const update = (): void => {
    pending = 0;
    const lists = new Set(body.querySelectorAll<HTMLElement>('.scroll'));
    for (const [list, m] of marks) {
      if (lists.has(list) && list.isConnected) continue;
      m.up.remove();
      m.down.remove();
      marks.delete(list);
    }
    const b = body.getBoundingClientRect();
    for (const list of lists) {
      let m = marks.get(list);
      if (!m) {
        m = { up: mark('up'), down: mark('down') };
        marks.set(list, m);
      }
      if (m.up.parentElement !== body) body.append(m.up, m.down);
      const r = list.getBoundingClientRect();
      const s = scrollMarks(list.scrollTop, list.clientHeight, list.scrollHeight);
      const left = `${Math.round(r.right - b.left) - 15}px`;
      m.up.style.left = left;
      m.down.style.left = left;
      m.up.style.top = `${Math.round(r.top - b.top) + 6}px`;
      m.down.style.top = `${Math.round(r.bottom - b.top) - 12}px`;
      m.up.classList.toggle('shown', s.up);
      m.down.classList.toggle('shown', s.down);
    }
  };
  const schedule = (): void => {
    if (!pending) pending = requestAnimationFrame(update);
  };
  const changes = new MutationObserver((records) => {
    // The marks' own coming and going is not a change of the lists.
    const own = (n: Node): boolean => n instanceof HTMLElement && n.classList.contains('ui-more');
    if (records.some((r) => ![...r.addedNodes, ...r.removedNodes].every(own))) schedule();
  });
  changes.observe(body, { childList: true, subtree: true });
  const sizes = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null;
  sizes?.observe(body);
  body.addEventListener('scroll', schedule, { capture: true, passive: true });
  schedule();
  return () => {
    changes.disconnect();
    sizes?.disconnect();
    body.removeEventListener('scroll', schedule, { capture: true });
    if (pending) cancelAnimationFrame(pending);
    for (const m of marks.values()) {
      m.up.remove();
      m.down.remove();
    }
    marks.clear();
  };
}
