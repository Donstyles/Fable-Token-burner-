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
import { button, el, heading, kv, note } from './dom';
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
  const active = state.selected;
  let school: MagicSchool | null = null;
  // A spell on one member waits for a portrait tap in the band, as MM6 cast its buffs.
  let pending: SpellId | null = null;

  const castAt = (id: SpellId, target: number): void => {
    const r = cast(state, active, id, target, rng);
    if (r.ok) hooks.onCast?.(r.event);
    frame.message(r.ok ? castMessage(state, r.event) : r.message);
    pending = null;
    ctx.claimPortraits(null);
    draw();
  };

  const onPick = (row: { id: SpellId; target: string; name: string }): void => {
    if (row.target !== 'member') {
      castAt(row.id, active);
      return;
    }
    if (pending === row.id) {
      pending = null;
      ctx.claimPortraits(null);
      frame.message('');
      draw();
      return;
    }
    pending = row.id;
    frame.message(`${row.name}: tap a portrait to choose whom.`);
    ctx.claimPortraits((i) => {
      castAt(row.id, i);
      return true;
    });
    draw();
  };

  const spellList = (c: Character, s: MagicSchool): HTMLElement => {
    const col = el('div', 'ui-col scroll');
    col.appendChild(heading('Spells'));
    const grid = el('div', 'spell-grid');
    for (const row of spellRows(c, s)) {
      const slot = el('button', 'spell-slot');
      slot.type = 'button';
      slot.dataset['paint'] = 'ellipse';
      slot.append(el('span', '', row.name), el('span', 'sub', row.reason ?? `${row.cost} SP`));
      slot.disabled = !row.canCast;
      slot.title = `Level ${row.level} · ${row.cost} SP · ${row.targetLabel}`;
      if (pending === row.id) slot.classList.add('pending');
      slot.addEventListener('click', (e) => {
        e.preventDefault();
        onPick(row);
      });
      grid.appendChild(slot);
    }
    col.appendChild(grid);
    return col;
  };

  const draw = (): void => {
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
