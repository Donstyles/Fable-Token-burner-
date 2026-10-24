import { describe, expect, it } from 'vitest';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import {
  averageShadowStep,
  paintGroundShade,
  shadeAt,
  shadeGridFor,
  shadowStepAt,
  type ShadeCaster,
  type ShadeMesh,
  sunBlend,
  sunSteps,
} from './ground-shade';

/** A box in its own metres, foot at y = 0, centred on x and z. */
function box(w: number, h: number, d: number): ShadeMesh {
  const x = w / 2;
  const z = d / 2;
  const positions = [
    [-x, 0, -z],
    [x, 0, -z],
    [x, 0, z],
    [-x, 0, z],
    [-x, h, -z],
    [x, h, -z],
    [x, h, z],
    [-x, h, z],
  ].flat();
  const quads = [
    [0, 1, 2, 3],
    [4, 5, 6, 7],
    [0, 1, 5, 4],
    [1, 2, 6, 5],
    [2, 3, 7, 6],
    [3, 0, 4, 7],
  ];
  return { positions, indices: quads.flatMap(([a, b, c, e]) => [a!, b!, c!, a!, c!, e!]) };
}

/** A round crown of radius r, its middle `at` metres up: two layers of leaves wherever it is. */
function crown(r: number, at: number, rings = 8, sides = 12): ShadeMesh {
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= rings; i++) {
    const phi = (Math.PI * i) / rings;
    for (let j = 0; j < sides; j++) {
      const theta = (2 * Math.PI * j) / sides;
      positions.push(
        r * Math.sin(phi) * Math.cos(theta),
        at + r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta),
      );
    }
  }
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < sides; j++) {
      const a = i * sides + j;
      const b = i * sides + ((j + 1) % sides);
      indices.push(a, a + sides, b, b, a + sides, b + sides);
    }
  }
  return { positions, indices };
}

/** Two meshes as one. */
function merge(a: ShadeMesh, b: ShadeMesh): ShadeMesh {
  const base = a.positions.length / 3;
  return {
    positions: [...Array.from(a.positions), ...Array.from(b.positions)],
    indices: [...Array.from(a.indices), ...Array.from(b.indices).map((i) => i + base)],
  };
}

const GRID = shadeGridFor({ min: [-64, 0, -64], max: [64, 20, 64] }, 512);
/** The instance matrix the level loader builds for a kernel placement (src/world/level.ts). */
const placed = (kx: number, ky: number, kz: number, yaw: number, scale = 1): Float32Array =>
  new Float32Array(
    Matrix.Compose(
      new Vector3(scale, scale, scale),
      Quaternion.RotationAxis(Vector3.Up(), yaw),
      new Vector3(-kx, ky, kz),
    ).m,
  );
const NORTH = { x: 0, z: 0.6 };

describe('ground shade', () => {
  it('casts the day average sun to the north, about half a metre a metre', () => {
    const step = averageShadowStep();
    expect(Math.abs(step.x)).toBeLessThan(0.02);
    expect(step.z).toBeGreaterThan(0.4);
    expect(step.z).toBeLessThan(0.9);
  });

  it('lays its grid over the level in scene space, mirrored on x', () => {
    const g = shadeGridFor({ min: [-100, 0, -50], max: [300, 10, 350] }, 1024);
    expect(g.minX).toBe(-300);
    expect(g.minZ).toBe(-50);
    expect(g.size).toBe(400);
  });

  it('shades where the instance is drawn: the kernel x mirrored, the yaw as Babylon turns it', () => {
    // A long low shed, 12 m along its own x and 4 m deep, at kernel (20, 0, 10) turned a quarter.
    const casters = new Map<string, ShadeCaster>([
      ['shed', { canopy: false, mesh: box(12, 2, 4) }],
    ]);
    const m = placed(20, 0, 10, Math.PI / 2);
    const data = paintGroundShade(GRID, casters, [{ model: 'shed', matrix: m }], NORTH);
    // Where Babylon draws the shed's two ends.
    const ends = [new Vector3(4.5, 0, 0), new Vector3(-4.5, 0, 0)].map((v) =>
      Vector3.TransformCoordinates(v, Matrix.FromArray(m)),
    );
    for (const e of ends) expect(shadeAt(data, GRID, e.x, e.z).sky).toBeGreaterThan(0.9);
    // In the scene it stands at x = -20; nothing at the unmirrored x = +20.
    expect(shadeAt(data, GRID, -20, 10).sky).toBeGreaterThan(0.9);
    expect(shadeAt(data, GRID, 20, 10).sky).toBe(0);
    // Turned a quarter it runs north and south, so 8 m east and west of its middle is open.
    expect(shadeAt(data, GRID, -20 + 8, 10).sky).toBeLessThan(0.2);
    expect(shadeAt(data, GRID, -20 - 8, 10).sky).toBeLessThan(0.2);
    expect(shadeAt(data, GRID, -20, 10 + 6).sky).toBeGreaterThan(0.5);
  });

  it('seats a house in a skirt and casts its shadow to the north only', () => {
    const casters = new Map<string, ShadeCaster>([
      ['house', { canopy: false, mesh: box(8, 6, 6) }],
    ]);
    const data = paintGroundShade(
      GRID,
      casters,
      [{ model: 'house', matrix: placed(0, 0, 0, 0) }],
      NORTH,
    );
    const at = (x: number, z: number) => shadeAt(data, GRID, x, z);
    // The skirt: dark at every wall's foot, fading over three metres or so, gone by nine.
    for (const [x, z] of [
      [0, -3.2],
      [0, 3.2],
      [4.2, 0],
      [-4.2, 0],
    ] as const) {
      expect(at(x, z).sky).toBeGreaterThan(0.8);
      expect(at(x * 1.5, z * 1.5).sky).toBeLessThan(at(x, z).sky);
    }
    expect(at(0, -4.5).sky).toBeGreaterThan(0.3);
    expect(at(0, -12).sky).toBeLessThan(0.02);
    // The roof's shadow reaches about 6 x 0.6 x 0.8 = 2.9 m north of the north wall; none south.
    expect(at(0, 3 + 1.5).sun).toBeGreaterThan(0.8);
    expect(at(0, 3 + 4.5).sun).toBeLessThan(0.1);
    expect(at(0, -3 - 1.5).sun).toBeLessThan(0.1);
  });

  it('pools shade under a crown, set a little north, soft at its rim', () => {
    const casters = new Map<string, ShadeCaster>([['oak', { canopy: true, mesh: crown(5, 8) }]]);
    const data = paintGroundShade(
      GRID,
      casters,
      [{ model: 'oak', matrix: placed(-10, 0, -10, 0.7) }],
      NORTH,
    );
    const at = (dx: number, dz: number) => shadeAt(data, GRID, 10 + dx, -10 + dz);
    expect(at(0, 0).sun).toBeGreaterThan(0.6);
    expect(at(0, 0).sky).toBeGreaterThan(0.3);
    // The crown's middle is 8 m up: a quarter of 0.6 m a metre sets the pool 1.2 m north.
    expect(at(0, 4).sun).toBeGreaterThan(at(0, -4).sun + 0.1);
    expect(at(0, 0).sun).toBeGreaterThan(at(4.5, 0).sun + 0.1);
    expect(at(12, 0).sun).toBe(0);
    expect(at(0, -12).sky).toBe(0);
  });

  it('keeps the darker of two crowns where they meet, never adding them up', () => {
    const casters = new Map<string, ShadeCaster>([['oak', { canopy: true, mesh: crown(5, 8) }]]);
    const one = paintGroundShade(GRID, casters, [{ model: 'oak', matrix: placed(0, 0, 0, 0) }]);
    const two = paintGroundShade(GRID, casters, [
      { model: 'oak', matrix: placed(0, 0, 0, 0) },
      { model: 'oak', matrix: placed(0, 0, 0, 0) },
    ]);
    expect([...two]).toEqual([...one]);
  });

  it('lets more sun through a sparse crown than a dense one', () => {
    const casters = new Map<string, ShadeCaster>([
      ['dense', { canopy: true, mesh: merge(crown(4, 6), crown(3, 6)) }],
      [
        'bare',
        { canopy: true, mesh: { positions: [0, 6, 0, 4, 6, 0.2, 0, 6.1, 4], indices: [0, 1, 2] } },
      ],
    ]);
    const dense = paintGroundShade(GRID, casters, [{ model: 'dense', matrix: placed(0, 0, 0, 0) }]);
    const bare = paintGroundShade(GRID, casters, [{ model: 'bare', matrix: placed(0, 0, 0, 0) }]);
    expect(shadeAt(dense, GRID, 0, 0).sun).toBeGreaterThan(0.8);
    // One layer over the triangle (x 0 to 4, z 0 to 4, set 0.9 m north): about half.
    expect(shadeAt(bare, GRID, 1, 2).sun).toBeGreaterThan(0.2);
    expect(shadeAt(bare, GRID, 1, 2).sun).toBeLessThan(0.6);
  });

  it('scales a crown with its instance', () => {
    const casters = new Map<string, ShadeCaster>([['oak', { canopy: true, mesh: crown(3, 5) }]]);
    const small = paintGroundShade(GRID, casters, [{ model: 'oak', matrix: placed(0, 0, 0, 0) }]);
    const big = paintGroundShade(GRID, casters, [{ model: 'oak', matrix: placed(0, 0, 0, 0, 2) }]);
    // Radius 3 or 6: 4 m out is beyond the one and well inside the other.
    expect(shadeAt(small, GRID, 4, 0).sun).toBeLessThan(0.05);
    expect(shadeAt(big, GRID, 4, 0).sun).toBeGreaterThan(0.5);
  });

  it('casts three suns, the morning’s to the west, noon’s north, the evening’s to the east', () => {
    // The scene's east is its +x, where the morning sun stands.
    const [morning, noon, evening] = sunSteps();
    expect(morning.x).toBeLessThan(-0.5);
    expect(evening.x).toBeGreaterThan(0.5);
    expect(Math.abs(noon.x)).toBeLessThan(0.1);
    expect(noon.z).toBeGreaterThan(0.2);
    // A low sun's shadow is long, but never past its cap.
    expect(Math.hypot(morning.x, morning.z)).toBeGreaterThan(Math.hypot(noon.x, noon.z));
    expect(Math.hypot(shadowStepAt(5.5).x, shadowStepAt(5.5).z)).toBeLessThanOrEqual(1.6001);
    const casters = new Map<string, ShadeCaster>([
      ['house', { canopy: false, mesh: box(6, 6, 6) }],
    ]);
    const data = paintGroundShade(GRID, casters, [{ model: 'house', matrix: placed(0, 0, 0, 0) }]);
    const at = (x: number, z: number) => shadeAt(data, GRID, x, z).suns;
    // West of the house (-x) in the morning's cast only; east (+x) in the evening's only.
    expect(at(-5, 0)[0]).toBeGreaterThan(0.6);
    expect(at(-5, 0)[2]).toBeLessThan(0.1);
    expect(at(5, 0)[2]).toBeGreaterThan(0.6);
    expect(at(5, 0)[0]).toBeLessThan(0.1);
  });

  it('blends the three casts through the day, all the morning’s early, the evening’s late', () => {
    expect(sunBlend(6 * 60)).toEqual([1, 0, 0]);
    expect(sunBlend(13 * 60)).toEqual([0, 1, 0]);
    expect(sunBlend(20 * 60)).toEqual([0, 0, 1]);
    const mid = sunBlend(10.75 * 60);
    expect(mid[0]).toBeCloseTo(0.5, 6);
    expect(mid[1]).toBeCloseTo(0.5, 6);
    for (const m of [7 * 60, 11 * 60, 15 * 60, 19 * 60]) {
      expect(sunBlend(m).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
    }
  });
});
