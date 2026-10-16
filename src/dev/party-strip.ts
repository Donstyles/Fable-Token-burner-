/**
 * Development stand-in for the HUD's portrait row (PLAN Phase 5 step 10): four boxes with
 * name and hit points, the selected member outlined, recovering members dimmed.
 */
import type { Party } from '../game/party';

export interface PartyStrip {
  update(now: number): void;
  dispose(): void;
}

export function createPartyStrip(parent: HTMLElement, party: Party): PartyStrip {
  const root = document.createElement('div');
  root.className = 'party-strip';
  const boxes = party.members.map((m) => {
    const box = document.createElement('div');
    box.className = 'party-member';
    const name = document.createElement('div');
    name.className = 'party-name';
    name.textContent = m.def.name;
    const bar = document.createElement('div');
    bar.className = 'party-bar';
    const fill = document.createElement('div');
    fill.className = 'party-fill';
    bar.appendChild(fill);
    const hp = document.createElement('div');
    hp.className = 'party-hp';
    box.append(name, bar, hp);
    root.appendChild(box);
    return { box, fill, hp };
  });
  parent.appendChild(root);
  let last = '';
  return {
    update(now) {
      const key = party.members
        .map((m, i) => `${m.hp}/${m.isReady(now) ? 1 : 0}/${party.selected === i ? 1 : 0}`)
        .join('|');
      if (key === last) return;
      last = key;
      party.members.forEach((m, i) => {
        const b = boxes[i]!;
        b.fill.style.width = `${(100 * m.hp) / m.def.maxHp}%`;
        b.hp.textContent = `${m.hp}/${m.def.maxHp}`;
        b.box.classList.toggle('selected', party.selected === i);
        b.box.classList.toggle('recovering', m.alive && !m.isReady(now));
        b.box.classList.toggle('dead', !m.alive);
      });
    },
    dispose() {
      root.remove();
    },
  };
}
