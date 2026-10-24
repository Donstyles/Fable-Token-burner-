import { expect, test } from '@playwright/test';

/**
 * Every screen fits its frame on the phone (owner's phone, 2026-10-23: "Formatting is off
 * everywhere"), in MM6's layout (DESIGN.md 16.34). At 932 by 430 with the iPhone 14 Pro Max's
 * landscape insets forced (59 pixels each side, 21 below), each screen stands in the view's box
 * between the pillars and over the band; its content lies inside its panel and inside every box
 * that clips it without scrolling (a list that scrolls must itself fit); what it draws over the
 * right-hand panel (a member, a house's board) lies inside the panel's cover; no two runs of
 * words share a line's pixels (a label running into its value); a title stands at the panel's
 * head and a close oval at its foot, where the screen has them.
 */
type Dev = {
  ready: boolean;
  state: { selected: number };
  screens: {
    open(name: string): void;
    openService(kind: string, house: unknown): void;
    close(): void;
  };
};
type W = Window & { ftb?: { dev?: Dev } };

/** The village's houses (src/game/content.ts) and a guild, for the service screens. */
const HOUSES: Record<string, [string, unknown]> = {
  tavern: ['tavern', { id: 'inn', name: 'The Inn', roomPrice: 10, foodPrice: 2, foodCapacity: 14 }],
  temple: ['temple', { id: 'temple', name: 'The Temple', priceMultiplier: 1 }],
  trainer: [
    'trainer',
    { id: 'training', name: 'The Training Hall', maxLevel: 15, priceMultiplier: 1 },
  ],
  store: [
    'shop',
    {
      id: 'store',
      name: "The Trader's Store",
      stock: ['potion-healing', 'scroll-torch-light', 'scroll-fire-bolt', 'copper-ring', 'boots'],
      priceMultiplier: 1.3,
      identifyPrice: 20,
      repairFraction: 0.2,
    },
  ],
  smithy: [
    'shop',
    {
      id: 'smithy',
      name: 'The Smithy',
      stock: [
        'dagger',
        'short-sword',
        'long-sword',
        'axe',
        'spear',
        'shield',
        'helmet',
        'chain-mail',
      ],
      priceMultiplier: 1.4,
      identifyPrice: 30,
      repairFraction: 0.15,
    },
  ],
  guild: [
    'guild',
    {
      id: 'guild-fire',
      name: 'The Guild of Fire',
      school: 'fire',
      maxSpellLevel: 6,
      membershipFee: 50,
      priceMultiplier: 1,
    },
  ],
};

/** Each screen with the member it is opened for: the knight, and the casters for the book. */
const CASES: { label: string; screen?: string; house?: string; member: number }[] = [
  ...[
    'sheet',
    'skills',
    'items',
    'awards',
    'spells',
    'rest',
    'reference',
    'options',
    'quests',
    'notes',
    'map',
    'calendar',
  ].map((screen) => ({
    label: screen,
    screen,
    member: 0,
  })),
  { label: 'sheet of Tobin', screen: 'sheet', member: 2 },
  { label: 'spells of Sera', screen: 'spells', member: 3 },
  ...Object.keys(HOUSES).map((house) => ({ label: house, house, member: 0 })),
];

interface Fit {
  outside: string[];
  overlaps: string[];
  panel: { left: number; top: number; right: number; bottom: number };
  title: { left: number; top: number } | null;
  close: { right: number; bottom: number } | null;
  /** What the screen drew over the right-hand panel and lies outside its cover. */
  coverOutside: string[];
}

/** Run in the page: what of the open screen lies outside its boxes, and which words overlap. */
function fitReport(): Fit {
  const panel = document.querySelector('.ui-modal .ui-panel')!;
  const p = panel.getBoundingClientRect();
  const name = (e: Element): string =>
    `${e.tagName.toLowerCase()}.${Array.from(e.classList).join('.')} "${(e.textContent ?? '').trim().slice(0, 24)}"`;
  const scrolls = (e: Element): boolean => {
    const cs = getComputedStyle(e);
    return [cs.overflowX, cs.overflowY].some((o) => o === 'auto' || o === 'scroll');
  };
  const inside = (r: DOMRect, b: DOMRect): boolean =>
    r.left >= b.left - 0.5 &&
    r.right <= b.right + 0.5 &&
    r.top >= b.top - 0.5 &&
    r.bottom <= b.bottom + 0.5;
  const outside: string[] = [];
  for (const e of Array.from(panel.querySelectorAll('*'))) {
    const r = e.getBoundingClientRect();
    // A word's canvas hangs its descenders into the leading under its line box.
    if (r.width === 0 || r.height === 0 || e.classList.contains('pxw') || e.closest('.pxs'))
      continue;
    let scrolled = false;
    let clip: Element | null = null;
    for (let a = e.parentElement; a && a !== panel; a = a.parentElement) {
      if (scrolls(a)) scrolled = true;
      const cs = getComputedStyle(a);
      if (!clip && (cs.overflowX !== 'visible' || cs.overflowY !== 'visible')) clip = a;
    }
    if (scrolled) continue;
    if (!inside(r, p)) outside.push(`${name(e)} outside the panel`);
    else if (clip && !inside(r, clip.getBoundingClientRect()))
      outside.push(`${name(e)} cut by ${name(clip)}`);
  }
  // Words of different runs over each other, in sight: beyond the few rows a descender hangs
  // into the line below (pixel-text.ts), a line run into the next or a label into its value.
  const DESCENT = 4;
  const words: { run: number; r: DOMRect; text: string }[] = [];
  panel.querySelectorAll('.pxt').forEach((run, i) => {
    for (const w of Array.from(run.querySelectorAll('.pxw'))) {
      const r = w.getBoundingClientRect();
      if (r.width > 0 && r.height > 0)
        words.push({ run: i, r, text: (run.textContent ?? '').trim().slice(0, 24) });
    }
  });
  const overlaps = new Set<string>();
  for (let i = 0; i < words.length; i++) {
    for (let j = i + 1; j < words.length; j++) {
      const a = words[i]!;
      const b = words[j]!;
      if (a.run === b.run) continue;
      const x = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
      const y = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
      if (x > 1 && y > DESCENT) overlaps.add(`${a.text} | ${b.text}`);
    }
  }
  // A title or a close oval counts where it shows: some of MM6's screens have neither.
  const shown = (s: string): DOMRect | null => {
    const e = document.querySelector(s);
    const r = e?.getBoundingClientRect();
    return r && r.width > 0 && r.height > 0 ? r : null;
  };
  const t = shown('.ui-modal .ui-title');
  const c = shown('.ui-modal .ui-close');
  const cover = document.querySelector('.panel-cover');
  const coverOutside: string[] = [];
  if (cover && cover.childElementCount) {
    const b = cover.getBoundingClientRect();
    for (const e of Array.from(cover.querySelectorAll('*'))) {
      const r = e.getBoundingClientRect();
      if (r.width === 0 || r.height === 0 || e.classList.contains('pxw') || e.closest('.pxs'))
        continue;
      if (!inside(r, b)) coverOutside.push(`${name(e)} outside the cover`);
    }
  }
  return {
    outside,
    overlaps: [...overlaps],
    panel: { left: p.left, top: p.top, right: p.right, bottom: p.bottom },
    title: t && { left: t.left, top: t.top },
    close: c && { right: c.right, bottom: c.bottom },
    coverOutside,
  };
}

test('every screen fits the view’s box inside the safe areas, its title at the head, its close at the foot', async ({
  page,
}) => {
  // Nineteen screens and houses over Gullhaven on software GL, each step waiting out a frame
  // of seconds.
  test.setTimeout(600_000);
  await page.goto('dev/?dev&lite&level=gullhaven&seed=11');
  await page.waitForFunction(() => (window as unknown as W).ftb?.dev?.ready === true, null, {
    timeout: 150_000,
  });
  await page.addStyleTag({
    content:
      ':root, html.forced-landscape { --sat: 0px !important; --sal: 59px !important; --sar: 59px !important; --sab: 21px !important; }',
  });
  await page.evaluate(() => document.fonts.ready);
  for (const c of CASES) {
    await page.evaluate(
      ([c, house]) => {
        const dev = (window as unknown as W).ftb!.dev!;
        dev.state.selected = c.member;
        if (c.screen) dev.screens.open(c.screen);
        else if (house) dev.screens.openService(house[0], house[1]);
      },
      [c, c.house ? HOUSES[c.house] : null] as const,
    );
    // The words are painted a frame or two after the screen draws (pixel-text.ts).
    await page.waitForTimeout(400);
    const fit = await page.evaluate(fitReport);
    expect(fit.outside, `${c.label}: cut off`).toEqual([]);
    expect(fit.overlaps, `${c.label}: words over words`).toEqual([]);
    expect(fit.coverOutside, `${c.label}: past the panel's cover`).toEqual([]);
    // The screen stands in the view's box: past the side pillar (59 and 15), short of the
    // middle one (the panel's 128 and two pillars), under the lintel, over the band (114 and
    // the inset).
    expect(fit.panel.left, c.label).toBeGreaterThanOrEqual(59 + 15);
    expect(fit.panel.right, c.label).toBeLessThanOrEqual(932 - 59 - 158);
    expect(fit.panel.top, c.label).toBeGreaterThanOrEqual(7);
    expect(fit.panel.bottom, c.label).toBeLessThanOrEqual(430 - 21 - 114);
    // A title at the panel's head, a close oval at its foot, where the screen has them.
    if (fit.title) expect(fit.title.top - fit.panel.top, `${c.label}: title`).toBeLessThan(24);
    if (fit.close) {
      expect(fit.panel.right - fit.close.right, `${c.label}: close`).toBeLessThan(80);
      expect(fit.panel.bottom - fit.close.bottom, `${c.label}: close`).toBeLessThan(12);
    }
  }
  await page.evaluate(() => (window as unknown as W).ftb!.dev!.screens.close());
});
