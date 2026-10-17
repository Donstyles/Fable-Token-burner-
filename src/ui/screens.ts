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
  // Line art, as MM6's gold emblems (critics, round 7): a sword, a satchel, an open book, a
  // scroll, a compass rose; 24 units wide, 40 tall.
  sheet: '<path d="M12 2v24M8 8h8M7 26h10M12 26v10M10 36h4"/>',
  items: '<path d="M6 14h12l3 22H3zM9 14v-4a3 3 0 0 1 6 0v4"/>',
  spells: '<path d="M2 8c4-2 7-2 10 1v24c-3-3-6-3-10-1zM22 8c-4-2-7-2-10 1v24c3-3 6-3 10-1z"/>',
  rest: '<path d="M14 3a8 8 0 1 0 7 11 7 7 0 0 1-7-11z"/>',
  quests: '<path d="M6 4h12v28H6zM9 11h6M9 17h6M9 23h4M4 32a2 2 0 0 0 4 0"/>',
  map: '<path d="M12 4l3 10 9 3-9 3-3 10-3-10-9-3 9-3z"/><circle cx="12" cy="17" r="3"/>',
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
        : `<svg viewBox="0 0 24 40" aria-hidden="true"><g class="shade" transform="translate(1 1.2)">${glyph}</g><g class="gilt">${glyph}</g><g class="sheen" transform="translate(-0.6 -0.6) scale(0.96)">${glyph}</g></svg><span class="ui-shelf-label">${SCREEN_LABELS[name]}</span>`;
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
