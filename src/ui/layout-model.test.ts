import { describe, expect, it } from 'vitest';
import { BAG_CELL, bagCell, SPELL_PLACE, spellPlace } from './layout-model';

/**
 * The phone in landscape (932 by 430) with and without its safe areas, 59 pixels each side
 * and 21 below: the view's box MM6's frame leaves (hud.css) is 641 pixels wide with them and
 * 759 without; the spell page in it 509 and 627 (ui.css, screens.css).
 */
const BODY = { insets: 216, plain: 237 };
const PAGE = { insets: 509, plain: 627 };

describe('bag cell', () => {
  it('shows all nine rows in the room the phone leaves, insets and all', () => {
    for (const h of [BODY.insets, BODY.plain]) {
      const cell = bagCell(h, 9);
      expect(Number.isInteger(cell)).toBe(true);
      expect(cell * 9 + 6).toBeLessThanOrEqual(h);
      // The largest that fits: one pixel more would cut the last row.
      expect((cell + 1) * 9 + 6).toBeGreaterThan(h);
    }
    expect(bagCell(BODY.insets, 9)).toBe(23);
    expect(bagCell(BODY.plain, 9)).toBe(25);
  });

  it("keeps MM6's 27 when there is room and never shrinks a glyph below 18", () => {
    expect(bagCell(400, 9)).toBe(BAG_CELL.max);
    expect(bagCell(100, 9)).toBe(BAG_CELL.min);
    expect(bagCell(9 * 27 + 6, 9)).toBe(27);
    expect(bagCell(9 * 27 + 5, 9)).toBe(26);
  });
});

describe('spell places', () => {
  it('puts three places across the page with and without the insets', () => {
    for (const w of [PAGE.insets, PAGE.plain]) {
      const place = spellPlace(w, 3);
      expect(place * 3).toBeLessThanOrEqual(w);
      expect(place % 2).toBe(0);
      expect(place).toBeGreaterThanOrEqual(SPELL_PLACE.min);
    }
    expect(spellPlace(PAGE.insets, 3)).toBe(168);
    expect(spellPlace(PAGE.plain, 3)).toBe(180);
  });

  it('never narrows a place below its oval nor spreads it past 180', () => {
    expect(spellPlace(150, 3)).toBe(SPELL_PLACE.min);
    expect(spellPlace(2000, 3)).toBe(SPELL_PLACE.max);
    expect(spellPlace(3 * 113, 3)).toBe(112);
  });
});
