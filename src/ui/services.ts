/**
 * The houses of the town (Phase 5 step 10; DESIGN.md 16.34; references mm6-smith-menu,
 * mm6-tavern-talk), as MM6 laid them out: over the right-hand panel the house's wooden board,
 * its name at the head and its choices down it in the white italic, the gold oval with the door
 * at its foot; the view keeps the street, where MM6 showed the room, until a choice needs a
 * list: the stock to buy, the guild's books; or the member's bag, on its leather as MM6 opened
 * it, to sell, identify or repair from: a tap on an item says what it fetches or costs, a
 * second tap on it does it (MM6 said it under the pointer and did it at a click).
 * The member the choices are for is the one picked in the band (a tap on a portrait turns the
 * house to them, as MM6's); what passes is said on the message bar. Each house is driven by its
 * record through `services-model.ts` and `shop-model.ts`.
 */
import type { ScreenContext, ServiceDefs, ServiceKind } from './context';
import { button, el } from './dom';
import {
  type ActionOutcome,
  buyBook,
  buyFoodAction,
  guildView,
  heal,
  join,
  rent,
  tavernView,
  templeRows,
  trainMember,
  trainerRows,
} from './services-model';
import { buy, identify, repair, sell, shopView } from './shop-model';
import type { Character } from '../game/character';
import { gridBlocks } from './inventory-model';
import { bagGrid } from './inventory';
import { bagCell } from './layout-model';

/** A house to open: its kind and the record of that kind. */
export type ServiceRef = { [K in ServiceKind]: { kind: K; house: ServiceDefs[K] } }[ServiceKind];

/** A choice on the board: its words, and why it cannot be taken now (said when tapped). */
interface Choice {
  label: string;
  reason?: string | null;
  /** The list it opens in the view, which shows lit while open. */
  list?: string;
  go(): void;
}

/** A line of a list in the view: its name, its price, why it cannot be had. */
interface Row {
  name: string;
  note?: string;
  price: string;
  reason: string | null;
  go(): void;
}

/** A choice done on an item of the member's bag: its verb, and each item's price or reason. */
interface Pack {
  verb: string;
  member(): Character | undefined;
  /** The item's price as said, and why the choice does not apply to it (null when it does). */
  of(index: number): { price: string; reason: string | null };
  act(index: number): ActionOutcome;
}

/** What a house's choices do beyond themselves: open a list, or say what passed. */
interface House {
  show(list: string): void;
  say(r: ActionOutcome | string): void;
}

/**
 * The board over the panel and the list in the view for one house. `choices` and `lists` are
 * asked again at each redraw, so the board always says what the gold and the member allow.
 */
function house(
  ctx: ScreenContext,
  name: string,
  choices: () => Choice[],
  lists: Record<string, { title: () => string; rows?: () => Row[]; pack?: Pack; empty: string }>,
): House {
  const { frame, state } = ctx;
  frame.root.classList.add('screen-house');
  frame.setTitle(name);
  let open: string | null = null;
  // The item of the bag tapped once, waiting for the second tap.
  let picked: number | null = null;
  const say = (r: ActionOutcome | string): void => {
    frame.message(typeof r === 'string' ? r : r.message);
    draw();
  };
  const draw = (): void => {
    // The board.
    const board = el('div', 'house-board');
    board.appendChild(el('div', 'house-name', name));
    const menu = el('div', 'house-choices');
    for (const c of choices()) {
      const b = el('button', 'house-choice', c.label);
      b.type = 'button';
      if (c.reason) b.classList.add('dim');
      if (c.list && c.list === open) b.classList.add('lit');
      b.addEventListener('click', (e) => {
        e.preventDefault();
        if (c.reason) say(c.reason);
        else c.go();
      });
      menu.appendChild(b);
    }
    const foot = el('div', 'house-foot');
    const exit = button('', () => ctx.close(), { className: 'house-exit' });
    exit.dataset['glyph'] = 'exit';
    exit.title = 'Leave';
    exit.setAttribute('aria-label', 'Leave');
    foot.appendChild(exit);
    board.append(menu, foot);
    ctx.cover?.replaceChildren(board);
    // The list in the view, or the street.
    const list = open ? lists[open] : null;
    frame.root.classList.toggle('listing', !!list);
    if (!list) {
      frame.body.replaceChildren();
      return;
    }
    const head = el('div', 'house-list-head');
    head.append(el('span', 'ui-h', list.title()), el('span', 'ui-v', `Gold ${state.gold}`));
    if (list.pack) {
      drawPack(list.pack, head);
      return;
    }
    const col = el('div', 'ui-col scroll house-list');
    col.appendChild(head);
    const rows = list.rows?.() ?? [];
    if (!rows.length) col.appendChild(el('div', 'house-row dim', list.empty));
    for (const r of rows) {
      const line = el('button', 'house-row');
      line.type = 'button';
      if (r.reason) line.classList.add('dim');
      const label = el('span', 'house-row-name', r.name);
      line.append(label);
      if (r.note) line.append(el('span', 'house-row-note', r.note));
      line.append(el('span', 'house-row-price', r.price));
      line.addEventListener('click', (e) => {
        e.preventDefault();
        if (r.reason) say(r.reason);
        else r.go();
      });
      col.appendChild(line);
    }
    frame.body.replaceChildren(col);
  };
  // The member's bag in the view, its leather and its items as the inventory page draws them,
  // the items the choice does not apply to greyed; beside it the item tapped and its price.
  const drawPack = (pack: Pack, head: HTMLElement): void => {
    const c = pack.member();
    const col = el('div', 'ui-col house-pack');
    col.appendChild(head);
    if (!c) {
      frame.body.replaceChildren(col);
      return;
    }
    const blocks = gridBlocks(c, null);
    if (picked !== null && !blocks[picked]) picked = null;
    const tap = (x: number, y: number): void => {
      const b = blocks.find((k) => x >= k.x && x < k.x + k.w && y >= k.y && y < k.y + k.h);
      if (!b) {
        picked = null;
        say('');
        return;
      }
      const it = pack.of(b.index);
      if (it.reason) {
        picked = null;
        say(`${b.name}: ${it.reason}`);
      } else if (picked === b.index) {
        picked = null;
        say(pack.act(b.index));
      } else {
        picked = b.index;
        say(
          `${b.name}: ${pack.verb.toLowerCase()} for ${it.price}. Tap it again to ${pack.verb.toLowerCase()}.`,
        );
      }
    };
    const row = el('div', 'house-pack-row');
    const grid = bagGrid(
      c,
      picked === null ? null : { kind: 'grid', index: picked },
      tap,
      (i) => pack.of(i).reason !== null,
    );
    const side = el('div', 'ui-col house-pack-side');
    const held = picked === null ? null : blocks[picked];
    if (held) {
      side.append(el('div', 'inv-held', held.name), el('div', 'ui-v', pack.of(held.index).price));
      const index = held.index;
      side.appendChild(
        button(pack.verb, () => {
          picked = null;
          say(pack.act(index));
        }),
      );
    } else {
      side.appendChild(
        el(
          'div',
          'inv-held',
          blocks.length
            ? `Tap an item to ${pack.verb.toLowerCase()} it.`
            : (list(open)?.empty ?? ''),
        ),
      );
    }
    row.append(grid, side);
    col.appendChild(row);
    frame.body.replaceChildren(col);
    // The cells as large as the view lets all nine rows show under the head (layout-model.ts).
    const cs = getComputedStyle(frame.body);
    const h =
      frame.body.clientHeight -
      parseFloat(cs.paddingTop) -
      parseFloat(cs.paddingBottom) -
      head.offsetHeight -
      4;
    if (h > 0) frame.body.style.setProperty('--cell', `${bagCell(h, c.grid.height)}px`);
  };
  const list = (key: string | null) => (key ? lists[key] : null);
  const show = (key: string): void => {
    open = open === key ? null : key;
    picked = null;
    draw();
  };
  // The band's portraits turn the house to the member tapped, as MM6's.
  ctx.claimPortraits((i) => {
    state.selected = i;
    picked = null;
    draw();
    return true;
  });
  state.selected = Math.max(0, Math.min(state.party.length - 1, state.selected));
  draw();
  return { show, say };
}

const gold = (n: number): string => `${n} gold`;

function renderTavern(ctx: ScreenContext, def: ServiceDefs['tavern']): void {
  const { state, hooks } = ctx;
  const h: House = house(
    ctx,
    def.name,
    () => {
      const v = tavernView(state, def);
      return [
        {
          label: `Rent Room for ${def.roomPrice} gold`,
          reason: v.canRent ? null : 'Not enough gold.',
          go: () => {
            const r = rent(state, def);
            if (r.ok) hooks.onRest('room');
            h.say(r);
          },
        },
        {
          label: `Fill Packs to ${def.foodCapacity} days for ${v.foodCost || def.foodPrice} gold`,
          reason: v.foodReason,
          go: () => h.say(buyFoodAction(state, def)),
        },
      ];
    },
    {},
  );
}

function renderTemple(ctx: ScreenContext, def: ServiceDefs['temple']): void {
  const { state } = ctx;
  const h: House = house(
    ctx,
    def.name,
    () => {
      const row = templeRows(state, def)[state.selected];
      if (!row) return [];
      return [
        {
          label: `Heal ${row.name} for ${row.price} gold`,
          reason: row.reason,
          go: () => h.say(heal(state, def, row.index)),
        },
      ];
    },
    {},
  );
}

function renderTrainer(ctx: ScreenContext, def: ServiceDefs['trainer']): void {
  const { state } = ctx;
  const h: House = house(
    ctx,
    def.name,
    () => {
      const row = trainerRows(state, def)[state.selected];
      if (!row) return [];
      return [
        {
          label: `Train ${row.name} to level ${row.level + 1} for ${row.price} gold`,
          reason: row.reason,
          go: () => h.say(trainMember(state, def, row.index)),
        },
      ];
    },
    {},
  );
}

function renderGuild(ctx: ScreenContext, def: ServiceDefs['guild']): void {
  const { state } = ctx;
  const h: House = house(
    ctx,
    def.name,
    () => {
      const v = guildView(state, def, state.selected);
      const out: Choice[] = [];
      if (!v.member) {
        out.push({
          label: `Join the guild for ${v.fee} gold`,
          reason: v.canJoin ? null : 'Not enough gold.',
          go: () => h.say(join(state, def)),
        });
      }
      out.push({ label: 'Buy Spells', list: 'books', go: () => h.show('books') });
      return out;
    },
    {
      books: {
        title: () => `Spellbooks for ${state.party[state.selected]?.name ?? ''}`,
        empty: 'Nothing for sale.',
        rows: () =>
          guildView(state, def, state.selected).spells.map((s) => ({
            name: s.name,
            note: `Level ${s.level}`,
            price: gold(s.price),
            reason: s.canBuy ? null : (s.reason ?? 'Not now.'),
            go: () => h.say(buyBook(state, def, s.id, state.selected)),
          })),
      },
    },
  );
}

function renderShop(ctx: ScreenContext, def: ServiceDefs['shop']): void {
  const { state } = ctx;
  // Sell, identify and repair open the member's bag (owner, 2026-10-25: "When selecting
  // indentify or sell it should open the leather inventory of the selected character and Not
  // just a List (works like this in the original mm6)").
  const pack = (pick: 'sell' | 'identify' | 'repair'): Pack => ({
    verb: pick === 'sell' ? 'Sell' : pick === 'identify' ? 'Identify' : 'Repair',
    member: () => state.party[state.selected],
    of: (index) => {
      const s = shopView(state, def, state.selected).sell.find((r) => r.gridIndex === index);
      if (!s) return { price: '', reason: 'No such item.' };
      if (pick === 'identify' && s.identified) return { price: '', reason: 'Already identified.' };
      if (pick === 'repair' && !s.broken) return { price: '', reason: 'Not broken.' };
      return {
        price: gold(
          pick === 'sell' ? s.price : pick === 'identify' ? s.identifyPrice : s.repairPrice,
        ),
        reason: null,
      };
    },
    act: (index) =>
      pick === 'sell'
        ? sell(state, def, state.selected, index)
        : pick === 'identify'
          ? identify(state, def, state.selected, index)
          : repair(state, def, state.selected, index),
  });
  const name = (): string => state.party[state.selected]?.name ?? '';
  const h: House = house(
    ctx,
    def.name,
    () => [
      { label: 'Buy', list: 'buy', go: () => h.show('buy') },
      { label: 'Sell', list: 'sell', go: () => h.show('sell') },
      { label: 'Identify', list: 'identify', go: () => h.show('identify') },
      { label: 'Repair', list: 'repair', go: () => h.show('repair') },
    ],
    {
      buy: {
        title: () => 'For sale',
        empty: 'Nothing for sale.',
        rows: () =>
          shopView(state, def, state.selected).buy.map((b) => ({
            name: b.name,
            price: gold(b.price),
            reason: b.canBuy ? null : (b.reason ?? 'Not now.'),
            go: () => h.say(buy(state, def, b.id, state.selected)),
          })),
      },
      sell: {
        title: () => `${name()}'s pack: sell`,
        empty: 'Nothing to sell.',
        pack: pack('sell'),
      },
      identify: {
        title: () => `${name()}'s pack: identify`,
        empty: 'Nothing to identify.',
        pack: pack('identify'),
      },
      repair: {
        title: () => `${name()}'s pack: repair`,
        empty: 'Nothing to repair.',
        pack: pack('repair'),
      },
    },
  );
}

export function renderService(ctx: ScreenContext, ref: ServiceRef): void {
  switch (ref.kind) {
    case 'tavern':
      return renderTavern(ctx, ref.house);
    case 'temple':
      return renderTemple(ctx, ref.house);
    case 'guild':
      return renderGuild(ctx, ref.house);
    case 'trainer':
      return renderTrainer(ctx, ref.house);
    case 'shop':
      return renderShop(ctx, ref.house);
  }
}
