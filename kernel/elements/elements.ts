import { DEG, mat4, type Vec3 } from '../core/math';
import { MeshBuilder } from '../core/mesh';
import { box, cylinder, extrude, loft, revolve } from '../core/ops';
import { ROLE } from './roles';

/**
 * Parametric architectural elements. Conventions: metres; Y up; an element's origin is at
 * its floor level; things that run along a length run along +X from x = 0; things with a
 * facing face +Z. `visual` is rendered, `collider` (when present) is used for collision
 * instead of the visual, e.g. the smooth ramp under a staircase.
 */
export interface Element {
  visual: MeshBuilder;
  collider?: MeshBuilder;
}

export interface WallOptions {
  length: number;
  height: number;
  thickness?: number;
  material?: number;
  /** Projecting base course. */
  plinth?: { height: number; depth: number; material?: number };
  /** Projecting top moulding. */
  cornice?: { height: number; depth: number; material?: number };
}

/**
 * The separate solids of a wall (body, plinth, cornice). They overlap, so anything that
 * runs booleans on a wall unions these first instead of trusting the merged mesh.
 */
export function wallParts(o: WallOptions): MeshBuilder[] {
  const t = o.thickness ?? 0.5;
  const parts: MeshBuilder[] = [
    box(o.length, o.height, t, { material: o.material ?? ROLE.ashlar }).translate(
      o.length / 2,
      o.height / 2,
      0,
    ),
  ];
  if (o.plinth) {
    const p = o.plinth;
    parts.push(
      box(o.length, p.height, t + 2 * p.depth, { material: p.material ?? ROLE.trim }).translate(
        o.length / 2,
        p.height / 2,
        0,
      ),
    );
  }
  if (o.cornice) {
    const c = o.cornice;
    parts.push(
      box(o.length, c.height, t + 2 * c.depth, { material: c.material ?? ROLE.trim }).translate(
        o.length / 2,
        o.height - c.height / 2,
        0,
      ),
    );
  }
  return parts;
}

/** A straight wall along +X, centred on z = 0, from y = 0 to height. */
export function wall(o: WallOptions): Element {
  const m = new MeshBuilder();
  for (const part of wallParts(o)) m.append(part);
  return { visual: m };
}

export interface SlabOptions {
  width: number;
  depth: number;
  thickness?: number;
  material?: number;
}

/** A floor slab: top surface at y = 0, extending down by thickness; centred on x and z. */
export function floorSlab(o: SlabOptions): Element {
  const t = o.thickness ?? 0.4;
  return {
    visual: box(o.width, t, o.depth, { material: o.material ?? ROLE.flagstone }).translate(
      0,
      -t / 2,
      0,
    ),
  };
}

/** A ceiling slab: underside at y = 0, extending up by thickness. */
export function ceilingSlab(o: SlabOptions): Element {
  const t = o.thickness ?? 0.4;
  return {
    visual: box(o.width, t, o.depth, { material: o.material ?? ROLE.ashlar }).translate(
      0,
      t / 2,
      0,
    ),
  };
}

export interface ColumnOptions {
  height: number;
  radius: number;
  base?: { height: number; radius: number };
  capital?: { height: number; radius: number };
  segments?: number;
  material?: number;
}

/** A column standing at the origin. */
export function column(o: ColumnOptions): Element {
  const base = o.base ?? { height: 0.25, radius: o.radius * 1.4 };
  const cap = o.capital ?? { height: 0.3, radius: o.radius * 1.5 };
  const shaftTop = o.height - cap.height;
  const profile: [number, number][] = [
    [0, 0],
    [base.radius, 0],
    [base.radius, base.height],
    [o.radius, base.height + 0.05],
    [o.radius, shaftTop - 0.05],
    [cap.radius, shaftTop],
    [cap.radius, o.height],
    [0, o.height],
  ];
  return { visual: revolve(profile, o.segments ?? 12, { material: o.material ?? ROLE.marble }) };
}

export interface StairOptions {
  width: number;
  rise: number;
  run: number;
  steps: number;
  material?: number;
  /** Solid stringers down to the floor (true) or floating treads of this thickness. */
  solid?: boolean;
}

/**
 * A straight flight climbing along +X: step i occupies x in [i·run, (i+1)·run] with its
 * tread at y = (i+1)·rise. Centred on z = 0. The collider is a smooth wedge so the party
 * glides up rather than popping tread by tread.
 */
export function stairs(o: StairOptions): Element {
  const m = new MeshBuilder();
  const mat = o.material ?? ROLE.flagstone;
  const total = o.steps * o.run;
  for (let i = 0; i < o.steps; i++) {
    const h = (i + 1) * o.rise;
    m.append(box(o.run, h, o.width, { material: mat }).translate(i * o.run + o.run / 2, h / 2, 0));
  }
  // Collider: right-triangle wedge in XY extruded across the width, plus a flat landing lip.
  const top = o.steps * o.rise;
  const wedge = extrude(
    [
      [0, 0],
      [total, 0],
      [total, top],
    ],
    o.width,
    { material: ROLE.collider },
  ).translate(0, 0, -o.width / 2);
  return { visual: m, collider: wedge };
}

export interface SpiralStairOptions {
  /** Outer radius of the treads. */
  radius: number;
  /** Radius of the central newel post (0 for an open well). */
  innerRadius: number;
  rise: number;
  steps: number;
  /** Total rotation over all steps in turns (1 = one full revolution). */
  turns: number;
  /** Clockwise when climbing, seen from above. */
  clockwise?: boolean;
  material?: number;
  /** Subdivisions per step for the smooth helical collider. */
  colliderSlices?: number;
  /** Tread slab thickness; defaults to 1.5 risers so the soffit reads as stepped stone. */
  treadThickness?: number;
}

/**
 * A spiral stair around the Y axis climbing from angle 0 (the +X direction). Tread k spans
 * angles [k, k + 1] × step angle (measured as atan2(z, x) for the default clockwise stair)
 * with its top at (k + 1) × rise. Treads are wedge slabs cantilevered from the newel; the
 * collider is a smooth helical ramp of thin sector slices.
 */
export function spiralStair(o: SpiralStairOptions): Element {
  const m = new MeshBuilder();
  const mat = o.material ?? ROLE.flagstone;
  const dir = o.clockwise === false ? 1 : -1;
  const stepAngle = (o.turns * Math.PI * 2) / o.steps;
  const r0 = Math.max(o.innerRadius, 0.05);
  const sector = (a0: number, a1: number): [number, number][] => [
    [r0 * Math.cos(a0), r0 * Math.sin(a0)],
    [o.radius * Math.cos(a0), o.radius * Math.sin(a0)],
    [o.radius * Math.cos(a1), o.radius * Math.sin(a1)],
    [r0 * Math.cos(a1), r0 * Math.sin(a1)],
  ];
  const thick = o.treadThickness ?? o.rise * 1.5;
  for (let i = 0; i < o.steps; i++) {
    const a0 = dir * i * stepAngle;
    const a1 = dir * (i + 1) * stepAngle;
    const top = (i + 1) * o.rise;
    // Sector in the XZ plane: profile (x, z) extruded along Y by the slab thickness.
    const tread = extrude(sector(a0, a1), thick, { material: mat });
    // extrude builds in XY then +Z; rotate so the profile lies flat and the height goes up.
    tread.transform(mat4.rotationX(-90 * DEG)).translate(0, top - thick, 0);
    m.append(tread);
  }
  if (o.innerRadius > 0) {
    m.append(cylinder(o.innerRadius, (o.steps + 1) * o.rise, 12, { material: mat }));
  }
  // Helical ramp collider: rings of 2 points (inner, outer) climbing continuously.
  const slices = o.colliderSlices ?? 6;
  const rings: Vec3[][] = [];
  const n = o.steps * slices;
  for (let k = 0; k <= n; k++) {
    const a = (dir * k * stepAngle) / slices;
    const y = (k / slices) * o.rise;
    const inner: Vec3 = [r0 * Math.cos(a), y, -r0 * Math.sin(a)];
    const outer: Vec3 = [o.radius * Math.cos(a), y, -o.radius * Math.sin(a)];
    const innerLow: Vec3 = [inner[0], y - 0.3, inner[2]];
    const outerLow: Vec3 = [outer[0], y - 0.3, outer[2]];
    rings.push([innerLow, outerLow, outer, inner]);
  }
  const ramp = loft(rings, { material: ROLE.collider });
  return { visual: m, collider: ramp };
}

export interface BalustradeOptions {
  length: number;
  height?: number;
  spacing?: number;
  balusterRadius?: number;
  railWidth?: number;
  railHeight?: number;
  material?: number;
}

/** Posts and a top rail along +X at z = 0. */
export function balustrade(o: BalustradeOptions): Element {
  const h = o.height ?? 1.0;
  const spacing = o.spacing ?? 0.6;
  const rw = o.railWidth ?? 0.18;
  const rh = o.railHeight ?? 0.12;
  const mat = o.material ?? ROLE.ashlar;
  const m = new MeshBuilder();
  const count = Math.max(2, Math.round(o.length / spacing) + 1);
  for (let i = 0; i < count; i++) {
    const x = (i / (count - 1)) * o.length;
    m.append(cylinder(o.balusterRadius ?? 0.06, h - rh, 8, { material: mat }).translate(x, 0, 0));
  }
  m.append(box(o.length + rw, rh, rw, { material: mat }).translate(o.length / 2, h - rh / 2, 0));
  m.append(box(o.length + rw, 0.1, rw, { material: mat }).translate(o.length / 2, 0.05, 0));
  return { visual: m };
}

export interface BridgeOptions {
  length: number;
  width: number;
  deckThickness?: number;
  rails?: boolean;
  material?: number;
}

/** A flat bridge or walkway along +X with its deck top at y = 0 and optional balustrades. */
export function bridge(o: BridgeOptions): Element {
  const t = o.deckThickness ?? 0.4;
  const mat = o.material ?? ROLE.plank;
  const m = new MeshBuilder();
  m.append(box(o.length, t, o.width, { material: mat }).translate(o.length / 2, -t / 2, 0));
  if (o.rails !== false) {
    const rail = balustrade({
      length: o.length,
      material: ROLE.iron,
      balusterRadius: 0.04,
      railWidth: 0.1,
      railHeight: 0.08,
    });
    m.append(rail.visual, mat4.translation(0, 0, o.width / 2 - 0.1));
    m.append(rail.visual, mat4.translation(0, 0, -o.width / 2 + 0.1));
  }
  return { visual: m };
}

export interface VaultOptions {
  /** Span across the vault (X). */
  width: number;
  /** Length along the vault (Z). */
  length: number;
  /** Rise of the arc above the springing line. */
  rise?: number;
  thickness?: number;
  segments?: number;
  material?: number;
}

/**
 * A barrel vault shell: springing line at y = 0, spanning x in [-width/2, width/2],
 * running along +Z from 0 to length. Faces point into the room below.
 */
export function barrelVault(o: VaultOptions): Element {
  const r = o.width / 2;
  const rise = o.rise ?? r;
  const t = o.thickness ?? 0.4;
  const segs = o.segments ?? 12;
  const pts: [number, number][] = [];
  // Inner arc, left to right, then outer arc back: a closed arch-shaped ring profile.
  for (let i = 0; i <= segs; i++) {
    const a = Math.PI - (Math.PI * i) / segs;
    pts.push([r * Math.cos(a), rise * Math.sin(a)]);
  }
  for (let i = segs; i >= 0; i--) {
    const a = Math.PI - (Math.PI * i) / segs;
    pts.push([(r + t) * Math.cos(a), (rise + t) * Math.sin(a)]);
  }
  const shell = extrude(pts, o.length, { material: o.material ?? ROLE.ashlar });
  return { visual: shell };
}
