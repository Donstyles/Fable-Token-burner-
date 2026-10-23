/**
 * The town service screens (Phase 5 step 10): tavern (room, food), temple (heal and cure by
 * member with the price), guild (membership, spellbooks for the active member), trainer
 * (level up per member) and shop (buy from the stock, sell from the active member's pack,
 * identify and repair). Each is driven by its house record through `services-model.ts`.
 */
import type { ScreenContext, ServiceDefs, ServiceKind } from './context';
import { button, el, heading, kv, memberTabs, note } from './dom';
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

/** A house to open: its kind and the record of that kind. */
export type ServiceRef = { [K in ServiceKind]: { kind: K; house: ServiceDefs[K] } }[ServiceKind];

function goldLine(gold: number): HTMLElement {
  return kv('Gold', gold, 'svc-gold');
}

/** A list's heading with the party's gold at its right, so the rows below get the room. */
function headLine(title: string, gold: number): HTMLElement {
  const row = el('div', 'svc-head');
  row.append(heading(title), goldLine(gold));
  return row;
}

/**
 * A row's action: always MM6's gold oval with its word alone (owner, 2026-10-23: a price or a
 * reason in the button made it a wide slab of another style). One that cannot be taken now
 * sits dim and, tapped, says why on the message line.
 */
function act(
  ctx: ScreenContext,
  label: string,
  reason: string | null,
  onTap: () => void,
): HTMLButtonElement {
  const b = button(label, () => {
    if (reason !== null) ctx.frame.message(reason);
    else onTap();
  });
  b.classList.add('svc-act');
  if (reason !== null) {
    b.classList.add('off');
    b.title = reason;
  }
  return b;
}

/**
 * The price, or the reason the row's action cannot be taken (a member's training or healing),
 * dim, in its own column.
 */
function priceCell(price: number, reason: string | null): HTMLElement {
  return el('span', `svc-price ${reason === null ? '' : 'dim'}`.trim(), reason ?? `${price} gold`);
}

/**
 * A list's rows as one table, so names, figures, prices and the gold ovals stand in columns
 * whatever wraps (owner, 2026-10-23: the row buttons and their notes ran out of line).
 */
function table(className: string): HTMLElement {
  return el('div', `svc-rows ${className}`);
}

/** One row of the table: its cells, then the gold ovals in the last. */
function tableRow(cells: HTMLElement[], acts: HTMLElement[], dim = false): HTMLElement {
  const line = el('div', 'svc-line');
  if (dim) line.classList.add('dim');
  const end = el('span', 'svc-acts');
  end.append(...acts);
  line.append(...cells, end);
  return line;
}

function renderTavern(ctx: ScreenContext, house: ServiceDefs['tavern']): void {
  const { state, frame, hooks, close } = ctx;
  const draw = (rested: ActionOutcome | null): void => {
    const v = tavernView(state, house);
    const left = el('div', 'ui-col narrow');
    left.append(goldLine(v.gold), kv('Food', `${v.food} / ${v.foodCapacity}`));
    const right = el('div', 'ui-col');
    if (rested) {
      right.appendChild(heading('The night'));
      for (const line of rested.lines ?? []) right.appendChild(note(line));
      right.appendChild(button('Done', close, { className: 'primary' }));
    } else {
      right.appendChild(heading(house.name));
      const actions = el('div', 'ui-col rest-actions');
      actions.append(
        button(
          'Rent a room',
          () => {
            const r = rent(state, house);
            frame.message(r.message);
            if (r.ok) hooks.onRest('room');
            draw(r.ok ? r : null);
          },
          {
            className: 'primary',
            disabled: !v.canRent,
            note: `${v.roomPrice} gold · rest, no food`,
          },
        ),
        button(
          'Buy food',
          () => {
            frame.message(buyFoodAction(state, house).message);
            draw(null);
          },
          {
            disabled: !v.canBuyFood,
            note: v.foodReason ?? `${v.foodUnits} for ${v.foodCost} gold (${v.foodPrice} each)`,
          },
        ),
      );
      right.appendChild(actions);
    }
    frame.body.replaceChildren(left, right);
  };
  draw(null);
}

function renderTemple(ctx: ScreenContext, house: ServiceDefs['temple']): void {
  const { state, frame } = ctx;
  const draw = (): void => {
    // One line a member, the four in sight without scrolling.
    const col = el('div', 'ui-col');
    col.appendChild(headLine('Healing', state.gold));
    const rows = table('svc-temple');
    for (const row of templeRows(state, house)) {
      rows.appendChild(
        tableRow(
          [
            el('span', 'svc-name', row.name),
            el('span', 'sub', row.condition),
            el('span', 'ui-v svc-num', `${row.hp} / ${row.maxHp}`),
            priceCell(row.price, row.reason),
          ],
          [
            act(ctx, 'Heal', row.reason, () => {
              frame.message(heal(state, house, row.index).message);
              draw();
            }),
          ],
        ),
      );
    }
    col.appendChild(rows);
    frame.body.replaceChildren(col);
  };
  draw();
}

function renderGuild(ctx: ScreenContext, house: ServiceDefs['guild']): void {
  const { state, frame } = ctx;
  let active = state.selected;
  const draw = (): void => {
    // The members beside the title; the message line keeps the foot's whole width.
    frame.aside.replaceChildren(
      memberTabs(state.party, active, (i) => {
        active = i;
        draw();
      }),
    );
    const v = guildView(state, house, active);
    const left = el('div', 'ui-col narrow');
    left.append(goldLine(state.gold), heading('Membership'));
    if (v.member) left.appendChild(note('The party are members.', 'good'));
    else {
      left.appendChild(
        button(
          'Join',
          () => {
            frame.message(join(state, house).message);
            draw();
          },
          { className: 'primary', disabled: !v.canJoin, note: `${v.fee} gold` },
        ),
      );
    }
    const right = el('div', 'ui-col scroll');
    right.appendChild(heading(`Spellbooks for ${state.party[active]?.name ?? ''}`));
    const rows = table('svc-books');
    for (const s of v.spells) {
      const text = el('div', 'svc-name');
      text.append(el('div', '', s.name), el('div', 'sub', `Level ${s.level}`));
      rows.appendChild(
        tableRow(
          [text, priceCell(s.price, null)],
          [
            act(ctx, 'Buy', s.canBuy ? null : (s.reason ?? 'Not now.'), () => {
              frame.message(buyBook(state, house, s.id, active).message);
              draw();
            }),
          ],
          s.known,
        ),
      );
    }
    right.appendChild(rows);
    frame.body.replaceChildren(left, right);
  };
  draw();
}

function renderTrainer(ctx: ScreenContext, house: ServiceDefs['trainer']): void {
  const { state, frame } = ctx;
  const draw = (): void => {
    // One line a member in aligned columns, the four in sight without scrolling (owner,
    // 2026-10-23: two lines a member ran Tobin's off the box and Sera's out of sight).
    const col = el('div', 'ui-col');
    col.appendChild(headLine(`Training to level ${house.maxLevel}`, state.gold));
    const rows = table('svc-trainer');
    for (const row of trainerRows(state, house)) {
      const sp = row.spGain > 0 ? `, +${row.spGain} SP` : '';
      rows.appendChild(
        tableRow(
          [
            el('span', 'svc-name', row.name),
            el('span', 'ui-v svc-num', `Level ${row.level}`),
            el('span', 'sub', `next +${row.hpGain} HP${sp}`),
            priceCell(row.price, row.reason),
          ],
          [
            act(ctx, 'Train', row.reason, () => {
              frame.message(trainMember(state, house, row.index).message);
              draw();
            }),
          ],
        ),
      );
    }
    col.appendChild(rows);
    frame.body.replaceChildren(col);
  };
  draw();
}

function renderShop(ctx: ScreenContext, house: ServiceDefs['shop']): void {
  const { state, frame } = ctx;
  let active = state.selected;
  const done = (r: ActionOutcome): void => {
    frame.message(r.message);
    draw();
  };
  const draw = (): void => {
    // The members beside the title; the message line keeps the foot's whole width.
    frame.aside.replaceChildren(
      memberTabs(state.party, active, (i) => {
        active = i;
        draw();
      }),
    );
    const v = shopView(state, house, active);
    // Each list scrolls in its box when the stock or the pack is longer than it.
    const left = el('div', 'ui-col scroll');
    left.appendChild(headLine('For sale', state.gold));
    if (v.merchant > 0) left.appendChild(note(`Merchant: ${v.merchant} % better prices.`, 'good'));
    const wares = table('svc-wares');
    for (const b of v.buy) {
      wares.appendChild(
        tableRow(
          [el('span', 'svc-name', b.name), priceCell(b.price, null)],
          [
            act(ctx, 'Buy', b.canBuy ? null : (b.reason ?? 'Not now.'), () =>
              done(buy(state, house, b.id, active)),
            ),
          ],
        ),
      );
    }
    left.appendChild(wares);
    const right = el('div', 'ui-col scroll');
    right.appendChild(heading(`${state.party[active]?.name ?? ''}'s pack`));
    if (v.sell.length === 0) right.appendChild(note('Nothing to sell.'));
    const pack = table('svc-wares');
    for (const s of v.sell) {
      // What the smith would charge first, under the name: the buttons carry their word alone.
      const text = el('div', 'svc-name');
      text.appendChild(el('div', '', s.name));
      const extra = [
        s.identified ? '' : `identify ${s.identifyPrice} gold`,
        s.broken ? `repair ${s.repairPrice} gold` : '',
      ].filter(Boolean);
      if (extra.length) text.appendChild(el('div', 'sub', extra.join(' · ')));
      const acts: HTMLElement[] = [];
      if (!s.identified) {
        acts.push(
          act(ctx, 'Identify', null, () => done(identify(state, house, active, s.gridIndex))),
        );
      }
      if (s.broken) {
        acts.push(act(ctx, 'Repair', null, () => done(repair(state, house, active, s.gridIndex))));
      }
      acts.push(act(ctx, 'Sell', null, () => done(sell(state, house, active, s.gridIndex))));
      pack.appendChild(tableRow([text, priceCell(s.price, null)], acts, s.broken));
    }
    right.appendChild(pack);
    frame.body.replaceChildren(left, right);
  };
  draw();
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
