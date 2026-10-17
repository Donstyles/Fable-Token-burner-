/**
 * The rest screen (Phase 5 step 10): the clock and date, daylight, the food, each member's
 * points and condition, and the choices: rest eight hours (one food), wait until dawn, or
 * cancel. The outcome is shown in plain lines before the screen closes.
 */
import type { ScreenContext } from './context';
import { button, el, heading, kv, note } from './dom';
import { doRest, doWait, type RestSummary, restView } from './rest-model';

export function renderRest(ctx: ScreenContext): void {
  const { state, frame, hooks, close } = ctx;

  const draw = (summary: RestSummary | null): void => {
    const v = restView(state);
    const left = el('div', 'ui-col narrow');
    left.append(
      el('div', 'rest-clock', v.time),
      el('div', 'rest-date', v.date),
      note(v.daylight ? 'It is light.' : 'It is dark.'),
      kv('Food', v.food, v.hungry ? 'bad' : ''),
    );
    if (v.hungry) left.appendChild(note('No food: resting heals nothing and weakens.', 'warn'));
    left.appendChild(heading('Party'));
    for (const m of v.members) {
      const line = el('div', 'ui-row');
      if (!m.living) line.classList.add('dim');
      const text = el('div', 'grow');
      text.append(el('div', '', m.name), el('div', 'sub', m.condition));
      const points = el(
        'div',
        'ui-v',
        `${m.hp}/${m.maxHp}${m.maxSp ? `  ${m.sp}/${m.maxSp}` : ''}`,
      );
      line.append(text, points);
      left.appendChild(line);
    }

    const right = el('div', 'ui-col');
    if (summary) {
      right.appendChild(heading(summary.kind === 'dawn' ? 'Dawn' : 'Rested'));
      for (const line of summary.lines) right.appendChild(note(line));
      right.appendChild(button('Done', close, { className: 'primary' }));
    } else {
      right.appendChild(heading('Rest'));
      const actions = el('div', 'rest-actions');
      actions.append(
        button('Rest 8 hours', () => act(doRest(state)), {
          className: 'primary',
          note: v.hungry ? 'no food' : '1 food',
        }),
        button('Wait until dawn', () => act(doWait(state)), { note: v.dawnIn }),
        button('Cancel', close),
      );
      right.appendChild(actions);
    }
    frame.body.replaceChildren(left, right);
  };

  const act = (summary: RestSummary): void => {
    hooks.onRest(summary.kind);
    draw(summary);
  };

  draw(null);
}
