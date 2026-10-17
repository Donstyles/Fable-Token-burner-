/**
 * The character sheet screen (Phase 5 step 10): the four members as tabs; identity, hit and
 * spell points, statistics with bonuses, the derived combat numbers, the condition and the
 * learnt skills with their ranks and a raise button that spends skill points.
 */
import type { SkillId } from '../game/skills';
import type { ScreenContext } from './context';
import { el, kv, note } from './dom';
import { raise, raiseMessage, type SheetView, sheetView, signed } from './sheet-model';

function identityColumn(v: SheetView): HTMLElement {
  const col = el('div', 'ui-col narrow');
  const head = el('div', 'sheet-head');
  head.append(
    el('div', 'sheet-name', v.name),
    el('div', 'sheet-class', `${v.className} · ${v.sex} · ${v.age} years`),
  );
  col.appendChild(head);
  col.appendChild(kv('Hit points', `${v.hp} / ${v.maxHp}`));
  if (v.hasSp) col.appendChild(kv('Spell points', `${v.sp} / ${v.maxSp}`));
  col.appendChild(kv('Level', v.level));
  col.appendChild(kv('Experience', `${v.xp} / ${v.xpNext}`));
  col.appendChild(
    v.canTrain
      ? note('Ready for training.', 'good')
      : note(`${v.xpToNext} experience to the next level.`),
  );
  const condition = kv('Condition', v.condition, v.condition === 'Good' ? 'good' : 'bad');
  col.appendChild(condition);
  if (v.afflictions.length > 1) col.appendChild(note(v.afflictions.join(', '), 'bad'));
  return col;
}

/** The fighting numbers, under the statistics as MM6's sheet set them. */
function combatBlock(v: SheetView, col: HTMLElement): void {
  col.appendChild(kv('Armour class', v.armorClass));
  col.appendChild(kv('Attack', `${signed(v.attack)}  ${v.damage}`));
  if (v.rangedAttack !== null) {
    col.appendChild(kv('Shoot', `${signed(v.rangedAttack)}  ${v.rangedDamage ?? ''}`));
  }
  col.appendChild(kv('Recovery', v.recovery));
}

function statsColumn(v: SheetView): HTMLElement {
  const col = el('div', 'ui-col narrow');
  const table = el('div', 'sheet-stats');
  for (const row of v.stats) {
    const label = el('span', 'ui-k', row.label);
    const value = el('span', 'ui-v', String(row.current));
    if (row.current !== row.base) {
      value.classList.add('bad');
      value.textContent = `${row.current} (${row.base})`;
    }
    const bonus = el('span', 'ui-v sheet-bonus', signed(row.bonus));
    table.append(label, value, bonus);
  }
  col.appendChild(table);
  combatBlock(v, col);
  return col;
}

function skillsColumn(v: SheetView, onRaise: (id: SkillId) => void): HTMLElement {
  const col = el('div', 'ui-col');
  col.appendChild(kv('Skill points', v.skillPoints, 'sheet-points'));
  for (const group of v.skills) {
    col.appendChild(el('div', 'sheet-group', group.label));
    for (const row of group.rows) {
      // Plain rows, as MM6's skill lists (critics, rounds 7 and 8): no box round each
      // skill and no "+" oval; the row itself is the button.
      const line = el('button', 'ui-row plain sheet-skill');
      line.type = 'button';
      line.disabled = !row.canRaise;
      line.addEventListener('click', (e) => {
        e.preventDefault();
        onRaise(row.id);
      });
      const name = el('div', 'grow');
      name.append(el('div', '', row.name), el('div', 'sub', `${row.rankLabel} · ${row.cost} pt`));
      const level = el('div', 'ui-v sheet-level', String(row.level));
      line.append(name, level);
      col.appendChild(line);
    }
  }
  if (v.skills.length === 0) col.appendChild(note('No skills learnt.'));
  return col;
}

export function renderSheet(ctx: ScreenContext): void {
  const { state, frame } = ctx;
  // The member is picked by their portrait in the band (DESIGN.md 16.15), not a tab strip.
  const active = state.selected;
  const draw = (): void => {
    const c = state.party[active];
    if (!c) return;
    const v = sheetView(c);
    frame.body.replaceChildren(
      identityColumn(v),
      statsColumn(v),
      skillsColumn(v, (id) => {
        frame.message(raiseMessage(raise(c, id), id));
        draw();
      }),
    );
  };
  draw();
}
