/**
 * The spellbook screen (Phase 5 step 10), as MM6's open book (DESIGN.md 16.22): the member's
 * schools as bookmarks down the right edge, the open school's page with its plate and a place
 * for each of its eleven spells, the known ones with picture and name, dim when they cannot
 * be cast, a tap giving the reason. A member spell waits for a portrait tap. A cast pays the
 * points and hands the effects to the runtime through `hooks.onCast`.
 */
import { type Character, maxSp } from '../game/character';
import type { MagicSchool } from '../game/skills';
import type { SpellId } from '../game/spells';
import type { ScreenContext } from './context';
import { el } from './dom';
import {
  cast,
  castMessage,
  type SchoolTab,
  schoolTabs,
  type SpellRow,
  spellRows,
} from './spellbook-model';

/**
 * The spell icons accepted into assets/icons/spells (DESIGN.md 16.22), by spell id. A spell
 * without one shows the bare oval with its name beneath, as an MM6 page does before the art
 * is in.
 */
const ICONS = import.meta.glob('../../assets/icons/spells/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

function iconOf(id: string): string | null {
  return ICONS[`../../assets/icons/spells/${id}.png`] ?? null;
}

/** MM6's book keeps a place for each of a school's eleven spells, by level. */
const PLACES = 11;

/**
 * The school's plate in the page's first place, where MM6 hangs the school's picture: its
 * name, the member's rank in it and their spell points.
 */
function schoolPlate(c: Character, tab: SchoolTab | null): HTMLElement {
  const plate = el('div', 'spell-plate');
  plate.append(
    el('div', 'spell-school', tab ? `${tab.label} Magic` : 'No magic'),
    el('div', 'sub', tab ? `${tab.rank} ${tab.level}` : `${c.name} knows none.`),
    el('div', 'sub', `SP ${c.sp} / ${maxSp(c)}`),
  );
  return plate;
}

/**
 * The bookmarks down the book's right edge (paint.ts `book:<schools>@<school>` paints them,
 * one per school known): a clear button over each, its school's name for the reader.
 */
function bookmarks(
  tabs: SchoolTab[],
  school: MagicSchool | null,
  onPick: (s: MagicSchool) => void,
): HTMLElement {
  const strip = el('div', 'spell-marks');
  for (const t of tabs) {
    const b = el('button', 'spell-mark');
    b.type = 'button';
    b.setAttribute('aria-label', t.label);
    b.title = `${t.label}: ${t.rank} ${t.level}, ${t.count} spells`;
    if (t.school === school) b.classList.add('active');
    b.addEventListener('click', (e) => {
      e.preventDefault();
      onPick(t.school);
    });
    strip.appendChild(b);
  }
  return strip;
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

  const slotFor = (row: SpellRow): HTMLElement => {
    // MM6's slot: the parchment oval with the spell's picture on it and its name beneath.
    const slot = el('button', 'spell-slot');
    slot.type = 'button';
    const art = el('span', 'spell-art');
    art.dataset['paint'] = 'ellipse';
    const url = iconOf(row.id);
    if (url) {
      const img = el('img', 'spell-icon');
      img.src = url;
      img.alt = '';
      art.appendChild(img);
      slot.classList.add('has-icon');
    }
    // The name alone beneath, as MM6's page; the cost and the reason a spell cannot be cast
    // come in the line at the book's foot when it is tapped.
    slot.append(art, el('span', 'spell-name', row.name));
    slot.classList.toggle('cannot', !row.canCast);
    slot.title = `Level ${row.level} · ${row.cost} SP · ${row.targetLabel}`;
    if (pending === row.id) slot.classList.add('pending');
    slot.addEventListener('click', (e) => {
      e.preventDefault();
      if (row.canCast) onPick(row);
      else frame.message(`${row.name}, ${row.cost} SP: ${row.reason ?? 'not now.'}`);
    });
    return slot;
  };

  /** A place for a spell not yet learnt: the bare oval, as MM6's page. */
  const emptyPlace = (): HTMLElement => {
    const place = el('div', 'spell-slot empty');
    const art = el('span', 'spell-art');
    art.dataset['paint'] = 'ellipse';
    place.appendChild(art);
    return place;
  };

  const page = (c: Character, tab: SchoolTab | null): HTMLElement => {
    const grid = el('div', 'spell-page');
    grid.appendChild(schoolPlate(c, tab));
    const rows = tab ? spellRows(c, tab.school) : [];
    for (let level = 1; level <= PLACES; level++) {
      const row = rows.find((r) => r.level === level);
      grid.appendChild(row ? slotFor(row) : emptyPlace());
    }
    return grid;
  };

  const draw = (): void => {
    const c = state.party[active];
    if (!c) return;
    const tabs = schoolTabs(c);
    if (!tabs.some((t) => t.school === school)) school = tabs[0]?.school ?? null;
    // The book's bookmarks are the schools known (critics, round 9: MM6 shows only earned
    // tabs), the open school's lighter.
    const panel = frame.root.querySelector<HTMLElement>('.ui-panel');
    if (panel) {
      const known = tabs.map((t) => t.school).join(',');
      panel.dataset['paint'] = `book:${known}${school ? `@${school}` : ''}`;
      panel.querySelector('.spell-marks')?.remove();
      panel.appendChild(
        bookmarks(tabs, school, (s) => {
          school = s;
          draw();
        }),
      );
    }
    frame.body.replaceChildren(page(c, tabs.find((t) => t.school === school) ?? null));
  };

  draw();
}
