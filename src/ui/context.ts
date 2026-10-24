/**
 * Types shared by the screens (Phase 5 step 10): the screen names, the hooks the runtime
 * provides, the events the screens report back and the context each screen renders with.
 */
import type { QuestDef } from '../game/quests';
import type { Rng } from '../game/rng';
import type { GuildDef, ShopDef, TavernDef, TempleDef, TrainerDef } from '../game/services';
import type { SpellEffect, SpellId } from '../game/spells';
import type { GameState } from '../game/state';
import type { Frame } from './dom';

/**
 * Every screen, as MM6 grouped them (DESIGN.md 16.34): a member's four pages (statistics,
 * skills, inventory, awards) opened from their portrait; the spellbook and the rest from the
 * panel's ovals with the quick reference and the options; the four books on the panel's shelf.
 */
export const SCREEN_NAMES = [
  'sheet',
  'skills',
  'items',
  'awards',
  'spells',
  'rest',
  'reference',
  'options',
  'quests',
  'notes',
  'map',
  'calendar',
] as const;
export type ScreenName = (typeof SCREEN_NAMES)[number];

/** A member's four pages (character.ts), the ovals along their foot switching between them. */
export const MEMBER_PAGES = ['sheet', 'skills', 'items', 'awards'] as const;
export type MemberPage = (typeof MEMBER_PAGES)[number];

export const SERVICE_KINDS = ['tavern', 'temple', 'guild', 'trainer', 'shop'] as const;
export type ServiceKind = (typeof SERVICE_KINDS)[number];

/** The service record each kind of house is driven by (`src/game/services.ts`). */
export interface ServiceDefs {
  tavern: TavernDef;
  temple: TempleDef;
  guild: GuildDef;
  trainer: TrainerDef;
  shop: ShopDef;
}

/** What passed: a camp rest, a wait until dawn, a shorter wait, or a tavern room. */
export type RestKind = 'rest' | 'dawn' | 'wait' | 'room';

/** A spell cast from the spellbook or a scroll: the effects for the runtime to perform. */
export interface CastEvent {
  caster: number;
  spell: SpellId;
  /** The targeted member for member spells; the caster otherwise. */
  target: number;
  cost: number;
  /** A Cursed caster's failure: the points are spent, nothing happens. */
  failed: boolean;
  effects: SpellEffect[];
  source: 'spellbook' | 'scroll';
}

/**
 * A mark on the automap: a villager (`person`), a quest giver with something to hand in or a
 * quest's goal (`quest`), or a way to another place (`portal`). `x` and `z` are in the scene's
 * own coordinates (Babylon's), the ones `state.level` keeps for the party, so the mark lands on
 * the automap's grid as the party's does; `label` is read when the mark is tapped.
 */
export interface MapMark {
  x: number;
  z: number;
  kind: 'person' | 'quest' | 'portal';
  label: string;
}

export interface ScreenHooks {
  /** A rest, wait or room has been applied to the state (clock, food, characters). */
  onRest(kind: RestKind): void;
  /** The open screen closed, by its button or `close()`. */
  onClose(): void;
  /** The runtime's clock in seconds, the one the party's recovery runs on. */
  now(): number;
  /** A spell was cast: spell points are paid; the runtime performs the effects. */
  onCast?(cast: CastEvent): void;
  /** A screen opened (after any other one closed silently). */
  onOpen?(name: ScreenName | ServiceKind): void;
  /** Quest definitions for the log, by id; unknown ids show as such. */
  questDefs?: Readonly<Record<string, QuestDef>>;
  /** The die for Cursed casting rolls; seeded from the state and the clock by default. */
  rng?: Rng;
  /**
   * The marks the automap draws over the current level, asked each time the map opens; they
   * show on cells not yet walked too.
   */
  marks?: () => MapMark[];
  /**
   * The level's picture from above for the map book (the minimap's, panel.ts), with the
   * metres it spans; the book shows the walked land in it, as MM6's. Null below ground.
   */
  mapPicture?: () => { picture: HTMLImageElement; size: number } | null;
  /**
   * Why the party may not rest or wait now ("There are hostile creatures nearby!"), or null
   * when it may; asked at each tap on the rest screen. A refusal changes nothing.
   */
  restBlocked?: () => string | null;
  /**
   * MM6's message bar on the band (status.ts): what a screen says goes there, as MM6's did;
   * without it a screen keeps its own line.
   */
  say?: (text: string) => void;
  /**
   * The panel's cover (panel.ts): a screen that MM6 drew over the right-hand panel (a member's
   * figure, a house's board) draws there; it is emptied when the screen closes.
   */
  cover?: HTMLElement;
  /** The options' game menu (options.ts): each is offered only when given. */
  menu?: MenuHooks;
}

/** What the options' menu does beyond closing (MM6's Resume, New, Save, Load, Quit). */
export interface MenuHooks {
  newGame?: () => void;
  /** Save now; false when it could not be written. */
  save?: () => boolean;
  /** Go back to the last save. */
  load?: () => void;
  /** Leave the game for its title. */
  quit?: () => void;
}

export interface ScreenContext {
  state: GameState;
  hooks: ScreenHooks;
  frame: Frame;
  rng: Rng;
  close(): void;
  /** Open another screen in this one's place (a member's pages turn this way). */
  open(name: ScreenName): void;
  /** The panel's cover, when the runtime gave one (`ScreenHooks.cover`). */
  cover: HTMLElement | null;
  /**
   * Claim the next tap on a portrait in the band (DESIGN.md 16.16): the handler returns true
   * when it used the tap, false to let it select the member as usual; null gives it up.
   */
  claimPortraits(handler: ((index: number) => boolean) | null): void;
}
