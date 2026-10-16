/**
 * The party in combat (DESIGN.md 14.2): four members, one selected; tapping a monster attacks
 * with the selected member if ready, then the selection advances to the next ready member,
 * MM6-style. Recovery is per member. Creation, levels and equipment come with later steps;
 * `TEST_PARTY` stands in until then.
 */
import { resolveAttack, type AttackResult } from './combat';
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

export interface Target {
  armorClass: number;
  takeDamage(amount: number): void;
}

export class PartyMember {
  hp: number;
  /** Simulated time at which the member can act again. */
  readyAt = 0;

  constructor(readonly def: MemberDef) {
    this.hp = def.maxHp;
  }

  get alive(): boolean {
    return this.hp > 0;
  }

  get attackBonus(): number {
    return statBonus(this.def.stats.accuracy) + this.def.meleeSkill;
  }

  get armorClass(): number {
    return Math.max(0, statBonus(this.def.stats.speed) + this.def.armor);
  }

  /** Recovery shortens with speed; never under half a second. */
  get recoverySec(): number {
    return Math.max(0.5, this.def.recoverySec - 0.05 * statBonus(this.def.stats.speed));
  }

  isReady(now: number): boolean {
    return this.alive && now >= this.readyAt;
  }
}

export interface PartyAttack {
  member: PartyMember;
  result: AttackResult;
}

export class Party {
  readonly members: PartyMember[];
  selected = 0;

  constructor(defs: readonly MemberDef[]) {
    this.members = defs.map((d) => new PartyMember(d));
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
    const result = resolveAttack(member.attackBonus, member.def.weapon, target.armorClass, rng);
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
  takeDamage(index: number, amount: number): void {
    const m = this.members[index];
    if (!m) return;
    m.hp = Math.max(0, m.hp - amount);
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
