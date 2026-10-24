/**
 * The game screens (Phase 5 step 10; DESIGN.md 16.34): each opens in the view's box, as MM6's
 * did, the band and the panel standing round it: character sheet, inventory, spellbook, rest,
 * quest log and automap, plus the town services a house opens. The panel's books and ovals
 * (panel.ts) and the band's portraits open them through the runtime. Plain DOM and CSS in the
 * house style. One screen is open at a time; opening pauses nothing, the runtime decides that
 * through the hooks. Each screen's rows and actions come from a pure `*-model.ts` module,
 * tested without a DOM.
 */
import './ui.css';
import './screens.css';
import { mulberry32 } from '../game/rng';
import type { GameState } from '../game/state';
import {
  type ScreenContext,
  type ScreenHooks,
  type ScreenName,
  type ServiceDefs,
  type ServiceKind,
} from './context';
import { createFrame, watchScrolls } from './dom';
import { renderCalendar, renderNotes, renderQuests } from './books';
import { renderAwards, renderSheet, renderSkills } from './character';
import { renderInventory } from './inventory';
import { renderMap } from './journal';
import { renderOptions } from './options';
import { renderReference } from './reference';
import { renderRest } from './rest';
import { renderService, type ServiceRef } from './services';
import { renderSpellbook } from './spellbook';
import { installPressFeel } from './press';

export type {
  CastEvent,
  MapMark,
  RestKind,
  ScreenHooks,
  ScreenName,
  ServiceDefs,
  ServiceKind,
} from './context';
export { SCREEN_NAMES, SERVICE_KINDS } from './context';
export { HOSTILES_NEARBY } from './rest-model';

export const SCREEN_LABELS: Record<ScreenName, string> = {
  sheet: 'Statistics',
  skills: 'Skills',
  items: 'Inventory',
  awards: 'Awards',
  spells: 'Spells',
  rest: 'Rest',
  reference: 'Quick Reference',
  options: 'Options',
  quests: 'Quests',
  notes: 'Notes',
  map: 'Map',
  calendar: 'Calendar',
};

const SCREEN_TITLES: Record<ScreenName, string> = {
  sheet: 'Character',
  skills: 'Skills',
  items: 'Inventory',
  awards: 'Awards',
  spells: 'Spellbook',
  rest: 'Rest',
  reference: 'Quick Reference',
  options: 'Options',
  quests: 'Current Quests',
  notes: 'Auto Notes',
  map: 'Map',
  calendar: 'Calendar',
};

const RENDERERS: Record<ScreenName, (ctx: ScreenContext) => void> = {
  sheet: renderSheet,
  skills: renderSkills,
  items: renderInventory,
  awards: renderAwards,
  spells: renderSpellbook,
  rest: renderRest,
  reference: renderReference,
  options: renderOptions,
  quests: renderQuests,
  notes: renderNotes,
  map: renderMap,
  calendar: renderCalendar,
};

/** The screens MM6 drew as open books (paint.ts `book`). */
const BOOKS: readonly string[] = ['spells', 'quests', 'notes', 'map', 'calendar'];

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
  installPressFeel(uiLayer);

  let open_: { name: ScreenName | ServiceKind; root: HTMLElement; stop: () => void } | null = null;
  let portraitClaim: ((index: number) => boolean) | null = null;

  function unmount(notify: boolean): void {
    if (!open_) return;
    open_.stop();
    open_.root.remove();
    open_ = null;
    hooks.cover?.replaceChildren();
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
    // What a screen says goes to MM6's message bar on the band when the runtime has one.
    const frame = createFrame(title, close, hooks.say);
    // The screen's own class, so the spellbook can be parchment and the sheet stone.
    frame.root.classList.add(`screen-${name}`);
    // The books are open books, as MM6's (paint.ts `book`): their foot is the painted page
    // edges, the clasp that closes them standing on them.
    if (BOOKS.includes(name)) {
      const panel = frame.root.querySelector<HTMLElement>('.ui-panel');
      if (panel) panel.dataset['paint'] = 'book';
      frame.root.classList.add('screen-book');
      frame.root.querySelector<HTMLElement>('.ui-close')?.setAttribute('data-glyph', 'close-book');
      // The title on MM6's knotwork banner across the page's head.
      const t = frame.root.querySelector<HTMLElement>('.ui-title');
      if (t) t.dataset['paint'] = 'banner';
    }
    portraitClaim = null;
    render({
      state,
      hooks,
      frame,
      rng,
      close,
      open,
      cover: hooks.cover ?? null,
      claimPortraits: (handler) => {
        portraitClaim = handler;
      },
    });
    uiLayer.appendChild(frame.root);
    // A list longer than its box scrolls under a finger, MM6's gold marks at its corners.
    open_ = { name, root: frame.root, stop: watchScrolls(frame.body) };
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
    toggleButtonBar() {
      // The books and the ovals stand in the panel now (panel.ts), which the talk covers.
    },
    dispose() {
      unmount(false);
    },
  };
}
