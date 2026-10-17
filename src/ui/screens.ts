/**
 * The game screens (Phase 5 step 10): a book-shelf button bar at the bottom right and the
 * full-viewport screens it opens: character sheet, inventory, spellbook, rest, quest log and
 * automap, plus the town services a house opens. Plain DOM and CSS in the house style; phone
 * landscape with the safe areas respected. One screen is open at a time; opening pauses
 * nothing, the runtime decides that through the hooks. Each screen's rows and actions come
 * from a pure `*-model.ts` module, tested without a DOM.
 */
import './ui.css';
import './screens.css';
import { mulberry32 } from '../game/rng';
import type { GameState } from '../game/state';
import {
  SCREEN_NAMES,
  type ScreenContext,
  type ScreenHooks,
  type ScreenName,
  type ServiceDefs,
  type ServiceKind,
} from './context';
import { button, createFrame, el } from './dom';
import { renderInventory } from './inventory';
import { renderMap, renderQuests } from './journal';
import { renderRest } from './rest';
import { renderService, type ServiceRef } from './services';
import { renderSheet } from './sheet';
import { renderSpellbook } from './spellbook';
import { installPressFeel } from './press';

export type {
  CastEvent,
  RestKind,
  ScreenHooks,
  ScreenName,
  ServiceDefs,
  ServiceKind,
} from './context';
export { SCREEN_NAMES, SERVICE_KINDS } from './context';

export const SCREEN_LABELS: Record<ScreenName, string> = {
  sheet: 'Sheet',
  items: 'Items',
  spells: 'Spells',
  rest: 'Rest',
  quests: 'Quests',
  map: 'Map',
};

/** Gold line-art glyphs on the spines, 24-unit boxes. */
const SHELF_GLYPHS: Record<ScreenName, string> = {
  sheet: '<path d="M12 3v16M9 7h6M8 19h8"/><path d="M12 19v2"/>',
  items: '<path d="M8 8h8l2 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  spells:
    '<path d="M4 5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6z"/>',
  rest: '<path d="M14 3a8 8 0 1 0 7 11 7 7 0 0 1-7-11z"/>',
  quests: '<path d="M7 3h10v18H7z"/><path d="M9 7h6M9 11h6M9 15h4"/>',
  map: '<circle cx="12" cy="12" r="8"/><path d="M12 4v16M4 12h16"/><path d="M12 7l2 5-2 5-2-5z"/>',
};

const SCREEN_TITLES: Record<ScreenName, string> = {
  sheet: 'Character',
  items: 'Inventory',
  spells: 'Spellbook',
  rest: 'Rest',
  quests: 'Quest Log',
  map: 'Automap',
};

const RENDERERS: Record<ScreenName, (ctx: ScreenContext) => void> = {
  sheet: renderSheet,
  items: renderInventory,
  spells: renderSpellbook,
  rest: renderRest,
  quests: renderQuests,
  map: renderMap,
};

export interface Screens {
  open(name: ScreenName): void;
  /** Open a town service's screen for the given house record. */
  openService<K extends ServiceKind>(kind: K, house: ServiceDefs[K]): void;
  close(): void;
  /** The open screen, or null. */
  current(): ScreenName | ServiceKind | null;
  /** A tap on a portrait in the band: true when the open screen used it (a spell's target). */
  pickMember(index: number): boolean;
  toggleButtonBar(on: boolean): void;
  dispose(): void;
}

export function installScreens(
  uiLayer: HTMLElement,
  state: GameState,
  hooks: ScreenHooks,
): Screens {
  const rng = hooks.rng ?? mulberry32((state.seed ^ Math.floor(hooks.now() * 1000)) >>> 0 || 1);
  const shelf = el('div', 'ui-shelf');
  const books = el('div', 'ui-shelf-books');
  books.dataset['paint'] = 'alcove';
  shelf.appendChild(books);
  for (const name of SCREEN_NAMES) {
    // Book spines with gold glyphs, as MM6's shelf; rest is the round gold button.
    const b = button('', () => open(name), {
      className: `ui-shelf-btn ${name === 'rest' ? 'rest' : ''}`.trim(),
    });
    // The emblems gilded: gold strokes over the same strokes a pixel down in dark bronze;
    // the rest button's moon stamped dark with a lit lower edge.
    const glyph = SHELF_GLYPHS[name];
    b.innerHTML =
      name === 'rest'
        ? `<svg viewBox="0 0 24 24" aria-hidden="true"><g class="lit" transform="translate(0 1)">${glyph}</g><g class="ink">${glyph}</g></svg>`
        : `<svg viewBox="0 0 24 24" aria-hidden="true"><g class="shade" transform="translate(0.7 0.9)">${glyph}</g><g class="gilt">${glyph}</g><g class="sheen" transform="translate(-0.4 -0.5)">${glyph}</g></svg><span class="ui-shelf-label">${SCREEN_LABELS[name]}</span>`;
    b.title = SCREEN_LABELS[name];
    b.dataset['paint'] = name === 'rest' ? 'gold' : 'spine';
    (name === 'rest' ? shelf : books).appendChild(b);
  }
  uiLayer.appendChild(shelf);
  installPressFeel(uiLayer);

  let open_: { name: ScreenName | ServiceKind; root: HTMLElement } | null = null;
  let portraitClaim: ((index: number) => boolean) | null = null;

  function unmount(notify: boolean): void {
    if (!open_) return;
    open_.root.remove();
    open_ = null;
    portraitClaim = null;
    if (notify) hooks.onClose();
  }

  function close(): void {
    unmount(true);
  }

  function mount(
    name: ScreenName | ServiceKind,
    title: string,
    render: (ctx: ScreenContext) => void,
  ): void {
    unmount(false);
    const frame = createFrame(title, close);
    // The screen's own class, so the spellbook can be parchment and the sheet stone.
    frame.root.classList.add(`screen-${name}`);
    // The spellbook and the quest log are open books, as MM6's (paint.ts `book`).
    if (name === 'spells' || name === 'quests' || name === 'map') {
      const panel = frame.root.querySelector<HTMLElement>('.ui-panel');
      if (panel) panel.dataset['paint'] = 'book';
    }
    portraitClaim = null;
    render({
      state,
      hooks,
      frame,
      rng,
      close,
      claimPortraits: (handler) => {
        portraitClaim = handler;
      },
    });
    uiLayer.appendChild(frame.root);
    open_ = { name, root: frame.root };
    hooks.onOpen?.(name);
  }

  function open(name: ScreenName): void {
    mount(name, SCREEN_TITLES[name], RENDERERS[name]);
  }

  return {
    open,
    openService(kind, house) {
      const ref = { kind, house } as ServiceRef;
      mount(kind, house.name, (ctx) => renderService(ctx, ref));
    },
    close,
    current() {
      return open_?.name ?? null;
    },
    pickMember(index) {
      return portraitClaim ? portraitClaim(index) : false;
    },
    toggleButtonBar(on) {
      shelf.classList.toggle('hidden', !on);
    },
    dispose() {
      unmount(false);
      shelf.remove();
    },
  };
}
