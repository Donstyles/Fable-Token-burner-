/**
 * Hand-drawn line art for the items (DESIGN.md 16.8): one gold-stroke glyph per kind of
 * thing, in 24-unit boxes like the shelf's, drawn as paths and nothing generated. MM6 had
 * painted sprites for every item; until an artist paints ours, the kind's silhouette on the
 * leather tells a sword from a scroll at a glance.
 */
import type { ItemKind } from '../game/items';

export const ITEM_GLYPHS: Record<ItemKind, string> = {
  weapon:
    '<path d="M10 4l2-2 2 2v11h-4z"/><path d="M7 15h10M12 15v6"/><circle cx="12" cy="21.5" r="1.3"/>',
  armor: '<path d="M7 4l5 2 5-2 2 6-2 1v9H7v-9l-2-1z"/><path d="M12 6v14M9 13h6"/>',
  shield: '<path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z"/><path d="M12 3v18M4 11h16"/>',
  helmet: '<path d="M5 13a7 7 0 0 1 14 0v5H5z"/><path d="M9 18v3h6v-3M12 6v12M8 13h8"/>',
  boots: '<path d="M8 3h6v10l5 3v3H8z"/><path d="M8 13h6M8 16h11"/>',
  belt: '<path d="M3 10h18v5H3z"/><rect x="9" y="8" width="6" height="9"/><path d="M12 10v5"/>',
  cloak: '<path d="M12 3c-5 2-7 8-7 18h14c0-10-2-16-7-18z"/><path d="M12 3v18M9 7l3 2 3-2"/>',
  gauntlets: '<path d="M7 11V5h3v6M10 10V4h3v6M13 10V5h3v6"/><path d="M7 11h9v5l-2 5H9l-2-5z"/>',
  ring: '<circle cx="12" cy="14" r="6"/><circle cx="12" cy="14" r="3.5"/><path d="M9 6l3-3 3 3-3 3z"/>',
  amulet: '<path d="M5 3c0 8 3 11 7 13 4-2 7-5 7-13"/><circle cx="12" cy="18" r="3"/>',
  potion:
    '<path d="M10 2h4v5l4 7v6a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-6l4-7z"/><path d="M7 15h10M9 2h6"/>',
  scroll:
    '<path d="M6 5h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6"/><path d="M6 5a2 2 0 0 0 0 4h11M6 21a2 2 0 0 1 0-4h11M9 12h6M9 15h4"/>',
  misc: '<path d="M8 8h8l3 10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z"/><path d="M8 8c0-3 2-5 4-5s4 2 4 5M9 14h6"/>',
};

/** An inline SVG of the kind's glyph, in the given class. */
export function itemGlyph(kind: ItemKind, className = 'inv-glyph'): HTMLElement {
  const span = document.createElement('span');
  span.className = className;
  span.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ITEM_GLYPHS[kind]}</svg>`;
  return span;
}
