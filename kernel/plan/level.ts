import { DEG, mat4, v3, type Mat4, type Vec3 } from '../core/math';
import { MeshBuilder, type MeshData } from '../core/mesh';
import { box, cylinder, extrude, sweep } from '../core/ops';
import { arch, rect } from '../core/profile';
import { csg, unionAll } from '../csg/manifold';
import { marchingCubes } from '../sdf/marching';
import { sdf, type SDF } from '../sdf/sdf';
import {
  balustrade,
  barrelVault,
  bridge as bridgeElement,
  column,
  spiralStair,
  stairs as stairsElement,
  wall,
  wallParts,
  type Element,
} from '../elements/elements';
import { ROLE } from '../elements/roles';

/**
 * Level planner: spaces placed in metres and joined by connectors (DESIGN.md 11.2).
 * A level script calls these methods in order; build() produces one visual mesh, one
 * collider mesh and the metadata the game and the validator need.
 *
 * Conventions: Y up, metres. A space's `at` is the centre of its floor at floor level.
 * Sides are named as on a map (north = +Z, east = +X) before the space's rotation.
 * Positions along a side are measured from the side's left end as seen from inside.
 */
export type Side = 'north' | 'south' | 'east' | 'west';

export interface Opening {
  side: Side;
  /** Centre of the opening along the side, from its left end as seen from inside. */
  at: number;
  width: number;
  height: number;
  /** Bottom of the opening above the floor (a balcony door at gallery level). */
  sill?: number;
  kind?: 'round' | 'pointed' | 'square';
}

export interface HallOptions {
  name: string;
  /** Centre of the floor, at floor level. */
  at: Vec3;
  /** X extent, Z extent (before rotation). */
  size: [number, number];
  height: number;
  vault?: 'flat' | 'barrel';
  wallMaterial?: number;
  floorMaterial?: number;
  wallThickness?: number;
  openings?: Opening[];
  /** Rotation about Y in degrees. */
  rotation?: number;
  /** Fog inside this space; the runtime eases toward it when the party is here. */
  fog?: FogPreset;
}

export interface Space {
  name: string;
  at: Vec3;
  size: [number, number];
  height: number;
  rotation: number;
  /** World position on the inner face of a side at floor level, `along` metres from its left end. */
  edge(side: Side, along: number): Vec3;
  /** Outward unit direction of a side. */
  outward(side: Side): Vec3;
}

export interface Portal {
  /** Point on the shaft's inner wall at tread height. */
  position: Vec3;
  /** World angle (degrees, atan2(z, x)) of the portal around the shaft axis. */
  angleDeg: number;
  /** Unit direction from the axis through the portal. */
  outward: Vec3;
  /** Height of the tread (or floor) the portal opens onto. */
  y: number;
}

export interface ShaftSpace extends Space {
  radius: number;
  /** Where a doorway at height y should go so it meets a tread. */
  portal(y: number): Portal;
}

export interface LightPlacement {
  position: Vec3;
  color: [number, number, number];
  range: number;
  intensity: number;
  /** What casts it: braziers get fire and smoke at runtime, glows stay invisible. */
  kind: 'lantern' | 'brazier' | 'glow';
}

/** A body of water: one surface at one level, with the direction its surface flows. */
export interface WaterBody {
  name: string;
  kind: 'pool' | 'river';
  /** Surface height. */
  y: number;
  bounds: { min: Vec3; max: Vec3 };
  /** Unit flow direction on the ground plane (x, z); [0, 0] for still water. */
  flow: [number, number];
}

export interface WaterSurface extends WaterBody {
  mesh: MeshData;
}

export interface Waterfall {
  name: string;
  /** Where the water leaves the lip. */
  lip: Vec3;
  /** Where it hits the pool. */
  plunge: Vec3;
  width: number;
  /** Arc length of the sheet in metres, so the runtime can fade the foam in over a distance. */
  length: number;
  mesh: MeshData;
}

export interface FogPreset {
  density: number;
  color: [number, number, number];
}

/** A named region of the level, for fog, sound and the automap. */
export interface SpaceRecord {
  name: string;
  kind: 'hall' | 'shaft' | 'corridor' | 'cavern';
  bounds: { min: Vec3; max: Vec3 };
  fog?: FogPreset;
}

export interface NamedPoint {
  name: string;
  position: Vec3;
  kind: 'spawn' | 'door' | 'loot' | 'trigger' | 'poi';
}

export interface LevelOutput {
  name: string;
  /** Everything rendered. */
  visual: MeshData;
  /** Everything the party collides with: solid architecture plus the ramps under stairs. */
  collider: MeshData;
  water: WaterSurface[];
  waterfalls: Waterfall[];
  lights: LightPlacement[];
  points: NamedPoint[];
  spaces: SpaceRecord[];
  spawn: { position: Vec3; yawDeg: number };
  bounds: { min: Vec3; max: Vec3 };
}

type Deferred = () => Promise<void>;

const WALL_T = 0.6;

export class LevelBuilder {
  /** Rendered and collides. */
  private readonly solid = new MeshBuilder();
  /** Rendered only: stair treads, whose collision is a ramp. */
  private readonly dressing = new MeshBuilder();
  /** Collides only: ramps. */
  private readonly ramps = new MeshBuilder();
  private readonly waters: { body: WaterBody; mesh: MeshBuilder }[] = [];
  private readonly falls: { fall: Omit<Waterfall, 'mesh'>; mesh: MeshBuilder }[] = [];
  private readonly lights: LightPlacement[] = [];
  private readonly points: NamedPoint[] = [];
  private readonly spaces: SpaceRecord[] = [];
  private readonly deferred: Deferred[] = [];
  private spawnPoint: { position: Vec3; yawDeg: number } = { position: [0, 0, 0], yawDeg: 0 };

  constructor(readonly name: string) {}

  /** Where the party starts: feet position and heading. */
  spawn(position: Vec3, yawDeg = 0): void {
    this.spawnPoint = { position, yawDeg };
    this.points.push({ name: 'spawn', position, kind: 'spawn' });
  }

  point(name: string, position: Vec3, kind: NamedPoint['kind'] = 'poi'): void {
    this.points.push({ name, position, kind });
  }

  light(
    position: Vec3,
    color: [number, number, number],
    range = 9,
    intensity = 2,
    kind: LightPlacement['kind'] = 'glow',
  ): void {
    this.lights.push({ position, color, range, intensity, kind });
  }

  /** Place an element. Elements with their own collider keep their visual out of the collision mesh. */
  add(element: Element, transform?: Mat4): void {
    if (element.collider) {
      this.dressing.append(element.visual, transform);
      this.ramps.append(element.collider, transform);
    } else {
      this.solid.append(element.visual, transform);
    }
  }

  /**
   * A wall lantern: iron bracket, glowing pane (role glass, emissive at runtime) and a warm
   * light. `facing` is the direction the bracket projects from the wall.
   */
  lantern(o: {
    at: Vec3;
    facing: Vec3;
    color?: [number, number, number];
    range?: number;
    intensity?: number;
  }): void {
    const f = v3.normalize([o.facing[0], 0, o.facing[2]]);
    const yaw = Math.atan2(f[0], f[2]) - Math.PI / 2; // local +X along the bracket
    const place = mat4.compose(o.at, yaw);
    const m = new MeshBuilder();
    m.append(box(0.5, 0.06, 0.06, { material: ROLE.iron }).translate(0.25, 0.2, 0));
    m.append(box(0.06, 0.4, 0.06, { material: ROLE.iron }).translate(0.03, 0, 0));
    m.append(box(0.26, 0.34, 0.26, { material: ROLE.glass }).translate(0.42, 0, 0));
    m.append(box(0.3, 0.05, 0.3, { material: ROLE.iron }).translate(0.42, 0.2, 0));
    this.dressing.append(m, place);
    const lamp = mat4.transformPoint(place, [0.42, 0, 0]);
    this.light(lamp, o.color ?? [1, 0.62, 0.3], o.range ?? 10, o.intensity ?? 2.5, 'lantern');
  }

  /** A floor brazier: iron bowl on a stand with glowing coals and a warm light. */
  brazier(o: {
    at: Vec3;
    color?: [number, number, number];
    range?: number;
    intensity?: number;
  }): void {
    const m = new MeshBuilder();
    m.append(cylinder(0.35, 0.08, 12, { material: ROLE.iron }));
    m.append(cylinder(0.08, 0.8, 8, { material: ROLE.iron }).translate(0, 0.08, 0));
    m.append(cylinder(0.55, 0.35, 12, { material: ROLE.iron }).translate(0, 0.85, 0));
    m.append(cylinder(0.45, 0.12, 12, { material: ROLE.glass }).translate(0, 1.15, 0));
    this.solid.append(m, mat4.translation(o.at[0], o.at[1], o.at[2]));
    this.light(
      [o.at[0], o.at[1] + 1.5, o.at[2]],
      o.color ?? [1, 0.55, 0.22],
      o.range ?? 14,
      o.intensity ?? 2.5,
      'brazier',
    );
  }

  /** A flat slab with its top at `at`, centred on x/z. */
  slab(o: { at: Vec3; size: [number, number]; thickness?: number; material?: number }): void {
    const t = o.thickness ?? 0.4;
    this.solid.append(
      box(o.size[0], t, o.size[1], { material: o.material ?? ROLE.flagstone }).translate(
        o.at[0],
        o.at[1] - t / 2,
        o.at[2],
      ),
    );
  }

  /**
   * A rectangular hall: floor slab, four walls with openings, flat ceiling or barrel vault.
   * Openings are cut with booleans, so those walls are built when build() runs.
   */
  hall(o: HallOptions): Space {
    const [w, d] = o.size;
    const t = o.wallThickness ?? WALL_T;
    const rot = (o.rotation ?? 0) * DEG;
    const space = makeSpace(o.name, o.at, o.size, o.height, o.rotation ?? 0);
    this.recordSpace('hall', space, o.fog);
    const place = mat4.compose(o.at, rot);
    const wallMat = o.wallMaterial ?? ROLE.ashlar;
    // Floor.
    this.solid.append(
      box(w + 2 * t, 0.5, d + 2 * t, { material: o.floorMaterial ?? ROLE.flagstone }).translate(
        0,
        -0.25,
        0,
      ),
      place,
    );
    // Ceiling.
    if (o.vault === 'barrel') {
      const rise = Math.min(w / 2, o.height * 0.35);
      const vault = barrelVault({
        width: w,
        length: d + 2 * t,
        rise,
        thickness: t,
        material: wallMat,
      });
      this.solid.append(
        vault.visual,
        mat4.multiply(place, mat4.translation(0, o.height, -d / 2 - t)),
      );
      // Gable fills close the vault at both ends above the end walls.
      const gable = gableFill(w / 2 + t, rise + t, t, wallMat);
      this.solid.append(gable, mat4.multiply(place, mat4.translation(0, o.height, -d / 2 - t)));
      this.solid.append(gable, mat4.multiply(place, mat4.translation(0, o.height, d / 2)));
    } else {
      this.solid.append(
        box(w + 2 * t, 0.5, d + 2 * t, { material: wallMat }).translate(0, o.height + 0.25, 0),
        place,
      );
    }
    // Walls. Each runs along its local +X with the inside on local +Z.
    const sides: { side: Side; origin: Vec3; yaw: number; length: number; corner: number }[] = [
      {
        side: 'south',
        origin: [-w / 2 - t, 0, -d / 2 - t / 2],
        yaw: 0,
        length: w + 2 * t,
        corner: t,
      },
      {
        side: 'north',
        origin: [w / 2 + t, 0, d / 2 + t / 2],
        yaw: 180,
        length: w + 2 * t,
        corner: t,
      },
      { side: 'west', origin: [-w / 2 - t / 2, 0, d / 2], yaw: 90, length: d, corner: 0 },
      { side: 'east', origin: [w / 2 + t / 2, 0, -d / 2], yaw: -90, length: d, corner: 0 },
    ];
    for (const s of sides) {
      const local = mat4.multiply(place, mat4.compose(s.origin, s.yaw * DEG));
      const openings = (o.openings ?? []).filter((op) => op.side === s.side);
      const spec = {
        length: s.length,
        height: o.height,
        thickness: t,
        material: wallMat,
        plinth: { height: 0.5, depth: 0.08 },
        ...(o.vault === 'barrel' ? {} : { cornice: { height: 0.35, depth: 0.12 } }),
      };
      if (openings.length === 0) {
        this.solid.append(wall(spec).visual, local);
        continue;
      }
      this.deferred.push(async () => {
        let solid = (await unionAll(wallParts(spec).map((p) => p.toMeshData()))).toMeshData();
        for (const op of openings) {
          // Left end as seen from inside is local x = corner (the inner corner).
          const cutter = openingCutter(op, t + 0.2, wallMat).translate(
            s.corner + op.at,
            op.sill ?? 0,
            0,
          );
          solid = (await csg('subtract', solid, cutter.toMeshData())).toMeshData();
        }
        this.solid.append(solid, local);
      });
    }
    return space;
  }

  /**
   * A gallery: a balcony ring inside a hall at `level`, with a balustrade on its inner
   * edge and corbels beneath. The hall's walls support it.
   */
  gallery(o: { around: Space; level: number; width: number; material?: number }): void {
    const [w, d] = o.around.size;
    const rot = o.around.rotation * DEG;
    const place = mat4.compose(v3.add(o.around.at, [0, o.level, 0]), rot);
    const mat = o.material ?? ROLE.flagstone;
    const t = 0.35;
    const strips: [number, number, number, number][] = [
      [0, -d / 2 + o.width / 2, w, o.width], // south
      [0, d / 2 - o.width / 2, w, o.width], // north
      [-w / 2 + o.width / 2, 0, o.width, d - 2 * o.width], // west
      [w / 2 - o.width / 2, 0, o.width, d - 2 * o.width], // east
    ];
    for (const [x, z, sx, sz] of strips) {
      this.solid.append(box(sx, t, sz, { material: mat }).translate(x, -t / 2, z), place);
    }
    const iw = w - 2 * o.width;
    const id = d - 2 * o.width;
    const rails: { origin: Vec3; yaw: number; length: number }[] = [
      { origin: [-iw / 2, 0, -id / 2], yaw: 0, length: iw },
      { origin: [iw / 2, 0, id / 2], yaw: 180, length: iw },
      { origin: [-iw / 2, 0, id / 2], yaw: 90, length: id },
      { origin: [iw / 2, 0, -id / 2], yaw: -90, length: id },
    ];
    for (const r of rails) {
      const rail = balustrade({ length: r.length, material: ROLE.ashlar });
      this.solid.append(rail.visual, mat4.multiply(place, mat4.compose(r.origin, r.yaw * DEG)));
    }
    const corbel = box(0.5, 0.6, 0.5, { material: ROLE.trim });
    for (let x = -iw / 2 + 1.5; x < iw / 2; x += 3) {
      this.solid.append(
        corbel,
        mat4.multiply(place, mat4.translation(x, -t - 0.3, -id / 2 - 0.25)),
      );
      this.solid.append(corbel, mat4.multiply(place, mat4.translation(x, -t - 0.3, id / 2 + 0.25)));
    }
    for (let z = -id / 2 + 1.5; z < id / 2; z += 3) {
      this.solid.append(
        corbel,
        mat4.multiply(place, mat4.translation(-iw / 2 - 0.25, -t - 0.3, z)),
      );
      this.solid.append(corbel, mat4.multiply(place, mat4.translation(iw / 2 + 0.25, -t - 0.3, z)));
    }
  }

  /**
   * A vertical cylindrical shaft with a spiral stair from floor `from` to floor `to`.
   * Doorways are cut where treads meet the wall; `align` rotates the stair so the portal
   * at one height faces a given direction, and `portal(y)` reports the others.
   */
  shaft(o: {
    name: string;
    /** Axis position; the y component is ignored in favour of `from`. */
    at: Vec3;
    radius: number;
    from: number;
    to: number;
    stairRise?: number;
    /** Treads per full turn; 20 treads of 0.225 m put a portal every 4.5 m at the same angle. */
    stepsPerTurn?: number;
    wallMaterial?: number;
    align?: { y: number; angleDeg: number };
    openings?: { y: number; width?: number; height?: number }[];
    fog?: FogPreset;
  }): ShaftSpace {
    const t = WALL_T;
    const r = o.radius;
    const height = o.to - o.from;
    const base: Vec3 = [o.at[0], o.from, o.at[2]];
    const rise0 = o.stairRise ?? 0.22;
    const steps = Math.max(1, Math.round(height / rise0));
    const rise = height / steps;
    const perTurn = o.stepsPerTurn ?? 16;
    const stepAngle = 360 / perTurn; // degrees per tread
    const wallMat = o.wallMaterial ?? ROLE.ashlar;
    // Tread k (0-based) is centred at local angle (k + 0.5)·stepAngle with its top at (k + 1)·rise.
    const treadFor = (y: number): { k: number; angle: number; top: number } => {
      const k = Math.min(steps - 1, Math.max(-1, Math.round((y - o.from) / rise) - 1));
      return { k, angle: (k + 0.5) * stepAngle, top: o.from + (k + 1) * rise };
    };
    // rotationY(ρ) turns a local angle a into world angle a − ρ.
    const rotation = o.align ? treadFor(o.align.y).angle - o.align.angleDeg : 0;
    const place = mat4.compose(base, rotation * DEG);
    const portal = (y: number): Portal => {
      const tr = treadFor(y);
      const angleDeg = tr.angle - rotation;
      const a = angleDeg * DEG;
      const outward: Vec3 = [Math.cos(a), 0, Math.sin(a)];
      return {
        position: [base[0] + r * outward[0], tr.top, base[2] + r * outward[2]],
        angleDeg,
        outward,
        y: tr.top,
      };
    };
    // Shell: outer cylinder minus inner, with doorways cut, all in one deferred boolean. It
    // rises headroom above the top floor and is closed by a floor and a cap.
    const headroom = 3.5;
    this.deferred.push(async () => {
      const outer = cylinder(r + t, height + headroom + 0.5, 24, { material: wallMat }).translate(
        0,
        -0.5,
        0,
      );
      const inner = cylinder(r, height + headroom + 4, 24, { material: wallMat }).translate(
        0,
        -1.5,
        0,
      );
      let shell = await csg('subtract', outer.toMeshData(), inner.toMeshData());
      for (const op of o.openings ?? []) {
        const tr = treadFor(op.y);
        const w = op.width ?? 1.6;
        const h = op.height ?? 2.6;
        const a = tr.angle * DEG;
        // A box through the shell wall, radial along its local +Z.
        const cutter = box(w, h, 2 * t + 0.4, { material: wallMat }).translate(
          0,
          h / 2 + (tr.k < 0 ? -0.05 : 0),
          0,
        );
        const at = mat4.multiply(
          mat4.translation((r + t / 2) * Math.cos(a), tr.top - o.from, (r + t / 2) * Math.sin(a)),
          mat4.rotationY(Math.PI / 2 - a),
        );
        const placed = new MeshBuilder().append(cutter, at);
        shell = await csg('subtract', shell.toMeshData(), placed.toMeshData());
      }
      this.solid.append(shell, place);
    });
    const stair = spiralStair({
      radius: r + 0.1, // treads run into the wall: no gap at the edge
      innerRadius: Math.max(0.3, r * 0.18),
      rise,
      steps,
      turns: steps / perTurn,
    });
    this.add(stair, place);
    this.solid.append(
      cylinder(r + t, 0.5, 24, { material: ROLE.flagstone }).translate(0, -0.5, 0),
      place,
    );
    this.solid.append(
      cylinder(r + t, 0.5, 24, { material: wallMat }).translate(0, height + headroom, 0),
      place,
    );
    const space = makeSpace(o.name, base, [2 * r, 2 * r], height + headroom, rotation);
    this.recordSpace('shaft', space, o.fog);
    return { ...space, radius: r, portal };
  }

  /**
   * A straight corridor between two points at the same height, open at both ends, with
   * side walls and a flat ceiling or barrel vault. Its local +X runs from `from` to `to`.
   */
  corridor(o: {
    name: string;
    from: Vec3;
    to: Vec3;
    width: number;
    height: number;
    vault?: 'flat' | 'barrel';
    material?: number;
    fog?: FogPreset;
  }): Space {
    const dir = v3.sub(o.to, o.from);
    const length = Math.hypot(dir[0], dir[2]);
    const yaw = Math.atan2(dir[0], dir[2]) - Math.PI / 2;
    const t = 0.5;
    const mat = o.material ?? ROLE.ashlar;
    const place = mat4.compose(o.from, yaw);
    const w = o.width;
    this.solid.append(
      box(length, 0.5, w + 2 * t, { material: ROLE.flagstone }).translate(length / 2, -0.25, 0),
      place,
    );
    for (const z of [w / 2 + t / 2, -w / 2 - t / 2]) {
      const side = wall({ length, height: o.height, thickness: t, material: mat });
      this.solid.append(side.visual, mat4.multiply(place, mat4.translation(0, 0, z)));
    }
    if (o.vault === 'barrel') {
      const rise = Math.min(w / 2, o.height * 0.35);
      const vault = barrelVault({ width: w, length, rise, thickness: t, material: mat });
      this.solid.append(
        vault.visual,
        mat4.multiply(
          place,
          mat4.multiply(mat4.translation(0, o.height, 0), mat4.rotationY(Math.PI / 2)),
        ),
      );
    } else {
      this.solid.append(
        box(length, 0.5, w + 2 * t, { material: mat }).translate(length / 2, o.height + 0.25, 0),
        place,
      );
    }
    const mid = v3.lerp(o.from, o.to, 0.5);
    const space = makeSpace(o.name, mid, [length, w], o.height, yaw / DEG);
    this.recordSpace('corridor', space, o.fog);
    return space;
  }

  /** A straight flight of stairs between two points; either may be the lower one. */
  stairs(o: { from: Vec3; to: Vec3; width?: number; rise?: number }): void {
    const [low, high] = o.from[1] <= o.to[1] ? [o.from, o.to] : [o.to, o.from];
    const dir = v3.sub(high, low);
    const run = Math.hypot(dir[0], dir[2]);
    const climb = dir[1];
    const rise = o.rise ?? 0.22;
    const steps = Math.max(1, Math.round(climb / rise));
    const el = stairsElement({ width: o.width ?? 3, rise: climb / steps, run: run / steps, steps });
    const yaw = Math.atan2(dir[0], dir[2]) - Math.PI / 2; // element +X toward the high end
    this.add(el, mat4.compose(low, yaw));
  }

  /**
   * A switchback stair: a flight down from `from` along `direction`, a landing, and a
   * second flight back beside the first. Returns the bottom edge's centre and the landing.
   */
  switchback(o: {
    from: Vec3;
    drop: number;
    direction: Vec3;
    width?: number;
    rise?: number;
    landing?: number;
    /** Which side (looking down the first flight) the second flight lies on. */
    side?: 'left' | 'right';
  }): { bottom: Vec3; landing: Vec3; direction: Vec3 } {
    const width = o.width ?? 2.4;
    const rise = o.rise ?? 0.22;
    const run = 0.32;
    const dir = v3.normalize([o.direction[0], 0, o.direction[2]]);
    const right: Vec3 = [-dir[2], 0, dir[0]];
    const side = v3.scale(right, o.side === 'left' ? -1 : 1);
    const half = o.drop / 2;
    const steps = Math.max(1, Math.round(half / rise));
    const length = steps * run;
    const landingDepth = o.landing ?? width + 0.4;
    // Flight 1: from the top edge down along dir.
    const low1 = v3.add(v3.add(o.from, v3.scale(dir, length)), [0, -half, 0]);
    this.stairs({ from: o.from, to: low1, width, rise });
    // Landing spanning both flights.
    const landingCentre = v3.add(
      v3.add(low1, v3.scale(dir, landingDepth / 2)),
      v3.scale(side, width / 2),
    );
    this.solid.append(
      box(landingDepth, 0.4, 2 * width, { material: ROLE.flagstone }).translate(0, -0.2, 0),
      mat4.compose(landingCentre, Math.atan2(dir[0], dir[2]) - Math.PI / 2),
    );
    // Flight 2: beside flight 1, from the landing back toward -dir, down to the bottom.
    const top2 = v3.add(low1, v3.scale(side, width));
    const low2 = v3.add(v3.sub(top2, v3.scale(dir, length)), [0, -half, 0]);
    this.stairs({ from: top2, to: low2, width, rise });
    return { bottom: low2, landing: landingCentre, direction: v3.scale(dir, -1) };
  }

  /** A bridge or walkway between two points at the same height. */
  bridge(o: { from: Vec3; to: Vec3; width?: number; material?: number }): void {
    const dir = v3.sub(o.to, o.from);
    const length = Math.hypot(dir[0], dir[2]);
    const el = bridgeElement({
      length,
      width: o.width ?? 2.5,
      ...(o.material !== undefined ? { material: o.material } : {}),
    });
    const yaw = Math.atan2(dir[0], dir[2]) - Math.PI / 2;
    this.solid.append(el.visual, mat4.compose(o.from, yaw));
  }

  /** A row of columns along a line. */
  colonnade(o: { from: Vec3; to: Vec3; count: number; height: number; radius?: number }): void {
    for (let i = 0; i < o.count; i++) {
      const p = v3.lerp(o.from, o.to, o.count === 1 ? 0 : i / (o.count - 1));
      const c = column({ height: o.height, radius: o.radius ?? 0.4 });
      this.solid.append(c.visual, mat4.translation(p[0], p[1], p[2]));
    }
  }

  /**
   * A cavern: rock mass filling `bounds`, with chambers and tunnels carved from it by
   * SDFs. Surfaced at build time. `carve` receives the sdf kit and returns the void.
   */
  cavern(o: {
    name: string;
    bounds: { min: Vec3; max: Vec3 };
    carve: (s: typeof sdf) => SDF;
    cell?: number;
    roughness?: number;
    seed?: number;
    material?: number;
    fog?: FogPreset;
  }): void {
    const { min, max } = o.bounds;
    this.spaces.push({
      name: o.name,
      kind: 'cavern',
      bounds: { min: [...min], max: [...max] },
      ...(o.fog ? { fog: o.fog } : {}),
    });
    const centre = v3.scale(v3.add(min, max), 0.5);
    const half = v3.scale(v3.sub(max, min), 0.5);
    // Rock extends past the bounds, so the grid never surfaces the outside of the mass:
    // only carved surfaces (and tunnel mouths leaving the bounds) produce triangles.
    const rock = sdf.box(centre, [half[0] + 1, half[1] + 1, half[2] + 1]);
    let voids = o.carve(sdf);
    if ((o.roughness ?? 0) > 0) voids = sdf.displace(voids, o.roughness ?? 0.3, 0.7, o.seed ?? 1);
    const field = sdf.subtract(rock, voids);
    const mesh = marchingCubes(field, {
      min,
      max,
      cell: o.cell ?? 0.5,
      smooth: 2,
      material: o.material ?? ROLE.rock,
      uvScale: 2,
    });
    // Rock is smooth-shaded: it reads as stone rather than crystal, and shared normals
    // let the exporter weld the dense marching-cubes vertices.
    mesh.smoothNormals();
    this.solid.append(mesh);
  }

  /**
   * A still water surface covering a rectangle at height y, tessellated so the water
   * material's waves have vertices to move. `flow` gives a current without changing shape.
   */
  waterPlane(o: {
    name?: string;
    at: Vec3;
    size: [number, number];
    flow?: [number, number];
    cell?: number;
  }): void {
    const [w, d] = o.size;
    const cell = o.cell ?? 1;
    const nx = Math.max(1, Math.round(w / cell));
    const nz = Math.max(1, Math.round(d / cell));
    const m = new MeshBuilder();
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < nz; j++) {
        const x0 = -w / 2 + (w * i) / nx;
        const x1 = -w / 2 + (w * (i + 1)) / nx;
        const z0 = -d / 2 + (d * j) / nz;
        const z1 = -d / 2 + (d * (j + 1)) / nz;
        m.addQuad([x0, 0, z0], [x0, 0, z1], [x1, 0, z1], [x1, 0, z0], { material: ROLE.water });
      }
    }
    m.translate(o.at[0], o.at[1], o.at[2]);
    const name = o.name ?? `water-${this.waters.length + 1}`;
    this.waters.push({
      body: {
        name,
        kind: 'pool',
        y: o.at[1],
        bounds: m.bounds(),
        flow: o.flow ?? [0, 0],
      },
      mesh: m,
    });
  }

  /**
   * A river: a water strip swept along a horizontal path. The current runs from the
   * first point to the last.
   */
  river(o: { name: string; path: Vec3[]; width: number }): void {
    if (o.path.length < 2) throw new Error(`river ${o.name}: path needs two points`);
    const strip = sweep(rect(o.width, 0.02), o.path, { material: ROLE.water, caps: false });
    const first = o.path[0]!;
    const last = o.path[o.path.length - 1]!;
    const dir = v3.normalize([last[0] - first[0], 0, last[2] - first[2]]);
    this.waters.push({
      body: {
        name: o.name,
        kind: 'river',
        y: first[1],
        bounds: strip.bounds(),
        flow: [dir[0], dir[2]],
      },
      mesh: strip,
    });
  }

  /**
   * A waterfall: a ribbon from the lip to the plunge point, leaving horizontally and
   * arriving vertically. The runtime scrolls foam down it and puts spray at the bottom.
   */
  waterfall(o: { name: string; lip: Vec3; plunge: Vec3; width: number }): void {
    const drop = o.lip[1] - o.plunge[1];
    const run: Vec3 = [o.plunge[0] - o.lip[0], 0, o.plunge[2] - o.lip[2]];
    const runLen = v3.length(run);
    const across: Vec3 = runLen > 1e-6 ? v3.normalize([-run[2], 0, run[0]]) : [1, 0, 0];
    // Cubic Bézier: tangent horizontal at the lip, vertical at the plunge. The first control
    // point sits close to the lip so the sheet bends down within a metre of leaving it,
    // like a slow stream over an edge, rather than shooting out horizontally.
    const c1: Vec3 = v3.add(o.lip, v3.scale(run, 0.15));
    const c2: Vec3 = [o.plunge[0], o.plunge[1] + drop * 0.45, o.plunge[2]];
    const segments = Math.max(6, Math.round(Math.hypot(drop, runLen) / 0.8));
    const m = new MeshBuilder();
    const at = (t: number): Vec3 => {
      const u = 1 - t;
      return [
        u * u * u * o.lip[0] +
          3 * u * u * t * c1[0] +
          3 * u * t * t * c2[0] +
          t * t * t * o.plunge[0],
        u * u * u * o.lip[1] +
          3 * u * u * t * c1[1] +
          3 * u * t * t * c2[1] +
          t * t * t * o.plunge[1],
        u * u * u * o.lip[2] +
          3 * u * u * t * c1[2] +
          3 * u * t * t * c2[2] +
          t * t * t * o.plunge[2],
      ];
    };
    const half = v3.scale(across, o.width / 2);
    let length = 0;
    for (let i = 0; i < segments; i++) {
      const t0 = i / segments;
      const t1 = (i + 1) / segments;
      const p0 = at(t0);
      const p1 = at(t1);
      length += v3.length(v3.sub(p1, p0));
      const a = v3.sub(p0, half);
      const b = v3.add(p0, half);
      const c = v3.add(p1, half);
      const d = v3.sub(p1, half);
      // u across the ribbon, v down the fall; the runtime scrolls foam along v.
      m.addQuad(a, b, c, d, {
        material: ROLE.waterfall,
        uvs: [
          [0, t0],
          [1, t0],
          [1, t1],
          [0, t1],
        ],
      });
      // Back face, so the sheet reads from behind as well.
      m.addQuad(d, c, b, a, {
        material: ROLE.waterfall,
        uvs: [
          [0, t1],
          [1, t1],
          [1, t0],
          [0, t0],
        ],
      });
    }
    this.falls.push({
      fall: { name: o.name, lip: o.lip, plunge: o.plunge, width: o.width, length },
      mesh: m,
    });
  }

  private recordSpace(kind: SpaceRecord['kind'], space: Space, fog?: FogPreset): void {
    const corners = (['south', 'north', 'west', 'east'] as const).flatMap((side) => [
      space.edge(side, 0),
      space.edge(side, side === 'south' || side === 'north' ? space.size[0] : space.size[1]),
    ]);
    const min: Vec3 = [Infinity, space.at[1], Infinity];
    const max: Vec3 = [-Infinity, space.at[1] + space.height, -Infinity];
    for (const c of corners) {
      min[0] = Math.min(min[0], c[0]);
      min[2] = Math.min(min[2], c[2]);
      max[0] = Math.max(max[0], c[0]);
      max[2] = Math.max(max[2], c[2]);
    }
    this.spaces.push({ name: space.name, kind, bounds: { min, max }, ...(fog ? { fog } : {}) });
  }

  async build(): Promise<LevelOutput> {
    for (const d of this.deferred) await d();
    this.deferred.length = 0;
    const visual = new MeshBuilder();
    visual.append(this.solid);
    visual.append(this.dressing);
    const collider = new MeshBuilder();
    collider.append(this.solid);
    collider.append(this.ramps);
    return {
      name: this.name,
      visual: visual.toMeshData(),
      collider: collider.toMeshData(),
      water: this.waters.map((w) => ({ ...w.body, mesh: w.mesh.toMeshData() })),
      waterfalls: this.falls.map((f) => ({ ...f.fall, mesh: f.mesh.toMeshData() })),
      lights: this.lights,
      points: this.points,
      spaces: this.spaces,
      spawn: this.spawnPoint,
      bounds: visual.bounds(),
    };
  }
}

function makeSpace(
  name: string,
  at: Vec3,
  size: [number, number],
  height: number,
  rotation: number,
): Space {
  const [w, d] = size;
  const rot = rotation * DEG;
  const local = (x: number, z: number): Vec3 =>
    mat4.transformPoint(mat4.compose(at, rot), [x, 0, z]);
  const dir = (x: number, z: number): Vec3 =>
    v3.normalize(mat4.transformDirection(mat4.rotationY(rot), [x, 0, z]));
  return {
    name,
    at,
    size,
    height,
    rotation,
    edge(side, along) {
      switch (side) {
        case 'south':
          return local(-w / 2 + along, -d / 2);
        case 'north':
          return local(w / 2 - along, d / 2);
        case 'west':
          return local(-w / 2, d / 2 - along);
        case 'east':
          return local(w / 2, -d / 2 + along);
      }
    },
    outward(side) {
      switch (side) {
        case 'south':
          return dir(0, -1);
        case 'north':
          return dir(0, 1);
        case 'west':
          return dir(-1, 0);
        case 'east':
          return dir(1, 0);
      }
    },
  };
}

/** A cutter solid for a doorway or window, standing on y = 0, centred on x = 0 and z = 0. */
function openingCutter(op: Opening, depth: number, material: number): MeshBuilder {
  const kind = op.kind ?? 'round';
  const profile =
    kind === 'square'
      ? ([
          [-op.width / 2, 0],
          [op.width / 2, 0],
          [op.width / 2, op.height],
          [-op.width / 2, op.height],
        ] as [number, number][])
      : arch(op.width, Math.max(0.1, op.height - op.width / 2), kind, 8);
  // Profile in XY, extruded along Z through the wall thickness, centred on z = 0. A floor
  // level opening starts a little below the floor so no sliver of wall survives.
  const dip = (op.sill ?? 0) > 0 ? 0 : 0.05;
  return extrude(profile, depth, { material }).translate(0, -dip, -depth / 2);
}

/** The filled half-ellipse closing a barrel vault's end, extruded `depth` along +Z. */
function gableFill(halfSpan: number, rise: number, depth: number, material: number): MeshBuilder {
  const pts: [number, number][] = [
    [-halfSpan, 0],
    [halfSpan, 0],
  ];
  const segs = 12;
  for (let i = 1; i < segs; i++) {
    const a = (Math.PI * i) / segs;
    pts.push([halfSpan * Math.cos(a), rise * Math.sin(a)]);
  }
  return extrude(pts, depth, { material });
}
