/**
 * dev-arena: a tuning room built from primitives. Development only, never shipped
 * (see PLAN.md Phase 1 step 4). Deleted when the Phase 2 showcase level exists.
 */
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { PhysicsAggregate } from '@babylonjs/core/Physics/v2/physicsAggregate';
import { PhysicsShapeType } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import type { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { applyRetroSampling, type PointLightDesc, type RetroMaterials } from '../render/materials';

export interface DevArena {
  spawn: Vector3;
  spawnYawDeg: number;
  /** Meshes that respond to a tap. */
  tappable: Mesh[];
  materialOf(mesh: Mesh): ShaderMaterial | undefined;
  setMipmaps(on: boolean): void;
  /** Scale every lantern and window light. */
  setLightIntensity(v: number): void;
  dispose(): void;
}

function checker(
  scene: Scene,
  name: string,
  a: string,
  b: string,
  cells = 8,
  size = 64,
): DynamicTexture {
  const tex = new DynamicTexture(name, { width: size, height: size }, scene, false);
  const ctx = tex.getContext();
  const cell = size / cells;
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? a : b;
      ctx.fillRect(x * cell, y * cell, cell, cell);
    }
  }
  // thin grid lines so texel scale reads clearly
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  for (let i = 0; i < cells; i++) {
    ctx.fillRect(i * cell, 0, 1, size);
    ctx.fillRect(0, i * cell, size, 1);
  }
  tex.update(false);
  return tex;
}

export function buildDevArena(scene: Scene, materials: RetroMaterials): DevArena {
  const textures = {
    floor: checker(scene, 'dev-floor', '#5d5a52', '#4a4842'),
    wall: checker(scene, 'dev-wall', '#7a5a3a', '#65482c'),
    stone: checker(scene, 'dev-stone', '#8d8a80', '#737068'),
    wood: checker(scene, 'dev-wood', '#9b6b35', '#7f5527'),
    target: checker(scene, 'dev-target', '#c0392b', '#96281b', 4),
    iron: checker(scene, 'dev-iron', '#2b2b2e', '#232326', 4),
    plaster: checker(scene, 'dev-plaster', '#b9ad95', '#a89c86', 8),
    glass: checker(scene, 'dev-glass', '#ffd08a', '#ffbf63', 2),
  };
  const lights: PointLightDesc[] = [];
  const meshes: Mesh[] = [];
  const tappable: Mesh[] = [];
  const byMesh = new Map<Mesh, ShaderMaterial>();

  const box = (
    name: string,
    size: [number, number, number],
    pos: [number, number, number],
    tex: DynamicTexture,
    uv: [number, number],
    opts: {
      rotX?: number;
      rotY?: number;
      tappable?: boolean;
      emissive?: Color3;
      noPhysics?: boolean;
    } = {},
  ): Mesh => {
    const m = CreateBox(name, { width: size[0], height: size[1], depth: size[2] }, scene);
    m.position.set(pos[0], pos[1], pos[2]);
    if (opts.rotX) m.rotation.x = opts.rotX;
    if (opts.rotY) m.rotation.y = opts.rotY;
    const mat = materials.create({
      name: `${name}-mat`,
      texture: tex,
      uvScale: uv,
      ...(opts.emissive ? { emissive: opts.emissive } : {}),
    });
    m.material = mat;
    byMesh.set(m, mat);
    if (!opts.noPhysics) {
      new PhysicsAggregate(m, PhysicsShapeType.BOX, { mass: 0, friction: 0.8 }, scene);
    }
    meshes.push(m);
    if (opts.tappable) tappable.push(m);
    return m;
  };

  // A lantern on a post: iron post, glowing lamp box, warm point light.
  const warm = new Color3(1.0, 0.62, 0.3);
  const lantern = (x: number, z: number): void => {
    box(`dev-post-${x}-${z}`, [0.12, 2.6, 0.12], [x, 1.3, z], textures.iron, [1, 8]);
    box(`dev-lamp-${x}-${z}`, [0.3, 0.35, 0.3], [x, 2.75, z], textures.glass, [1, 1], {
      emissive: new Color3(1.1, 0.78, 0.42),
      noPhysics: true,
    });
    lights.push(
      materials.addLight({ position: new Vector3(x, 2.7, z), color: warm, range: 9, intensity: 1 }),
    );
  };

  // Floor and perimeter.
  box('dev-floor', [60, 0.5, 60], [0, -0.25, 0], textures.floor, [30, 30]);
  box('dev-wall-n', [60, 5, 0.5], [0, 2.5, 30], textures.wall, [30, 2.5]);
  box('dev-wall-s', [60, 5, 0.5], [0, 2.5, -30], textures.wall, [30, 2.5]);
  box('dev-wall-e', [0.5, 5, 60], [30, 2.5, 0], textures.wall, [30, 2.5]);
  box('dev-wall-w', [0.5, 5, 60], [-30, 2.5, 0], textures.wall, [30, 2.5]);

  // Staircase up to a 3 m ledge with a sheer drop on its far side (fall-damage test).
  const rise = 0.25;
  const run = 0.35;
  const steps = 12;
  for (let i = 0; i < steps; i++) {
    const h = (i + 1) * rise;
    box(`dev-step-${i}`, [3, h, run], [8, h / 2, 4 + i * run + run / 2], textures.stone, [3, 1]);
  }
  const ledgeZ = 4 + steps * run + 3;
  box('dev-ledge', [6, 3, 6], [8, 1.5, ledgeZ], textures.stone, [6, 3]);

  // Ramp to a 2.5 m platform.
  const rampLen = 8;
  const rampRise = 2.5;
  const angle = Math.atan2(rampRise, rampLen);
  box(
    'dev-ramp',
    [3, 0.3, Math.hypot(rampLen, rampRise)],
    [-8, rampRise / 2 - 0.1, 4 + rampLen / 2],
    textures.wood,
    [3, 8],
    { rotX: -angle },
  );
  box('dev-ramp-top', [4, 2.5, 4], [-8, 1.25, 4 + rampLen + 2], textures.wood, [4, 2.5]);

  // Step-height tests: a 0.4 m curb (climbable) and a 0.7 m wall (blocks).
  box('dev-curb', [4, 0.4, 0.6], [0, 0.2, -4], textures.stone, [4, 0.6]);
  box('dev-knee-wall', [4, 0.7, 0.6], [0, 0.35, 0], textures.stone, [4, 0.7]);

  // A corridor with a right-angle turn for the turn-while-walking feel.
  box('dev-corr-a', [0.5, 3, 12], [-16, 1.5, -14], textures.wall, [12, 3]);
  box('dev-corr-b', [0.5, 3, 12], [-19, 1.5, -14], textures.wall, [12, 3]);
  box('dev-corr-c', [10, 3, 0.5], [-21, 1.5, -8], textures.wall, [10, 3]);
  box('dev-corr-d', [7, 3, 0.5], [-22.5, 1.5, -5], textures.wall, [7, 3]);

  // Pillars.
  for (const [x, z] of [
    [18, -18],
    [22, -18],
    [18, -14],
    [22, -14],
  ] as const) {
    const p = CreateCylinder(`dev-pillar-${x}-${z}`, { diameter: 1, height: 5 }, scene);
    p.position.set(x, 2.5, z);
    const mat = materials.create({
      name: `${p.name}-mat`,
      texture: textures.stone,
      uvScale: [3, 5],
    });
    p.material = mat;
    byMesh.set(p, mat);
    new PhysicsAggregate(p, PhysicsShapeType.CYLINDER, { mass: 0 }, scene);
    meshes.push(p);
  }

  // Lanterns around the spawn and along the way to the stairs.
  lantern(-3, -11);
  lantern(3, -11);
  lantern(6, 2);
  lantern(-6, -1);

  // A house front with glowing windows, to judge emissive bloom and warm light pools.
  box('dev-house', [8, 4.5, 0.5], [-12, 2.25, 8], textures.plaster, [8, 4.5]);
  for (const wx of [-14.5, -12, -9.5]) {
    box(`dev-window-${wx}`, [0.9, 1.1, 0.12], [wx, 2.4, 7.72], textures.glass, [1, 1], {
      emissive: new Color3(1.05, 0.7, 0.36),
      noPhysics: true,
    });
    lights.push(
      materials.addLight({
        position: new Vector3(wx, 2.3, 7.2),
        color: warm,
        range: 6,
        intensity: 0.8,
      }),
    );
  }

  // Tap targets.
  box('dev-target-1', [1, 1, 1], [3, 0.5, -8], textures.target, [1, 1], { tappable: true });
  box('dev-target-2', [1, 1.5, 1], [-3, 0.75, -8], textures.target, [1, 1], { tappable: true });
  box('dev-target-3', [1, 1, 1], [0, 3.5, ledgeZ - 8], textures.target, [1, 1], { tappable: true });

  const setMipmaps = (on: boolean): void => {
    for (const t of Object.values(textures)) applyRetroSampling(t, on);
  };
  setMipmaps(true);
  const baseIntensity = lights.map((l) => l.intensity);
  const setLightIntensity = (v: number): void => {
    lights.forEach((l, i) => {
      l.intensity = (baseIntensity[i] ?? 1) * v;
    });
  };
  setLightIntensity(2.2);

  return {
    spawn: new Vector3(0, 0, -14),
    spawnYawDeg: 0,
    tappable,
    materialOf: (m) => byMesh.get(m),
    setMipmaps,
    setLightIntensity,
    dispose() {
      for (const l of lights) materials.removeLight(l);
      for (const m of meshes) m.dispose();
      for (const t of Object.values(textures)) t.dispose();
    },
  };
}

export const FLASH_TINT = new Color3(2.5, 2.2, 1.6);
