/**
 * Townsfolk (DESIGN.md 16.2): a villager stands at their place, idles, turns to face the
 * party when it comes near, and answers a tap with a line in the status bar while the talk
 * clip plays. No quests yet; the lines are the village's voice until dialogue lands.
 */
import type { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { NpcDef } from '../game/monsters';
import type { Character } from './character';

const NOTICE_RANGE = 6;
const TALK_SECONDS = 3.5;

export class Npc {
  private line = 0;
  private talkUntil = 0;
  private readonly restYaw: number;
  private time = 0;

  constructor(
    readonly def: NpcDef,
    readonly character: Character,
  ) {
    this.restYaw = character.node.rotation.y;
    character.play('idle');
  }

  get name(): string {
    return this.def.name;
  }

  get position(): Vector3 {
    return this.character.node.position;
  }

  /** The next thing they have to say; starts the talk clip. */
  greet(): string {
    const text = this.def.lines[this.line % this.def.lines.length]!;
    this.line += 1;
    this.talkUntil = this.time + TALK_SECONDS;
    if (this.character.clips.includes('talk')) this.character.play('talk');
    return `${this.def.name}: ${text}`;
  }

  update(dt: number, party: Vector3): void {
    this.time += dt;
    const node = this.character.node;
    const dx = party.x - node.position.x;
    const dz = party.z - node.position.z;
    const near = dx * dx + dz * dz < NOTICE_RANGE * NOTICE_RANGE;
    // Turn to the party when it is near, back to their place when it leaves.
    const want = near ? Math.atan2(dx, dz) : this.restYaw;
    let delta = want - node.rotation.y;
    delta = Math.atan2(Math.sin(delta), Math.cos(delta));
    node.rotation.y += delta * Math.min(1, dt * 4);
    if (this.talkUntil > 0 && this.time >= this.talkUntil) {
      this.talkUntil = 0;
      this.character.play('idle');
    }
  }
}
