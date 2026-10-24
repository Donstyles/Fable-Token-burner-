/**
 * MM6's quick reference (DESIGN.md 16.34), the scroll among the panel's ovals: the whole party
 * on one slate, a column a member and a line a figure, so the four can be compared at a glance
 * without turning their pages.
 */
import type { ScreenContext } from './context';
import { el } from './dom';
import { sheetView, signed } from './sheet-model';

export function renderReference(ctx: ScreenContext): void {
  const { state, frame } = ctx;
  frame.setTitle('Quick Reference');
  const views = state.party.map((c) => sheetView(c));
  const rows: [string, (v: (typeof views)[number]) => string, string?][] = [
    ['Name', (v) => v.name, 'name'],
    ['Level', (v) => String(v.level)],
    ['Hit Points', (v) => `${v.hp} / ${v.maxHp}`],
    ['Spell Points', (v) => `${v.sp} / ${v.maxSp}`],
    ['Armor Class', (v) => String(v.armorClass)],
    ['Attack', (v) => signed(v.attack)],
    ['Damage', (v) => v.damageRange],
    ['Shoot', (v) => (v.rangedAttack === null ? 'N/A' : signed(v.rangedAttack))],
    ['Skill Points', (v) => String(v.skillPoints)],
    ['Condition', (v) => v.condition],
  ];
  const table = el('div', 'ui-col reference-table');
  table.style.gridTemplateColumns = `auto repeat(${views.length}, 1fr)`;
  for (const [label, value, cls] of rows) {
    table.appendChild(el('span', 'ui-k reference-label', label));
    for (const v of views) {
      const cell = el('span', `ui-v reference-cell ${cls ?? ''}`.trim(), value(v));
      if (label === 'Condition' && v.condition !== 'Good') cell.classList.add('bad');
      table.appendChild(cell);
    }
  }
  frame.body.replaceChildren(table);
}
