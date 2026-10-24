/**
 * The catalogue of Meshy props (DESIGN.md 10.3): what each generated model is for and how big
 * it stands in the world. A model arrives from Meshy at an arbitrary size; `npm run
 * props:catalogue` measures every GLB in assets/props and writes assets/props/catalogue.json
 * with each model's footprint at the nominal height here, which the terrain kernel reads to
 * lay out the village and the runtime reads to scale the model.
 */
export type PropKind = 'tree' | 'bush' | 'building' | 'prop' | 'rock';

export interface PropSpec {
  kind: PropKind;
  /** Height the model stands in the world, metres (its tallest point above the ground). */
  height: number;
  /**
   * Trees: the trunk the party meets, for its collider (tools/lib/trunk.ts, read off the
   * model between a metre and 1.8 m up): the radius of a disc of its area, and its middle in
   * metres in the model's own frame, as `door`. A big oak's trunk and roots are over five
   * metres across and stand a metre off the model's middle; a fir's boughs sweep to head
   * height. (A hand-set 0.2 to 0.45 m at the model's middle had let the party walk into them.)
   */
  trunk?: number;
  trunkAt?: readonly [number, number];
  /** Trees: the forest classes this model stands in for (kernel/terrain/trees.ts). */
  classes?: readonly ('pine' | 'broadleaf' | 'spruce' | 'oak' | 'palm')[];
  /**
   * The side Meshy delivered the front (the door, a cart's shafts) on, in the game's frame,
   * when it is not +Z: image-to-3D keeps the picture's framing, and from a three-quarter
   * picture the door can come out on a gable. Post-processing turns it round to +Z.
   */
  front?: '+x' | '-x' | '-z';
  /**
   * Buildings: the door on the front, in metres in the model's own frame (x across the front,
   * positive to the right as you face it; y up from the foot), read off a square-on front view
   * (`tools/review` with `?front`). A tap enters a house only on its door (owner, 2026-10-23:
   * "I want Houses only enterable from door"), and the place named after the house stands
   * before it.
   */
  door?: { x: number; width: number; height: number };
  /**
   * Lights the model carries, in metres in its own frame as `door` (z towards the front): a
   * lantern's glass, a forge's coals. Found on the model's paint (tools/lib/glow.ts) or read
   * off its square-on front view, and checked as marks on its review render; every copy of the
   * model carries them, turned with it (owner, 2026-10-23: "How will you manage lighting
   * features on houses and lanterns etc?").
   */
  lights?: readonly { at: readonly [number, number, number]; kind: 'lantern' | 'forge' }[];
  /**
   * The tops of the chimneys the model carries, in metres in its own frame as `door`, where
   * its hearths' smoke rises (DESIGN.md 17.6): found on its geometry (tools/lib/chimney.ts)
   * and checked as marks on its review render; a spire or a ridge vent is not one.
   */
  chimneys?: readonly (readonly [number, number, number])[];
}

/** The turn about the upright, in glTF's frame (the game's X is glTF's -X), that brings `front` to +Z. */
export function frontTurnDeg(front: PropSpec['front']): number {
  return front === '+x' ? 90 : front === '-x' ? -90 : front === '-z' ? 180 : 0;
}

export const PROPS: Record<string, PropSpec> = {
  'tree-spruce-01': {
    kind: 'tree',
    height: 22,
    trunk: 0.69,
    trunkAt: [0.05, 0.01],
    classes: ['spruce'],
  },
  'tree-spruce-02': {
    kind: 'tree',
    height: 26,
    trunk: 0.5,
    trunkAt: [0.11, -0.08],
    classes: ['spruce'],
  },
  'tree-spruce-03': {
    kind: 'tree',
    height: 20,
    trunk: 0.62,
    trunkAt: [0.02, -0.2],
    classes: ['spruce'],
  },
  'tree-fir-01': {
    kind: 'tree',
    height: 24,
    trunk: 1.74,
    trunkAt: [0.06, -0.04],
    classes: ['spruce', 'pine'],
  },
  'tree-pine-01': {
    kind: 'tree',
    height: 20,
    trunk: 0.66,
    trunkAt: [0.02, -0.33],
    classes: ['pine'],
  },
  'tree-pine-02': {
    kind: 'tree',
    height: 9,
    trunk: 0.41,
    trunkAt: [0.01, 0.05],
    classes: ['pine'],
  },
  'tree-larch-01': {
    kind: 'tree',
    height: 18,
    trunk: 0.51,
    trunkAt: [0.01, -0.02],
    classes: ['pine'],
  },
  'tree-oak-01': {
    kind: 'tree',
    height: 16,
    trunk: 2.67,
    trunkAt: [-0.04, 1.04],
    classes: ['oak'],
  },
  'tree-oak-02': { kind: 'tree', height: 14, trunk: 0.72, trunkAt: [0.07, 0.11], classes: ['oak'] },
  'tree-beech-01': {
    kind: 'tree',
    height: 18,
    trunk: 0.75,
    trunkAt: [-0.13, -0.14],
    classes: ['broadleaf'],
  },
  'tree-birch-01': {
    kind: 'tree',
    height: 14,
    trunk: 0.4,
    trunkAt: [0.09, -0.02],
    classes: ['broadleaf'],
  },
  'tree-maple-01': {
    kind: 'tree',
    height: 13,
    trunk: 0.85,
    trunkAt: [0.19, 0.36],
    classes: ['broadleaf'],
  },
  'tree-linden-01': {
    kind: 'tree',
    height: 15,
    trunk: 0.57,
    trunkAt: [-0.03, 0.14],
    classes: ['broadleaf'],
  },
  'tree-willow-01': {
    kind: 'tree',
    height: 10,
    trunk: 1.07,
    trunkAt: [-0.02, 0.13],
    classes: ['broadleaf'],
  },
  'tree-dead-01': { kind: 'tree', height: 9, trunk: 1.03, trunkAt: [0.21, 0.1] },
  'tree-dead-02': { kind: 'tree', height: 7, trunk: 0.52, trunkAt: [-0.02, 0.04] },
  'tree-palm-01': {
    kind: 'tree',
    height: 9,
    trunk: 0.51,
    trunkAt: [0.15, 0.63],
    classes: ['palm'],
  },
  'tree-palm-02': {
    kind: 'tree',
    height: 7,
    trunk: 0.95,
    trunkAt: [0.04, -0.18],
    classes: ['palm'],
  },
  'bush-01': { kind: 'bush', height: 1.4 },
  'bush-02': { kind: 'bush', height: 1.8 },
  'building-inn': {
    kind: 'building',
    height: 10.5,
    door: { x: -0.2, width: 1.3, height: 2.3 },
    // The stack at the left gable, its two pots as one.
    chimneys: [[-4.13, 10.5, -0.78]],
  },
  'building-temple': {
    kind: 'building',
    height: 13,
    front: '+x',
    door: { x: 0, width: 1.6, height: 3 },
  },
  'building-store': {
    kind: 'building',
    height: 8,
    door: { x: 0.38, width: 0.9, height: 2.1 },
    chimneys: [[-3.02, 8, 0]],
  },
  'building-smithy': {
    kind: 'building',
    height: 6,
    door: { x: 0.33, width: 3.1, height: 2.3 },
    // The coals painted under the lean-to on its left.
    lights: [{ at: [-1.15, 1, 1.08], kind: 'forge' }],
    chimneys: [[-0.36, 6, -2.53]],
  },
  'building-stables': {
    kind: 'building',
    height: 5.5,
    door: { x: -0.2, width: 1.7, height: 2 },
  },
  'building-barn': {
    kind: 'building',
    height: 9,
    front: '+x',
    door: { x: -0.7, width: 3.8, height: 3.3 },
  },
  'building-cottage-01': {
    kind: 'building',
    height: 6.5,
    door: { x: 0.15, width: 1.2, height: 2.1 },
    // The stone stack at the gable, its two pots as one.
    chimneys: [[3.27, 6.5, 0.03]],
  },
  'building-cottage-02': {
    kind: 'building',
    height: 5.5,
    front: '-z',
    door: { x: -1, width: 1.05, height: 2 },
    chimneys: [[1.58, 5.5, 0.87]],
  },
  'building-cottage-03': {
    kind: 'building',
    height: 8.5,
    front: '-x',
    door: { x: -0.14, width: 0.7, height: 1.8 },
    // A stack at either gable.
    chimneys: [
      [-0.24, 8.49, -3.24],
      [0.01, 8.42, 2.32],
    ],
  },
  'building-farmhouse': {
    kind: 'building',
    height: 9.5,
    door: { x: -0.1, width: 1.3, height: 2.1 },
    // The stack over the house end, its two pots as one.
    chimneys: [[0.38, 9.5, 6.03]],
  },
  'prop-well': { kind: 'prop', height: 3.2 },
  'prop-shrine': { kind: 'prop', height: 2.8 },
  'prop-cart': { kind: 'prop', height: 1.8, front: '-x' },
  'prop-market-stall': { kind: 'prop', height: 2.6 },
  'prop-haystack': { kind: 'prop', height: 2.4 },
  'prop-lantern-post': {
    kind: 'prop',
    height: 3.4,
    // The lantern hanging from the arm.
    lights: [{ at: [0.49, 2.3, 0], kind: 'lantern' }],
  },
  'prop-fence': { kind: 'prop', height: 1.2 },
  'prop-woodpile': { kind: 'prop', height: 1.3 },
  'rock-boulder-01': { kind: 'rock', height: 1.8 },
  'rock-boulder-02': { kind: 'rock', height: 1.4 },
  'rock-outcrop-01': { kind: 'rock', height: 3.5 },
  'rock-cluster-01': { kind: 'rock', height: 0.6 },
};

/** A measured model: its box in metres at the nominal height, the foot at y = 0. */
export interface PropMeasure {
  /** Width (x), height (y) and depth (z) in metres. */
  size: [number, number, number];
  /** The box's minimum corner in metres after scaling, before the foot is raised to 0. */
  min: [number, number, number];
  /** Scale from the GLB's own units to metres. */
  scale: number;
  triangles: number;
  /** Triangles of the far-detail copy, when one was made. */
  lodTriangles?: number;
  /**
   * A building's wall base: metres from its lowest point up to the first height at which it
   * spans most of its footprint both ways. Posts and steps below go into the ground, so the
   * walls stand on it (owner, 2026-10-18: the inn's walls hung 1.6 m up on its posts).
   */
  base?: number;
}

export type PropCatalogue = Record<string, PropMeasure>;

/** Tree models standing in for a forest class, in catalogue order. */
export function treesOfClass(cls: NonNullable<PropSpec['classes']>[number]): string[] {
  return Object.entries(PROPS)
    .filter(([, p]) => p.kind === 'tree' && p.classes?.includes(cls))
    .map(([id]) => id);
}

/** Deterministic pick among models for a placement, so a rebuild keeps the same forest
 * and the kernel knows which model the runtime draws for each tree. */
export function pickModel(ids: readonly string[], x: number, z: number): string {
  const h = Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453);
  return ids[Math.floor((h - Math.floor(h)) * ids.length)]!;
}
