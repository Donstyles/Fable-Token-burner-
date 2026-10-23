/**
 * Sizes the screens take from their room (owner, 2026-10-23: "Formatting is off everywhere"):
 * every length a whole UI pixel, chosen so each screen fits its frame on the phone in
 * landscape, 932 by 430 with or without its safe areas, and keeps MM6's sizes where there is
 * room for them. Pure, so the choices are tested without a page.
 */

/** The bag's cell: MM6's 27 pixels at most, 18 at the least (a one-cell item's glyph). */
export const BAG_CELL = { min: 18, max: 27 } as const;

/**
 * The bag's cell for a grid of `rows` rows in a box `height` pixels tall, `frame` pixels of it
 * the grid's own border: the largest whole cell that shows every row (MM6 showed the whole
 * bag; owner's phone, 2026-10-23: the last rows were cut off).
 */
export function bagCell(height: number, rows: number, frame = 6): number {
  const fit = Math.floor((height - frame) / Math.max(1, rows));
  return Math.max(BAG_CELL.min, Math.min(BAG_CELL.max, fit));
}

/** A spell's place on the book's page: its oval's 108 pixels at the least, 130 at the most. */
export const SPELL_PLACE = { min: 108, max: 130 } as const;

/**
 * The width of each of `columns` places across a page `width` pixels wide (DESIGN.md 16.22:
 * two rows of six): as wide as the page allows, an even number of pixels so a picture centres
 * on whole pixels, never under its oval (owner's phone, 2026-10-23: at 126 the last column ran
 * off the page inside the insets).
 */
export function spellPlace(width: number, columns: number): number {
  let w = Math.floor(width / Math.max(1, columns));
  w -= w % 2;
  return Math.max(SPELL_PLACE.min, Math.min(SPELL_PLACE.max, w));
}
