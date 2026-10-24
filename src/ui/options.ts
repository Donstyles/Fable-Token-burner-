/**
 * MM6's game menu (DESIGN.md 16.34; reference mm6-main-menu), the disk among the panel's ovals:
 * the game's name on a stone plaque over six slabs in two columns, Resume Game and Controls,
 * New Game and Load Game, Save Game and Quit, as MM6 set them. New Game over a game asks first;
 * Controls shows how the phone is played. Each slab does what the runtime offers
 * (`ScreenHooks.menu`); one it does not offer stands dim.
 */
import type { ScreenContext } from './context';
import { button, el } from './dom';
import { GAME_TITLE, START_AGAIN } from './title';

/** The touch controls (DESIGN.md 7.1), as the Controls slab shows them. */
export const CONTROLS: readonly [string, string][] = [
  ['Walk', 'Hold and drag on the left half of the view.'],
  ['Look and turn', 'Drag on the right half; while walking it turns the party.'],
  ['Talk, enter, attack', 'Tap a person, a door or a foe.'],
  ['A member', 'Tap a face to choose who acts; tap again for their pages.'],
  [
    'Books and ovals',
    'The right-hand panel: quests, notes, map, calendar; cast, rest, reference, menu.',
  ],
];

export function renderOptions(ctx: ScreenContext): void {
  const { frame, hooks } = ctx;
  frame.root.classList.add('screen-options');
  frame.setTitle('');
  const menu = hooks.menu ?? {};
  const plaque = el('div', 'options-plaque');
  plaque.dataset['paint'] = 'tablet';
  plaque.appendChild(el('h2', 'options-name', GAME_TITLE));
  const slab = (label: string, go: (() => void) | undefined, className = ''): HTMLElement => {
    const b = button(label, () => go?.(), { className: `options-slab ${className}`.trim() });
    if (!go) b.disabled = true;
    return b;
  };
  const showMenu = (): void => {
    const grid = el('div', 'options-grid');
    grid.append(
      slab('Resume Game', () => ctx.close()),
      slab('Controls', showControls),
      slab('New Game', menu.newGame ? showConfirm : undefined),
      slab('Load Game', menu.load),
      slab(
        'Save Game',
        menu.save
          ? () => frame.message(menu.save!() ? 'Game saved' : 'The game could not be saved')
          : undefined,
      ),
      slab('Quit', menu.quit, 'quit'),
    );
    frame.body.replaceChildren(plaque, grid);
  };
  const showConfirm = (): void => {
    const ask = el('div', 'options-ask');
    ask.append(el('p', 'options-question', START_AGAIN));
    const answers = el('div', 'options-answers');
    answers.append(
      button('Yes', () => menu.newGame?.(), { className: 'options-answer' }),
      button('No', showMenu, { className: 'options-answer' }),
    );
    ask.appendChild(answers);
    frame.body.replaceChildren(plaque, ask);
  };
  const showControls = (): void => {
    const list = el('div', 'ui-col options-controls');
    for (const [what, how] of CONTROLS) {
      const line = el('div', 'options-control');
      line.append(el('span', 'ui-k', what), el('span', 'ui-v', how));
      list.appendChild(line);
    }
    const back = el('div', 'options-answers');
    back.appendChild(button('Back', showMenu, { className: 'options-answer' }));
    frame.body.replaceChildren(list, back);
  };
  showMenu();
}
