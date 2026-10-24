/**
 * The inventory page (Phase 5 step 10; DESIGN.md 16.34; reference mm6-inventory): the member's
 * 14 × 9 grid filling the view as MM6's, items as blocks spanning their footprint, its cells as
 * large as the box shows every row; beside it the item in hand with what can be done with it;
 * the worn slots over the panel with the member (character.ts `memberCover`), where MM6 stood
 * the figure. Tap an item to select it, a free cell to move it there, a slot to wear it; tap a
 * worn item to take it off. Every rule is in the model.
 */
import type { Character } from '../game/character';
import { memberCover, memberTabs } from './character';
import type { ScreenContext } from './context';
import { button, el } from './dom';
import { itemGlyph } from './glyphs';
import { bagCell } from './layout-model';
import {
  actions,
  derived,
  equipSelected,
  giveSelected,
  gridBlocks,
  type InvSelection,
  slotRows,
  type TapOutcome,
  tapCell,
  tapSlot,
  unequipSelected,
  useSelected,
} from './inventory-model';
import { signed } from './sheet-model';

/** The name of the item in hand, for the message line. */
function selectedName(c: Character | undefined, sel: InvSelection): string | null {
  if (!c || !sel) return null;
  if (sel.kind === 'slot') return slotRows(c, sel).find((r) => r.selected)?.name ?? null;
  return gridBlocks(c, sel).find((b) => b.selected)?.name ?? null;
}

function gridNode(
  c: Character,
  sel: InvSelection,
  onTap: (x: number, y: number) => void,
): HTMLElement {
  const grid = el('div', 'inv-grid');
  for (let y = 0; y < c.grid.height; y++) {
    for (let x = 0; x < c.grid.width; x++) {
      const cell = el('div', 'inv-cell');
      cell.style.gridArea = `${y + 1} / ${x + 1}`;
      cell.addEventListener('click', () => onTap(x, y));
      grid.appendChild(cell);
    }
  }
  for (const b of gridBlocks(c, sel)) {
    const block = el('div', 'inv-item');
    block.dataset['paint'] = 'tile';
    if (b.selected) block.classList.add('selected');
    if (b.broken) block.classList.add('broken');
    block.style.gridArea = `${b.y + 1} / ${b.x + 1} / span ${b.h} / span ${b.w}`;
    block.classList.add(`w${Math.min(b.w, 3)}`);
    block.appendChild(itemGlyph(b.kind));
    // One cell holds the glyph alone, as MM6's sprites stood alone; wider pieces carry a name.
    if (b.w >= 2) block.appendChild(el('span', 'inv-name', b.name));
    block.title = b.name;
    block.addEventListener('click', () => onTap(b.x, b.y));
    grid.appendChild(block);
  }
  return grid;
}

export function renderInventory(ctx: ScreenContext): void {
  const { state, frame, hooks } = ctx;
  const active = state.selected;
  let sel: InvSelection = null;

  const apply = (r: TapOutcome): void => {
    sel = r.selection;
    // A one-cell item shows its glyph alone: the line names what is in hand.
    frame.message(r.message ?? selectedName(state.party[active], sel) ?? '');
    draw();
  };

  // The selection's actions stand beside the grid under its name; a reason an action cannot be
  // taken is its button's title and the message line's when tapped.
  const actionBar = (c: Character): HTMLElement[] => {
    const out: HTMLElement[] = [];
    for (const a of actions(c, sel)) {
      const b = button(a.label, () => {
        if (!a.enabled) {
          frame.message(a.note ?? '');
          return;
        }
        if (a.id === 'equip') apply(equipSelected(c, sel));
        else if (a.id === 'unequip') apply(unequipSelected(c, sel));
        else {
          const r = useSelected(c, sel, { member: active, partySize: state.party.length });
          if (r.cast) {
            hooks.onCast?.({
              caster: active,
              spell: r.cast.spell,
              target: active,
              cost: 0,
              failed: false,
              effects: r.cast.effects,
              source: 'scroll',
            });
          }
          apply(r);
        }
      });
      if (!a.enabled) b.classList.add('off');
      if (a.note) b.title = a.note;
      out.push(b);
    }
    if (sel?.kind === 'grid') {
      state.party.forEach((other, i) => {
        if (i === active) return;
        out.push(button(`To ${other.name}`, () => apply(giveSelected(c, other, sel))));
      });
    }
    return out;
  };

  // The bag's cells as large as the box lets all nine rows show (layout-model.ts `bagCell`).
  const fit = (): void => {
    const c = state.party[active];
    const cs = getComputedStyle(frame.body);
    const h = frame.body.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    if (c && h > 0) frame.body.style.setProperty('--cell', `${bagCell(h, c.grid.height)}px`);
  };
  if (typeof ResizeObserver === 'function') new ResizeObserver(fit).observe(frame.body);

  const draw = (): void => {
    const c = state.party[active];
    if (!c) return;
    frame.setTitle(`Inventory of ${c.name}`);
    const d = derived(c);
    frame.aside.textContent = `AC ${d.armorClass} · ${signed(d.attack)} ${d.damage}`;
    // The item in hand, named, and what can be done with it.
    const side = el('div', 'ui-col inv-side');
    const held = selectedName(c, sel);
    side.append(el('div', 'inv-held', held ?? 'Tap an item to take it in hand.'));
    const acts = el('div', 'inv-actions');
    acts.append(...actionBar(c));
    side.appendChild(acts);
    frame.body.replaceChildren(
      gridNode(c, sel, (x, y) => apply(tapCell(c, sel, x, y))),
      side,
    );
    memberCover(ctx, c, sel, (slot) => apply(tapSlot(c, sel, slot)));
  };
  memberTabs(ctx, 'items');
  draw();
}
