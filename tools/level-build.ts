/**
 * Level compile step (DESIGN.md 11.5): level script → kernel → baked light → navmesh →
 * reachability validation → GLB + sidecar JSON in public/levels/.
 *
 *   npm run level:build                  every level under levels/
 *   npm run level:build -- showcase      one level
 *   npm run level:build -- --no-validate keep going when a point is unreachable
 *
 * Outputs are build artifacts and never committed; CI and the Pages deploy run this before
 * the Vite build.
 */
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  LevelBuilder,
  type LevelOutput,
  type PortalRecord,
  type SpawnRecord,
} from '../kernel/plan/level';
import type { MeshData } from '../kernel/core/mesh';
import { ROLE } from '../kernel/elements/roles';
import { bakeVertexLight } from '../kernel/light/bake';
import { buildNavMesh, checkReachability } from '../kernel/nav/navmesh';
import { buildLevelGlb } from '../kernel/export/glb';
import { buildRegion, type RegionScript } from '../kernel/terrain/region';
import { writeMapSheet, writeMiniMap } from './lib/map-sheet';
import { TREE_KINDS } from '../kernel/terrain/trees';
import { existsSync } from 'node:fs';

export interface LevelBuildOptions {
  /** Light reaching every vertex. */
  ambient: [number, number, number];
  /** Pre-bake grid spacing, metres. */
  bakeCell: number;
  /** Visual chunk size, metres. */
  chunk: number;
}

interface LevelModule {
  default: (plan: LevelBuilder) => void | Promise<void>;
  options?: Partial<LevelBuildOptions>;
  /** Doors to other levels (DESIGN.md 15.3). */
  portals?: PortalRecord[];
  /** Monsters standing in the level, as a region's packs are (src/dev/index.ts places them). */
  spawns?: SpawnRecord[];
}

const DEFAULTS: LevelBuildOptions = { ambient: [0.1, 0.1, 0.13], bakeCell: 1, chunk: 12 };

/** The mesh minus every triangle of one material role. */
function withoutRole(mesh: MeshData, role: number): MeshData {
  const indices: number[] = [];
  const materials: number[] = [];
  for (let t = 0; t < mesh.materials.length; t++) {
    if (mesh.materials[t] === role) continue;
    indices.push(
      mesh.indices[t * 3] ?? 0,
      mesh.indices[t * 3 + 1] ?? 0,
      mesh.indices[t * 3 + 2] ?? 0,
    );
    materials.push(mesh.materials[t] ?? 0);
  }
  return { ...mesh, indices, materials };
}
const OUT = 'public/levels';

const round = (v: number): number => Math.round(v * 1000) / 1000;
const ms = (a: number, b: number): string => `${(b - a).toFixed(0)} ms`;

/** Outdoor regions: levels/<id>/region.ts exports a hand-written RegionScript (owner, 2026-10-19). */
async function buildRegionLevel(id: string, validate: boolean): Promise<boolean> {
  const t0 = performance.now();
  const url = pathToFileURL(resolve('levels', id, 'region.ts')).href;
  const script = ((await import(url)) as { default: RegionScript }).default;
  const level = buildRegion(script);
  const chunkMetres = script.chunkCells * script.cell;
  const t1 = performance.now();
  // Coarse voxels for a region kilometres wide; the climb must cover one cell's rise on the
  // steepest walkable slope (1.5 m × tan 48° ≈ 1.7 m) or every hillside breaks into islands.
  const nav = await buildNavMesh(level.collider, {
    cellSize: 1.5,
    cellHeight: 0.3,
    agentRadius: 0.45,
    agentMaxClimb: 1.8,
    agentMaxSlopeDeg: 48,
    // 192 m tiles: a solo mesh overflows its 16-bit vertex indices on a region this size.
    tileSize: 128,
  });
  const t2 = performance.now();
  const report = checkReachability(
    nav.navMesh,
    level.spawn.position,
    level.points.filter((p) => !level.unreachableOk.includes(p.name)),
    4,
  );
  nav.navMesh.destroy();
  // Trees travel as instances in the sidecar (a few bytes each) and are drawn as thin
  // instances of two prototypes; collision is the terrain chunks plus a cylinder per trunk,
  // plus the cave mouth as a collider mesh (buildings and props collide as their own models).
  const glb = await buildLevelGlb(
    {
      visual: level.visual,
      collider: level.solids,
      water: level.water,
      waterfalls: level.waterfalls,
      nodes: [
        { name: 'terrain', children: level.chunks },
        { name: 'backdrop', children: [{ name: 'backdrop', mesh: level.backdrop }] },
      ],
    },
    { chunk: chunkMetres, quantize: true },
  );
  const t3 = performance.now();
  const sidecar = {
    name: id,
    version: 1,
    outdoor: true,
    region: level.region,
    terrainTextures: level.terrainTextures,
    environment: level.environment,
    lod: { chunk: chunkMetres, distances: [chunkMetres * 2.2, chunkMetres * 5], forestFar: 700 },
    trees: level.trees.map((t) => [
      TREE_KINDS.indexOf(t.kind),
      round(t.x),
      round(t.y),
      round(t.z),
      round(t.yaw),
      round(t.scale),
    ]),
    propModels: [...new Set(level.props.map((p) => p.model))],
    props: level.props.map((p) => [
      [...new Set(level.props.map((q) => q.model))].indexOf(p.model),
      round(p.x),
      round(p.y),
      round(p.z),
      round(p.yaw),
      round(p.scale),
    ]),
    spawn: level.spawn,
    points: level.points,
    lights: level.lights,
    portals: level.portals,
    spawns: level.spawns,
    spaces: level.spaces,
    water: level.water.map(({ mesh: _mesh, ...body }) => body),
    waterfalls: level.waterfalls.map(({ mesh: _mesh, ...fall }) => fall),
    bounds: level.bounds,
    // No debug navmesh for a region: it would be megabytes of JSON for an overlay.
    nav: { positions: [], indices: [] },
    reachability: report.results,
    stats: {
      triangles: level.chunks
        .filter((c) => c.lod === 0)
        .reduce((n, c) => n + c.mesh.indices.length / 3, 0),
      trees: level.trees.length,
      props: level.props.length,
      portals: level.portals.length,
      spawns: level.spawns.length,
      waterfalls: level.waterfalls.length,
      backdropTriangles: level.backdrop.indices.length / 3,
      visualTriangles: level.visual.indices.length / 3,
      forestTriangles: level.forest.indices.length / 3,
      colliderTriangles: level.collider.indices.length / 3,
      navTriangles: nav.debug.indices.length / 3,
      glbBytes: glb.byteLength,
      heightMin: round(level.height.min),
      heightMax: round(level.height.max),
    },
  };
  await mkdir(OUT, { recursive: true });
  await writeFile(resolve(OUT, `${id}.glb`), glb);
  await writeFile(resolve(OUT, `${id}.json`), JSON.stringify(sidecar));
  await writeFile(resolve(OUT, `${id}.nav.bin`), nav.bytes);
  // The map sheet: the region from above, for the owner's review and the automap.
  await writeMapSheet(level, resolve(OUT, `${id}.map.png`));
  // The minimap's picture (src/ui/panel.ts).
  await writeMiniMap(level, resolve(OUT, `${id}.mini.png`));
  console.info(
    [
      `${id}: ${sidecar.stats.triangles} terrain tris at full detail, ${level.trees.length} trees ` +
        `(${sidecar.stats.forestTriangles} tris), ${sidecar.stats.props} props ` +
        `(${sidecar.stats.visualTriangles} tris), ${(glb.byteLength / 1024 / 1024).toFixed(1)} MB glb, ` +
        `${sidecar.stats.navTriangles} nav tris, heights ${sidecar.stats.heightMin} to ${sidecar.stats.heightMax} m`,
      `  generate ${ms(t0, t1)}, nav ${ms(t1, t2)}, glb ${ms(t2, t3)}`,
    ].join('\n'),
  );
  for (const r of report.results) {
    if (!r.reachable) console.error(`  ${r.name}: unreachable (${r.reason})`);
  }
  if (!report.ok) {
    console.error(`${id}: unreachable points${validate ? '' : ' (ignored, --no-validate)'}`);
    return !validate;
  }
  return true;
}

async function buildOne(id: string, validate: boolean): Promise<boolean> {
  if (existsSync(resolve('levels', id, 'region.ts'))) return buildRegionLevel(id, validate);
  const t0 = performance.now();
  const url = pathToFileURL(resolve('levels', id, 'level.ts')).href;
  const mod = (await import(url)) as LevelModule;
  const options = { ...DEFAULTS, ...mod.options };
  const plan = new LevelBuilder(id);
  await mod.default(plan);
  const level: LevelOutput = await plan.build();
  const t1 = performance.now();

  // Lamp panes enclose their own lights; they must not cast shadows.
  const occluder = withoutRole(level.visual, ROLE.glass);
  const visual = bakeVertexLight(level.visual, level.lights, {
    ambient: options.ambient,
    cell: options.bakeCell,
    occluder,
  });
  const t2 = performance.now();

  const nav = await buildNavMesh(level.collider);
  const report = checkReachability(
    nav.navMesh,
    level.spawn.position,
    level.points.filter((p) => p.kind !== 'spawn'),
  );
  nav.navMesh.destroy();
  const t3 = performance.now();

  const glb = await buildLevelGlb(
    { visual, collider: level.collider, water: level.water, waterfalls: level.waterfalls },
    { chunk: options.chunk },
  );
  const t4 = performance.now();

  const sidecar = {
    name: level.name,
    version: 1,
    spawn: level.spawn,
    points: level.points,
    lights: level.lights,
    portals: mod.portals ?? [],
    spawns: mod.spawns ?? [],
    spaces: level.spaces,
    water: level.water.map(({ mesh: _mesh, ...body }) => body),
    waterfalls: level.waterfalls.map(({ mesh: _mesh, ...fall }) => fall),
    bounds: level.bounds,
    nav: {
      positions: nav.debug.positions.map(round),
      indices: nav.debug.indices,
    },
    reachability: report.results,
    stats: {
      triangles: visual.indices.length / 3,
      vertices: visual.positions.length / 3,
      colliderTriangles: level.collider.indices.length / 3,
      navTriangles: nav.debug.indices.length / 3,
      glbBytes: glb.byteLength,
    },
  };
  await mkdir(OUT, { recursive: true });
  await writeFile(resolve(OUT, `${id}.glb`), glb);
  await writeFile(resolve(OUT, `${id}.json`), JSON.stringify(sidecar));
  await writeFile(resolve(OUT, `${id}.nav.bin`), nav.bytes);

  const perRole = new Map<number, number>();
  for (const m of visual.materials) perRole.set(m, (perRole.get(m) ?? 0) + 1);
  const roles = [...perRole.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([role, n]) => `${role}:${n}`)
    .join(' ');
  const ms = (a: number, b: number): string => `${Math.round(b - a)} ms`;
  console.info(
    [
      `${id}: ${sidecar.stats.triangles} tris, ${sidecar.stats.vertices} verts, ` +
        `${(glb.byteLength / 1024).toFixed(0)} KB glb, ${sidecar.stats.navTriangles} nav tris`,
      `  plan ${ms(t0, t1)}, bake ${ms(t1, t2)}, nav ${ms(t2, t3)}, glb ${ms(t3, t4)}`,
      `  tris per role ${roles}`,
    ].join('\n'),
  );
  for (const r of report.results) {
    const tag = r.reachable ? 'ok ' : 'MISS';
    const detail = r.reachable ? `${r.pathLength?.toFixed(1)} m` : (r.reason ?? '');
    console.info(`  ${tag} ${r.name.padEnd(16)} ${detail}`);
  }
  if (!report.ok) {
    console.error(`${id}: unreachable points${validate ? '' : ' (ignored, --no-validate)'}`);
    return !validate;
  }
  return true;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const validate = !args.includes('--no-validate');
  const ids = args.filter((a) => !a.startsWith('--'));
  const all = (await readdir('levels', { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  const todo = ids.length ? ids : all;
  let ok = true;
  for (const id of todo) {
    if (!all.includes(id)) throw new Error(`no such level: ${id}`);
    ok = (await buildOne(id, validate)) && ok;
  }
  if (!ok) process.exit(1);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? (err.stack ?? err.message) : err);
  process.exit(1);
});
