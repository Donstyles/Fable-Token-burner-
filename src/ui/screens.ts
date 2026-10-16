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
import { renderRest } from './rest';
import { renderService, type ServiceRef } from './services';
import { renderSheet } from './sheet';
import { renderSpellbook } from './spellbook';

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
  quests: renderSheet,
  map: renderSheet,
};

export interface Screens {
  open(name: ScreenName): void;
  /** Open a town service's screen for the given house record. */
  openService<K extends ServiceKind>(kind: K, house: ServiceDefs[K]): void;
  close(): void;
  /** The open screen, or null. */
  current(): ScreenName | ServiceKind | null;
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
  for (const name of SCREEN_NAMES) {
    shelf.appendChild(button(SCREEN_LABELS[name], () => open(name), { className: 'ui-shelf-btn' }));
  }
  uiLayer.appendChild(shelf);

  let open_: { name: ScreenName | ServiceKind; root: HTMLElement } | null = null;

  function unmount(notify: boolean): void {
    if (!open_) return;
    open_.root.remove();
    open_ = null;
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
    render({ state, hooks, frame, rng, close });
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
    toggleButtonBar(on) {
      shelf.classList.toggle('hidden', !on);
    },
    dispose() {
      unmount(false);
      shelf.remove();
    },
  };
}
