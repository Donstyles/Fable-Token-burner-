import {
  PhysicsCharacterController,
  CharacterSupportedState,
} from '@babylonjs/core/Physics/v2/characterController';
import type { CharacterSurfaceInfo } from '@babylonjs/core/Physics/v2/characterController';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Observable } from '@babylonjs/core/Misc/observable';
import { PhysicsRaycastResult } from '@babylonjs/core/Physics/physicsRaycastResult';
import type { PhysicsEngine } from '@babylonjs/core/Physics/v2/physicsEngine';
import type { Scene } from '@babylonjs/core/scene';
import type { TargetCamera } from '@babylonjs/core/Cameras/targetCamera';
import type { FrameInput } from '../app/input/zones';

/** Everything tunable about how the party moves. Edited live from the dev panel. */
export interface PartyTuning {
  /** Forward speed, m/s. */
  walkSpeed: number;
  /** Degrees of yaw per CSS px of right-thumb drag while walking. */
  turnDegPerPx: number;
  /** Degrees per CSS px of right-thumb drag while stationary. */
  lookDegPerPx: number;
  /** Keyboard turn rate, deg/s. */
  keyTurnDegPerSec: number;
  pitchMinDeg: number;
  pitchMaxDeg: number;
  /** Downward acceleration, m/s². */
  gravity: number;
  capsuleRadius: number;
  capsuleHeight: number;
  /** Eye height above the feet. */
  eyeHeight: number;
  maxStepHeight: number;
  maxSlopeDeg: number;
  /** Drops taller than this report a fall. */
  fallDamageMinM: number;
  /** Fraction of the velocity difference applied per step: 1 is instant start and stop. */
  accelGain: number;
  /** Magnetic level view on/off (off by default, 2026-10-14). */
  levelSnapEnabled: boolean;
  /** Magnetic level view: when a look drag ends within this many degrees of level, snap to level. */
  levelSnapDeg: number;
  /** Speed of the snap, degrees per second. */
  levelSnapDegPerSec: number;
}

export const DEFAULT_TUNING: PartyTuning = {
  walkSpeed: 4.5,
  turnDegPerPx: 0.22,
  lookDegPerPx: 0.18,
  keyTurnDegPerSec: 120,
  pitchMinDeg: -60,
  pitchMaxDeg: 60,
  gravity: 20,
  capsuleRadius: 0.35,
  capsuleHeight: 1.8,
  eyeHeight: 1.65,
  maxStepHeight: 0.45,
  maxSlopeDeg: 50,
  fallDamageMinM: 3,
  accelGain: 1,
  levelSnapEnabled: false,
  levelSnapDeg: 8,
  levelSnapDegPerSec: 45,
};

export interface FallEvent {
  /** Height of the drop in metres. */
  height: number;
}

const DEG = Math.PI / 180;
const UP = new Vector3(0, 1, 0);
const DOWN = new Vector3(0, -1, 0);

/** Move `value` toward zero by at most `step`. */
function towardZero(value: number, step: number): number {
  if (Math.abs(value) <= step) return 0;
  return value - Math.sign(value) * step;
}

/**
 * First-person party movement on a Havok character capsule, driven by FrameInput.
 * Tank controls: forward and backward along the facing, slow sideways strafing, turning by
 * yaw, and a magnetic snap back to a level view after small pitch excursions.
 */
export class PartyController {
  readonly onFall = new Observable<FallEvent>();
  tuning: PartyTuning;
  yaw = 0;
  pitch = 0;

  private readonly controller: PhysicsCharacterController;
  private readonly physics: PhysicsEngine;
  private readonly ray = new PhysicsRaycastResult();
  /** True when the last step produced almost no movement despite a movement request. */
  private blocked = false;
  private readonly gravityVec = new Vector3();
  private readonly forward = new Vector3();
  private readonly right = new Vector3();
  private readonly desired = new Vector3();
  private levelling = false;
  private airborne = false;
  private apexY = 0;
  private landedY = 0;
  /** Diagnostics for the dev build. */
  lastSupport: CharacterSupportedState = CharacterSupportedState.UNSUPPORTED;
  lastInputMove = 0;

  constructor(
    scene: Scene,
    private readonly camera: TargetCamera,
    feetPosition: Vector3,
    tuning: PartyTuning = DEFAULT_TUNING,
    yawDeg = 0,
  ) {
    const physics = scene.getPhysicsEngine();
    if (!physics) throw new Error('PartyController needs physics enabled on the scene');
    this.physics = physics as PhysicsEngine;
    this.tuning = { ...tuning };
    this.yaw = yawDeg * DEG;
    const start = feetPosition.add(new Vector3(0, this.tuning.capsuleHeight / 2 + 0.05, 0));
    this.controller = new PhysicsCharacterController(
      start,
      { capsuleHeight: this.tuning.capsuleHeight, capsuleRadius: this.tuning.capsuleRadius },
      scene,
    );
    this.applyTuning();
    this.landedY = start.y;
    this.syncCamera();
  }

  /** Feet position in world space. */
  get position(): Vector3 {
    const c = this.controller.getPosition();
    return new Vector3(c.x, c.y - this.tuning.capsuleHeight / 2, c.z);
  }

  get isAirborne(): boolean {
    return this.airborne;
  }

  get velocity(): Vector3 {
    return this.controller.getVelocity().clone();
  }

  teleport(feetPosition: Vector3, yawDeg?: number): void {
    this.controller.setPosition(
      feetPosition.add(new Vector3(0, this.tuning.capsuleHeight / 2 + 0.05, 0)),
    );
    this.controller.setVelocity(Vector3.Zero());
    if (yawDeg !== undefined) this.yaw = yawDeg * DEG;
    this.pitch = 0;
    this.levelling = false;
    this.airborne = false;
    this.syncCamera();
  }

  setTuning(next: Partial<PartyTuning>): void {
    this.tuning = { ...this.tuning, ...next };
    this.applyTuning();
  }

  update(dt: number, input: FrameInput): void {
    if (dt <= 0) return;
    const t = this.tuning;

    // Orientation. Right drag turns while moving and looks while stationary.
    this.yaw += input.turnPx * t.turnDegPerPx * DEG;
    this.yaw += input.keyTurn * t.keyTurnDegPerSec * DEG * dt;
    this.yaw += input.lookX * t.lookDegPerPx * DEG;
    if (input.lookY !== 0) {
      this.levelling = false;
      this.pitch += input.lookY * t.lookDegPerPx * DEG;
    }
    this.pitch = Math.max(t.pitchMinDeg * DEG, Math.min(t.pitchMaxDeg * DEG, this.pitch));

    // Magnetic level view: a look drag that ends close to level eases back to level.
    if (t.levelSnapEnabled && input.lookReleased && Math.abs(this.pitch) <= t.levelSnapDeg * DEG) {
      this.levelling = true;
    }
    if (this.levelling) {
      this.pitch = towardZero(this.pitch, t.levelSnapDegPerSec * DEG * dt);
      if (this.pitch === 0) this.levelling = false;
    }

    // Facing on the ground plane (Babylon is left-handed: yaw 0 faces +Z, turning right is +yaw).
    this.forward.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    this.right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    const cc = this.controller;
    const support: CharacterSurfaceInfo = cc.checkSupport(dt, DOWN);
    this.lastSupport = support.supportedState;
    this.lastInputMove = input.move;
    const current = cc.getVelocity();
    this.desired
      .copyFrom(this.forward)
      .scaleInPlace(input.move * t.walkSpeed)
      .addInPlace(this.right.scale(input.strafe * t.walkSpeed));
    this.gravityVec.set(0, -t.gravity, 0);

    let next: Vector3;
    if (support.supportedState === CharacterSupportedState.SUPPORTED) {
      // The averaged contact normal tilts toward any wall we touch; treat anything steeper
      // than a walkable slope as flat ground so pressing against a wall never zeroes movement.
      const n = support.averageSurfaceNormal;
      const surfaceNormal = Vector3.Dot(n, UP) >= Math.cos(t.maxSlopeDeg * DEG) ? n : UP;
      if (this.blocked && this.desired.lengthSquared() > 0.01) this.stepUp(this.desired);
      next = cc.calculateMovement(
        dt,
        this.forward,
        surfaceNormal,
        current,
        support.averageSurfaceVelocity,
        this.desired,
        UP,
      );
      // Keep the result in the surface plane so slopes do not launch the party.
      next.subtractInPlace(support.averageSurfaceVelocity);
      if (Vector3.Dot(next, UP) > 1e-3) {
        const len = next.length();
        if (len > 1e-6) {
          next.scaleInPlace(1 / len);
          const horizontal = len / Math.max(1e-3, Vector3.Dot(support.averageSurfaceNormal, UP));
          const c = Vector3.Cross(support.averageSurfaceNormal, next);
          next = Vector3.Cross(c, UP).scaleInPlace(horizontal);
        }
      }
      next.addInPlace(support.averageSurfaceVelocity);
      this.onLanded();
    } else {
      // In the air: keep horizontal momentum, let gravity act.
      next = current.add(this.gravityVec.scale(dt));
      if (support.supportedState === CharacterSupportedState.SLIDING) {
        // Slide down steep surfaces rather than sticking to them.
        const n = support.averageSurfaceNormal;
        const into = Vector3.Dot(next, n);
        if (into < 0) next.subtractInPlace(n.scale(into));
      }
      this.onAirborne();
    }

    cc.setVelocity(next);
    cc.integrate(dt, support, this.gravityVec);
    // Blocked: asked to move, barely moved. Checked next frame for a step-up.
    const wanted = Math.hypot(this.desired.x, this.desired.z);
    const got = cc.getVelocity();
    this.blocked = wanted > 0.1 && Math.hypot(got.x, got.z) < 0.25 * wanted;
    this.syncCamera();
  }

  /**
   * Ray-based step-up, used when the capsule is blocked: probe the ground just ahead at
   * step height, and if it is a walkable surface within maxStepHeight with head room,
   * lift the capsule onto it. Havok's own step-up rejects box edges, this one reads faces.
   */
  private stepUp(desired: Vector3): void {
    const t = this.tuning;
    const dir = new Vector3(desired.x, 0, desired.z).normalize();
    const centre = this.controller.getPosition();
    const footY = centre.y - t.capsuleHeight / 2;
    const ahead = t.capsuleRadius + 0.2;
    const probeTop = t.maxStepHeight + 0.25;
    const from = new Vector3(centre.x + dir.x * ahead, footY + probeTop, centre.z + dir.z * ahead);
    const to = new Vector3(from.x, footY - 0.05, from.z);
    this.physics.raycastToRef(from, to, this.ray);
    if (!this.ray.hasHit) return;
    const rise = this.ray.hitPointWorld.y - footY;
    if (rise < 0.03 || rise > t.maxStepHeight) return;
    if (this.ray.hitNormalWorld.y < Math.cos(t.maxSlopeDeg * DEG)) return;
    // Head room above the capsule for the lift.
    const headFrom = new Vector3(centre.x, centre.y + t.capsuleHeight / 2, centre.z);
    const headTo = new Vector3(headFrom.x, headFrom.y + rise + 0.05, headFrom.z);
    this.physics.raycastToRef(headFrom, headTo, this.ray);
    if (this.ray.hasHit) return;
    // Distance to the obstacle's face at half the step height, so the capsule's lowest
    // point lands past the edge rather than hanging over the drop behind it.
    const faceFrom = new Vector3(centre.x, footY + rise * 0.5, centre.z);
    const faceTo = new Vector3(faceFrom.x + dir.x * ahead, faceFrom.y, faceFrom.z + dir.z * ahead);
    this.physics.raycastToRef(faceFrom, faceTo, this.ray);
    const faceDist = this.ray.hasHit ? this.ray.hitDistance : ahead - 0.1;
    const forward = faceDist + 0.1;
    this.controller.setPosition(
      new Vector3(centre.x + dir.x * forward, centre.y + rise + 0.02, centre.z + dir.z * forward),
    );
    this.blocked = false;
  }

  dispose(): void {
    this.controller.dispose();
    this.onFall.clear();
  }

  private applyTuning(): void {
    const cc = this.controller;
    cc.maxStepHeight = this.tuning.maxStepHeight;
    cc.maxSlopeCosine = Math.cos(this.tuning.maxSlopeDeg * DEG);
    // MM6 movement starts and stops instantly; the gain is the fraction of the velocity
    // difference applied each step, the cap is effectively unlimited.
    cc.acceleration = Math.max(0.01, Math.min(1, this.tuning.accelGain));
    cc.maxAcceleration = 1000;
    cc.keepDistance = 0.05;
    cc.keepContactTolerance = 0.1;
  }

  private onAirborne(): void {
    const y = this.controller.getPosition().y;
    if (!this.airborne) {
      this.airborne = true;
      this.apexY = y;
    } else if (y > this.apexY) {
      this.apexY = y;
    }
  }

  private onLanded(): void {
    if (!this.airborne) return;
    this.airborne = false;
    this.landedY = this.controller.getPosition().y;
    const height = this.apexY - this.landedY;
    if (height >= this.tuning.fallDamageMinM) this.onFall.notifyObservers({ height });
  }

  private syncCamera(): void {
    const c = this.controller.getPosition();
    const eye = c.y - this.tuning.capsuleHeight / 2 + this.tuning.eyeHeight;
    this.camera.position.set(c.x, eye, c.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }
}
