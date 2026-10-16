/**
 * Services view-model (Phase 5 step 10): the rows and buttons of the tavern, temple, guild
 * and trainer screens for a given house record (the shop is in `shop-model.ts`), each button
 * with its price and, when it cannot be used, the reason; and the actions, thin wrappers over
 * `src/game/services.ts` that turn its results into a message line. Gold is the party's; the
 * active member matters for the guild (who learns) and the trainer (who trains).
 */
import { type Character, isLiving, maxHp } from '../game/character';
import { classDef } from '../game/classes';
import { CONDITION_DEFS, worstCondition } from '../game/conditions';
import { canLevelUp, nextLevelGains, xpForLevel } from '../game/experience';
import {
  buyFood,
  buySpellbook,
  type GuildDef,
  guildSpells,
  isMember,
  joinGuild,
  rentRoom,
  spellbookPrice,
  type TavernDef,
  type TempleDef,
  templeHeal,
  templePrice,
  train,
  type TrainerDef,
  trainerPrice,
} from '../game/services';
import { SKILL_NAMES } from '../game/skills';
import { canLearnSpell } from '../game/spellbook';
import { rankForSpellLevel, type SpellId } from '../game/spells';
import type { GameState } from '../game/state';
import { restSummary } from './rest-model';
import { RANK_LABELS } from './sheet-model';

export interface ActionOutcome {
  ok: boolean;
  message: string;
  /** Further lines, such as a room's rest summary. */
  lines?: string[];
}

export const NOT_ENOUGH_GOLD = 'Not enough gold.';

function conditionName(c: Character): string {
  return CONDITION_DEFS[worstCondition(c.conditions)].name;
}

// Tavern

export interface TavernView {
  gold: number;
  food: number;
  roomPrice: number;
  canRent: boolean;
  foodPrice: number;
  foodCapacity: number;
  /** Units the house would sell now, as far as the purse goes. */
  foodUnits: number;
  foodCost: number;
  canBuyFood: boolean;
  foodReason: string | null;
}

export function tavernView(state: GameState, tavern: TavernDef): TavernView {
  const wanted = Math.max(0, tavern.foodCapacity - state.food);
  const units = Math.min(wanted, Math.floor(state.gold / tavern.foodPrice));
  let reason: string | null = null;
  if (wanted <= 0) reason = 'The larder is full.';
  else if (units <= 0) reason = NOT_ENOUGH_GOLD;
  return {
    gold: state.gold,
    food: state.food,
    roomPrice: tavern.roomPrice,
    canRent: state.gold >= tavern.roomPrice,
    foodPrice: tavern.foodPrice,
    foodCapacity: tavern.foodCapacity,
    foodUnits: units,
    foodCost: units * tavern.foodPrice,
    canBuyFood: reason === null,
    foodReason: reason,
  };
}

export function rent(state: GameState, tavern: TavernDef): ActionOutcome {
  const r = rentRoom(state, tavern);
  if (!r.ok) return { ok: false, message: 'Not enough gold for a room.' };
  return {
    ok: true,
    message: `A room for ${r.price} gold.`,
    lines: restSummary(state, r.rest, true),
  };
}

export function buyFoodAction(state: GameState, tavern: TavernDef): ActionOutcome {
  const r = buyFood(state, tavern);
  if (!r.ok) {
    return { ok: false, message: r.reason === 'full' ? 'The larder is full.' : NOT_ENOUGH_GOLD };
  }
  return { ok: true, message: `Bought ${r.units} food for ${r.price} gold.` };
}

// Temple

export interface TempleRow {
  index: number;
  name: string;
  condition: string;
  hp: number;
  maxHp: number;
  price: number;
  canHeal: boolean;
  reason: string | null;
}

export function templeRows(state: GameState, temple: TempleDef): TempleRow[] {
  return state.party.map((c, index) => {
    const price = templePrice(temple, c);
    const whole = worstCondition(c.conditions) === 'good' && c.hp >= maxHp(c);
    let reason: string | null = null;
    if (whole) reason = 'Nothing to heal.';
    else if (state.gold < price) reason = NOT_ENOUGH_GOLD;
    return {
      index,
      name: c.name,
      condition: conditionName(c),
      hp: c.hp,
      maxHp: maxHp(c),
      price,
      canHeal: reason === null,
      reason,
    };
  });
}

export function heal(state: GameState, temple: TempleDef, index: number): ActionOutcome {
  const c = state.party[index];
  const r = templeHeal(state, temple, index);
  if (!r.ok || !c) {
    const reason = r.ok ? 'member' : r.reason;
    const message =
      reason === 'nothing' ? 'Nothing to heal.' : reason === 'gold' ? NOT_ENOUGH_GOLD : 'No one.';
    return { ok: false, message };
  }
  const cured = r.cured.length
    ? ` (${r.cured.map((id) => CONDITION_DEFS[id].name).join(', ')} cured)`
    : '';
  return { ok: true, message: `${c.name} is healed for ${r.price} gold${cured}.` };
}

// Guild

export interface GuildSpellRow {
  id: SpellId;
  name: string;
  level: number;
  price: number;
  known: boolean;
  canBuy: boolean;
  reason: string | null;
}

export interface GuildView {
  member: boolean;
  fee: number;
  canJoin: boolean;
  spells: GuildSpellRow[];
}

export function guildView(state: GameState, guild: GuildDef, index: number): GuildView {
  const member = isMember(state, guild);
  const c = state.party[index];
  const spells = guildSpells(guild).map((spell): GuildSpellRow => {
    const price = spellbookPrice(guild, spell);
    const learn = c ? canLearnSpell(c, spell.id) : null;
    let reason: string | null = null;
    if (!c || !isLiving(c)) reason = 'No one to teach.';
    else if (learn && !learn.ok) {
      if (learn.reason === 'known') reason = 'Already known.';
      else if (learn.reason === 'class') reason = `Not for a ${classDef(c.classId).name}.`;
      else if (learn.reason === 'skill') reason = `Needs ${SKILL_NAMES[guild.school]}.`;
      else reason = `Needs ${RANK_LABELS[rankForSpellLevel(spell.level)]} rank.`;
    } else if (!member) reason = 'Join the guild first.';
    else if (state.gold < price) reason = NOT_ENOUGH_GOLD;
    return {
      id: spell.id,
      name: spell.name,
      level: spell.level,
      price,
      known: learn !== null && !learn.ok && learn.reason === 'known',
      canBuy: reason === null,
      reason,
    };
  });
  return {
    member,
    fee: guild.membershipFee,
    canJoin: !member && state.gold >= guild.membershipFee,
    spells,
  };
}

export function join(state: GameState, guild: GuildDef): ActionOutcome {
  const r = joinGuild(state, guild);
  if (!r.ok) {
    return { ok: false, message: r.reason === 'member' ? 'Already a member.' : NOT_ENOUGH_GOLD };
  }
  return { ok: true, message: `Joined the ${guild.name} for ${r.price} gold.` };
}

export function buyBook(
  state: GameState,
  guild: GuildDef,
  spell: SpellId,
  index: number,
): ActionOutcome {
  const row = guildView(state, guild, index).spells.find((s) => s.id === spell);
  if (!row) return { ok: false, message: 'Not sold here.' };
  if (!row.canBuy) return { ok: false, message: row.reason ?? 'Cannot buy.' };
  const r = buySpellbook(state, guild, spell, index);
  if (!r.ok) return { ok: false, message: 'Cannot buy.' };
  const c = state.party[index];
  return { ok: true, message: `${c?.name ?? 'Someone'} learns ${row.name} for ${r.price} gold.` };
}

// Trainer

export interface TrainerRow {
  index: number;
  name: string;
  level: number;
  xp: number;
  /** Experience still missing for the next level. */
  needed: number;
  price: number;
  hpGain: number;
  spGain: number;
  canTrain: boolean;
  reason: string | null;
}

export function trainerRows(state: GameState, trainer: TrainerDef): TrainerRow[] {
  return state.party.map((c, index) => {
    const price = trainerPrice(trainer, c);
    const needed = Math.max(0, xpForLevel(c.level + 1) - c.xp);
    const gains = nextLevelGains(c);
    let reason: string | null = null;
    if (!isLiving(c)) reason = `${c.name} is ${conditionName(c).toLowerCase()}.`;
    else if (c.level + 1 > trainer.maxLevel) reason = `Trains up to level ${trainer.maxLevel}.`;
    else if (!canLevelUp(c)) reason = `${needed} more experience.`;
    else if (state.gold < price) reason = NOT_ENOUGH_GOLD;
    return {
      index,
      name: c.name,
      level: c.level,
      xp: c.xp,
      needed,
      price,
      hpGain: gains.hp,
      spGain: gains.sp,
      canTrain: reason === null,
      reason,
    };
  });
}

export function trainMember(state: GameState, trainer: TrainerDef, index: number): ActionOutcome {
  const row = trainerRows(state, trainer)[index];
  if (!row) return { ok: false, message: 'No one.' };
  if (!row.canTrain) return { ok: false, message: row.reason ?? 'Cannot train.' };
  const r = train(state, trainer, index);
  if (!r.ok) return { ok: false, message: 'Cannot train.' };
  const sp = r.result.spGain > 0 ? `, +${r.result.spGain} spell points` : '';
  return {
    ok: true,
    message:
      `${row.name} reaches level ${r.result.level} for ${r.price} gold: ` +
      `+${r.result.hpGain} hit points${sp}, ${r.result.skillPoints} skill points to spend.`,
  };
}
