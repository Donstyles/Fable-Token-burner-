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

export const SCREEN_NAMES = ['sheet', 'items', 'spells', 'rest', 'quests', 'map'] as const;
export type ScreenName = (typeof SCREEN_NAMES)[number];

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

/** What passed: a camp rest, a wait until dawn, or a tavern room. */
export type RestKind = 'rest' | 'dawn' | 'room';

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
   * Why the party may not rest or wait now ("There are hostile creatures nearby!"), or null
   * when it may; asked at each tap on the rest screen. A refusal changes nothing.
   */
  restBlocked?: () => string | null;
}

export interface ScreenContext {
  state: GameState;
  hooks: ScreenHooks;
  frame: Frame;
  rng: Rng;
  close(): void;
  /**
   * Claim the next tap on a portrait in the band (DESIGN.md 16.16): the handler returns true
   * when it used the tap, false to let it select the member as usual; null gives it up.
   */
  claimPortraits(handler: ((index: number) => boolean) | null): void;
}
