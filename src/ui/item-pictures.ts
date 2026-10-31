/**
 * The items' pictures (DESIGN.md 16.8): photographs of real objects from The Met's open-access
 * collection, keyed and digitised to the bag's cells by `npm run met` into assets/items/, one
 * PNG per item id at its cells' size. An item without one keeps its kind's line glyph.
 */
import type { ItemId } from '../game/items';

const PICTURES = import.meta.glob('../../assets/items/*.png', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** The picture's URL for an item, or null while it has only its glyph. */
export function itemPicture(id: ItemId): string | null {
  return PICTURES[`../../assets/items/${id}.png`] ?? null;
}

/** An image element of the item's picture, drawn at the bag's pitch. */
export function itemImage(id: ItemId, className = 'inv-pic'): HTMLImageElement | null {
  const url = itemPicture(id);
  if (!url) return null;
  const img = document.createElement('img');
  img.className = className;
  img.src = url;
  img.alt = '';
  img.draggable = false;
  return img;
}
