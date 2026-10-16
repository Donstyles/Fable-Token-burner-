/**
 * A monster in the world (DESIGN.md 14.3): a character from the Meshy pipeline, a crowd agent
 * on the navmesh and a small state machine. Idle until the party comes within aggro range,
 * then closes in (walking near, running from afar), swings when in reach, flinches when hit,
 * falls when its hit points run out and stays down.
 */
import type { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { resolveAttack } from '../game/combat';
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
  pickTarget(rng: Rng): { name: string; armorClass: number; hit(damage: number): void } | null;
}

export interface MonsterEvent {
  monster: Monster;
  text: string;
}

const RUN_BEYOND = 5;

export class Monster {
  hp: number;
  state: MonsterState = 'idle';
  readonly events: MonsterEvent[] = [];
  private agent: NavAgent | null = null;
  private swing = 0;
  private swingHitAt = -1;
  private swingDone = true;
  private nextSwingIn = 0;
  private moving: 'walk' | 'run' | null = null;

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

  /** Damage from the party; a living monster flinches, a spent one falls. */
  takeDamage(amount: number): 'hit' | 'dead' {
    if (!this.alive) return 'dead';
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp === 0) {
      this.state = 'dead';
      this.agent?.remove();
      this.agent = null;
      this.character.play('death');
      this.events.push({ monster: this, text: `${this.def.name} falls` });
      return 'dead';
    }
    this.state = 'hit';
    this.swingDone = true;
    this.moving = null;
    this.agent?.stop();
    this.character.play('hit', { loop: false, speed: 1.5 });
    return 'hit';
  }

  update(dt: number, party: PartyTarget, now: number): void {
    if (this.state === 'dead') return;
    const d = this.distanceTo(party.position);
    switch (this.state) {
      case 'idle':
        if (d <= this.def.aggroRange) this.state = 'chase';
        break;
      case 'hit':
        if (this.character.finished) {
          this.state = 'chase';
          this.character.play('idle');
        }
        break;
      case 'chase':
        if (d <= this.def.attackRange) {
          this.agent?.stop();
          this.moving = null;
          this.state = 'attack';
          this.nextSwingIn = 0.3;
          this.character.play('idle');
          break;
        }
        this.chase(party.position, d);
        break;
      case 'attack':
        this.face(party.position);
        this.attack(dt, party, now, d);
        break;
    }
    if (this.agent && this.state !== 'attack') {
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

  private attack(dt: number, party: PartyTarget, now: number, d: number): void {
    if (this.swingDone) {
      if (d > this.def.attackRange * 1.4) {
        this.state = 'chase';
        return;
      }
      this.nextSwingIn -= dt;
      if (this.nextSwingIn > 0) return;
      this.swing = (this.swing % 2) + 1;
      this.character.play(`attack_${this.swing}`, { loop: false, speed: 1.5 });
      // The blow lands partway through the swing, at the clip's own pace.
      this.swingHitAt = now + (this.character.clipDuration / 1.5) * 0.4;
      this.swingDone = false;
      return;
    }
    if (this.swingHitAt >= 0 && now >= this.swingHitAt) {
      this.swingHitAt = -1;
      const target = party.pickTarget(this.rng);
      if (target) {
        const r = resolveAttack(this.def.attackBonus, this.def.damage, target.armorClass, this.rng);
        if (r.hit) {
          target.hit(r.damage);
          this.events.push({
            monster: this,
            text: `${this.def.name} hits ${target.name} for ${r.damage}`,
          });
        } else {
          this.events.push({ monster: this, text: `${this.def.name} misses ${target.name}` });
        }
      }
    }
    if (this.character.finished) {
      this.swingDone = true;
      this.nextSwingIn = this.def.attackEverySec;
      this.character.play('idle');
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
