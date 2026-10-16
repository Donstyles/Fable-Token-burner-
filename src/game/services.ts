/**
 * Town services (Phase 5 step 7), each a definition plus functions over the game state that
 * return results as values. Tavern: a room is a rest that costs gold and no food; food is bought
 * up to the house's capacity. Temple: heals and cures one member for a price by condition (the
 * price table is ours, scaled per temple; MM6 prices vary by town). Guild: membership for a fee,
 * then spellbooks of its school up to its level, priced by spell level (ours, in MM6's range);
 * buying teaches the member at once (MM6 sells a book to read, a simplification). Trainer: one
 * level when the experience is there, 25 gold per level of the new level (ours), up to the
 * trainer's maximum. Shop: buy at value × house markup, sell at half value, both bettered by the
 * active member's Merchant skill (2 % per point of skill bonus, to 50 %; MM6's exact curve is
 * not agreed); identify and repair for a fee. Gold is the party's.
 */
import type { Character } from './character';
import { healCharacter, isLiving, maxHp, restoreSp } from './character';
import { type Affliction, type ConditionId, cureAll, worstCondition } from './conditions';
import { canLevelUp, levelUp, type LevelUpResult, trainingCost } from './experience';
import { addItem, removeItem } from './inventory';
import { createItem, type ItemDef, type ItemId, itemDef } from './items';
import { rest, type RestResult } from './rest';
import { type MagicSchool, skillBonus } from './skills';
import { canLearnSpell, type LearnResult, learnSpell } from './spellbook';
import { type SpellDef, type SpellId, spellsOfSchool } from './spells';
import { type GameState, spendGold } from './state';

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
  priceMultiplier: number;
}

/** Base price to be rid of a condition; Good is the price of healing wounds alone. */
export const TEMPLE_PRICES: Record<ConditionId, number> = {
  good: 10,
  cursed: 50,
  weak: 50,
  asleep: 10,
  afraid: 25,
  drunk: 25,
  insane: 200,
  poisoned: 100,
  diseased: 150,
  paralyzed: 200,
  unconscious: 50,
  dead: 500,
  stoned: 750,
  eradicated: 2000,
};

export function templePrice(temple: TempleDef, c: Character): number {
  return Math.round(TEMPLE_PRICES[worstCondition(c.conditions)] * temple.priceMultiplier);
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

// Shop

export interface ShopDef {
  id: string;
  name: string;
  stock: readonly ItemId[];
  /** Markup on value when buying from the shop. */
  priceMultiplier: number;
  identifyPrice: number;
  /** Fraction of value charged to repair. */
  repairFraction: number;
}

export const MERCHANT_PER_POINT = 0.02;
export const MERCHANT_MAX = 0.5;

/** The active member's Merchant advantage, 0 to 0.5. */
export function merchantFactor(c: Character): number {
  return Math.min(MERCHANT_MAX, skillBonus(c.skills, 'merchant') * MERCHANT_PER_POINT);
}

export function buyPrice(shop: ShopDef, def: ItemDef, c: Character): number {
  return Math.max(1, Math.round(def.value * shop.priceMultiplier * (1 - merchantFactor(c))));
}

export function sellPrice(shop: ShopDef, def: ItemDef, c: Character, broken = false): number {
  const base = def.value * 0.5 * (1 + merchantFactor(c));
  return Math.max(1, Math.round(Math.min(def.value, base) * (broken ? 0.5 : 1)));
}

export type BuyResult =
  | { ok: true; price: number; at: { x: number; y: number } }
  | { ok: false; reason: 'not-sold' | 'gold' | 'room' | 'member' };

export function buyItem(state: GameState, shop: ShopDef, id: ItemId, index: number): BuyResult {
  if (!shop.stock.includes(id)) return { ok: false, reason: 'not-sold' };
  const c = member(state, index);
  if (isError(c)) return c;
  const price = buyPrice(shop, itemDef(id), c);
  if (state.gold < price) return { ok: false, reason: 'gold' };
  const at = addItem(c.grid, createItem(id));
  if (!at) return { ok: false, reason: 'room' };
  spendGold(state, price);
  return { ok: true, price, at };
}

export type SellResult =
  { ok: true; price: number; item: ItemId } | { ok: false; reason: 'member' | 'item' };

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
  const price = sellPrice(shop, itemDef(placed.item), c, placed.item.broken);
  removeItem(c.grid, gridIndex);
  state.gold += price;
  return { ok: true, price, item: placed.item.id };
}

export type ServiceItemResult =
  { ok: true; price: number } | { ok: false; reason: 'member' | 'item' | 'gold' | 'needless' };

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
  if (placed.item.identified) return { ok: false, reason: 'needless' };
  if (!spendGold(state, shop.identifyPrice)) return { ok: false, reason: 'gold' };
  placed.item.identified = true;
  return { ok: true, price: shop.identifyPrice };
}

export function repairPrice(shop: ShopDef, def: ItemDef): number {
  return Math.max(1, Math.round(def.value * shop.repairFraction));
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
  if (!placed.item.broken) return { ok: false, reason: 'needless' };
  const price = repairPrice(shop, itemDef(placed.item));
  if (!spendGold(state, price)) return { ok: false, reason: 'gold' };
  placed.item.broken = false;
  return { ok: true, price };
}
