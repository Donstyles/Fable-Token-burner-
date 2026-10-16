/**
 * The character sheet screen (Phase 5 step 10): the four members as tabs; identity, hit and
 * spell points, statistics with bonuses, the derived combat numbers, the condition and the
 * learnt skills with their ranks and a raise button that spends skill points.
 */
import type { SkillId } from '../game/skills';
import type { ScreenContext } from './context';
import { bar, button, el, heading, kv, memberTabs, note } from './dom';
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
  col.appendChild(bar(v.hp, v.maxHp, 'hp'));
  if (v.hasSp) {
    col.appendChild(kv('Spell points', `${v.sp} / ${v.maxSp}`));
    col.appendChild(bar(v.sp, v.maxSp, 'sp'));
  }
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
  col.appendChild(heading('Combat'));
  col.appendChild(kv('Armour class', v.armorClass));
  col.appendChild(kv('Attack', `${signed(v.attack)}  ${v.damage}`));
  if (v.rangedAttack !== null) {
    col.appendChild(kv('Shoot', `${signed(v.rangedAttack)}  ${v.rangedDamage ?? ''}`));
  }
  col.appendChild(kv('Recovery', v.recovery));
  return col;
}

function statsColumn(v: SheetView): HTMLElement {
  const col = el('div', 'ui-col narrow');
  col.appendChild(heading('Statistics'));
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
  return col;
}

function skillsColumn(v: SheetView, onRaise: (id: SkillId) => void): HTMLElement {
  const col = el('div', 'ui-col');
  col.appendChild(heading('Skills'));
  col.appendChild(kv('Skill points', v.skillPoints, 'sheet-points'));
  for (const group of v.skills) {
    col.appendChild(el('div', 'sheet-group', group.label));
    for (const row of group.rows) {
      const line = el('div', 'ui-row');
      const name = el('div', 'grow');
      name.append(el('div', '', row.name), el('div', 'sub', row.rankLabel));
      const level = el('div', 'ui-v sheet-level', String(row.level));
      const plus = button('+', () => onRaise(row.id), {
        className: 'sheet-raise',
        disabled: !row.canRaise,
        note: `${row.cost} pt`,
      });
      line.append(name, level, plus);
      col.appendChild(line);
    }
  }
  if (v.skills.length === 0) col.appendChild(note('No skills learnt.'));
  return col;
}

export function renderSheet(ctx: ScreenContext): void {
  const { state, frame } = ctx;
  let active = state.selected;
  const draw = (): void => {
    frame.tabs.replaceChildren(
      memberTabs(state.party, active, (i) => {
        active = i;
        frame.message('');
        draw();
      }),
    );
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
