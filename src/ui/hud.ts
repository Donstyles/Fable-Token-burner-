/**
 * The HUD (DESIGN.md 9, 16.34): MM6's frame round the view, as its 640 by 480 laid it out. Three
 * marble pillars stand the screen's height, one at each side and one between the view and the
 * right-hand panel (panel.ts: the minimap, the books, the purse and the four ovals); a lintel
 * runs over the view; under the view the band holds MM6's message bar (status.ts) and the party.
 * Four gold oval frames hold the party, each with the member's portrait (the owner's, cut by
 * tools/portrait.ts, DESIGN.md 12.2) or, until theirs comes, their class sigil painted in gold
 * pixels (paint.ts `sigil-<class>`), a green hit point tube and a blue spell point tube standing
 * beside the frame, and a condition gem above them. A tap on a frame selects that member; a
 * second tap opens their sheet.
 */
import type { Party } from '../game/party';
import { maxSp } from '../game/character';
import { worstCondition, type ConditionId } from '../game/conditions';
import { el } from './dom';
import { installPaint, installPaintedButtons } from './paint';
import { createPanel, type Panel, type PanelHooks } from './panel';
import { installPixelText, PX } from './pixel-text';
import './hud.css';

/** The portraits cut into assets/portraits/<appearance>/<expression>.png, by path. */
const PORTRAITS = import.meta.glob('../../assets/portraits/*/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

/** An appearance's portrait in an expression, if it has been cut. */
export function portraitOf(appearance: string, expression = 'neutral'): string | null {
  return PORTRAITS[`../../assets/portraits/${appearance}/${expression}.png`] ?? null;
}

export interface Hud {
  update(now: number): void;
  /** The right-hand panel (panel.ts). */
  panel: Panel;
  /** Show the game clock (minutes since the start of the calendar). */
  setClock(minutes: number): void;
  /**
   * Show the party's gold and food in MM6's well under the clock (interface.md 8.7); nothing
   * shows there until the first call. Cheap to call every frame: it repaints on a change.
   */
  setPurse(gold: number, food: number): void;
  dispose(): void;
}

/** The most the purse's well shows: six figures fit the gold's well beside the coins. */
const PURSE_MAX = 999_999;

/** A count as the well shows it: whole, never below nothing, at most six figures. */
export function purseFigure(n: number): string {
  const v = Number.isFinite(n) ? Math.floor(n) : 0;
  return String(Math.max(0, Math.min(PURSE_MAX, v)));
}

export interface HudHooks extends PanelHooks {
  /** A tap on an already selected member. */
  onOpenSheet(index: number): void;
  /** A tap that selects a member: the open screen, if any, turns to them (DESIGN.md 16.15). */
  onSelect?(index: number): void;
}

/** The gem's colour for the member's worst condition. */
function gemClass(id: ConditionId): string {
  if (id === 'good') return 'good';
  if (id === 'dead' || id === 'stoned' || id === 'eradicated') return 'dead';
  if (id === 'unconscious' || id === 'paralyzed') return 'out';
  if (id === 'diseased' || id === 'poisoned') return 'ill';
  return 'weak';
}

/**
 * A tube's fill for a fraction full, in whole UI pixels of its track (critics, round 11: every
 * edge on the one grid), so the painted fill is never stretched by a fraction of a pixel.
 */
function fillHeight(fill: HTMLElement, fraction: number): string {
  const track = fill.parentElement?.offsetHeight ?? 0;
  const units = Math.round(track / PX);
  const f = Math.max(0, Math.min(1, Number.isFinite(fraction) ? fraction : 0));
  return units > 0 ? `${Math.round(units * f) * PX}px` : `${100 * f}%`;
}

export function createHud(parent: HTMLElement, party: Party, hooks: HudHooks): Hud {
  installPaint();
  installPaintedButtons(parent);
  installPixelText(parent);
  // The frame: outside each side pillar the band's marble fills the phone's safe area to the
  // screen's edge, so the view never shows past the frame (owner, 2026-10-18), and a strip of
  // it runs under everything over the bottom inset; three pillars with capitals and plinths
  // stand the screen's height, as MM6's (hud.css); a lintel runs over the view.
  for (const side of ['left', 'right', 'foot'] as const) {
    parent.appendChild(el('div', `view-margin ${side}`));
  }
  for (const side of ['left', 'mid', 'right'] as const) {
    const pillar = el('div', `view-pillar ${side}`);
    pillar.dataset['paint'] = 'pillar';
    const capital = el('div', 'view-capital');
    capital.dataset['paint'] = 'capital';
    const plinth = el('div', 'view-plinth');
    plinth.dataset['paint'] = 'plinth';
    pillar.append(capital, plinth);
    parent.appendChild(pillar);
  }
  const lintel = el('div', 'view-lintel');
  lintel.dataset['paint'] = 'lintel';
  parent.appendChild(lintel);
  const panel = createPanel(parent, hooks);
  const root = el('div', 'hud');
  // MM6's message bar along the band's top (status.ts writes in it).
  const bar = el('div', 'hud-say');
  bar.dataset['paint'] = 'plaque';
  root.appendChild(bar);
  // Each member in a rectangle recessed into the marble, a gutter of marble between, as
  // MM6's band (critics, round 5): no trough, no pilasters.
  const band = el('div', 'hud-band');
  const cells = party.members.map((m, i) => {
    const cell = el('button', 'hud-cell');
    cell.type = 'button';
    // The first cell meets the pillar with a dark edge; the others the previous cell's ridge.
    cell.dataset['paint'] = i === 0 ? 'recess-first' : 'recess';
    const frame = el('div', 'hud-frame');
    frame.dataset['paint'] = 'ring';
    const cameo = el('div', 'hud-cameo');
    const face = m.character ? portraitOf(m.character.portrait) : null;
    if (face) {
      // One image pixel to the UI pixel, in the ring's opening (hud.css).
      cameo.classList.add('portrait');
      cameo.style.setProperty('--face', `url("${face}")`);
    } else cameo.dataset['paint'] = `sigil-${m.character?.classId ?? 'knight'}`;
    frame.appendChild(cameo);
    const bars = el('div', 'hud-bars');
    const gem = el('div', 'hud-gem good');
    gem.dataset['paint'] = 'gem-good';
    // Both tubes stand in one recessed slot.
    const tubes = el('div', 'hud-tubes');
    tubes.dataset['paint'] = 'tube-slot';
    // The fill stands in a track between the caps, so a full tube keeps its cap.
    const hp = el('div', 'hud-bar hp');
    hp.dataset['paint'] = 'tube';
    const hpTrack = el('div', 'hud-track');
    const hpFill = el('div', 'hud-fill');
    hpFill.dataset['paint'] = 'tube-hp';
    hpTrack.appendChild(hpFill);
    const hpCaps = el('div', 'hud-caps');
    hpCaps.dataset['paint'] = 'tube-caps';
    hp.append(hpTrack, hpCaps);
    const sp = el('div', 'hud-bar sp');
    sp.dataset['paint'] = 'tube';
    const spTrack = el('div', 'hud-track');
    const spFill = el('div', 'hud-fill');
    spFill.dataset['paint'] = 'tube-sp';
    spTrack.appendChild(spFill);
    const spCaps = el('div', 'hud-caps');
    spCaps.dataset['paint'] = 'tube-caps';
    sp.append(spTrack, spCaps);
    tubes.append(hp, sp);
    bars.append(gem, tubes);
    // No name plate: MM6 named nobody in the band; the sheet carries the name.
    cell.append(frame, bars);
    cell.title = m.name;
    cell.addEventListener('click', (e) => {
      e.preventDefault();
      if (party.selected === i) hooks.onOpenSheet(i);
      else {
        party.selected = i;
        hooks.onSelect?.(i);
      }
    });
    band.appendChild(cell);
    return { cell, frame, hpFill, spFill, gem };
  });
  root.appendChild(band);
  parent.appendChild(root);
  let last = '';
  return {
    update(now) {
      const key = party.members
        .map((m, i) => {
          const c = m.character;
          const cond = c ? worstCondition(c.conditions) : m.alive ? 'good' : 'dead';
          return `${m.hp}/${c?.sp ?? 0}/${cond}/${m.isReady(now) ? 1 : 0}/${party.selected === i ? 1 : 0}`;
        })
        .join('|');
      if (key === last) return;
      last = key;
      party.members.forEach((m, i) => {
        const x = cells[i]!;
        const c = m.character;
        x.hpFill.style.height = fillHeight(x.hpFill, m.hp / m.maxHp);
        const spMax = c ? maxSp(c) : 0;
        x.spFill.style.height = fillHeight(x.spFill, spMax > 0 && c ? c.sp / spMax : 0);
        const cond = c ? worstCondition(c.conditions) : m.alive ? 'good' : 'dead';
        x.gem.className = `hud-gem ${gemClass(cond)}`;
        x.gem.dataset['paint'] = `gem-${gemClass(cond)}`;
        x.cell.classList.toggle('selected', party.selected === i);
        x.frame.dataset['paint'] = party.selected === i ? 'ring-active' : 'ring';
        x.cell.classList.toggle('recovering', m.alive && !m.isReady(now));
        x.cell.classList.toggle('dead', !m.alive);
        x.cell.title = `${m.name}: ${cond}`;
        x.cell.setAttribute('aria-label', m.name);
      });
    },
    panel,
    setClock(minutes) {
      panel.setClock(minutes);
    },
    setPurse(goldCount, foodCount) {
      panel.setPurse(goldCount, foodCount);
    },
    dispose() {
      panel.dispose();
      root.remove();
      for (const n of parent.querySelectorAll('.view-pillar, .view-lintel, .view-margin'))
        n.remove();
    },
  };
}
