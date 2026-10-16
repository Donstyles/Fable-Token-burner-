/**
 * The game state root (Phase 5): the four characters, the party's gold and food, the clock,
 * the quest log, the automap, the level and position, guild memberships and script flags, all
 * plain JSON-safe data that `save.ts` serialises as is. `newGame` takes four created characters,
 * gives each the MM6-style starting kit (the weapon of the class's fixed weapon skill, leather
 * armour when the class starts with Leather, a healing potion) and MM6's starting purse of 200
 * gold and 7 food (ours where the manual is silent). Rewards and shared experience are applied
 * here because they touch several parts of the state.
 */
import { type Automap, createAutomap } from './automap';
import { type Character, isLiving } from './character';
import { classDef, type ClassId } from './classes';
import { shareExperience } from './experience';
import { addItem, equipItem } from './inventory';
import { createItem, type ItemId } from './items';
import { createQuestLog, type QuestLog, type QuestReward } from './quests';
import type { WeaponSkill } from './skills';
import { createClock, type GameClock } from './time';

export const PARTY_SIZE = 4;
export const STARTING_GOLD = 200;
export const STARTING_FOOD = 7;

export interface LevelPosition {
  id: string;
  x: number;
  y: number;
  z: number;
  yawDeg: number;
}

export interface GameState {
  seed: number;
  party: Character[];
  /** Index of the selected member. */
  selected: number;
  gold: number;
  food: number;
  clock: GameClock;
  quests: QuestLog;
  automap: Automap;
  level: LevelPosition;
  /** Guild ids the party has joined. */
  memberships: string[];
  /** Named flags set by scripts and dialogue. */
  flags: Record<string, number>;
}

export interface NewGameOptions {
  seed: number;
  level: LevelPosition;
  gold?: number;
  food?: number;
}

export type NewGameResult =
  { ok: true; state: GameState } | { ok: false; reason: 'party-size' | 'duplicate-name' };

const WEAPON_FOR_SKILL: Record<WeaponSkill, ItemId> = {
  staff: 'staff',
  sword: 'long-sword',
  dagger: 'dagger',
  axe: 'axe',
  spear: 'spear',
  bow: 'bow',
  mace: 'mace',
};

function isWeaponSkill(skill: string): skill is WeaponSkill {
  return skill in WEAPON_FOR_SKILL;
}

/** What a new member of the class carries. */
export function starterKit(classId: ClassId): ItemId[] {
  const cls = classDef(classId);
  const kit: ItemId[] = [];
  for (const skill of cls.fixedSkills) {
    if (isWeaponSkill(skill)) kit.push(WEAPON_FOR_SKILL[skill]);
    if (skill === 'leather') kit.push('leather-armor');
  }
  kit.push('potion-healing');
  return kit;
}

/** Put an item in the member's grid; false when there is no room. */
export function giveItem(c: Character, id: ItemId): boolean {
  return addItem(c.grid, createItem(id)) !== null;
}

/** Equip what can be equipped, grid the rest and anything displaced. */
export function outfit(c: Character, ids: readonly ItemId[]): void {
  for (const id of ids) {
    const item = createItem(id);
    const r = equipItem(c.equipment, item, c.skills);
    if (!r.ok) addItem(c.grid, item);
    else for (const d of r.displaced) addItem(c.grid, d);
  }
}

export function newGame(characters: readonly Character[], options: NewGameOptions): NewGameResult {
  if (characters.length !== PARTY_SIZE) return { ok: false, reason: 'party-size' };
  if (new Set(characters.map((c) => c.name)).size !== characters.length) {
    return { ok: false, reason: 'duplicate-name' };
  }
  const party = characters.map((c) => c);
  for (const c of party) outfit(c, starterKit(c.classId));
  return {
    ok: true,
    state: {
      seed: options.seed,
      party,
      selected: 0,
      gold: options.gold ?? STARTING_GOLD,
      food: options.food ?? STARTING_FOOD,
      clock: createClock(),
      quests: createQuestLog(),
      automap: createAutomap(),
      level: { ...options.level },
      memberships: [],
      flags: {},
    },
  };
}

export function addGold(state: GameState, amount: number): void {
  state.gold += Math.max(0, Math.floor(amount));
}

/** Pay if the purse allows; false leaves the purse untouched. */
export function spendGold(state: GameState, amount: number): boolean {
  if (amount < 0 || state.gold < amount) return false;
  state.gold -= amount;
  return true;
}

export function livingMembers(state: GameState): Character[] {
  return state.party.filter(isLiving);
}

export interface RewardOutcome {
  gold: number;
  xp: number[];
  /** Items that found no room in any grid. */
  dropped: ItemId[];
}

/** Grant a quest reward: gold to the purse, experience shared, items to whoever has room. */
export function grantReward(state: GameState, reward: QuestReward): RewardOutcome {
  const outcome: RewardOutcome = { gold: 0, xp: state.party.map(() => 0), dropped: [] };
  if (reward.gold) {
    addGold(state, reward.gold);
    outcome.gold = reward.gold;
  }
  if (reward.xp) outcome.xp = shareExperience(state.party, reward.xp);
  for (const id of reward.items ?? []) {
    const order = [state.selected, ...state.party.map((_, i) => i)];
    const taker = order.find((i) => {
      const c = state.party[i];
      return c !== undefined && giveItem(c, id);
    });
    if (taker === undefined) outcome.dropped.push(id);
  }
  return outcome;
}

/** Move the party to another level and position. */
export function travelTo(state: GameState, level: LevelPosition): void {
  state.level = { ...level };
}
