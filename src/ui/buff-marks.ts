/**
 * Buff marks (DESIGN.md 17.17): the small icons MM6 put on the band for a member's spells and
 * in the strip under the hireling windows for the party's. Each mark is the spell's icon from
 * the book (spell-icons.ts) in a dark tile, or, for a spell whose icon is not in yet, the tile
 * alone in its school's colour; its title names the spell and the time it has left.
 */
import { type ActiveBuff, type BuffId, buffLabel } from '../game/buffs';
import { el } from './dom';
import { buffIcon } from './spell-icons';

/** The school a buff belongs to, for a tile without an icon. */
const SCHOOL: Record<BuffId, string> = {
  bless: 'spirit',
  heroism: 'spirit',
  haste: 'fire',
  shield: 'air',
  'stone-skin': 'earth',
  'temp-might': 'body',
  'temp-intellect': 'mind',
  'temp-personality': 'mind',
  'temp-endurance': 'body',
  'temp-accuracy': 'mind',
  'temp-speed': 'body',
  'temp-luck': 'spirit',
  'torch-light': 'fire',
  'protection-fire': 'fire',
  'protection-electricity': 'air',
  'protection-cold': 'water',
  'protection-poison': 'body',
  'protection-magic': 'earth',
  'wizard-eye': 'air',
  'water-walk': 'water',
  'feather-fall': 'air',
  fly: 'air',
  'guardian-angel': 'spirit',
};

/** Fill `row` with one mark per buff, longest-lasting first; empty when there are none. */
export function renderBuffMarks<K extends BuffId>(
  row: HTMLElement,
  buffs: readonly ActiveBuff<K>[],
): void {
  const marks = buffs.map((b) => {
    const mark = el('span', `buff-mark school-${SCHOOL[b.id]}`);
    mark.title = buffLabel(b.id, b.minutesLeft);
    mark.dataset['buff'] = b.id;
    const url = buffIcon(b.id);
    if (url) {
      const img = el('img', 'buff-mark-icon');
      img.src = url;
      img.alt = '';
      img.draggable = false;
      mark.appendChild(img);
    }
    return mark;
  });
  row.replaceChildren(...marks);
}

/** A short key for what the marks show, to skip redraws. */
export function buffMarksKey<K extends BuffId>(buffs: readonly ActiveBuff<K>[]): string {
  return buffs.map((b) => `${b.id}:${Math.ceil(b.minutesLeft)}`).join(',');
}
