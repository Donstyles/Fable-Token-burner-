/**
 * The HUD (DESIGN.md 9): MM6's marble band along the foot of the view. Four gold oval frames
 * hold the party, each with the member's class sigil in gold line art (portrait art comes
 * from the owner later and drops into the same frame), the name on a plate, a green hit
 * point bar and a blue spell point bar standing beside the frame, and a condition gem above
 * them. A tap on a frame selects that member; a second tap opens their sheet.
 */
import type { Party } from '../game/party';
import { maxSp } from '../game/character';
import { worstCondition, type ConditionId } from '../game/conditions';
import type { ClassId } from '../game/classes';
import { formatDate, formatTime } from '../game/time';
import { el } from './dom';
import './hud.css';

export interface Hud {
  update(now: number): void;
  /** Show the game clock (minutes since the start of the calendar). */
  setClock(minutes: number): void;
  dispose(): void;
}

export interface HudHooks {
  /** A tap on an already selected member. */
  onOpenSheet(index: number): void;
}

/** Gold line-art sigils, one per class, 24-unit boxes. */
const SIGILS: Record<ClassId, string> = {
  knight: '<path d="M12 2v15M9 6h6M8 17h8M12 17v4"/><path d="M10.5 21h3" />',
  paladin:
    '<path d="M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5z"/><path d="M12 7v9M8.5 10.5h7"/>',
  archer:
    '<path d="M6 3c6 3 6 15 0 18"/><path d="M6 3v18"/><path d="M6 12h14"/><path d="M17 9l3 3-3 3"/>',
  cleric: '<circle cx="12" cy="6.5" r="3.5"/><path d="M12 10v12M7 14h10"/>',
  sorcerer: '<path d="M12 2l2.6 6.6L22 9.3l-5.5 4.6 1.8 7.1L12 17l-6.3 4 1.8-7.1L2 9.3l7.4-.7z"/>',
  druid:
    '<path d="M20 4c-9 0-15 5-15 13 0 1.5.3 3 1 4 1-6 5-10 11-12-5 3-8 7-9 12 8 1 13-5 12-17z"/>',
};

function sigil(classId: ClassId): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="#e2b84a" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SIGILS[classId]}</svg>`;
}

/** The gem's colour for the member's worst condition. */
function gemClass(id: ConditionId): string {
  if (id === 'good') return 'good';
  if (id === 'dead' || id === 'stoned' || id === 'eradicated') return 'dead';
  if (id === 'unconscious' || id === 'paralyzed') return 'out';
  if (id === 'diseased' || id === 'poisoned') return 'ill';
  return 'weak';
}

export function createHud(parent: HTMLElement, party: Party, hooks: HudHooks): Hud {
  const root = el('div', 'hud');
  const clock = el('div', 'hud-clock');
  const clockTime = el('div', 'hud-clock-time');
  const clockDate = el('div', 'hud-clock-date');
  clock.append(clockTime, clockDate);
  root.appendChild(clock);
  const band = el('div', 'hud-band');
  const cells = party.members.map((m, i) => {
    const cell = el('button', 'hud-cell');
    cell.type = 'button';
    const frame = el('div', 'hud-frame');
    const cameo = el('div', 'hud-cameo');
    cameo.innerHTML = m.character ? sigil(m.character.classId) : sigil('knight');
    frame.appendChild(cameo);
    const plate = el('div', 'hud-plate', m.name);
    const bars = el('div', 'hud-bars');
    const gem = el('div', 'hud-gem good');
    const hp = el('div', 'hud-bar hp');
    const hpFill = el('div', 'hud-fill');
    hp.appendChild(hpFill);
    const sp = el('div', 'hud-bar sp');
    const spFill = el('div', 'hud-fill');
    sp.appendChild(spFill);
    bars.append(gem, hp, sp);
    const left = el('div', 'hud-left');
    left.append(frame, plate);
    cell.append(left, bars);
    cell.addEventListener('click', (e) => {
      e.preventDefault();
      if (party.selected === i) hooks.onOpenSheet(i);
      else party.selected = i;
    });
    band.appendChild(cell);
    return { cell, hpFill, spFill, gem };
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
        x.hpFill.style.height = `${Math.max(0, Math.min(100, (100 * m.hp) / m.maxHp))}%`;
        const spMax = c ? maxSp(c) : 0;
        x.spFill.style.height = `${spMax > 0 && c ? Math.max(0, Math.min(100, (100 * c.sp) / spMax)) : 0}%`;
        const cond = c ? worstCondition(c.conditions) : m.alive ? 'good' : 'dead';
        x.gem.className = `hud-gem ${gemClass(cond)}`;
        x.cell.classList.toggle('selected', party.selected === i);
        x.cell.classList.toggle('recovering', m.alive && !m.isReady(now));
        x.cell.classList.toggle('dead', !m.alive);
        x.cell.title = `${m.name}: ${cond}`;
      });
    },
    setClock(minutes) {
      clockTime.textContent = formatTime(minutes);
      clockDate.textContent = formatDate(minutes);
    },
    dispose() {
      root.remove();
    },
  };
}
