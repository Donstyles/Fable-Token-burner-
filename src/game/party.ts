/**
 * The party in combat (DESIGN.md 14.2): four members, one selected; tapping a monster attacks
 * with the selected member if ready, then the selection advances to the next ready member,
 * MM6-style. Recovery is per member. A member is backed either by a full `Character` sheet
 * (creation, levels, equipment and conditions drive its numbers and its hit points live on the
 * sheet) or, for test data, by a plain `MemberDef`; `TEST_PARTY` uses the latter.
 */
import {
  armorClass as characterArmor,
  attackBonus as characterAttack,
  canActNow,
  type Character,
  damageCharacter,
  damageDice,
  isCharacter,
  isConscious,
  maxHp,
  recoverySec as characterRecovery,
} from './character';
import { resolveAttack, type AttackResult } from './combat';
import { failChance } from './conditions';
import type { Dice, Rng } from './rng';
import { statBonus, stats, type Stats } from './stats';

export interface MemberDef {
  name: string;
  stats: Stats;
  maxHp: number;
  /** Weapon skill ranks, added to the attack bonus. */
  meleeSkill: number;
  weapon: Dice;
  /** Seconds until the member can act again after an attack, before the speed bonus. */
  recoverySec: number;
  /** Armour value, added to the speed bonus for armour class. */
  armor: number;
}

export type MemberSource = MemberDef | Character;

export interface Target {
  armorClass: number;
  takeDamage(amount: number): void;
}

/** A `MemberDef` view over a character sheet; its fields follow the sheet live. */
function characterView(c: Character): MemberDef {
  return {
    get name() {
      return c.name;
    },
    get stats() {
      return c.stats;
    },
    get maxHp() {
      return maxHp(c);
    },
    get meleeSkill() {
      return characterAttack(c) - statBonus(c.stats.accuracy);
    },
    get weapon() {
      return damageDice(c) ?? { count: 1, sides: 3 };
    },
    get recoverySec() {
      return characterRecovery(c);
    },
    get armor() {
      return characterArmor(c) - statBonus(c.stats.speed);
    },
  };
}

export class PartyMember {
  /** Simulated time at which the member can act again. */
  readyAt = 0;
  readonly def: MemberDef;
  readonly character: Character | null;
  private legacyHp: number;

  constructor(source: MemberSource) {
    if (isCharacter(source)) {
      this.character = source;
      this.def = characterView(source);
      this.legacyHp = 0;
    } else {
      this.character = null;
      this.def = source;
      this.legacyHp = source.maxHp;
    }
  }

  get name(): string {
    return this.def.name;
  }

  get hp(): number {
    return this.character ? this.character.hp : this.legacyHp;
  }

  set hp(value: number) {
    if (this.character) this.character.hp = value;
    else this.legacyHp = value;
  }

  get maxHp(): number {
    return this.def.maxHp;
  }

  /** Up and targetable: 0 hit points or more (MM6) and not dead, stoned or eradicated. */
  get alive(): boolean {
    return this.character ? isConscious(this.character) : this.hp >= 0;
  }

  get attackBonus(): number {
    if (this.character) return characterAttack(this.character);
    return statBonus(this.def.stats.accuracy) + this.def.meleeSkill;
  }

  get armorClass(): number {
    if (this.character) return characterArmor(this.character);
    return Math.max(0, statBonus(this.def.stats.speed) + this.def.armor);
  }

  get damage(): Dice {
    return this.def.weapon;
  }

  /** Recovery shortens with speed; never under half a second. */
  get recoverySec(): number {
    if (this.character) return characterRecovery(this.character);
    return Math.max(0.5, this.def.recoverySec - 0.05 * statBonus(this.def.stats.speed));
  }

  /** The chance an action fails before it starts (Cursed). */
  get failChance(): number {
    return this.character ? failChance(this.character.conditions) : 0;
  }

  isReady(now: number): boolean {
    if (!this.alive || now < this.readyAt) return false;
    return this.character ? canActNow(this.character) : true;
  }

  /** Damage at game minute `gameMinute`; a character sheet handles falling and dying. */
  takeDamage(amount: number, gameMinute = 0): void {
    if (this.character) damageCharacter(this.character, amount, gameMinute);
    else this.legacyHp -= Math.max(0, amount);
  }
}

export interface PartyAttack {
  member: PartyMember;
  result: AttackResult;
}

export class Party {
  readonly members: PartyMember[];
  selected = 0;

  constructor(sources: readonly MemberSource[]) {
    this.members = sources.map((s) => new PartyMember(s));
  }

  get alive(): boolean {
    return this.members.some((m) => m.alive);
  }

  /** The selected member if ready, else the next ready one; -1 when nobody can act. */
  readyIndex(now: number): number {
    for (let i = 0; i < this.members.length; i++) {
      const index = (this.selected + i) % this.members.length;
      if (this.members[index]!.isReady(now)) return index;
    }
    return -1;
  }

  /** Attack a target with the ready member; the selection advances afterwards. */
  attack(target: Target, now: number, rng: Rng): PartyAttack | null {
    const index = this.readyIndex(now);
    if (index < 0) return null;
    const member = this.members[index]!;
    const chance = member.failChance;
    const result: AttackResult =
      chance > 0 && rng() < chance
        ? { hit: false, damage: 0, chance: 0 }
        : resolveAttack(member.attackBonus, member.damage, target.armorClass, rng);
    if (result.hit) target.takeDamage(result.damage);
    member.readyAt = now + member.recoverySec;
    this.advance(now, index);
    return { member, result };
  }

  /** Move the selection to the next ready member after `from`, or to the next alive one. */
  private advance(now: number, from: number): void {
    const n = this.members.length;
    for (let i = 1; i <= n; i++) {
      const index = (from + i) % n;
      if (this.members[index]!.isReady(now)) {
        this.selected = index;
        return;
      }
    }
    for (let i = 1; i <= n; i++) {
      const index = (from + i) % n;
      if (this.members[index]!.alive) {
        this.selected = index;
        return;
      }
    }
  }

  /** Damage to one member; the selection leaves a member who drops. */
  takeDamage(index: number, amount: number, gameMinute = 0): void {
    const m = this.members[index];
    if (!m) return;
    m.takeDamage(amount, gameMinute);
    if (!m.alive && this.selected === index) this.advance(0, index);
  }

  /** A living member chosen by the attacker, uniformly. */
  randomLivingIndex(rng: Rng): number {
    const living = this.members.map((m, i) => (m.alive ? i : -1)).filter((i) => i >= 0);
    return living.length ? living[Math.floor(rng() * living.length)]! : -1;
  }
}

/** Phase 5 test data: a knight, an archer, a cleric and a sorcerer at level 1. */
export const TEST_PARTY: readonly MemberDef[] = [
  {
    name: 'Alric',
    stats: stats({ might: 17, endurance: 15, accuracy: 13, speed: 11 }),
    maxHp: 34,
    meleeSkill: 2,
    weapon: { count: 2, sides: 4, bonus: 1 },
    recoverySec: 1.3,
    armor: 6,
  },
  {
    name: 'Mira',
    stats: stats({ accuracy: 17, speed: 15, might: 12 }),
    maxHp: 22,
    meleeSkill: 1,
    weapon: { count: 1, sides: 6 },
    recoverySec: 1.0,
    armor: 3,
  },
  {
    name: 'Tobin',
    stats: stats({ personality: 17, endurance: 13, might: 13 }),
    maxHp: 26,
    meleeSkill: 1,
    weapon: { count: 1, sides: 8 },
    recoverySec: 1.4,
    armor: 4,
  },
  {
    name: 'Sera',
    stats: stats({ intellect: 18, speed: 12, might: 9 }),
    maxHp: 14,
    meleeSkill: 0,
    weapon: { count: 1, sides: 4 },
    recoverySec: 1.1,
    armor: 1,
  },
];
