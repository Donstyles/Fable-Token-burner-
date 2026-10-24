/**
 * The rest screen (Phase 5 step 10; DESIGN.md 16.34; reference mm6-rest), as MM6 laid it out
 * on its rose marble: the mountains in a picture across the top; at the left Rest & Heal 8
 * Hours with the food it eats beside it, and under it the box of waits without healing, until
 * dawn, an hour, five minutes; at the right the hourglass in its dark well with the hour, the
 * day, the month and the year, and Exit Rest under it. A choice is applied at once and the
 * screen stays, as MM6's, the hour moving on and what passed said on the message bar. With
 * foes about (`ScreenHooks.restBlocked`) every choice is refused with MM6's "There are hostile
 * creatures nearby!", and nothing passes.
 */
import type { ScreenContext } from './context';
import { button, el } from './dom';
import { restView, tryRest, type WAITS } from './rest-model';

type Choice = 'rest' | 'dawn' | keyof typeof WAITS;

export function renderRest(ctx: ScreenContext): void {
  const { state, frame, hooks, close } = ctx;

  const draw = (): void => {
    const v = restView(state);
    const ask = (kind: Choice): void => {
      const outcome = tryRest(state, kind, hooks.restBlocked?.() ?? null);
      if (!outcome.ok) {
        frame.message(outcome.message);
        return;
      }
      hooks.onRest(outcome.summary.kind);
      frame.message(outcome.summary.lines[0] ?? '');
      draw();
    };
    const picture = el('div', 'rest-picture');
    picture.dataset['paint'] = 'panorama';
    // Rest & Heal with the food it eats in a well at its end, the apple beside the count.
    const heal = el('div', 'rest-heal');
    const food = el('div', 'rest-food');
    food.dataset['paint'] = 'plaque';
    const apple = el('span', 'rest-apple');
    apple.dataset['paint'] = 'apple';
    food.append(apple, el('span', `rest-count${v.hungry ? ' bad' : ''}`, String(v.food)));
    heal.append(
      button('Rest & Heal 8 Hours', () => ask('rest'), { className: 'rest-slab' }),
      food,
    );
    const waits = el('div', 'rest-waits');
    waits.append(
      el('div', 'rest-waits-head', 'Wait without healing'),
      button('Wait until Dawn', () => ask('dawn'), { className: 'rest-slab' }),
      button('Wait 1 Hour', () => ask('hour'), { className: 'rest-slab' }),
      button('Wait 5 Minutes', () => ask('minutes'), { className: 'rest-slab' }),
    );
    const left = el('div', 'rest-left');
    left.append(heal, waits);
    // The hourglass in its well of dark green marble, MM6's clock and date beside it.
    const well = el('div', 'rest-well');
    well.dataset['paint'] = 'plaque-rest';
    const glass = el('div', 'rest-hourglass');
    glass.dataset['paint'] = 'hourglass';
    const date = el('div', 'rest-date');
    date.append(
      el('div', 'rest-time', v.clock12),
      line('Day', v.day),
      line('Month', v.month),
      line('Year', v.year),
    );
    well.append(glass, date);
    const right = el('div', 'rest-right');
    right.append(well, button('Exit Rest', close, { className: 'rest-slab rest-exit' }));
    const lower = el('div', 'rest-lower');
    lower.append(left, right);
    frame.body.replaceChildren(picture, lower);
  };

  draw();
}

function line(label: string, value: number): HTMLElement {
  const r = el('div', 'rest-line');
  r.append(el('span', '', label), el('span', '', String(value)));
  return r;
}
