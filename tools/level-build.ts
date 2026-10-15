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
import { LevelBuilder, type LevelOutput } from '../kernel/plan/level';
import type { MeshData } from '../kernel/core/mesh';
import { ROLE } from '../kernel/elements/roles';
import { bakeVertexLight } from '../kernel/light/bake';
import { buildNavMesh, checkReachability } from '../kernel/nav/navmesh';
import { buildLevelGlb } from '../kernel/export/glb';

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

async function buildOne(id: string, validate: boolean): Promise<boolean> {
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
