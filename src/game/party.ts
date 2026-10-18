/**
 * The party in combat (DESIGN.md 14.2): four members, one selected; tapping a monster attacks
 * with the selected member if ready, then the selection advances to the next ready member,
 * MM6-style. A member with a bow shoots with the bow's attack bonus, dice and recovery
 * (MM6-GAPS.md 8). Recovery is per member; a struck member also recovers (20 − Endurance
 * effect, GF-M) and, if selected, hands the selection on (GF-P) when the runtime passes the
 * time. A member is backed either by a full `Character` sheet (creation, levels, equipment and
 * conditions drive its numbers and its hit points live on the sheet) or, for test data, by a
 * plain `MemberDef`; `TEST_PARTY` uses the latter.
 */
import {
  armorClass as characterArmor,
  attackBonus as characterAttack,
  canActNow,
  type Character,
  damageCharacter,
  damageDice,
  hitRecovery,
  hitRecoveryUnits,
  isCharacter,
  isConscious,
  maxHp,
  MIN_MELEE_RECOVERY,
  RECOVERY_UNITS_PER_SECOND,
  recoverySec as characterRecovery,
} from './character';
import { resolveAttack, type AttackResult } from './combat';
import { failChance } from './conditions';
import { rangedWeapon } from './inventory';
import type { Dice, Rng } from './rng';
import { statBonus, stats, type Stats } from './stats';

export interface MemberDef {
  name: string;
  stats: Stats;
  maxHp: number;
  /** Weapon skill ranks, added to the attack bonus. */
  meleeSkill: number;
  weapon: Dice;
  /** Seconds until the member can act again after an attack, before the Speed effect. */
  recoverySec: number;
  /** Armour value, added to the speed bonus for armour class. */
  armor: number;
}

export type MemberSource = MemberDef | Character;

export interface Target {
  armorClass: number;
  takeDamage(amount: number): void;
}

/** One attack's numbers: a melee blow's or, with a bow, a shot's. */
export interface AttackNumbers {
  attackBonus: number;
  damage: Dice;
  recoverySec: number;
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

  /** Up and targetable: above 0 hit points (MM6) and not dead, stoned or eradicated. */
  get alive(): boolean {
    return this.character ? isConscious(this.character) : this.hp > 0;
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

  /** Seconds of recovery after an attack; test data takes MM6's Speed term and melee floor. */
  get recoverySec(): number {
    if (this.character) return characterRecovery(this.character);
    const units = this.def.recoverySec * RECOVERY_UNITS_PER_SECOND;
    const speed = statBonus(this.def.stats.speed);
    return Math.max(MIN_MELEE_RECOVERY, units - speed) / RECOVERY_UNITS_PER_SECOND;
  }

  /** A bow is slung and whole; test data has none. */
  get canShoot(): boolean {
    return this.character ? rangedWeapon(this.character.equipment) !== null : false;
  }

  /**
   * The numbers of an attack: a shot takes the bow's attack bonus (Shoot), dice and recovery, a
   * blow the melee weapon's (MM6-GAPS.md 8). Without a bow a shot falls back to the blow.
   */
  attackNumbers(ranged: boolean): AttackNumbers {
    const c = this.character;
    if (c && ranged && this.canShoot) {
      return {
        attackBonus: characterAttack(c, true),
        damage: damageDice(c, true) ?? this.damage,
        recoverySec: characterRecovery(c, true),
      };
    }
    return { attackBonus: this.attackBonus, damage: this.damage, recoverySec: this.recoverySec };
  }

  /** Seconds of recovery a blow costs: 20 − Endurance effect in MM6's units (GF-M). */
  get hitRecoverySec(): number {
    const units = this.character
      ? hitRecoveryUnits(this.character)
      : hitRecovery(this.def.stats.endurance);
    return units / RECOVERY_UNITS_PER_SECOND;
  }

  /** The chance an action fails before it starts (Cursed). */
  get failChance(): number {
    return this.character ? failChance(this.character.conditions) : 0;
  }

  isReady(now: number): boolean {
    if (!this.alive || now < this.readyAt) return false;
    return this.character ? canActNow(this.character) : true;
  }

  /**
   * Damage at game minute `gameMinute`; a character sheet handles falling and dying. With the
   * simulated time `now`, the blow also sets the member's recovery to at least its hit recovery.
   */
  takeDamage(amount: number, gameMinute = 0, now?: number): void {
    if (this.character) damageCharacter(this.character, amount, gameMinute);
    else this.legacyHp -= Math.max(0, amount);
    if (now !== undefined) this.readyAt = Math.max(this.readyAt, now + this.hitRecoverySec);
  }
}

export interface PartyAttack {
  member: PartyMember;
  result: AttackResult;
  /** The member shot with a bow rather than struck in melee. */
  ranged: boolean;
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

  /**
   * Attack a target with the ready member; the selection advances afterwards. A member with a
   * bow shoots with the bow's numbers, as the runtime lets a bow reach anything in view; pass
   * `ranged: false` for a blow (what MM6 does with a bow at arm's length is unverified). A member
   * without a bow strikes in melee.
   */
  attack(target: Target, now: number, rng: Rng, ranged = true): PartyAttack | null {
    const index = this.readyIndex(now);
    if (index < 0) return null;
    const member = this.members[index]!;
    const shot = ranged && member.canShoot;
    const n = member.attackNumbers(shot);
    const chance = member.failChance;
    const result: AttackResult =
      chance > 0 && rng() < chance
        ? { hit: false, damage: 0, chance: 0 }
        : resolveAttack(n.attackBonus, n.damage, target.armorClass, rng);
    if (result.hit) target.takeDamage(result.damage);
    member.readyAt = now + n.recoverySec;
    this.advance(now, index);
    return { member, result, ranged: shot };
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

  /**
   * Damage to one member at game minute `gameMinute`; the selection leaves a member who drops.
   * With the simulated time `now` the blow costs hit recovery, and a selected member it leaves
   * recovering hands the selection to the next ready one (MM6-GAPS.md 8, GF-M, GF-P).
   */
  takeDamage(index: number, amount: number, gameMinute = 0, now?: number): void {
    const m = this.members[index];
    if (!m) return;
    m.takeDamage(amount, gameMinute, now);
    if (this.selected !== index) return;
    if (!m.alive) this.advance(now ?? 0, index);
    else if (now !== undefined && !m.isReady(now)) this.advance(now, index);
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
