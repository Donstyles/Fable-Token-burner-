/**
 * The inventory screen (Phase 5 step 10): the member's 14 × 9 grid as a CSS grid with items
 * as blocks spanning their footprint, the equipment slots as a list, the derived armour and
 * recovery, and the actions for the selection. Tap an item to select it, a free cell to move
 * it there, a slot to wear it; tap a worn item to take it off. Every rule is in the model.
 */
import type { Character } from '../game/character';
import type { EquipSlot } from '../game/inventory';
import type { ScreenContext } from './context';
import { button, el, heading, kv, memberTabs } from './dom';
import { itemGlyph } from './glyphs';
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
    if (b.selected) block.classList.add('selected');
    if (b.broken) block.classList.add('broken');
    block.style.gridArea = `${b.y + 1} / ${b.x + 1} / span ${b.h} / span ${b.w}`;
    block.append(itemGlyph(b.kind), el('span', 'inv-name', b.name));
    block.addEventListener('click', () => onTap(b.x, b.y));
    grid.appendChild(block);
  }
  return grid;
}

function slotList(c: Character, sel: InvSelection, onTap: (slot: EquipSlot) => void): HTMLElement {
  const list = el('div', 'ui-list');
  for (const row of slotRows(c, sel)) {
    const line = el('div', 'ui-row inv-slot');
    if (row.selected) line.classList.add('selected');
    if (!row.name) line.classList.add('dim');
    line.append(
      el('span', 'slot-name', row.label),
      row.kind ? itemGlyph(row.kind) : el('span', 'inv-glyph'),
      el('span', 'grow ui-v', row.name ?? '—'),
    );
    line.addEventListener('click', () => onTap(row.slot));
    list.appendChild(line);
  }
  return list;
}

export function renderInventory(ctx: ScreenContext): void {
  const { state, frame, hooks } = ctx;
  let active = state.selected;
  let sel: InvSelection = null;

  const apply = (r: TapOutcome): void => {
    sel = r.selection;
    frame.message(r.message ?? '');
    draw();
  };

  const actionBar = (c: Character): HTMLElement => {
    const row = el('div', 'ui-actions');
    for (const a of actions(c, sel)) {
      const opts = {
        className: 'primary',
        disabled: !a.enabled,
        ...(a.note ? { note: a.note } : {}),
      };
      row.appendChild(
        button(
          a.label,
          () => {
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
          },
          opts,
        ),
      );
    }
    if (sel?.kind === 'grid') {
      const give = el('div', 'inv-give');
      state.party.forEach((other, i) => {
        if (i === active) return;
        give.appendChild(
          button(other.name, () => apply(giveSelected(c, other, sel)), { note: 'give' }),
        );
      });
      row.appendChild(give);
    }
    return row;
  };

  const draw = (): void => {
    frame.tabs.replaceChildren(
      memberTabs(state.party, active, (i) => {
        active = i;
        sel = null;
        frame.message('');
        draw();
      }),
    );
    const c = state.party[active];
    if (!c) return;
    const side = el('div', 'ui-col inv-side');
    const d = derived(c);
    side.appendChild(heading('Equipment'));
    side.appendChild(slotList(c, sel, (slot) => apply(tapSlot(c, sel, slot))));
    side.appendChild(heading('In combat'));
    side.appendChild(kv('Armour class', d.armorClass));
    side.appendChild(kv('Attack / damage', `${d.attack >= 0 ? '+' : ''}${d.attack}  ${d.damage}`));
    side.appendChild(kv('Recovery', d.recovery));
    side.appendChild(actionBar(c));
    frame.body.replaceChildren(
      gridNode(c, sel, (x, y) => apply(tapCell(c, sel, x, y))),
      side,
    );
  };
  draw();
}
