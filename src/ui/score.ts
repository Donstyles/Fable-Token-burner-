/**
 * The score screen (DESIGN.md 17.13): MM6 ended with a congratulations page naming the
 * party, their levels and promotions, the game time and a final score. Ours comes up when a
 * slice's last quest is paid, on a book's page: the party, the days, the gold and the score,
 * and the game goes on.
 */
import { classDef } from '../game/classes';
import { scoreboard } from '../game/score';
import { bookBanner } from './books';
import type { ScreenContext } from './context';
import { el } from './dom';

export function renderScore(ctx: ScreenContext, title: string): void {
  const { state, frame } = ctx;
  bookBanner(ctx, title);
  const board = scoreboard(state);
  const page = el('div', 'ui-col scroll book-page score-page');
  page.appendChild(el('p', 'book-line book-title', 'Congratulations'));
  page.appendChild(
    el(
      'p',
      'book-line sub',
      'The dead lie still under the hills. Gullhaven sleeps, and the road runs on.',
    ),
  );
  page.appendChild(el('div', 'book-rule'));
  for (const m of board.members) {
    page.appendChild(
      el('p', 'book-line', `${m.name}, ${classDef(m.classId).name}, level ${m.level}`),
    );
  }
  page.appendChild(el('div', 'book-rule'));
  page.appendChild(el('p', 'book-line', `Days: ${board.days}`));
  page.appendChild(el('p', 'book-line', `Gold: ${board.gold}`));
  page.appendChild(el('p', 'book-line', `Experience: ${board.experience}`));
  page.appendChild(el('p', 'book-line book-title', `Score: ${board.score}`));
  frame.body.replaceChildren(page);
}
