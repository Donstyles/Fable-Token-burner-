/**
 * A monster in the world (DESIGN.md 14.3, 17.16): a character from the Meshy pipeline, a crowd
 * agent on the navmesh and a small state machine. Idle until the party comes within aggro
 * range, then closes in (walking near, running from afar), swings when in reach, flinches when
 * hit between its own swings, falls when its hit points run out and stays down. One with a
 * missile stops where it can see the party and shoots or casts instead of closing in; one whose
 * hit points fall under its AI type's share runs from the party, and turns to fight again only
 * when it is cornered (monsters.md 2.4, 2.7). A hit may try the monster's special attack, which
 * the struck member saves against (2.6).
 *
 * Every timer here runs on the `dt` the update receives, the world's step, and never on the
 * clips' clock. The animation stepper advances the clips on the real frame time
 * (src/render/animation-step.ts) while src/dev/index.ts caps the world's step at 50 ms, so on
 * a slow device a clip plays out before the game time it stands for. Swings that ended with
 * their clips came quicker below 20 fps and lost their blows altogether once a frame took
 * more than about 125 ms (play-through audit, 2026-10-23). The clips still play; they are for
 * show.
 */
import type { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { SpecialOutcome } from '../game/character';
import { resolveMonsterAttack, triesSpecial } from '../game/combat';
import { CONDITION_DEFS } from '../game/conditions';
import { fleesAt, type MissileKind, type MonsterDef, type MonsterSpecial } from '../game/monsters';
import type { Rng } from '../game/rng';
import type { Character } from './character';
import type { NavAgent, Navigation } from './navigation';

export type MonsterState = 'idle' | 'chase' | 'attack' | 'hit' | 'flee' | 'dead';

/** A member a blow or a missile goes for. */
export interface MemberTarget {
  name: string;
  armorClass: number;
  hit(damage: number, from: Vector3): void;
  /** The monster's special attack on this member: the save and the condition, or null. */
  suffer?(special: MonsterSpecial): SpecialOutcome | null;
}

/** What a monster needs from the party: where it stands and whom it can hit. */
export interface PartyTarget {
  /** Feet position in scene space. */
  position: Vector3;
  /** The member this blow goes for, or null when nobody stands. */
  pickTarget(rng: Rng): MemberTarget | null;
  /** Could a missile from `from` reach the party unhindered? Absent: always. */
  canSee?(from: Vector3): boolean;
}

/** A missile in the air: the runtime flies it and calls `land` where it comes down. */
export interface Shot {
  from: Vector3;
  /** Where the party stood when the missile left, at chest height. */
  at: Vector3;
  kind: MissileKind;
  /** Metres per second. */
  speed: number;
  /**
   * The missile arrives at `arrived`; the party stands at `partyAt`. A party that has stepped
   * aside is missed, else the shot's roll decides. Events for the log follow.
   */
  land(arrived: Vector3, partyAt: Vector3): void;
}

export interface MonsterEvent {
  monster: Monster;
  kind: 'hit' | 'miss' | 'death' | 'shoot' | 'flee';
  text: string;
  shot?: Shot;
}

const RUN_BEYOND = 5;
/** Swings and the hit reaction play at 1.5 times their authored pace (DESIGN.md 14.3). */
const SWING_SPEED = 1.5;
const HIT_SPEED = 1.5;
/** The blow lands this far into the swing (DESIGN.md 14.3). */
const BLOW_AT = 0.4;
/** Seconds a monster that has just come into reach gathers itself before it swings. */
const WIND_UP = 0.3;
/** A missile is used only from beyond this many arm's reaches. */
const MISSILE_FROM = 1.5;
/** A party this far from where it stood when the missile left has stepped out of its way. */
export const DODGE = 1.2;
/** Metres a second a missile flies: a bolt as the party's, an arrow faster. */
const MISSILE_SPEED: Record<'bolt' | 'arrow', number> = { bolt: 16, arrow: 26 };
/** A fleeing monster runs for a point this far off, away from the party. */
const FLEE_STEP = 8;
/** It flees only while the party is nearer than this many aggro ranges, then stands off. */
const FLEE_WITHIN = 2.5;
/** Fleeing but not getting away for this long, with the party close, it turns and fights. */
const CORNERED_AFTER = 1.2;
const CORNERED_MOVE = 0.35;

export class Monster {
  hp: number;
  state: MonsterState = 'idle';
  readonly events: MonsterEvent[] = [];
  private agent: NavAgent | null = null;
  /** The attack clip of the last swing, 1 or 2; they alternate. */
  private swing = 0;
  /** Seconds of game time into the swing in progress, or -1 between swings. */
  private swingTime = -1;
  /** The swing's length in game seconds: its clip's at the swing's pace. */
  private swingLength = 0;
  /** This swing looses a missile rather than a blow. */
  private shooting = false;
  private blowLanded = false;
  /**
   * Seconds of game time before the monster may swing again: the pause after each swing,
   * `attackEverySec`. It runs down whatever the monster is doing, flinching and reeling
   * included, as a monster's recovery does in the MM7 engine (docs/gaps/monsters.md 2.5).
   */
  private recovery = 0;
  /** Seconds of game time left of the hit reaction. */
  private reeling = 0;
  private moving: 'walk' | 'run' | null = null;
  private push: { dir: Vector3; remaining: number } | null = null;
  private stunnedUntil = -1;
  /** Cornered while fleeing: it fights to the end from now on. */
  private cornered = false;
  /** Seconds fleeing without getting anywhere, and where it was at the last check. */
  private stuckFor = 0;
  private fleeFrom: { x: number; z: number } | null = null;

  constructor(
    readonly def: MonsterDef,
    readonly character: Character,
    private readonly nav: Navigation | null,
    private readonly rng: Rng,
  ) {
    this.hp = def.hp;
    const feet = nav?.nearest(character.node.position, 1.5) ?? null;
    if (feet) character.node.position.copyFrom(feet);
    this.agent =
      nav?.addAgent(character.node.position, {
        radius: 0.35,
        height: def.heightMetres,
        maxSpeed: def.walkSpeed,
      }) ?? null;
    character.play('idle');
  }

  get name(): string {
    return this.character.node.name;
  }

  get position(): Vector3 {
    return this.character.node.position;
  }

  get alive(): boolean {
    return this.state !== 'dead';
  }

  get armorClass(): number {
    return this.def.armorClass;
  }

  /** Running from the party. */
  get fleeing(): boolean {
    return this.state === 'flee';
  }

  distanceTo(point: Vector3): number {
    const p = this.position;
    return Math.hypot(point.x - p.x, point.z - p.z);
  }

  /**
   * Damage from the party; a spent monster falls. A living one flinches only between its own
   * swings: a blow does not break a swing, and a flinch already playing (or a stun) is not
   * restarted, as the MM7 engine's stun passes over a monster that is attacking or already
   * reeling (OE `Actor::AI_Stun`; MM6 unverified). Its recovery runs on through the flinch, so
   * a party striking in turn cannot hold it off; when every blow restarted the swing, the
   * play-through audit (2026-10-23) took no damage over five kills.
   */
  takeDamage(amount: number): 'hit' | 'dead' {
    if (!this.alive) return 'dead';
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp === 0) {
      this.state = 'dead';
      this.agent?.remove();
      this.agent = null;
      this.character.play('death');
      this.events.push({ monster: this, kind: 'death', text: `${this.def.name} falls` });
      return 'dead';
    }
    if (this.swingTime >= 0 || this.state === 'hit') return 'hit';
    this.state = 'hit';
    this.moving = null;
    this.agent?.stop();
    this.character.play('hit', { loop: false, speed: HIT_SPEED });
    this.reeling = this.character.clipDuration / HIT_SPEED;
    return 'hit';
  }

  /** Shove the monster along `dir` (horizontal, normalised) over the next tenth of a second. */
  knockback(dir: Vector3, metres: number): void {
    this.push = { dir: dir.clone(), remaining: metres };
  }

  /** Hold the monster reeling until `now + seconds` (Stun, DESIGN.md 16.9). */
  stun(seconds: number, now: number): void {
    if (!this.alive) return;
    this.stunnedUntil = Math.max(this.stunnedUntil, now + seconds);
    this.state = 'hit';
    // Unlike a blow, a stun breaks a swing: its blow never lands.
    this.swingTime = -1;
    this.moving = null;
    this.agent?.stop();
    this.character.play('hit', { loop: false, speed: 1 });
  }

  get stunned(): boolean {
    return this.alive && this.state === 'hit' && this.stunnedUntil > 0;
  }

  private applyPush(dt: number): void {
    if (!this.push || dt <= 0) return;
    // An exponential ease over about a tenth of a second, by time so a frozen or slow frame
    // moves the monster no further than a fast one.
    const step = Math.min(this.push.remaining, this.push.remaining * Math.min(1, dt / 0.06));
    this.character.node.position.addInPlace(this.push.dir.scale(step));
    this.push.remaining -= step;
    if (this.push.remaining <= 0.02) {
      this.push = null;
      this.agent?.teleport(this.character.node.position);
    }
  }

  /**
   * Should it be running? Under its AI type's share of hit points (monsters.md 2.7), with the
   * party near enough to run from, and not cornered. A monster never flees mid-swing.
   */
  private shouldFlee(d: number): boolean {
    if (this.cornered || this.swingTime >= 0) return false;
    const share = fleesAt(this.def);
    if (share <= 0 || this.hp > this.def.hp * share) return false;
    return d < this.def.aggroRange * FLEE_WITHIN;
  }

  update(dt: number, party: PartyTarget, now: number): void {
    this.applyPush(dt);
    if (this.state === 'dead') return;
    // The part of this step after the recovery ran out: a swing that starts now has already
    // run that long, so the rate of blows does not depend on the length of the step.
    const spare = Math.max(0, dt - this.recovery);
    this.recovery = Math.max(0, this.recovery - dt);
    if (this.stunnedUntil > 0) {
      if (now < this.stunnedUntil) return;
      this.stunnedUntil = -1;
      this.state = 'idle';
      this.character.play('idle');
    }
    const d = this.distanceTo(party.position);
    if (this.state !== 'hit') {
      const flee = this.shouldFlee(d);
      if (flee && this.state !== 'flee') this.startFlee();
      else if (!flee && this.state === 'flee') {
        // Far enough: it stands off, and comes again only if it dares.
        this.state = 'idle';
        this.moving = null;
        this.agent?.stop();
        this.character.play('idle');
      }
    }
    switch (this.state) {
      case 'idle':
        if (d <= this.def.aggroRange) this.state = 'chase';
        break;
      case 'hit':
        this.reeling -= dt;
        if (this.reeling > 0) break;
        // Over the flinch: in reach it stands to swing as soon as its recovery allows, with no
        // fresh wind-up; out of reach it closes in again.
        this.state = d <= this.def.attackRange ? 'attack' : 'chase';
        this.character.play('idle');
        break;
      case 'chase':
        if (d <= this.def.attackRange || this.canShoot(d, party)) {
          this.agent?.stop();
          this.moving = null;
          this.state = 'attack';
          // One still recovering from its last swing waits that out: in recovery a monster
          // stands or closes in (docs/gaps/monsters.md 2.4).
          this.recovery = Math.max(this.recovery, WIND_UP);
          this.character.play('idle');
          break;
        }
        this.chase(party.position, d);
        break;
      case 'attack':
        this.face(party.position);
        this.attack(dt, spare, party, d);
        break;
      case 'flee':
        this.flee(party.position, d, dt);
        break;
    }
    if (this.agent && this.state !== 'attack' && !this.push) {
      this.character.node.position.copyFrom(this.agent.position);
      const v = this.agent.velocity;
      if (v.x * v.x + v.z * v.z > 0.01) this.character.yaw = Math.atan2(v.x, v.z);
    }
  }

  /** In missile range, beyond arm's reach and with a clear line: it shoots from here. */
  private canShoot(d: number, party: PartyTarget): boolean {
    const m = this.def.missile;
    if (!m || d > m.range || d <= this.def.attackRange * MISSILE_FROM) return false;
    return party.canSee?.(this.muzzle()) ?? true;
  }

  /** Where a missile leaves: the chest. */
  private muzzle(): Vector3 {
    const m = this.position.clone();
    m.y += this.def.heightMetres * 0.65;
    return m;
  }

  private gait(gait: 'walk' | 'run'): void {
    if (this.moving === gait) return;
    this.moving = gait;
    this.character.play(gait);
    this.agent?.setMaxSpeed(gait === 'run' ? this.def.runSpeed : this.def.walkSpeed);
  }

  /** Step straight towards `target` without a navmesh (tests, loading). */
  private stepTo(target: { x: number; z: number }, speed: number): void {
    const p = this.position;
    const step = speed * (1 / 60);
    const dx = target.x - p.x;
    const dz = target.z - p.z;
    const len = Math.hypot(dx, dz) || 1;
    p.x += (dx / len) * Math.min(step, len);
    p.z += (dz / len) * Math.min(step, len);
    this.character.yaw = Math.atan2(dx, dz);
  }

  private chase(target: Vector3, d: number): void {
    const gait: 'walk' | 'run' = d > RUN_BEYOND ? 'run' : 'walk';
    this.gait(gait);
    if (this.agent) this.agent.moveTo(target);
    else this.stepTo(target, gait === 'run' ? this.def.runSpeed : this.def.walkSpeed);
  }

  private startFlee(): void {
    this.state = 'flee';
    this.moving = null;
    this.stuckFor = 0;
    this.fleeFrom = { x: this.position.x, z: this.position.z };
    this.events.push({ monster: this, kind: 'flee', text: `${this.def.name} flees` });
  }

  /** Run for a point away from the party; cornered with the party close, turn and fight. */
  private flee(party: Vector3, d: number, dt: number): void {
    this.gait('run');
    const p = this.position;
    const len = Math.max(0.01, d);
    const away = {
      x: p.x + ((p.x - party.x) / len) * FLEE_STEP,
      z: p.z + ((p.z - party.z) / len) * FLEE_STEP,
    };
    if (this.agent) {
      const goal = p.clone();
      goal.x = away.x;
      goal.z = away.z;
      // The nearest spot on the navmesh in that direction; none within reach means a wall.
      const spot = this.nav?.nearest(goal, FLEE_STEP) ?? null;
      this.agent.moveTo(spot ?? goal);
    } else this.stepTo(away, this.def.runSpeed);
    // Not getting anywhere with the party on it: cornered.
    this.stuckFor += dt;
    if (this.stuckFor >= CORNERED_AFTER) {
      const from = this.fleeFrom ?? { x: p.x, z: p.z };
      const moved = Math.hypot(p.x - from.x, p.z - from.z);
      if (moved < CORNERED_MOVE && d < this.def.attackRange * 2.5) {
        this.cornered = true;
        this.state = 'chase';
        this.moving = null;
      }
      this.stuckFor = 0;
      this.fleeFrom = { x: p.x, z: p.z };
    }
  }

  private face(target: Vector3): void {
    const p = this.position;
    this.character.yaw = Math.atan2(target.x - p.x, target.z - p.z);
  }

  /** `spare`: the seconds of this step after the recovery ran out (see `update`). */
  private attack(dt: number, spare: number, party: PartyTarget, d: number): void {
    if (this.swingTime < 0) {
      // Each swing decides afresh: a blow in reach, a missile beyond it, else close in.
      const shoot = d > this.def.attackRange && this.canShoot(d, party);
      if (!shoot && d > this.def.attackRange * 1.4) {
        this.state = 'chase';
        return;
      }
      if (this.recovery > 0) return;
      this.shooting = shoot;
      if (shoot) {
        const clip = this.def.missile!.kind === 'arrow' ? 'attack_1' : 'cast';
        this.character.play(clip, { loop: false, speed: SWING_SPEED });
      } else {
        this.swing = (this.swing % 2) + 1;
        this.character.play(`attack_${this.swing}`, { loop: false, speed: SWING_SPEED });
      }
      this.swingLength = this.character.clipDuration / SWING_SPEED;
      this.swingTime = spare;
      this.blowLanded = false;
    } else {
      this.swingTime += dt;
    }
    if (!this.blowLanded && this.swingTime >= this.swingLength * BLOW_AT) {
      this.blowLanded = true;
      if (this.shooting) this.shoot(party);
      else this.strike(party);
    }
    if (this.swingTime >= this.swingLength) {
      // The pause runs from the swing's end; what this step ran past it already counts.
      this.recovery = this.def.attackEverySec - (this.swingTime - this.swingLength);
      this.swingTime = -1;
      this.character.play('idle');
    }
  }

  /** The special attack after a hit, if any: the try, then the member's save. */
  private special(target: MemberTarget): string {
    const special = this.def.special;
    if (!special || !target.suffer || !triesSpecial(this.def, this.rng)) return '';
    const outcome = target.suffer(special);
    if (!outcome) return '';
    const name = CONDITION_DEFS[outcome.condition].name.toLowerCase();
    return outcome.landed ? `; ${target.name} is ${name}` : `; ${target.name} resists`;
  }

  private strike(party: PartyTarget): void {
    const target = party.pickTarget(this.rng);
    if (!target) return;
    // MM6's monster blow: the chance by the monster's level against the armour class.
    const r = resolveMonsterAttack(this.def, target.armorClass, this.rng);
    if (r.hit) {
      target.hit(r.damage, this.position);
      this.events.push({
        monster: this,
        kind: 'hit',
        text: `${this.def.name} hits ${target.name} for ${r.damage}${this.special(target)}`,
      });
    } else {
      this.events.push({
        monster: this,
        kind: 'miss',
        text: `${this.def.name} misses ${target.name}`,
      });
    }
  }

  /**
   * Loose a missile at the party where it stands: the roll is made now, as a blow's is, and
   * lands when the runtime brings the shot down. Attack 1's missiles carry the special
   * (monsters.md 2.6, the MM7 engine).
   */
  private shoot(party: PartyTarget): void {
    const missile = this.def.missile;
    const target = party.pickTarget(this.rng);
    if (!missile || !target) return;
    const r = resolveMonsterAttack(
      { level: this.def.level, damage: missile.damage },
      target.armorClass,
      this.rng,
    );
    const from = this.muzzle();
    const at = party.position.clone();
    at.y += 1.2;
    const verb = missile.kind === 'arrow' ? 'shoots' : 'casts';
    const shot: Shot = {
      from,
      at,
      kind: missile.kind,
      speed: MISSILE_SPEED[missile.kind === 'arrow' ? 'arrow' : 'bolt'],
      land: (arrived, partyAt) => {
        const off = Math.hypot(arrived.x - partyAt.x, arrived.z - partyAt.z);
        if (off > DODGE) {
          this.events.push({
            monster: this,
            kind: 'miss',
            text: `${this.def.name}'s ${missile.kind === 'arrow' ? 'arrow' : 'bolt'} flies past`,
          });
          return;
        }
        if (r.hit) {
          target.hit(r.damage, from);
          this.events.push({
            monster: this,
            kind: 'hit',
            text: `${this.def.name} hits ${target.name} for ${r.damage}${this.special(target)}`,
          });
        } else {
          this.events.push({
            monster: this,
            kind: 'miss',
            text: `${this.def.name} misses ${target.name}`,
          });
        }
      },
    };
    this.events.push({
      monster: this,
      kind: 'shoot',
      text: `${this.def.name} ${verb} at ${target.name}`,
      shot,
    });
  }

  /** Drain the event log. */
  takeEvents(): MonsterEvent[] {
    return this.events.splice(0, this.events.length);
  }

  dispose(): void {
    this.agent?.remove();
    this.character.dispose();
  }
}
