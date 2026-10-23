/**
 * A monster in the world (DESIGN.md 14.3): a character from the Meshy pipeline, a crowd agent
 * on the navmesh and a small state machine. Idle until the party comes within aggro range,
 * then closes in (walking near, running from afar), swings when in reach, flinches when hit
 * between its own swings, falls when its hit points run out and stays down.
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
import { resolveMonsterAttack } from '../game/combat';
import type { MonsterDef } from '../game/monsters';
import type { Rng } from '../game/rng';
import type { Character } from './character';
import type { NavAgent, Navigation } from './navigation';

export type MonsterState = 'idle' | 'chase' | 'attack' | 'hit' | 'dead';

/** What a monster needs from the party: where it stands and whom it can hit. */
export interface PartyTarget {
  /** Feet position in scene space. */
  position: Vector3;
  /** The member this blow goes for, or null when nobody stands. */
  pickTarget(
    rng: Rng,
  ): { name: string; armorClass: number; hit(damage: number, from: Vector3): void } | null;
}

export interface MonsterEvent {
  monster: Monster;
  kind: 'hit' | 'miss' | 'death';
  text: string;
}

const RUN_BEYOND = 5;
/** Swings and the hit reaction play at 1.5 times their authored pace (DESIGN.md 14.3). */
const SWING_SPEED = 1.5;
const HIT_SPEED = 1.5;
/** The blow lands this far into the swing (DESIGN.md 14.3). */
const BLOW_AT = 0.4;
/** Seconds a monster that has just come into reach gathers itself before it swings. */
const WIND_UP = 0.3;

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
        if (d <= this.def.attackRange) {
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
    }
    if (this.agent && this.state !== 'attack' && !this.push) {
      this.character.node.position.copyFrom(this.agent.position);
      const v = this.agent.velocity;
      if (v.x * v.x + v.z * v.z > 0.01) this.character.yaw = Math.atan2(v.x, v.z);
    }
  }

  private chase(target: Vector3, d: number): void {
    const gait: 'walk' | 'run' = d > RUN_BEYOND ? 'run' : 'walk';
    if (this.moving !== gait) {
      this.moving = gait;
      this.character.play(gait);
      this.agent?.setMaxSpeed(gait === 'run' ? this.def.runSpeed : this.def.walkSpeed);
    }
    if (this.agent) this.agent.moveTo(target);
    else {
      // No navmesh (tests, loading): walk straight at the target.
      const p = this.position;
      const step = (gait === 'run' ? this.def.runSpeed : this.def.walkSpeed) * (1 / 60);
      const dx = target.x - p.x;
      const dz = target.z - p.z;
      const len = Math.hypot(dx, dz) || 1;
      p.x += (dx / len) * Math.min(step, len);
      p.z += (dz / len) * Math.min(step, len);
      this.character.yaw = Math.atan2(dx, dz);
    }
  }

  private face(target: Vector3): void {
    const p = this.position;
    this.character.yaw = Math.atan2(target.x - p.x, target.z - p.z);
  }

  /** `spare`: the seconds of this step after the recovery ran out (see `update`). */
  private attack(dt: number, spare: number, party: PartyTarget, d: number): void {
    if (this.swingTime < 0) {
      if (d > this.def.attackRange * 1.4) {
        this.state = 'chase';
        return;
      }
      if (this.recovery > 0) return;
      this.swing = (this.swing % 2) + 1;
      this.character.play(`attack_${this.swing}`, { loop: false, speed: SWING_SPEED });
      this.swingLength = this.character.clipDuration / SWING_SPEED;
      this.swingTime = spare;
      this.blowLanded = false;
    } else {
      this.swingTime += dt;
    }
    if (!this.blowLanded && this.swingTime >= this.swingLength * BLOW_AT) {
      this.blowLanded = true;
      this.strike(party);
    }
    if (this.swingTime >= this.swingLength) {
      // The pause runs from the swing's end; what this step ran past it already counts.
      this.recovery = this.def.attackEverySec - (this.swingTime - this.swingLength);
      this.swingTime = -1;
      this.character.play('idle');
    }
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
        text: `${this.def.name} hits ${target.name} for ${r.damage}`,
      });
    } else {
      this.events.push({
        monster: this,
        kind: 'miss',
        text: `${this.def.name} misses ${target.name}`,
      });
    }
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
