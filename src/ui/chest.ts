/**
 * A chest's window (DESIGN.md 17.12): what is in it on the leather in the view, as MM6's
 * chest screen laid its items out, and its board over the panel with the gold in it. A tap
 * on an item puts it in the chosen member's pack, or anyone's with room; the gold goes to
 * the party at a tap. What is left stays in the chest.
 */
import { addItem, removeItem } from '../game/inventory';
import { itemDef } from '../game/items';
import type { ChestState } from '../game/state';
import type { ScreenContext } from './context';
import { button, el } from './dom';
import { bagGrid } from './inventory';
import { gridBlocks } from './inventory-model';

export interface ChestWindow {
  /** The chest's name in its level, for the runtime to close its lid. */
  name: string;
  /** What the board calls it. */
  title: string;
  state: ChestState;
}

export function renderChest(ctx: ScreenContext, chest: ChestWindow): void {
  const { frame, state } = ctx;
  // A house's board over the panel, and its listing on the slate: that is where taps land.
  frame.root.classList.add('screen-house', 'listing');
  frame.setTitle(chest.title);
  // The chosen member first, then anyone with room.
  const give = (index: number): string | null => {
    const placed = chest.state.grid.items[index];
    if (!placed) return null;
    const order = [...state.party.keys()].sort((a, b) =>
      a === state.selected ? -1 : b === state.selected ? 1 : a - b,
    );
    for (const i of order) {
      const c = state.party[i]!;
      if (addItem(c.grid, placed.item)) {
        removeItem(chest.state.grid, index);
        return c.name;
      }
    }
    return null;
  };
  const draw = (): void => {
    const board = el('div', 'house-board');
    board.appendChild(el('div', 'house-name', chest.title));
    const menu = el('div', 'house-choices');
    if (chest.state.gold > 0) {
      const b = el('button', 'house-choice', `Take ${chest.state.gold} gold`);
      b.type = 'button';
      b.addEventListener('click', (e) => {
        e.preventDefault();
        state.gold += chest.state.gold;
        frame.message(`${chest.state.gold} gold`);
        chest.state.gold = 0;
        draw();
      });
      menu.appendChild(b);
    }
    const foot = el('div', 'house-foot');
    const exit = button('', () => ctx.close(), { className: 'house-exit' });
    exit.dataset['glyph'] = 'exit';
    exit.title = 'Close';
    exit.setAttribute('aria-label', 'Close');
    foot.appendChild(exit);
    board.append(menu, foot);
    ctx.cover?.replaceChildren(board);
    const col = el('div', 'ui-col house-pack');
    const head = el('div', 'house-list-head');
    head.append(
      el('span', 'ui-h', chest.state.grid.items.length ? 'In the chest' : 'Empty'),
      el('span', 'ui-v', `Gold ${state.gold}`),
    );
    col.appendChild(head);
    const row = el('div', 'house-pack-row');
    row.appendChild(
      bagGrid(chest.state, null, (x, y) => {
        const blocks = gridBlocks(chest.state, null);
        const b = blocks.find((k) => x >= k.x && x < k.x + k.w && y >= k.y && y < k.y + k.h);
        if (!b) return;
        const who = give(b.index);
        frame.message(
          who ? `${who} takes the ${b.name}` : `Nobody has room for the ${itemDef(b.item).name}`,
        );
        draw();
      }),
    );
    col.appendChild(row);
    frame.body.replaceChildren(col);
  };
  draw();
}
