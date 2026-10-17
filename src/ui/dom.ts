/**
 * Small DOM helpers for the screens (Phase 5 step 10): elements, buttons, tab rows and the
 * modal frame in the house style. Rendering stays thin; what a screen shows and what a tap
 * does to the state come from the pure `*-model.ts` modules next to each screen.
 */
import type { Character } from '../game/character';
import { isConscious } from '../game/character';

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

/** The modal frame: a title, a slot for tabs, the close button, the body and a message line. */
export interface Frame {
  root: HTMLElement;
  tabs: HTMLElement;
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
  const tabs = el('div', 'ui-head-tabs');
  // MM6 closed its screens with a glyph, not a word: a cross in dark ink on the gold oval.
  const close = button('', onClose, { className: 'ui-close' });
  close.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  close.setAttribute('aria-label', 'Close');
  close.title = 'Close';
  head.append(titleNode, tabs, close);
  const body = el('div', 'ui-body');
  const foot = el('div', 'ui-foot');
  panel.append(head, body, foot);
  root.appendChild(panel);
  return {
    root,
    tabs,
    body,
    setTitle(t) {
      titleNode.textContent = t;
    },
    message(text) {
      foot.textContent = text;
      foot.classList.toggle('shown', text.length > 0);
    },
  };
}
