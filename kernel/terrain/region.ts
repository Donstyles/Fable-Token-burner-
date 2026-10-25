/**
 * Authored regions (owner, 2026-10-19: "Hand design 640m maps"; docs/ROADMAP.md). A region
 * is written by hand in `levels/<id>/region.ts` as shapes on a 640 m square: the land's
 * base height, hills and ridges, a coast with its sea, levelled floors, roads, forests,
 * building plots, the cave mouth, townsfolk, monster packs and named places. Nothing comes
 * from a seed but the ground's small ripple. This module turns the script into the same
 * `TerrainLevel` the build tool and the runtime already know.
 *
 * A script is drawn as a map: x east, z north, headings a compass's. The kernel's
 * own frame is glTF's, right-handed, so with z north its x runs west, and the runtime's
 * handedness mirror puts the kernel's +x on the left of a party facing north. `fromMap` turns a
 * script into the kernel's frame; until it existed every region stood mirrored, its temple
 * "at the west end" standing east and its sun rising over the western hills.
 */
import type { MeshData } from '../core/mesh';
import type { Vec3 } from '../core/math';
import { ROLE } from '../elements/roles';
import type {
  LightPlacement,
  NamedPoint,
  PortalRecord,
  SpawnRecord,
  WaterSurface,
} from '../plan/level';
import { backdropMesh } from './backdrop';
import type { RegionEnvironment, TerrainLevel, TerrainTextures } from './build';
import { CAVE, caveMouth, type CaveResult, type CaveSpec } from './cave';
import { fenceAlong } from './fence';
import { terrainChunks } from './chunks';
import { Heightfield } from './heightfield';
import { appendMesh, terrainMesh, type ColouredMeshData } from './mesh';
import { fbm, lerp, smoothstep } from './noise';
import { layRoad } from './road';
import { box, nb, quad } from './solids';
import { PROPS, pickModel, treesOfClass } from './props';
import { GroundPath, headingDeg, smoothPath, type P2 } from './spline';
import { forestMeshes, scatterTrees, type TreeKind } from './trees';
import { laneDistance, layoutPlots, rectDistance, type Lane, type Plot } from './plots';

/** A round hill: its height at the centre falls off as a smooth bump to its radius. */
export interface Hill {
  at: P2;
  radius: number;
  height: number;
  /** Stretch along x and z (1 = round). */
  stretch?: P2;
}

/** A ridge along a line: full height on the line, falling away over `width` either side. */
export interface Ridge {
  path: P2[];
  width: number;
  height: number;
}

/** A floor levelled to one height: a rectangle with a soft edge, for a town or a yard. */
export interface Flat {
  at: P2;
  halfA: number;
  halfB: number;
  /** Heading of the rectangle's b axis, degrees (0 north). */
  heading: number;
  y: number;
  /** The levelling fades into the land over this many metres. */
  soft: number;
}

export interface RegionRoad {
  name: string;
  /** Control points; the road is a smooth curve through them. */
  path: P2[];
  width: number;
}

export interface Forest {
  /** The wood's outline. */
  area: P2[];
  /** Metres between candidate trees, and the share of them kept. */
  spacing: number;
  density: number;
  kinds: TreeKind[];
}

/** Townsfolk: an NPC id (src/game/monsters.ts NPCS) at a place, facing a point. */
export interface Resident {
  kind: string;
  at: P2;
  face: P2;
}

/** A group of monsters standing about a place (DESIGN.md 14.3): `count` round `at`. */
export interface Pack {
  kind: string;
  at: P2;
  count: number;
  /** How far from the centre they stand. */
  spread: number;
}

export interface RegionScript {
  /** The level id, as in `?level=` and portals. */
  id: string;
  /** Only the ground's small ripple comes from it. */
  seed: number;
  /** 640 m square of 5 m cells (ROADMAP decision 3); chunks of `chunkCells` cells. */
  width: number;
  cell: number;
  chunkCells: number;
  /** The land's height where nothing else says otherwise. */
  base: number;
  /** Height of the ground's ripple, metres. */
  ripple: number;
  /** Land inside `coast`, sea outside; the shore slopes down over `shore` metres. */
  sea?: { level: number; floor: number; coast: P2[]; shore: number };
  hills: Hill[];
  ridges: Ridge[];
  flats: Flat[];
  roads: RegionRoad[];
  /** Dirt rectangles (a square, a yard) and lanes to doors. */
  squares: { at: P2; halfA: number; halfB: number; heading: number }[];
  lanes: Lane[];
  forests: Forest[];
  /** Trees set one by one: an orchard's rows, the square's limes, the crossroads' oak. */
  trees?: { kind: TreeKind; at: P2; scale?: number }[];
  /** Glades the woods keep out of: a camp's, a ring of stones', the crossroads'. */
  clearings?: { at: P2; radius: number }[];
  plots: Plot[];
  /**
   * The cave mouth: its threshold, the heading it faces out to and the level its tunnel leads
   * into. Without a target the tunnel ends in rock, with no portal.
   */
  cave?: { at: P2; facing: number; target?: { level: string; entry: string } };
  /** Split-rail fences the kernel builds, each a line of corners (src/kernel/terrain/fence.ts). */
  fences?: P2[][];
  residents: Resident[];
  packs: Pack[];
  points: { name: string; at: P2 }[];
  /** Where a new party wakes and the way it faces. */
  start: { at: P2; face: P2 };
  environment: RegionEnvironment;
  textures: TerrainTextures;
}

/** A point on the map in the kernel's frame. */
const kernelPoint = (p: P2): P2 => [-p[0], p[1]];

/**
 * A region script as drawn on a map (x east, headings clockwise from north, a compass's) in the
 * kernel's frame (x west): every point's x turned over. Headings carry over as they are: the
 * kernel turns its +z anticlockwise to (-sin, cos), which in a frame whose x runs west is the
 * compass's clockwise turn.
 */
export function fromMap(s: RegionScript): RegionScript {
  const pts = (ps: readonly P2[]): P2[] => ps.map(kernelPoint);
  return {
    ...s,
    ...(s.sea ? { sea: { ...s.sea, coast: pts(s.sea.coast) } } : {}),
    hills: s.hills.map((h) => ({ ...h, at: kernelPoint(h.at) })),
    ridges: s.ridges.map((r) => ({ ...r, path: pts(r.path) })),
    flats: s.flats.map((f) => ({ ...f, at: kernelPoint(f.at) })),
    roads: s.roads.map((r) => ({ ...r, path: pts(r.path) })),
    squares: s.squares.map((q) => ({ ...q, at: kernelPoint(q.at) })),
    lanes: s.lanes.map((l) => ({ ...l, from: kernelPoint(l.from), to: kernelPoint(l.to) })),
    forests: s.forests.map((f) => ({ ...f, area: pts(f.area) })),
    ...(s.trees ? { trees: s.trees.map((t) => ({ ...t, at: kernelPoint(t.at) })) } : {}),
    ...(s.clearings
      ? { clearings: s.clearings.map((c) => ({ ...c, at: kernelPoint(c.at) })) }
      : {}),
    plots: s.plots.map((p) => ({ ...p, at: kernelPoint(p.at), face: kernelPoint(p.face) })),
    ...(s.cave ? { cave: { ...s.cave, at: kernelPoint(s.cave.at) } } : {}),
    ...(s.fences ? { fences: s.fences.map(pts) } : {}),
    residents: s.residents.map((r) => ({ ...r, at: kernelPoint(r.at), face: kernelPoint(r.face) })),
    packs: s.packs.map((p) => ({ ...p, at: kernelPoint(p.at) })),
    points: s.points.map((p) => ({ ...p, at: kernelPoint(p.at) })),
    start: { at: kernelPoint(s.start.at), face: kernelPoint(s.start.face) },
  };
}

/** Inside a polygon (even-odd). */
export function inside(poly: readonly P2[], x: number, z: number): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i]!;
    const [xj, zj] = poly[j]!;
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) hit = !hit;
  }
  return hit;
}

/** A flat's rectangle in `rectDistance`'s terms. */
function flatRect(f: { at: P2; halfA: number; halfB: number; heading: number }) {
  return {
    x: f.at[0],
    z: f.at[1],
    halfA: f.halfA,
    halfB: f.halfB,
    yaw: (f.heading * Math.PI) / 180,
  };
}

/** The land before roads and plots: base, hills, ridges, ripple, the shore and the sea bed. */
function landHeight(
  s: RegionScript,
  coast: GroundPath | null,
  ridges: { line: GroundPath; width: number; height: number }[],
  x: number,
  z: number,
): number {
  let h = s.base + fbm(x, z, 60, s.seed) * s.ripple;
  for (const hill of s.hills) {
    const sx = hill.stretch?.[0] ?? 1;
    const sz = hill.stretch?.[1] ?? 1;
    const d = Math.hypot((x - hill.at[0]) / sx, (z - hill.at[1]) / sz) / hill.radius;
    if (d < 1) h += hill.height * (1 - smoothstep(0, 1, d));
  }
  for (const r of ridges) {
    const d = r.line.nearest(x, z).distance;
    if (d < r.width) h += r.height * (1 - smoothstep(0, r.width, d));
  }
  if (s.sea && coast) {
    const d = coast.nearest(x, z).distance;
    const land = inside(s.sea.coast, x, z);
    if (!land) {
      // The sea bed: shallow off the beach, then down to the floor.
      h = lerp(s.sea.level - 0.6, s.sea.floor, smoothstep(6, 50, d));
    } else if (d < s.sea.shore) {
      // The shore: the land comes down to the water's edge.
      h = lerp(s.sea.level - 0.6, h, smoothstep(0, s.sea.shore, d));
    }
  }
  return h;
}

/** Monsters of a pack round its centre, each facing out, on the ground. */
function packSpawns(p: Pack, ground: (x: number, z: number) => number): SpawnRecord[] {
  const out: SpawnRecord[] = [];
  for (let i = 0; i < p.count; i++) {
    const a = (i / p.count) * Math.PI * 2 + p.count * 0.7;
    const r = p.count === 1 ? 0 : p.spread * (0.6 + (0.4 * ((i * 37) % 10)) / 10);
    const x = p.at[0] + Math.cos(a) * r;
    const z = p.at[1] + Math.sin(a) * r;
    out.push({
      kind: p.kind,
      position: [x, ground(x, z), z],
      yawDeg: headingDeg(x - p.at[0], z - p.at[1]),
    });
  }
  return out;
}

/** An invisible wall along a line, from below the sea bed to above a head. */
function wallAlong(into: MeshData, line: readonly P2[], bottom: number, top: number): void {
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!;
    const b = line[i]!;
    quad(
      into,
      [
        [a[0], bottom, a[1]],
        [b[0], bottom, b[1]],
        [b[0], top, b[1]],
        [a[0], top, a[1]],
      ],
      ROLE.collider,
    );
  }
}

/** The coast pushed out to sea by `by` metres, every five metres, for the shallows' wall. */
function offshore(coast: readonly P2[], by: number): P2[] {
  const ring = smoothPath([...coast, coast[0]!, coast[1]!], 6);
  const out: P2[] = [];
  for (let i = 1; i < ring.length; i++) {
    const a = ring[i - 1]!;
    const b = ring[i]!;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    // Outward is to the right of the walk when the coast winds anticlockwise; test it.
    let nx = (b[1] - a[1]) / len;
    let nz = -(b[0] - a[0]) / len;
    const mx = (a[0] + b[0]) / 2;
    const mz = (a[1] + b[1]) / 2;
    if (inside(coast, mx + nx * 2, mz + nz * 2)) {
      nx = -nx;
      nz = -nz;
    }
    out.push([mx + nx * by, mz + nz * by]);
  }
  return out;
}

/**
 * The sea as one flat sheet out to the far backdrop; land stands above it. A grid, twenty
 * metres near the land and coarser toward the horizon, because fog is reckoned at the
 * vertices (src/render/materials.ts): one quad's far corners fogged the whole sea into the
 * sky's colour. Cells wholly over high ground are left out.
 */
function seaSurface(
  level: number,
  reach: number,
  ground: (x: number, z: number) => number,
): WaterSurface {
  const axis: number[] = [];
  for (let c = -480; c <= 480; c += 20) axis.push(c);
  let edge = 480;
  let step = 20;
  while (edge < reach) {
    step *= 1.35;
    edge = Math.min(reach, edge + step);
    axis.push(edge);
    axis.unshift(-edge);
  }
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const materials: number[] = [];
  const m = axis.length;
  for (let j = 0; j < m; j++) {
    for (let i = 0; i < m; i++) {
      const x = axis[i]!;
      const z = axis[j]!;
      positions.push(x, level, z);
      normals.push(0, 1, 0);
      uvs.push(x, z);
    }
  }
  for (let j = 0; j < m - 1; j++) {
    for (let i = 0; i < m - 1; i++) {
      const corners: P2[] = [
        [axis[i]!, axis[j]!],
        [axis[i + 1]!, axis[j]!],
        [axis[i]!, axis[j + 1]!],
        [axis[i + 1]!, axis[j + 1]!],
      ];
      if (corners.every(([x, z]) => ground(x, z) > level + 2)) continue;
      const a = j * m + i;
      // Counter-clockwise from above.
      indices.push(a, a + m, a + 1, a + 1, a + m, a + m + 1);
      materials.push(ROLE.water, ROLE.water);
    }
  }
  return {
    name: 'sea',
    kind: 'pool',
    y: level,
    mirror: 'sky',
    bounds: { min: [-reach, level - 8, -reach], max: [reach, level, reach] },
    flow: [0.6, 0.8],
    mesh: { positions, normals, uvs, indices, materials },
  };
}

export function buildRegion(s: RegionScript): TerrainLevel {
  const half = s.width / 2;
  const cells = Math.round(s.width / s.cell);
  const hf = new Heightfield(cells, s.cell);
  const n = hf.n;
  const coast = s.sea ? new GroundPath([...s.sea.coast, s.sea.coast[0]!]) : null;
  const ridges = s.ridges.map((r) => ({ ...r, line: new GroundPath(smoothPath(r.path, 8)) }));
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) hf.set(i, j, landHeight(s, coast, ridges, hf.x(i), hf.z(j)));
  }

  // Floors levelled for towns and yards, with a soft edge into the land.
  for (const f of s.flats) {
    const rect = flatRect(f);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const d = rectDistance(hf.x(i), hf.z(j), rect);
        if (d > f.soft) continue;
        hf.set(i, j, lerp(f.y, hf.get(i, j), smoothstep(0, f.soft, d)));
      }
    }
  }

  // The cave mouth: its floor dug in below the ground at its threshold point. The ground round
  // it is shaped once the roads and pads are laid (kernel/terrain/cave.ts).
  let cave: CaveSpec | null = null;
  if (s.cave) {
    const h = (s.cave.facing * Math.PI) / 180;
    // Facing out along the heading; local +Z points into the hill, the other way.
    const inward: P2 = [Math.sin(h), -Math.cos(h)];
    cave = {
      x: s.cave.at[0],
      y: hf.sample(s.cave.at[0], s.cave.at[1]) - CAVE.sink,
      z: s.cave.at[1],
      yaw: Math.atan2(-inward[0], inward[1]),
    };
  }

  // Roads: smoothed and cut into the land, allowed to fall as well as climb.
  const roads = s.roads.map((r) => ({ ...r, ground: new GroundPath(smoothPath(r.path, 10)) }));
  for (const r of roads) {
    layRoad(hf, r.ground, {
      width: r.width,
      cutTo: r.width / 2 + 10,
      maxGradeDeg: 14,
      allowDescent: true,
    });
  }

  // Plots: each building on a dead-level pad at the ground under its centre.
  const plots = layoutPlots(s.plots, (x, z) => hf.sample(x, z));
  for (const pad of plots.pads) {
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const d = rectDistance(hf.x(i), hf.z(j), pad);
        if (d > 6) continue;
        hf.set(i, j, d <= 0 ? pad.y : lerp(pad.y, hf.get(i, j), smoothstep(0, 6, d)));
      }
    }
  }

  // Splat: path (roads, squares, lanes, aprons), scree (cliffs), sand (the shore).
  const squares = s.squares.map(flatRect);
  const splatAt = (x: number, z: number, h: number, slope: number): [number, number, number] => {
    let path = 0;
    for (const r of roads) {
      path = Math.max(
        path,
        1 - smoothstep(r.width / 2, r.width / 2 + 2.5, r.ground.nearest(x, z).distance),
      );
    }
    for (const q of squares) path = Math.max(path, 1 - smoothstep(0, 3, rectDistance(x, z, q)));
    for (const lane of s.lanes) {
      path = Math.max(
        path,
        1 - smoothstep(lane.halfWidth, lane.halfWidth + 2, laneDistance(x, z, lane)),
      );
    }
    for (const pad of plots.pads)
      path = Math.max(path, 0.7 * (1 - smoothstep(-1, 2.5, rectDistance(x, z, pad))));
    const patch = smoothstep(0.1, 0.25, fbm(x + 0.7 * h, z - 0.5 * h, 70, s.seed + 17));
    let scree = Math.max(smoothstep(38, 50, slope), patch * smoothstep(20, 30, slope));
    let sand = s.sea ? 1 - smoothstep(s.sea.level + 1.2, s.sea.level + 2.4, h) : 0;
    const total = path + scree + sand;
    if (total > 1) {
      path /= total;
      scree /= total;
      sand /= total;
    }
    return [path, scree, sand];
  };

  // The cave mouth on the land as the roads and pads left it; then the coarse ground is pressed
  // under its fine ground and its tunnel.
  let caveMesh: CaveResult | null = null;
  if (cave) {
    caveMesh = caveMouth(cave, { height: (x, z) => hf.sample(x, z), splat: splatAt });
    caveMesh.press(hf);
  }

  const splat = new Float32Array(n * n * 3);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const k = (j * n + i) * 3;
      const [path, scree, sand] = splatAt(hf.x(i), hf.z(j), hf.get(i, j), hf.slopeDeg(i, j));
      splat[k] = path;
      splat[k + 1] = scree;
      splat[k + 2] = sand;
    }
  }

  // Forests: candidates inside each wood's outline, clear of roads, plots, water and cliffs.
  const seaLevel = s.sea?.level ?? -Infinity;
  const trees = s.forests.flatMap((f, fi) =>
    scatterTrees(hf, {
      seed: s.seed * 31 + fi,
      spacing: f.spacing,
      density: f.density,
      kinds: f.kinds,
      accept: (x, z) => {
        if (!inside(f.area, x, z)) return false;
        if (hf.sample(x, z) < seaLevel + 2) return false;
        for (const c of s.clearings ?? []) {
          if (Math.hypot(x - c.at[0], z - c.at[1]) < c.radius) return false;
        }
        for (const r of roads) if (r.ground.nearest(x, z).distance < r.width / 2 + 4) return false;
        for (const pad of plots.pads) if (rectDistance(x, z, pad) < 6) return false;
        for (const q of squares) if (rectDistance(x, z, q) < 4) return false;
        if (cave && Math.hypot(x - cave.x, z - cave.z) < 30) return false;
        if (caveMesh?.covers(x, z)) return false;
        // No tree grows through a fence.
        for (const line of s.fences ?? []) if (lineDistance(x, z, line) < 3) return false;
        const i = Math.round((x + half) / s.cell);
        const j = Math.round((z + half) / s.cell);
        return hf.slopeDeg(i, j) < 32;
      },
    }),
  );
  // The trees set by hand, each turned by its place so a row does not stand in step.
  for (const t of s.trees ?? []) {
    const [x, z] = t.at;
    trees.push({
      kind: t.kind,
      x,
      y: hf.sample(x, z),
      z,
      yaw: (((x * 12.9898 + z * 78.233) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2),
      scale: t.scale ?? 1,
    });
  }
  const forest = forestMeshes(trees);

  const ground = (x: number, z: number): number => hf.sample(x, z);
  const at3 = (p: P2): Vec3 => [p[0], ground(p[0], p[1]), p[1]];

  // Solids: the cave mouth, the wall along the shallows, the map's edge. The visual carries
  // vertex colours (the GLB's COLOR_0): Babylon multiplies a role material's light by them,
  // so they are the daylight in the cave's tunnel and full elsewhere, and the terrain
  // material reads them as splat weights on the cave's fine ground.
  const visual: ColouredMeshData = {
    positions: [],
    normals: [],
    uvs: [],
    indices: [],
    materials: [],
    colors: [],
  };
  const solids: MeshData = { positions: [], normals: [], uvs: [], indices: [], materials: [] };
  const lights: LightPlacement[] = [...plots.lights];
  const portals: PortalRecord[] = [];
  const points: NamedPoint[] = [...plots.points];
  // The fences, posts and rails on the ground, their slabs solid for the party and the navmesh.
  const fenceCollider: MeshData = {
    positions: [],
    normals: [],
    uvs: [],
    indices: [],
    materials: [],
  };
  const fences: MeshData = { positions: [], normals: [], uvs: [], indices: [], materials: [] };
  for (const line of s.fences ?? []) fenceAlong(fences, fenceCollider, line, ground);
  appendMesh(visual, fences, [1, 1, 1]);
  appendTo(solids, fenceCollider);
  if (caveMesh && s.cave) {
    appendTo(visual, caveMesh.visual);
    for (const c of caveMesh.visual.colors) visual.colors.push(c);
    appendTo(solids, caveMesh.collider);
    // No light inside: the dark is the depth (owner, 2026-10-23), and the party's torch shows
    // the walls as it goes in.
    if (s.cave.target) {
      portals.push({
        name: 'cave',
        position: caveMesh.portal,
        radius: CAVE.portalRadius,
        target: s.cave.target,
        arrive: { position: caveMesh.arrive, yawDeg: s.cave.facing },
      });
    }
    points.push({ name: 'cave', position: caveMesh.portal, kind: s.cave.target ? 'door' : 'poi' });
  }
  // The party wades the shallows to the ankles and no further.
  if (s.sea) wallAlong(solids, offshore(s.sea.coast, 7), s.sea.floor - 4, s.sea.level + 6);
  const rim = half - 8;
  wallAlong(
    solids,
    [
      [-rim, -rim],
      [rim, -rim],
      [rim, rim],
      [-rim, rim],
      [-rim, -rim],
    ],
    -40,
    200,
  );

  // The navmesh: terrain, footprint boxes, the cave and its rocks' boxes, trunks near the roads
  // where monsters walk, each the trunk of the model the runtime draws there, where it draws it
  // and as thick (kernel/terrain/props.ts `trunk`), with its roots (`roots`), so a monster
  // paths round a big oak's roots as the party is stopped by them.
  const navTrunks = nb();
  for (const t of trees) {
    if (!roads.some((r) => r.ground.nearest(t.x, t.z).distance < 60)) continue;
    const spec = PROPS[pickModel(treesOfClass(t.kind), t.x, t.z)];
    const [ax, az] = spec?.trunkAt ?? [0, 0];
    const r = (spec?.trunk ?? 0.3) * t.scale;
    const cos = Math.cos(t.yaw);
    const sin = Math.sin(t.yaw);
    const x = t.x + (ax * cos - az * sin) * t.scale;
    const z = t.z + (ax * sin + az * cos) * t.scale;
    box(navTrunks, [x - r, t.y - 0.5, z - r], [x + r, t.y + 4, z + r], ROLE.collider);
    for (const [rx, rz, rr] of spec?.roots ?? []) {
      const px = t.x + (rx * cos - rz * sin) * t.scale;
      const pz = t.z + (rx * sin + rz * cos) * t.scale;
      const q = rr * t.scale;
      box(navTrunks, [px - q, t.y - 0.5, pz - q], [px + q, t.y + 1, pz + q], ROLE.collider);
    }
  }
  const collider = terrainMesh({ height: hf, splat });
  appendMesh(collider, navTrunks);
  appendMesh(collider, plots.collider);
  if (caveMesh) {
    appendMesh(collider, caveMesh.collider);
    appendMesh(collider, caveMesh.rockBoxes);
  }
  appendMesh(collider, fenceCollider);
  const navCollider: MeshData = {
    positions: collider.positions,
    normals: collider.normals,
    uvs: collider.uvs,
    indices: collider.indices,
    materials: collider.materials.map(() => ROLE.collider),
  };

  const bounds = {
    min: [-half, hf.min - 10, -half] as Vec3,
    max: [half, hf.max + 60, half] as Vec3,
  };
  const reach = 2600;
  const edge = (x: number, z: number): number => {
    const c = (v: number): number => Math.max(-half + 6, Math.min(half - 6, v));
    return hf.sample(c(x), c(z));
  };
  const spawns: SpawnRecord[] = [
    ...s.residents.map((r) => ({
      kind: r.kind,
      position: at3(r.at),
      yawDeg: headingDeg(r.face[0] - r.at[0], r.face[1] - r.at[1]),
    })),
    ...s.packs.flatMap((p) => packSpawns(p, ground)),
  ];
  for (const p of s.points) points.push({ name: p.name, position: at3(p.at), kind: 'poi' });
  return {
    region: 'region',
    height: hf,
    splat,
    chunks: terrainChunks({ height: hf, splat }, s.chunkCells),
    backdrop: backdropMesh({
      seed: s.seed + 99,
      half,
      reach,
      rings: 12,
      segments: 160,
      peak: 320,
      snowLine: 1e9,
      edgeHeight: edge,
      ...(s.sea ? { sea: { level: s.sea.level, floor: s.sea.floor } } : {}),
    }),
    visual,
    props: [...plots.props, ...(caveMesh?.props ?? [])],
    forest: forest.visual,
    trees,
    collider: navCollider,
    solids,
    lights,
    portals,
    spawns,
    // Beyond the map the sea bed stays under the water; the backdrop rises over it on land.
    water: s.sea
      ? [
          seaSurface(s.sea.level, half + reach, (x, z) =>
            Math.abs(x) < half && Math.abs(z) < half ? ground(x, z) : s.sea!.floor,
          ),
        ]
      : [],
    waterfalls: [],
    points,
    smoke: plots.smoke,
    unreachableOk: [],
    spaces: [
      {
        name: s.id,
        kind: 'cavern',
        bounds,
        fog: { density: s.environment.fogDensity, color: s.environment.fogColor },
      },
    ],
    spawn: {
      position: at3(s.start.at),
      yawDeg: headingDeg(s.start.face[0] - s.start.at[0], s.start.face[1] - s.start.at[1]),
    },
    bounds,
    terrainTextures: s.textures,
    environment: s.environment,
  };
}

/** The distance from (x, z) to the nearest point of a polyline. */
function lineDistance(x: number, z: number, line: readonly P2[]): number {
  let best = Infinity;
  for (let k = 0; k + 1 < line.length; k++) {
    const [ax, az] = line[k]!;
    const [bx, bz] = line[k + 1]!;
    const dx = bx - ax;
    const dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    best = Math.min(best, Math.hypot(x - (ax + dx * t), z - (az + dz * t)));
  }
  return best;
}

function appendTo(into: MeshData, mesh: MeshData): void {
  const base = into.positions.length / 3;
  into.positions.push(...mesh.positions);
  into.normals.push(...mesh.normals);
  into.uvs.push(...mesh.uvs);
  into.indices.push(...mesh.indices.map((i) => i + base));
  into.materials.push(...mesh.materials);
}
