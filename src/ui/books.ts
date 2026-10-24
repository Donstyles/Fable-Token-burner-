/**
 * MM6's books on the panel's shelf (DESIGN.md 16.34; reference mm6-quests): each an open book
 * filling the view (paint.ts `book`), a knotwork banner across the page's head with the book's
 * title, the page's words under it in the book's sans, the clasp at the page's foot to close it.
 * The quests book lists what is in hand (what is done goes to each member's awards, as MM6's);
 * the notes book what people told the party; the calendar the month, today marked, the moon's
 * quarters on their days and the hour under it. The map book is journal.ts's.
 */
import { DIALOGUES } from '../game/dialogue';
import { WEEKDAY_NAMES } from '../game/time';
import { calendarView, type MoonPhase, noteRows } from './books-model';
import type { ScreenContext } from './context';
import { el } from './dom';
import { questRows } from './journal-model';

/** The banner across the page's head with the book's title on it (paint.ts `banner`). */
export function bookBanner(ctx: ScreenContext, title: string): void {
  ctx.frame.root.classList.add('screen-book');
  ctx.frame.setTitle(title);
}

/** The quests in hand, each its title and what it asks now. */
export function renderQuests(ctx: ScreenContext): void {
  const { state, frame, hooks } = ctx;
  bookBanner(ctx, 'Current Quests');
  const rows = questRows(state.quests, hooks.questDefs ?? {}).active;
  const page = el('div', 'ui-col scroll book-page');
  if (!rows.length) page.appendChild(el('p', 'book-line dim', 'No quests yet.'));
  for (const q of rows) {
    const entry = el('div', 'book-entry');
    entry.appendChild(el('p', 'book-line book-title', q.title));
    if (q.objective) entry.appendChild(el('p', 'book-line quest-objective', q.objective));
    if (q.text) entry.appendChild(el('p', 'book-line sub', q.text));
    // A rule under each entry, as MM6's.
    entry.appendChild(el('div', 'book-rule'));
    page.appendChild(entry);
  }
  frame.body.replaceChildren(page);
}

/** What the party was told, a note each, as MM6's notes: the fact alone. */
export function renderNotes(ctx: ScreenContext): void {
  const { state, frame } = ctx;
  bookBanner(ctx, 'Auto Notes');
  const rows = noteRows(state, DIALOGUES);
  const page = el('div', 'ui-col scroll book-page');
  if (!rows.length) page.appendChild(el('p', 'book-line dim', 'No notes yet.'));
  for (const n of rows) {
    const entry = el('div', 'book-entry');
    entry.appendChild(el('p', 'book-line', n.text));
    entry.appendChild(el('div', 'book-rule'));
    page.appendChild(entry);
  }
  frame.body.replaceChildren(page);
}

/** The moon's face for a quarter, drawn on a pixel grid: dark, lit at the right, full, left. */
function moonGlyph(phase: MoonPhase): HTMLCanvasElement {
  const s = 11;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  c.className = 'book-moon';
  const g = c.getContext('2d')!;
  const r = s / 2 - 0.5;
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const dx = x + 0.5 - s / 2;
      const dy = y + 0.5 - s / 2;
      const d = Math.hypot(dx, dy);
      if (d > r) continue;
      const lit =
        phase === 'full' ? true : phase === 'new' ? false : phase === 'first' ? dx >= 0 : dx < 0;
      g.fillStyle = d > r - 1 ? '#3a2a10' : lit ? '#f4ecd0' : '#5a4a30';
      g.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

/** The month as MM6's calendar laid it out: four weeks of seven days, today marked. */
export function renderCalendar(ctx: ScreenContext): void {
  const { state, frame } = ctx;
  const v = calendarView(state.clock.minutes);
  bookBanner(ctx, v.title);
  const page = el('div', 'ui-col book-page calendar');
  const grid = el('div', 'calendar-grid');
  for (const name of WEEKDAY_NAMES) grid.appendChild(el('div', 'calendar-head', name.slice(0, 3)));
  for (const week of v.weeks) {
    for (const d of week) {
      const cell = el('div', `calendar-day${d.today ? ' today' : ''}`);
      cell.appendChild(el('span', 'calendar-number', String(d.day)));
      if (d.moon) cell.appendChild(moonGlyph(d.moon));
      grid.appendChild(cell);
    }
  }
  page.append(grid, el('p', 'book-line calendar-time', v.time));
  frame.body.replaceChildren(page);
}
