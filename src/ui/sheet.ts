/**
 * The character sheet screen (Phase 5 step 10): the member picked in the band, named in the
 * title with their calling; hit and spell points, armour, level and condition, statistics
 * with bonuses and the fighting numbers, and the learnt skills with their ranks, a tap on
 * one spending skill points to raise it.
 */
import type { SkillId } from '../game/skills';
import type { ScreenContext } from './context';
import { el, kv, note } from './dom';
import { raise, raiseMessage, type SheetView, sheetView, signed } from './sheet-model';

/**
 * The member's points, armour, recovery, level and condition (the name, the class, sex and
 * age head the screen), one line each as MM6's (owner, 2026-10-23: the sheet's last rows were
 * cut off inside the insets).
 */
function stateColumn(v: SheetView): HTMLElement {
  const col = el('div', 'ui-col sheet-state');
  col.appendChild(kv('Hit points', `${v.hp} / ${v.maxHp}`));
  if (v.hasSp) col.appendChild(kv('Spell points', `${v.sp} / ${v.maxSp}`));
  col.appendChild(kv('Armour class', v.armorClass));
  col.appendChild(kv('Recovery', v.recovery));
  col.appendChild(kv('Level', v.level));
  // Enough for the next level shows green, as MM6's experience did; the figure after the
  // stroke is the next level's.
  col.appendChild(kv('Experience', `${v.xp} / ${v.xpNext}`, v.canTrain ? 'good' : ''));
  col.appendChild(kv('Condition', v.condition, v.condition === 'Good' ? 'good' : 'bad'));
  if (v.canTrain) col.appendChild(note('Ready for training.', 'good'));
  if (v.afflictions.length > 1) col.appendChild(note(v.afflictions.join(', '), 'bad'));
  return col;
}

/** The seven statistics with their bonuses, then the fighting numbers, as MM6's sheet. */
function statsColumn(v: SheetView): HTMLElement {
  const col = el('div', 'ui-col sheet-stats-col');
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
  const fight = el('div', 'sheet-fight');
  fight.appendChild(kv('Attack', `${signed(v.attack)}  ${v.damage}`));
  if (v.rangedAttack !== null) {
    fight.appendChild(kv('Shoot', `${signed(v.rangedAttack)}  ${v.rangedDamage ?? ''}`));
  }
  col.appendChild(fight);
  return col;
}

function skillsColumn(v: SheetView, onRaise: (id: SkillId) => void): HTMLElement {
  // A long list scrolls in its box, the gold marks at its corners (dom.ts `watchScrolls`).
  const col = el('div', 'ui-col scroll sheet-skills');
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
      // One line a skill, as MM6's: the rank named only above Normal, the price to raise it
      // dim beside the level (screens critic, round 13: two lines a skill ran off the box).
      const name = el(
        'div',
        'grow',
        row.rankLabel === 'Normal' ? row.name : `${row.name} ${row.rankLabel}`,
      );
      const cost = el('div', 'sub sheet-cost', `${row.cost} pt`);
      const level = el('div', 'ui-v sheet-level', String(row.level));
      line.append(name, cost, level);
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
    // MM6 headed its sheet with the member's name and calling.
    frame.setTitle(`${v.name} the ${v.className}`);
    frame.aside.textContent = `${v.sex} · ${v.age} years`;
    frame.body.replaceChildren(
      stateColumn(v),
      statsColumn(v),
      skillsColumn(v, (id) => {
        frame.message(raiseMessage(raise(c, id), id));
        draw();
      }),
    );
  };
  draw();
}
