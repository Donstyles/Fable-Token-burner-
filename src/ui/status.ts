/**
 * The status line (DESIGN.md 9, 16): MM6's one-line stone bar above the portraits. What the
 * party taps is named here ("The Inn", "Goblin Scout"), and the fight is told here ("Alric
 * hits Bandit for 7"). A line holds for a few seconds, then clears; nothing else pops up
 * over the view.
 */
import { el } from './dom';
import './hud.css';

export interface StatusLine {
  say(text: string, holdMs?: number): void;
  dispose(): void;
}

export function createStatusLine(parent: HTMLElement): StatusLine {
  const root = el('div', 'status-line');
  const text = el('span', 'status-text');
  root.appendChild(text);
  parent.appendChild(root);
  let timer = 0;
  return {
    say(line, holdMs = 4000) {
      text.textContent = line;
      root.classList.add('shown');
      window.clearTimeout(timer);
      timer = window.setTimeout(() => root.classList.remove('shown'), holdMs);
    },
    dispose() {
      window.clearTimeout(timer);
      root.remove();
    },
  };
}
