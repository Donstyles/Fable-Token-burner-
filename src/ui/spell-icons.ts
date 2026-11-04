/**
 * The spell icons accepted into assets/icons/spells (DESIGN.md 16.22), by spell id, for the
 * book's ovals and the buff marks on the band and the panel (DESIGN.md 17.17). A spell without
 * one shows the bare oval with its name beneath, as an MM6 page does before the art is in.
 */
import type { BuffId } from '../game/buffs';

const ICONS = import.meta.glob('../../assets/icons/spells/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export function spellIcon(id: string): string | null {
  return ICONS[`../../assets/icons/spells/${id}.png`] ?? null;
}

/** The spell whose icon stands for a buff. */
const BUFF_SPELL: Record<BuffId, string> = {
  bless: 'bless',
  heroism: 'heroism',
  haste: 'haste',
  shield: 'shield',
  'stone-skin': 'stone-skin',
  'temp-might': 'meditation',
  'temp-intellect': 'meditation',
  'temp-personality': 'meditation',
  'temp-endurance': 'meditation',
  'temp-accuracy': 'precision',
  'temp-speed': 'meditation',
  'temp-luck': 'meditation',
  'torch-light': 'torch-light',
  'protection-fire': 'protection-from-fire',
  'protection-electricity': 'protection-from-electricity',
  'protection-cold': 'protection-from-cold',
  'protection-poison': 'protection-from-poison',
  'protection-magic': 'protection-from-magic',
  'wizard-eye': 'wizard-eye',
  'water-walk': 'water-walk',
  'feather-fall': 'feather-fall',
  fly: 'fly',
  'guardian-angel': 'guardian-angel',
};

export function buffIcon(id: BuffId): string | null {
  return spellIcon(BUFF_SPELL[id]);
}
