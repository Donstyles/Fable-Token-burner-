/**
 * The title screen (ROADMAP M0, interface.md 11.1): the game's name over the whole screen and
 * the way in, Continue when a game is saved and New Game. A new game over a saved one asks
 * first, as MM6's menu asked a second click: "Start again? Your saved game will be lost."
 *
 * Text only until the owner's title art comes (MM6-GAPS 40: no placeholder pictures): the
 * screens' own kit, the band's marble round the edges and over the phone's safe areas, the
 * slate in its marble frame, the name in the heading face, the choices on MM6's marble slabs
 * and gold ovals, every word bitmap type (paint.ts, pixel-text.ts). It stands over the world,
 * the band and the loading veil (z-index 80), so it can go up before anything has loaded.
 */
import './ui.css';
import './title.css';
import { button, el } from './dom';
import { installPaint, installPaintedButtons } from './paint';
import { installPixelText } from './pixel-text';
import { installPressFeel } from './press';

export interface TitleScreenOptions {
  /** A saved game exists: Continue is offered and New Game asks before it starts over. */
  hasSave: boolean;
  onContinue(): void;
  onNewGame(): void;
}

export interface TitleScreen {
  /** Take the screen down; safe to call more than once. */
  dispose(): void;
}

/** The game's name as the title screen sets it (not the world's: DESIGN.md 13, 2026-10-19). */
export const GAME_TITLE = 'Fable Token Burner';

/** The question New Game asks over a saved game. */
export const START_AGAIN = 'Start again? Your saved game will be lost.';

export function createTitleScreen(parent: HTMLElement, opts: TitleScreenOptions): TitleScreen {
  installPaint();
  const root = el('div', 'title-root');
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-label', GAME_TITLE);
  const panel = el('div', 'ui-panel title-panel');
  panel.dataset['paint'] = 'marble-frame';
  const name = el('h1', 'title-name', GAME_TITLE);
  const menu = el('div', 'title-menu');
  panel.append(name, menu);
  root.appendChild(panel);

  let disposed = false;
  let chosen = false;
  /** Each way in is taken once, however many fingers land on it. */
  const take = (go: () => void): void => {
    if (disposed || chosen) return;
    chosen = true;
    go();
  };

  const showMenu = (): void => {
    const items: HTMLElement[] = [];
    if (opts.hasSave) {
      items.push(
        button('Continue', () => take(() => opts.onContinue()), {
          className: 'title-choice primary',
        }),
      );
    }
    items.push(
      button('New Game', () => (opts.hasSave ? showConfirm() : take(() => opts.onNewGame())), {
        className: `title-choice${opts.hasSave ? '' : ' primary'}`,
      }),
    );
    menu.classList.remove('asking');
    menu.replaceChildren(...items);
  };

  const showConfirm = (): void => {
    if (disposed || chosen) return;
    const question = el('p', 'title-question', START_AGAIN);
    const answers = el('div', 'title-answers');
    answers.append(
      button('Yes', () => take(() => opts.onNewGame()), { className: 'title-answer' }),
      button('No', () => showMenu(), { className: 'title-answer primary' }),
    );
    menu.classList.add('asking');
    menu.replaceChildren(question, answers);
  };

  // Escape backs out of the question, as a No.
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && menu.classList.contains('asking')) {
      e.preventDefault();
      showMenu();
    }
  };
  addEventListener('keydown', onKey);

  showMenu();
  parent.appendChild(root);
  // The kit's paint and type, whether or not the band has been raised yet (each is watched
  // once, so a later band does not paint it twice over).
  installPaintedButtons(root);
  installPixelText(root);
  installPressFeel(root);

  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      removeEventListener('keydown', onKey);
      root.remove();
    },
  };
}
