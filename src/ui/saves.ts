/**
 * The Save and Load screens (DESIGN.md 17.14): MM6's game menu opened a list of saves; ours
 * lists the ten slots on the slate, each with where the party stood, the game's date and
 * hour and who was in it, the board over the panel saying which of the two it is. Saving taps
 * a slot and copies the game into it; loading taps a written slot and the game goes on from
 * that copy. The load list opens with the autosave, the game as it last stood.
 */
import { formatDate, formatTime } from '../game/time';
import type { SaveSummary } from '../game/save';
import type { SlotRecord } from '../app/saves';
import type { ScreenContext, SaveHooks } from './context';
import { button, el } from './dom';
import { SLOTS } from '../app/saves';

export type SavesMode = 'save' | 'load';

/** One line for a save: where, when on the game clock, and who. */
export function summaryLine(summary: SaveSummary, placeName: (level: string) => string): string {
  const who = summary.party.map((p) => `${p.name} ${p.level}`).join(', ');
  return `${placeName(summary.level)}, ${formatDate(summary.minutes)} ${formatTime(summary.minutes)}: ${who}`;
}

export function renderSaves(ctx: ScreenContext, mode: SavesMode, hooks: SaveHooks): void {
  const { frame, state } = ctx;
  // A house's board over the panel and its listing on the slate, where taps land.
  frame.root.classList.add('screen-house', 'listing', 'screen-saves');
  const title = mode === 'save' ? 'Save Game' : 'Load Game';
  frame.setTitle(title);
  let records = new Map<string, SlotRecord>();
  const board = (): void => {
    const b = el('div', 'house-board');
    b.appendChild(el('div', 'house-name', title));
    const menu = el('div', 'house-choices');
    menu.appendChild(
      el(
        'div',
        'house-choice dim',
        mode === 'save' ? 'Tap a slot to save there' : 'Tap a save to go on from it',
      ),
    );
    const foot = el('div', 'house-foot');
    const exit = button('', () => ctx.close(), { className: 'house-exit' });
    exit.dataset['glyph'] = 'exit';
    exit.title = 'Back';
    exit.setAttribute('aria-label', 'Back');
    foot.appendChild(exit);
    b.append(menu, foot);
    ctx.cover?.replaceChildren(b);
  };
  const row = (name: string, note: string, go: (() => void) | null): HTMLElement => {
    const line = el('button', 'house-row save-slot');
    line.type = 'button';
    if (!go) line.classList.add('dim');
    line.append(el('span', 'house-row-name', name), el('span', 'house-row-note', note));
    line.addEventListener('click', (e) => {
      e.preventDefault();
      go?.();
    });
    return line;
  };
  const draw = (): void => {
    const col = el('div', 'ui-col scroll house-list saves-list');
    const head = el('div', 'house-list-head');
    head.append(el('span', 'ui-h', title), el('span', 'ui-v', `Gold ${state.gold}`));
    col.appendChild(head);
    if (mode === 'load') {
      const auto = hooks.autosave();
      col.appendChild(
        row(
          'Autosave',
          auto ? summaryLine(auto, hooks.placeName) : 'Nothing saved yet',
          auto ? () => hooks.load('auto') : null,
        ),
      );
    }
    SLOTS.forEach((slot, i) => {
      const rec = records.get(slot);
      const note = rec ? summaryLine(rec.summary, hooks.placeName) : 'Empty';
      const go =
        mode === 'save'
          ? async (): Promise<void> => {
              hooks.stamp();
              try {
                const written = await hooks.store.write(slot, state);
                records.set(slot, written);
                frame.message(`Saved in slot ${i + 1}`);
              } catch (e) {
                frame.message(`The game could not be saved: ${e instanceof Error ? e.message : e}`);
              }
              draw();
            }
          : rec
            ? () => hooks.load(slot)
            : null;
      col.appendChild(row(`Slot ${i + 1}`, note, go));
    });
    frame.body.replaceChildren(col);
  };
  board();
  draw();
  void hooks.store.list().then((list) => {
    records = new Map(list.map((r) => [r.slot, r]));
    draw();
  });
}
