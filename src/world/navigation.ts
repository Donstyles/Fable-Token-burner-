/**
 * Runtime navigation on recast-navigation (the library the compile step builds the navmesh
 * with): the level's Detour binary is imported as is, a Crowd moves the monsters along it.
 * The navmesh lives in the kernel's right-handed space; Babylon is left-handed with X
 * mirrored (see level.ts), so every position crossing this boundary is mirrored.
 */
import {
  Crowd,
  NavMeshQuery,
  importNavMesh,
  init,
  type CrowdAgent,
  type NavMesh,
} from '@recast-navigation/core';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';

type V = { x: number; y: number; z: number };
const toNav = (v: Vector3): V => ({ x: -v.x, y: v.y, z: v.z });
const fromNav = (v: V): Vector3 => new Vector3(-v.x, v.y, v.z);

let ready: Promise<void> | null = null;

export interface AgentOptions {
  radius: number;
  height: number;
  maxSpeed: number;
}

/** One crowd agent in scene space. */
export class NavAgent {
  private target: Vector3 | null = null;

  constructor(
    private readonly crowd: Crowd,
    readonly agent: CrowdAgent,
  ) {}

  get position(): Vector3 {
    return fromNav(this.agent.position());
  }

  get velocity(): Vector3 {
    return fromNav(this.agent.velocity());
  }

  /** Steer toward a point; a target within 0.3 m of the last one is left alone. */
  moveTo(point: Vector3): void {
    if (this.target && Vector3.Distance(this.target, point) < 0.3) return;
    this.target = point.clone();
    this.agent.requestMoveTarget(toNav(point));
  }

  stop(): void {
    this.target = null;
    this.agent.resetMoveTarget();
  }

  setMaxSpeed(maxSpeed: number): void {
    if (this.agent.maxSpeed !== maxSpeed) this.agent.updateParameters({ maxSpeed });
  }

  teleport(point: Vector3): void {
    this.target = null;
    this.agent.teleport(toNav(point));
  }

  remove(): void {
    this.crowd.removeAgent(this.agent);
  }
}

export class Navigation {
  private readonly crowd: Crowd;
  private readonly query: NavMeshQuery;

  private constructor(private readonly navMesh: NavMesh) {
    this.crowd = new Crowd(navMesh, { maxAgents: 32, maxAgentRadius: 0.6 });
    this.query = new NavMeshQuery(navMesh);
  }

  /** Fetch a compiled level's `.nav.bin` and import it. The WASM module loads once. */
  static async load(url: string): Promise<Navigation> {
    ready ??= init();
    await ready;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url}: ${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    const imported = importNavMesh(bytes) as { navMesh: NavMesh } | NavMesh;
    const navMesh = 'navMesh' in imported ? imported.navMesh : imported;
    return new Navigation(navMesh);
  }

  /** Nearest walkable point within `extent` metres, or null. */
  nearest(point: Vector3, extent = 1): Vector3 | null {
    const r = this.query.findNearestPoly(toNav(point), {
      halfExtents: { x: extent, y: extent * 2, z: extent },
    });
    if (!r.success || !r.nearestRef) return null;
    return fromNav(r.nearestPoint);
  }

  addAgent(point: Vector3, opts: AgentOptions): NavAgent {
    const agent = this.crowd.addAgent(toNav(point), {
      radius: opts.radius,
      height: opts.height,
      maxSpeed: opts.maxSpeed,
      maxAcceleration: 12,
      collisionQueryRange: opts.radius * 12,
      pathOptimizationRange: opts.radius * 30,
      separationWeight: 1,
    });
    return new NavAgent(this.crowd, agent);
  }

  update(dt: number): void {
    this.crowd.update(dt);
  }

  dispose(): void {
    this.crowd.destroy();
    this.query.destroy();
    this.navMesh.destroy();
  }
}
