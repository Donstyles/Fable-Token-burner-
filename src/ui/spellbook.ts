/**
 * The spellbook screen (Phase 5 step 10): members as tabs, the member's schools as a column
 * of tabs, the known spells with level and cost, a target row for member spells and a cast
 * button that is disabled with its reason when the spell cannot be cast. A cast pays the
 * points and hands the effects to the runtime through `hooks.onCast`.
 */
import { type Character, maxSp } from '../game/character';
import type { MagicSchool } from '../game/skills';
import type { SpellId } from '../game/spells';
import type { ScreenContext } from './context';
import { button, el, heading, kv, memberTabs, note, tabRow } from './dom';
import { cast, castMessage, type SchoolTab, schoolTabs, spellRows } from './spellbook-model';

function schoolColumn(
  c: Character,
  tabs: SchoolTab[],
  school: MagicSchool | null,
  onPick: (s: MagicSchool) => void,
): HTMLElement {
  const col = el('div', 'ui-col narrow');
  const max = maxSp(c);
  col.appendChild(kv('Spell points', `${c.sp} / ${max}`));
  col.appendChild(heading('Schools'));
  if (tabs.length === 0) col.appendChild(note(`${c.name} knows no magic.`));
  for (const t of tabs) {
    const b = button(t.label, () => onPick(t.school), {
      className: 'ui-tab',
      note: `${t.rank} ${t.level} · ${t.count} spells`,
    });
    if (t.school === school) b.classList.add('active');
    col.appendChild(b);
  }
  return col;
}

export function renderSpellbook(ctx: ScreenContext): void {
  const { state, frame, hooks, rng } = ctx;
  let active = state.selected;
  let school: MagicSchool | null = null;
  let target = active;

  const onCast = (id: SpellId): void => {
    const r = cast(state, active, id, target, rng);
    if (r.ok) hooks.onCast?.(r.event);
    frame.message(r.ok ? castMessage(state, r.event) : r.message);
    draw();
  };

  const spellList = (c: Character, s: MagicSchool): HTMLElement => {
    const col = el('div', 'ui-col scroll');
    col.appendChild(heading('Spells'));
    const targets = el('div', 'spell-target');
    targets.appendChild(el('span', 'ui-k', 'Target'));
    targets.appendChild(
      tabRow(
        state.party.map((m, i) => ({ id: i, label: m.name })),
        target,
        (i) => {
          target = i;
          draw();
        },
      ),
    );
    col.appendChild(targets);
    for (const row of spellRows(c, s)) {
      const line = el('div', 'ui-row');
      const text = el('div', 'grow');
      text.append(
        el('div', '', row.name),
        el('div', 'sub', `Level ${row.level} · ${row.cost} SP · ${row.targetLabel}`),
      );
      const b = button('Cast', () => onCast(row.id), {
        className: 'primary',
        disabled: !row.canCast,
        note: row.reason ?? `${row.cost} SP`,
      });
      line.append(el('span', 'ui-v spell-level', `L${row.level}`), text, b);
      col.appendChild(line);
    }
    return col;
  };

  const draw = (): void => {
    frame.tabs.replaceChildren(
      memberTabs(state.party, active, (i) => {
        active = i;
        target = i;
        school = null;
        frame.message('');
        draw();
      }),
    );
    const c = state.party[active];
    if (!c) return;
    const tabs = schoolTabs(c);
    if (!tabs.some((t) => t.school === school)) school = tabs[0]?.school ?? null;
    const left = schoolColumn(c, tabs, school, (s) => {
      school = s;
      draw();
    });
    frame.body.replaceChildren(left, school ? spellList(c, school) : el('div', 'ui-col'));
  };

  draw();
}
