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

function priceNote(price: number, reason: string | null): string {
  return reason ?? `${price} gold`;
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
    const col = el('div', 'ui-col');
    col.appendChild(goldLine(state.gold));
    col.appendChild(heading('Healing'));
    for (const row of templeRows(state, house)) {
      const line = el('div', 'ui-row');
      const text = el('div', 'grow');
      text.append(el('div', '', row.name), el('div', 'sub', row.condition));
      line.append(
        text,
        el('span', 'ui-v', `${row.hp}/${row.maxHp}`),
        button(
          'Heal',
          () => {
            frame.message(heal(state, house, row.index).message);
            draw();
          },
          { className: 'primary', disabled: !row.canHeal, note: priceNote(row.price, row.reason) },
        ),
      );
      col.appendChild(line);
    }
    frame.body.replaceChildren(col);
  };
  draw();
}

function renderGuild(ctx: ScreenContext, house: ServiceDefs['guild']): void {
  const { state, frame } = ctx;
  let active = state.selected;
  const draw = (): void => {
    frame.tabs.replaceChildren(
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
    for (const s of v.spells) {
      const line = el('div', 'ui-row');
      if (s.known) line.classList.add('dim');
      const text = el('div', 'grow');
      text.append(el('div', '', s.name), el('div', 'sub', `Level ${s.level}`));
      line.append(
        text,
        button(
          'Buy',
          () => {
            frame.message(buyBook(state, house, s.id, active).message);
            draw();
          },
          { className: 'primary', disabled: !s.canBuy, note: priceNote(s.price, s.reason) },
        ),
      );
      right.appendChild(line);
    }
    frame.body.replaceChildren(left, right);
  };
  draw();
}

function renderTrainer(ctx: ScreenContext, house: ServiceDefs['trainer']): void {
  const { state, frame } = ctx;
  const draw = (): void => {
    const col = el('div', 'ui-col');
    col.append(goldLine(state.gold), heading(`Training to level ${house.maxLevel}`));
    for (const row of trainerRows(state, house)) {
      const line = el('div', 'ui-row');
      const text = el('div', 'grow');
      const sp = row.spGain > 0 ? `, +${row.spGain} SP` : '';
      text.append(
        el('div', '', `${row.name} · level ${row.level}`),
        el('div', 'sub', `${row.xp} experience · next level: +${row.hpGain} HP${sp}`),
      );
      line.append(
        text,
        button(
          'Train',
          () => {
            frame.message(trainMember(state, house, row.index).message);
            draw();
          },
          { className: 'primary', disabled: !row.canTrain, note: priceNote(row.price, row.reason) },
        ),
      );
      col.appendChild(line);
    }
    frame.body.replaceChildren(col);
  };
  draw();
}

function renderShop(ctx: ScreenContext, house: ServiceDefs['shop']): void {
  const { state, frame } = ctx;
  let active = state.selected;
  const act = (r: ActionOutcome): void => {
    frame.message(r.message);
    draw();
  };
  const draw = (): void => {
    frame.tabs.replaceChildren(
      memberTabs(state.party, active, (i) => {
        active = i;
        draw();
      }),
    );
    const v = shopView(state, house, active);
    const left = el('div', 'ui-col scroll');
    left.append(goldLine(state.gold), heading('For sale'));
    if (v.merchant > 0) left.appendChild(note(`Merchant: ${v.merchant} % better prices.`, 'good'));
    for (const b of v.buy) {
      const line = el('div', 'ui-row');
      line.append(
        el('span', 'grow', b.name),
        button('Buy', () => act(buy(state, house, b.id, active)), {
          className: 'primary',
          disabled: !b.canBuy,
          note: priceNote(b.price, b.reason),
        }),
      );
      left.appendChild(line);
    }
    const right = el('div', 'ui-col scroll');
    right.appendChild(heading(`${state.party[active]?.name ?? ''}'s pack`));
    if (v.sell.length === 0) right.appendChild(note('Nothing to sell.'));
    for (const s of v.sell) {
      const line = el('div', 'ui-row');
      if (s.broken) line.classList.add('dim');
      line.appendChild(el('span', 'grow', s.name));
      if (!s.identified) {
        line.appendChild(
          button('Identify', () => act(identify(state, house, active, s.gridIndex)), {
            note: `${s.identifyPrice} gold`,
          }),
        );
      }
      if (s.broken) {
        line.appendChild(
          button('Repair', () => act(repair(state, house, active, s.gridIndex)), {
            note: `${s.repairPrice} gold`,
          }),
        );
      }
      line.appendChild(
        button('Sell', () => act(sell(state, house, active, s.gridIndex)), {
          note: `${s.price} gold`,
        }),
      );
      right.appendChild(line);
    }
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
