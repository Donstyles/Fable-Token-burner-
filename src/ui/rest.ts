/**
 * The rest screen (Phase 5 step 10): the clock and date, daylight, the food, each member's
 * points and condition, and the choices: rest eight hours (one food), wait until dawn, or
 * cancel. The outcome is shown in plain lines before the screen closes. With foes about
 * (`ScreenHooks.restBlocked`) a choice is refused on the screen's message line over them,
 * as MM6's "There are hostile creatures nearby!", and nothing passes.
 */
import type { ScreenContext } from './context';
import { button, el, heading, kv, note } from './dom';
import { type RestSummary, restView, tryRest } from './rest-model';

export function renderRest(ctx: ScreenContext): void {
  const { state, frame, hooks, close } = ctx;

  const draw = (summary: RestSummary | null): void => {
    const v = restView(state);
    const left = el('div', 'ui-col narrow');
    const well = el('div', 'rest-well');
    well.dataset['paint'] = 'plaque-rest';
    well.append(el('div', 'rest-clock', v.time), el('div', 'rest-date', v.date));
    // The clock, the food and a line a member (screens critic, round 13), so the party fits
    // the box inside the phone's insets (owner, 2026-10-23: Tobin's line was cut, Sera's
    // gone); the daylight and a hungry party's warning stand with the choices.
    left.append(well, kv('Food', v.food, v.hungry ? 'bad' : ''));
    left.appendChild(heading('Party'));
    // A line a member, so the party fits the frame (screens critic, round 13); the condition
    // only when it is not Good.
    for (const m of v.members) {
      const line = el('div', 'ui-row rest-member');
      if (!m.living) line.classList.add('dim');
      const points = el(
        'div',
        'ui-v',
        `${m.hp}/${m.maxHp}${m.maxSp ? `  ${m.sp}/${m.maxSp}` : ''}`,
      );
      line.appendChild(el('div', 'grow', m.name));
      if (m.condition !== 'Good') line.appendChild(el('div', 'sub', m.condition));
      line.appendChild(points);
      left.appendChild(line);
    }

    const right = el('div', 'ui-col');
    if (summary) {
      right.appendChild(heading(summary.kind === 'dawn' ? 'Dawn' : 'Rested'));
      for (const line of summary.lines) right.appendChild(note(line));
      right.appendChild(button('Done', close, { className: 'primary' }));
    } else {
      // The screen's message line heads the choices: "Rest", or why the party may not. It
      // stays in sight however little room the phone's insets leave the column.
      const message = heading('Rest');
      message.classList.add('rest-message');
      message.setAttribute('role', 'status');
      right.appendChild(message);
      right.appendChild(note(v.daylight ? 'It is light.' : 'It is dark.'));
      if (v.hungry) right.appendChild(note('No food: resting heals nothing and weakens.', 'warn'));
      const ask = (kind: 'rest' | 'dawn'): void => {
        const outcome = tryRest(state, kind, hooks.restBlocked?.() ?? null);
        if (!outcome.ok) {
          message.textContent = outcome.message;
          message.classList.add('refused');
          return;
        }
        hooks.onRest(outcome.summary.kind);
        draw(outcome.summary);
      };
      const actions = el('div', 'rest-actions');
      actions.append(
        button('Rest 8 hours', () => ask('rest'), {
          className: 'primary',
          note: v.hungry ? 'no food' : '1 food',
        }),
        button('Wait until dawn', () => ask('dawn'), { note: v.dawnIn }),
        button('Cancel', close),
      );
      right.appendChild(actions);
    }
    frame.body.replaceChildren(left, right);
  };

  draw(null);
}
