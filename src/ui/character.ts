/**
 * A member's pages (DESIGN.md 16.34; references mm6-stats, mm6-skills, mm6-inventory), as MM6
 * laid them out in its view: the statistics in six carved boxes in two columns under the
 * member's name and their skill points; the skills in two boxes, weapons and magic, armour and
 * the rest, each skill's level at its right; the inventory (inventory.ts); the awards. Along the
 * foot MM6's five gold ovals: a head for the statistics, a hand for the skills, a sword and
 * shield for the inventory, a medal for the awards, a door to leave. Over the panel stands the
 * member, where MM6 drew their figure: their face in its ring, their name and what they wear
 * (the figure itself waits on the paper doll, DESIGN.md 12.4).
 */
import type { Character } from '../game/character';
import type { EquipSlot } from '../game/inventory';
import type { SKILL_NAMES } from '../game/skills';
import type { MemberPage, ScreenContext } from './context';
import { button, el } from './dom';
import { itemGlyph } from './glyphs';
import { slotRows, type InvSelection } from './inventory-model';
import { questRows } from './journal-model';
import {
  GROUP_LABELS,
  raise,
  raiseMessage,
  type SheetView,
  sheetView,
  signed,
  skillRows,
} from './sheet-model';
import { portraitOf } from './hud';
import type { ButtonGlyph } from './paint-panel';

/** The five ovals along a member's pages: the four pages and the way out. */
const TABS: { page: MemberPage | 'exit'; glyph: ButtonGlyph; label: string }[] = [
  { page: 'sheet', glyph: 'head', label: 'Statistics' },
  { page: 'skills', glyph: 'hand', label: 'Skills' },
  { page: 'items', glyph: 'items', label: 'Inventory' },
  { page: 'awards', glyph: 'award', label: 'Awards' },
  { page: 'exit', glyph: 'exit', label: 'Exit' },
];

/** The member's pages' ovals in the frame's foot, the open page's pressed. */
export function memberTabs(ctx: ScreenContext, page: MemberPage): void {
  ctx.frame.root.classList.add('screen-member');
  ctx.frame.bar.replaceChildren(
    ...TABS.map((t) => {
      const b = button('', () => (t.page === 'exit' ? ctx.close() : ctx.open(t.page)), {
        className: `member-tab${t.page === page ? ' active' : ''}`,
      });
      b.dataset['glyph'] = t.glyph;
      b.title = t.label;
      b.setAttribute('aria-label', t.label);
      return b;
    }),
  );
}

/** A carved box of label and value lines. */
function box(rows: readonly HTMLElement[], className = ''): HTMLElement {
  const b = el('div', `ui-col member-box ${className}`.trim());
  b.append(...rows);
  return b;
}

function line(label: string, value: string, valueClass = ''): HTMLElement {
  const r = el('div', 'member-line');
  r.append(el('span', 'ui-k', label), el('span', `ui-v ${valueClass}`.trim(), value));
  return r;
}

/** MM6's five resistances. None are given yet by race, item or spell (MM6-GAPS.md 8). */
const RESISTANCES = ['Fire', 'Electricity', 'Cold', 'Poison', 'Magic'] as const;

function statsBody(v: SheetView): HTMLElement {
  const cols = el('div', 'member-cols');
  const left = el('div', 'member-col');
  const right = el('div', 'member-col');
  left.append(
    box(
      v.stats.map((s) =>
        line(s.label, `${s.current} / ${s.base}`, s.current < s.base ? 'bad' : ''),
      ),
    ),
    box([
      line('Hit Points', `${v.hp} / ${v.maxHp}`, v.hp < v.maxHp / 4 ? 'bad' : ''),
      line('Spell Points', `${v.sp} / ${v.maxSp}`),
      line('Armor Class', `${v.armorClass} / ${v.armorClass}`),
    ]),
    box([
      line('Condition', v.condition, v.condition === 'Good' ? 'good' : 'bad'),
      line('Recovery', v.recovery),
    ]),
  );
  right.append(
    box([
      line('Age', String(v.age)),
      line('Level', `${v.level} / ${v.level}`),
      // Enough for the next level shows green, as MM6's experience did.
      line('Experience', `${v.xp} / ${v.xpNext}`, v.canTrain ? 'good' : ''),
    ]),
    box([
      line('Attack', signed(v.attack)),
      line('Damage', v.damageRange),
      line('Shoot', v.rangedAttack === null ? 'N/A' : signed(v.rangedAttack)),
      line('Damage', v.rangedRange ?? 'N/A'),
    ]),
    box(RESISTANCES.map((r) => line(r, '0 / 0'))),
  );
  cols.append(left, right);
  return cols;
}

function skillsBody(c: Character, onRaise: (id: string) => void): HTMLElement {
  const rows = skillRows(c);
  const cols = el('div', 'member-cols');
  const group = (g: keyof typeof GROUP_LABELS): HTMLElement[] => {
    const head = el('div', 'member-line member-group');
    head.append(el('span', '', GROUP_LABELS[g]), el('span', '', 'Level'));
    const mine = rows.filter((r) => r.group === g);
    const out: HTMLElement[] = [head];
    if (!mine.length) out.push(line('None', ''));
    for (const r of mine) {
      // The line is the button, as MM6's lists: a tap spends the points the next level costs.
      const b = el('button', 'member-line member-skill');
      b.type = 'button';
      if (!r.canRaise) b.classList.add('dim');
      b.append(
        el('span', 'ui-k', r.rankLabel === 'Normal' ? r.name : `${r.name} ${r.rankLabel}`),
        el('span', 'ui-v', String(r.level)),
      );
      b.title = `${r.cost} skill points to raise`;
      b.addEventListener('click', (e) => {
        e.preventDefault();
        onRaise(r.id);
      });
      out.push(b);
    }
    return out;
  };
  // MM6's two boxes: weapons over magic, armour over the rest.
  cols.append(
    box([...group('weapon'), el('div', 'member-gap'), ...group('magic')], 'scroll'),
    box([...group('armor'), el('div', 'member-gap'), ...group('misc')], 'scroll'),
  );
  return cols;
}

function awardsBody(ctx: ScreenContext): HTMLElement {
  const done = questRows(ctx.state.quests, ctx.hooks.questDefs ?? {}).done;
  const lines: HTMLElement[] = done.map((q) => el('div', 'member-award', q.title));
  if (!lines.length) lines.push(el('div', 'member-award dim', 'No awards yet.'));
  return box(lines, 'scroll member-awards');
}

/**
 * The member over the panel, where MM6 stood their figure: the face in its ring (the band's),
 * the name, and the worn slots a line each, the item or the slot's name dim; on the inventory
 * a tap on a slot is `onSlot`'s.
 */
export function memberCover(
  ctx: ScreenContext,
  c: Character,
  sel: InvSelection = null,
  onSlot?: (slot: EquipSlot) => void,
): void {
  const cover = ctx.cover;
  if (!cover) return;
  const root = el('div', 'member-cover');
  const ring = el('div', 'member-ring');
  ring.dataset['paint'] = 'ring';
  const cameo = el('div', 'hud-cameo');
  const face = portraitOf(c.portrait);
  if (face) {
    cameo.classList.add('portrait');
    cameo.style.setProperty('--face', `url("${face}")`);
  } else cameo.dataset['paint'] = `sigil-${c.classId}`;
  ring.appendChild(cameo);
  const name = el('div', 'member-name', c.name);
  const slots = el('div', 'member-slots');
  for (const row of slotRows(c, sel)) {
    const s = el(onSlot ? 'button' : 'div', 'member-slot');
    if (s instanceof HTMLButtonElement) s.type = 'button';
    if (row.selected) s.classList.add('selected');
    if (!row.name) s.classList.add('dim');
    s.title = row.name ? `${row.label}: ${row.name}` : row.label;
    s.append(
      row.kind ? itemGlyph(row.kind) : el('span', 'inv-glyph'),
      el('span', 'member-slot-name', row.name ?? row.label),
    );
    if (onSlot) s.addEventListener('click', () => onSlot(row.slot));
    slots.appendChild(s);
  }
  root.append(ring, name, slots);
  cover.replaceChildren(root);
}

/** The statistics page. */
export function renderSheet(ctx: ScreenContext): void {
  const { state, frame } = ctx;
  const c = state.party[state.selected];
  if (!c) return;
  const v = sheetView(c);
  frame.setTitle(`${v.name} the ${v.className}`);
  frame.aside.textContent = `Skill Points: ${v.skillPoints}`;
  frame.body.replaceChildren(statsBody(v));
  memberTabs(ctx, 'sheet');
  memberCover(ctx, c);
}

/** The skills page: a tap on a skill spends the points its next level costs. */
export function renderSkills(ctx: ScreenContext): void {
  const { state, frame } = ctx;
  const draw = (): void => {
    const c = state.party[state.selected];
    if (!c) return;
    frame.setTitle(`Skills for ${c.name}`);
    frame.aside.textContent = `Skill Points: ${c.skillPoints}`;
    frame.body.replaceChildren(
      skillsBody(c, (id) => {
        const key = id as keyof typeof SKILL_NAMES;
        frame.message(raiseMessage(raise(c, key), key));
        draw();
      }),
    );
    memberCover(ctx, c);
  };
  draw();
  memberTabs(ctx, 'skills');
}

/** The awards page: the quests the party has seen through. */
export function renderAwards(ctx: ScreenContext): void {
  const { state, frame } = ctx;
  const c = state.party[state.selected];
  if (!c) return;
  frame.setTitle(`Awards for ${c.name}`);
  frame.body.replaceChildren(awardsBody(ctx));
  memberTabs(ctx, 'awards');
  memberCover(ctx, c);
}
