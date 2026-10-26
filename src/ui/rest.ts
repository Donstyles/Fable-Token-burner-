/**
 * The rest screen (Phase 5 step 10; DESIGN.md 16.34; reference mm6-rest), as MM6 laid it out
 * on its rose marble: the vista across the top, the owner's mountains under a live sky at the
 * hour of the game clock (`vista.ts`); at the left Rest & Heal 8 Hours with the food it eats
 * beside it, and under it the box of waits without healing, until dawn, an hour, five minutes;
 * at the right the hourglass in its dark well with the hour, the day, the month and the year,
 * and Exit Rest under it. A choice is applied to the state at once, then plays out as MM6's
 * did: the hours run on the clock, the sand runs in the hourglass and the sun and moon cross
 * the vista, half a second an hour, and what passed is said on the message bar when it is
 * done; the screen stays. With foes about (`ScreenHooks.restBlocked`) every choice is refused
 * with MM6's "There are hostile creatures nearby!", and nothing passes.
 */
import type { ScreenContext } from './context';
import { button, el } from './dom';
import { restView, tryRest, type WAITS } from './rest-model';
import { VISTA_STEP, VistaPainter } from './vista';

type Choice = 'rest' | 'dawn' | keyof typeof WAITS;

/** How long a wait plays, seconds: half a second an hour, no less than 0.6 nor more than 6. */
export function playTime(minutes: number): number {
  return Math.max(0.6, Math.min(6, (minutes / 60) * 0.5));
}

export function renderRest(ctx: ScreenContext): void {
  const { state, frame, hooks, close } = ctx;
  // The vista's canvas, kept across redraws and drawn every tenth of a second while it is up.
  const picture = el('div', 'rest-picture');
  const view = document.createElement('canvas');
  view.className = 'rest-vista';
  picture.append(view);
  const vista = new VistaPainter(view);
  /** The clock the screen shows: the state's, or a wait's as it plays. */
  let shown = state.clock.minutes;
  /** A wait playing: the clock runs from `from` to `to`, then `done` tells what passed. */
  let play: { from: number; to: number; start: number; dur: number; done: () => void } | null =
    null;
  let glass: HTMLElement | null = null;
  let date: HTMLElement | null = null;

  const dateBox = (): HTMLElement => {
    const v = restView(state, Math.floor(shown));
    const box = el('div', 'rest-date');
    box.append(
      el('div', 'rest-time', v.clock12),
      line('Day', v.day),
      line('Month', v.month),
      line('Year', v.year),
    );
    return box;
  };

  const draw = (): void => {
    const v = restView(state);
    const ask = (kind: Choice): void => {
      if (play) return;
      const from = state.clock.minutes;
      const outcome = tryRest(state, kind, hooks.restBlocked?.() ?? null);
      if (!outcome.ok) {
        frame.message(outcome.message);
        return;
      }
      const to = state.clock.minutes;
      play = {
        from,
        to,
        start: performance.now(),
        dur: playTime(to - from),
        done: () => {
          play = null;
          shown = state.clock.minutes;
          hooks.onRest(outcome.summary.kind);
          if (!view.isConnected) return;
          frame.message(outcome.summary.lines[0] ?? '');
          draw();
        },
      };
    };
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
    glass = el('div', 'rest-hourglass');
    glass.dataset['paint'] = 'hourglass';
    date = dateBox();
    well.append(glass, date);
    const right = el('div', 'rest-right');
    right.append(
      well,
      button(
        'Exit Rest',
        () => {
          if (!play) close();
        },
        { className: 'rest-slab rest-exit' },
      ),
    );
    const lower = el('div', 'rest-lower');
    lower.append(left, right);
    frame.body.replaceChildren(picture, lower);
  };

  let step = -1;
  /** Frames the box has been out of the page: before it first shows, a few are waited out. */
  let away = 0;
  let shownOnce = false;
  const tick = (): void => {
    // Closed: a wait still playing is over at once, and the loop ends.
    if (!view.isConnected) {
      if (shownOnce || ++away > 120) {
        play?.done();
        return;
      }
      requestAnimationFrame(tick);
      return;
    }
    shownOnce = true;
    requestAnimationFrame(tick);
    // The clock a wait's start was read from (a frame's own time can run ahead of it).
    const now = performance.now();
    const at = Math.floor(now / 1000 / VISTA_STEP);
    if (at === step) return;
    step = at;
    if (play) {
      const p = Math.min(1, (now - play.start) / 1000 / play.dur);
      shown = play.from + (play.to - play.from) * p;
      if (glass)
        glass.dataset['paint'] =
          p < 1 ? `hourglass:${Math.min(8, Math.floor(p * 9))}` : 'hourglass';
      if (date) {
        const next = dateBox();
        date.replaceWith(next);
        date = next;
      }
      if (p >= 1) play.done();
    }
    // The canvas at the box's own pixels, the UI's pitch.
    const w = picture.clientWidth;
    const h = picture.clientHeight;
    if (!w || !h) return;
    if (view.width !== w || view.height !== h) {
      view.width = w;
      view.height = h;
    }
    vista.draw(shown, now / 1000);
  };

  draw();
  requestAnimationFrame(tick);
}

function line(label: string, value: number): HTMLElement {
  const r = el('div', 'rest-line');
  r.append(el('span', '', label), el('span', '', String(value)));
  return r;
}
