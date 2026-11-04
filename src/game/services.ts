/**
 * Town services (Phase 5 step 7), each a definition plus functions over the game state that
 * return results as values. Tavern: a room is a rest that costs gold and no food; food is bought
 * up to the house's capacity. Temple: heals and cures one member at MM6's prices (MW6, reported;
 * docs/gaps/characters.md 10.6): every temple has a donation X; hit and spell points cost X, a
 * condition X times the day of the week it began (Monday 1 to Sunday 7), five times that for
 * Dead and Stoned, ten for Eradicated; several conditions cost the dearest. Guild: membership for a fee,
 * then spellbooks of its school up to its level, priced by spell level (ours, in MM6's range);
 * buying teaches the member at once (MM6 sells a book to read, a simplification). Trainer: one
 * level when the experience is there, 25 gold per level of the new level (ours), up to the
 * trainer's maximum. Shop (DESIGN.md 17.19): four kinds that buy, name and mend their own
 * kind of thing (a general store buys anything at half and does neither), shelves drawn at a
 * treasure level from the shop's families and renewed on its own period when the party
 * visits, opening hours, and MM7's prices from the house's factor and the member's Merchant
 * percentage (items.md 6.3: they reproduce MM6's tavern and fare prices). Gold is the party's.
 */
import type { Character } from './character';
import { healCharacter, isLiving, maxHp, restoreSp } from './character';
import { type Affliction, afflictions, cureAll, worstCondition } from './conditions';
import { canLevelUp, levelUp, type LevelUpResult, trainingCost } from './experience';
import { addItem, removeItem } from './inventory';
import { itemValue } from './enchant';
import { type ItemDef, type ItemInstance, type ItemKind, itemDef } from './items';
import { rest, type RestResult } from './rest';
import { type MagicSchool, RANK_MULTIPLIER } from './skills';
import { mulberry32, type Rng } from './rng';
import { randomItemWhere } from './treasure';
import { canLearnSpell, type LearnResult, learnSpell } from './spellbook';
import { type SpellDef, type SpellId, spellsOfSchool } from './spells';
import { type GameState, spendGold } from './state';
import { gameDate, MINUTES_PER_DAY } from './time';

type MemberError = { ok: false; reason: 'member' };

function member(state: GameState, index: number): Character | MemberError {
  const c = state.party[index];
  return c && isLiving(c) ? c : { ok: false, reason: 'member' };
}

function isError(x: Character | MemberError): x is MemberError {
  return 'ok' in x;
}

// Tavern

export interface TavernDef {
  id: string;
  name: string;
  roomPrice: number;
  /** Gold per unit of food. */
  foodPrice: number;
  /** The most food the house sells the party up to. */
  foodCapacity: number;
}

export type RentResult =
  { ok: true; price: number; rest: RestResult } | { ok: false; reason: 'gold' };

export function rentRoom(state: GameState, tavern: TavernDef): RentResult {
  if (!spendGold(state, tavern.roomPrice)) return { ok: false, reason: 'gold' };
  const result = rest(state.party, state, state.clock, { room: true });
  return { ok: true, price: tavern.roomPrice, rest: result };
}

export type BuyFoodResult =
  { ok: true; units: number; price: number } | { ok: false; reason: 'gold' | 'full' };

/** Fill the larder to the house's capacity, or as far as the purse goes. */
export function buyFood(state: GameState, tavern: TavernDef): BuyFoodResult {
  const wanted = tavern.foodCapacity - state.food;
  if (wanted <= 0) return { ok: false, reason: 'full' };
  const affordable = Math.floor(state.gold / tavern.foodPrice);
  const units = Math.min(wanted, affordable);
  if (units <= 0) return { ok: false, reason: 'gold' };
  const price = units * tavern.foodPrice;
  spendGold(state, price);
  state.food += units;
  return { ok: true, units, price };
}

// Temple

export interface TempleDef {
  id: string;
  name: string;
  /** The minimum donation, X: MM6's run from 10 (New Sorpigal) to 100 (Blackshire). */
  donation: number;
}

/** What a condition costs in donations: the weekday it began, times five or ten for the gravest. */
export function templeMultiplier(condition: Affliction, since: number): number {
  const weekday = gameDate(Math.max(0, since)).weekday + 1;
  const gravity =
    condition === 'eradicated' ? 10 : condition === 'dead' || condition === 'stoned' ? 5 : 1;
  return weekday * gravity;
}

/** The donation asked of one member: X for wounds alone, the dearest condition's price else. */
export function templePrice(temple: TempleDef, c: Character): number {
  let multiplier = 1;
  for (const id of afflictions(c.conditions)) {
    multiplier = Math.max(multiplier, templeMultiplier(id, c.conditions[id]!.since));
  }
  return temple.donation * multiplier;
}

export type TempleResult =
  | { ok: true; price: number; cured: Affliction[] }
  | { ok: false; reason: 'gold' | 'nothing' | 'member' };

/** Heal one member fully and cure every condition, including death. */
export function templeHeal(state: GameState, temple: TempleDef, index: number): TempleResult {
  const c = state.party[index];
  if (!c) return { ok: false, reason: 'member' };
  const whole = worstCondition(c.conditions) === 'good' && c.hp >= maxHp(c);
  if (whole) return { ok: false, reason: 'nothing' };
  const price = templePrice(temple, c);
  if (!spendGold(state, price)) return { ok: false, reason: 'gold' };
  const cured = cureAll(c.conditions);
  c.hp = Math.max(c.hp, 0);
  healCharacter(c, maxHp(c));
  restoreSp(c);
  return { ok: true, price, cured };
}

// Guild

export interface GuildDef {
  id: string;
  name: string;
  school: MagicSchool;
  /** Highest spell level the guild sells. */
  maxSpellLevel: number;
  membershipFee: number;
  priceMultiplier: number;
}

/** Spellbook base price by spell level (index), MM6's range. */
export const SPELLBOOK_PRICES = [0, 50, 100, 200, 300, 400, 500, 700, 1000, 2000, 5000, 10000];

export function isMember(state: GameState, guild: GuildDef): boolean {
  return state.memberships.includes(guild.id);
}

export type JoinResult = { ok: true; price: number } | { ok: false; reason: 'gold' | 'member' };

export function joinGuild(state: GameState, guild: GuildDef): JoinResult {
  if (isMember(state, guild)) return { ok: false, reason: 'member' };
  if (!spendGold(state, guild.membershipFee)) return { ok: false, reason: 'gold' };
  state.memberships.push(guild.id);
  return { ok: true, price: guild.membershipFee };
}

export function guildSpells(guild: GuildDef): SpellDef[] {
  return spellsOfSchool(guild.school).filter((s) => s.level <= guild.maxSpellLevel);
}

export function spellbookPrice(guild: GuildDef, spell: SpellDef): number {
  return Math.round((SPELLBOOK_PRICES[spell.level] ?? 0) * guild.priceMultiplier);
}

export type BuySpellResult =
  | { ok: true; price: number }
  | { ok: false; reason: 'membership' | 'not-sold' | 'gold' | 'member' }
  | Exclude<LearnResult, { ok: true }>;

export function buySpellbook(
  state: GameState,
  guild: GuildDef,
  spell: SpellId,
  index: number,
): BuySpellResult {
  if (!isMember(state, guild)) return { ok: false, reason: 'membership' };
  const def = guildSpells(guild).find((s) => s.id === spell);
  if (!def) return { ok: false, reason: 'not-sold' };
  const c = member(state, index);
  if (isError(c)) return c;
  const learnable = canLearnSpell(c, spell);
  if (!learnable.ok) return learnable;
  const price = spellbookPrice(guild, def);
  if (!spendGold(state, price)) return { ok: false, reason: 'gold' };
  learnSpell(c, spell);
  return { ok: true, price };
}

// Trainer

export interface TrainerDef {
  id: string;
  name: string;
  maxLevel: number;
  priceMultiplier: number;
}

export function trainerPrice(trainer: TrainerDef, c: Character): number {
  return trainingCost(c.level + 1, trainer.priceMultiplier);
}

export type TrainResult =
  | { ok: true; price: number; result: LevelUpResult }
  | { ok: false; reason: 'member' | 'xp' | 'level' | 'gold' };

export function train(state: GameState, trainer: TrainerDef, index: number): TrainResult {
  const c = member(state, index);
  if (isError(c)) return c;
  if (c.level + 1 > trainer.maxLevel) return { ok: false, reason: 'level' };
  if (!canLevelUp(c)) return { ok: false, reason: 'xp' };
  const price = trainerPrice(trainer, c);
  if (!spendGold(state, price)) return { ok: false, reason: 'gold' };
  return { ok: true, price, result: levelUp(c) };
}

// Shop (DESIGN.md 17.19; docs/gaps/items.md 6)

/** MM6's four kinds: smiths of arms, smiths of armour, magic shops and general stores. */
export type ShopKind = 'weapon' | 'armor' | 'magic' | 'general';

/** A shelf: so many slots drawn at a treasure level from the named families or kinds. */
export interface StockList {
  level: number;
  /** Catalogue family ids ('longsword', 'dagger'), item kinds ('potion'), or 'misc' (a magic shop's everything else). */
  families: readonly string[];
  slots: number;
}

export interface ShopDef {
  id: string;
  name: string;
  kind: ShopKind;
  /** The house's factor, Val, 1.5 to 4 (items.md 6.3, 6.5). */
  val: number;
  regular: StockList;
  special?: StockList;
  /** Days between restocks, counted from a visit (items.md 6.2). */
  restockDays: number;
  /** Open from the first hour to the second (items.md 6.5). */
  hours: readonly [number, number];
  /** The kinds it buys, identifies and repairs, when not its kind's own (a village smithy's arms and armour). */
  trades?: readonly ItemKind[];
}

/** A shop's shelves as the party last found them, and when they are next renewed. */
export interface ShopState {
  stock: ItemInstance[];
  special: ItemInstance[];
  /** The game minute from which a visit renews both lists. */
  restockAt: number;
}

const ARMOUR_KINDS: readonly ItemKind[] = ['armor', 'shield', 'helmet', 'gauntlets'];

/** Does the shop deal in this kind of thing: buy it, name it, mend it (items.md 6.1)? */
export function tradesIn(shop: ShopDef, def: ItemDef): boolean {
  if (shop.trades) return shop.trades.includes(def.kind);
  switch (shop.kind) {
    case 'weapon':
      return def.kind === 'weapon';
    case 'armor':
      return ARMOUR_KINDS.includes(def.kind);
    case 'magic':
      return def.kind !== 'weapon' && !ARMOUR_KINDS.includes(def.kind);
    case 'general':
      return false;
  }
}

/** Is a thing one of a shelf's families: by its family, its kind, or 'misc' for a magic shop's. */
export function onShelf(list: StockList, def: ItemDef): boolean {
  return list.families.some((f) => {
    if (f === 'misc') return def.kind !== 'weapon' && !ARMOUR_KINDS.includes(def.kind);
    return f === def.kind || f === def.family;
  });
}

/**
 * The member's Merchant percentage, M (MM7's rule, items.md 6.3): rank multiplier × skill +
 * 7 with the skill, 0 without; reputation waits. At most 100.
 */
export function merchantPercent(c: Character): number {
  const m = c.skills.merchant;
  if (!m) return 0;
  return Math.min(100, RANK_MULTIPLIER[m.rank] * m.level + 7);
}

/**
 * MM7 works its prices in whole gold, cutting the fraction off at each step (OE
 * `PriceCalculator.cpp`); so do these, which is what makes the document's examples come out.
 */
const cut = Math.floor;

/** Buying: value × Val × (100 − M) ÷ 100, never below the value. */
export function buyPriceOf(shop: ShopDef, value: number, c: Character): number {
  const base = cut(value * shop.val);
  return Math.max(value, cut((base * (100 - merchantPercent(c))) / 100));
}

export function buyPrice(shop: ShopDef, def: ItemDef, c: Character): number {
  return buyPriceOf(shop, def.value, c);
}

/**
 * Selling: value ÷ (Val + 2) + value × M ÷ 100, at least 1 and at most the value; a broken
 * thing fetches 1. A general store pays half the value for anything.
 */
export function sellPrice(shop: ShopDef, item: ItemInstance, c: Character): number {
  if (item.broken) return 1;
  const value = itemValue(item, itemDef(item));
  if (shop.kind === 'general') return Math.max(1, cut(value / 2));
  const price = cut(value / (shop.val + 2)) + cut((value * merchantPercent(c)) / 100);
  return Math.max(1, Math.min(value, price));
}

/** Identifying: 50 × Val × (100 − M) ÷ 100, never below a third of 50 × Val. */
export function identifyPrice(shop: ShopDef, c: Character): number {
  const base = cut(50 * shop.val);
  return Math.max(cut(base / 3), cut((base * (100 - merchantPercent(c))) / 100));
}

/** Repairing: value ÷ (6 − Val) × (100 − M) ÷ 100, never below a third of value ÷ (6 − Val). */
export function repairPrice(shop: ShopDef, item: ItemInstance, c: Character): number {
  const base = cut(itemValue(item, itemDef(item)) / (6 - shop.val));
  return Math.max(1, Math.max(cut(base / 3), cut((base * (100 - merchantPercent(c))) / 100)));
}

/** Open at this game minute: from the first hour up to the second. */
export function isOpen(shop: ShopDef, minutes: number): boolean {
  const h = gameDate(minutes).hour;
  return h >= shop.hours[0] && h < shop.hours[1];
}

/**
 * The shop's shelves as the party finds them: made afresh when a visit falls past the
 * restock time (never while unvisited), each slot one thing of the shelf's level from its
 * families, always identified (items.md 6.2, MM7's rule).
 */
export function visitShop(state: GameState, shop: ShopDef, rng?: Rng): ShopState {
  const now = state.clock.minutes;
  const kept = state.shops[shop.id];
  if (kept && now < kept.restockAt) return kept;
  const r = rng ?? mulberry32((state.seed * 7919 + now) >>> 0);
  const shelf = (list: StockList | undefined): ItemInstance[] => {
    if (!list) return [];
    const out: ItemInstance[] = [];
    for (let i = 0; i < list.slots; i++) {
      const item = randomItemWhere(list.level, r, (def) => onShelf(list, def));
      if (item) out.push({ ...item, identified: true });
    }
    return out;
  };
  const fresh: ShopState = {
    stock: shelf(shop.regular),
    special: shelf(shop.special),
    restockAt: now + shop.restockDays * MINUTES_PER_DAY,
  };
  state.shops[shop.id] = fresh;
  return fresh;
}

export type BuyResult =
  | { ok: true; price: number; item: ItemInstance; at: { x: number; y: number } }
  | { ok: false; reason: 'not-sold' | 'gold' | 'room' | 'member' };

/** Buy the thing in a shelf's slot into the member's pack; it leaves the shelf. */
export function buyItem(
  state: GameState,
  shop: ShopDef,
  list: 'stock' | 'special',
  slot: number,
  index: number,
): BuyResult {
  const shelves = visitShop(state, shop);
  const item = shelves[list][slot];
  if (!item) return { ok: false, reason: 'not-sold' };
  const c = member(state, index);
  if (isError(c)) return c;
  const price = buyPriceOf(shop, itemValue(item, itemDef(item)), c);
  if (state.gold < price) return { ok: false, reason: 'gold' };
  const at = addItem(c.grid, item);
  if (!at) return { ok: false, reason: 'room' };
  spendGold(state, price);
  shelves[list].splice(slot, 1);
  return { ok: true, price, item, at };
}

export type SellResult =
  | { ok: true; price: number; item: ItemInstance }
  | { ok: false; reason: 'member' | 'item' | 'trade' };

/** Sell from the pack: a shop of a kind takes only its own kind; a general store anything. */
export function sellItem(
  state: GameState,
  shop: ShopDef,
  index: number,
  gridIndex: number,
): SellResult {
  const c = member(state, index);
  if (isError(c)) return c;
  const placed = c.grid.items[gridIndex];
  if (!placed) return { ok: false, reason: 'item' };
  if (shop.kind !== 'general' && !tradesIn(shop, itemDef(placed.item))) {
    return { ok: false, reason: 'trade' };
  }
  const price = sellPrice(shop, placed.item, c);
  removeItem(c.grid, gridIndex);
  state.gold += price;
  return { ok: true, price, item: placed.item };
}

export type ServiceItemResult =
  | { ok: true; price: number }
  | { ok: false; reason: 'member' | 'item' | 'gold' | 'needless' | 'trade' };

export function identifyItem(
  state: GameState,
  shop: ShopDef,
  index: number,
  gridIndex: number,
): ServiceItemResult {
  const c = member(state, index);
  if (isError(c)) return c;
  const placed = c.grid.items[gridIndex];
  if (!placed) return { ok: false, reason: 'item' };
  if (!tradesIn(shop, itemDef(placed.item))) return { ok: false, reason: 'trade' };
  if (placed.item.identified) return { ok: false, reason: 'needless' };
  const price = identifyPrice(shop, c);
  if (!spendGold(state, price)) return { ok: false, reason: 'gold' };
  placed.item.identified = true;
  return { ok: true, price };
}

export function repairItem(
  state: GameState,
  shop: ShopDef,
  index: number,
  gridIndex: number,
): ServiceItemResult {
  const c = member(state, index);
  if (isError(c)) return c;
  const placed = c.grid.items[gridIndex];
  if (!placed) return { ok: false, reason: 'item' };
  if (!tradesIn(shop, itemDef(placed.item))) return { ok: false, reason: 'trade' };
  if (!placed.item.broken) return { ok: false, reason: 'needless' };
  const price = repairPrice(shop, placed.item, c);
  if (!spendGold(state, price)) return { ok: false, reason: 'gold' };
  placed.item.broken = false;
  return { ok: true, price };
}
