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
  /** Trees: trunk radius at the foot, metres, for the trunk collider. */
  trunk?: number;
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
}

/** The turn about the upright, in glTF's frame (the game's X is glTF's -X), that brings `front` to +Z. */
export function frontTurnDeg(front: PropSpec['front']): number {
  return front === '+x' ? 90 : front === '-x' ? -90 : front === '-z' ? 180 : 0;
}

export const PROPS: Record<string, PropSpec> = {
  'tree-spruce-01': { kind: 'tree', height: 22, trunk: 0.35, classes: ['spruce'] },
  'tree-spruce-02': { kind: 'tree', height: 26, trunk: 0.38, classes: ['spruce'] },
  'tree-spruce-03': { kind: 'tree', height: 20, trunk: 0.32, classes: ['spruce'] },
  'tree-fir-01': { kind: 'tree', height: 24, trunk: 0.4, classes: ['spruce', 'pine'] },
  'tree-pine-01': { kind: 'tree', height: 20, trunk: 0.36, classes: ['pine'] },
  'tree-pine-02': { kind: 'tree', height: 9, trunk: 0.22, classes: ['pine'] },
  'tree-larch-01': { kind: 'tree', height: 18, trunk: 0.3, classes: ['pine'] },
  'tree-oak-01': { kind: 'tree', height: 16, trunk: 0.45, classes: ['oak'] },
  'tree-oak-02': { kind: 'tree', height: 14, trunk: 0.42, classes: ['oak'] },
  'tree-beech-01': { kind: 'tree', height: 18, trunk: 0.36, classes: ['broadleaf'] },
  'tree-birch-01': { kind: 'tree', height: 14, trunk: 0.22, classes: ['broadleaf'] },
  'tree-maple-01': { kind: 'tree', height: 13, trunk: 0.3, classes: ['broadleaf'] },
  'tree-linden-01': { kind: 'tree', height: 15, trunk: 0.34, classes: ['broadleaf'] },
  'tree-willow-01': { kind: 'tree', height: 10, trunk: 0.4, classes: ['broadleaf'] },
  'tree-dead-01': { kind: 'tree', height: 9, trunk: 0.3 },
  'tree-dead-02': { kind: 'tree', height: 7, trunk: 0.28 },
  'tree-palm-01': { kind: 'tree', height: 9, trunk: 0.25, classes: ['palm'] },
  'tree-palm-02': { kind: 'tree', height: 7, trunk: 0.22, classes: ['palm'] },
  'bush-01': { kind: 'bush', height: 1.4 },
  'bush-02': { kind: 'bush', height: 1.8 },
  'building-inn': {
    kind: 'building',
    height: 10.5,
    door: { x: -0.2, width: 1.3, height: 2.3 },
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
  },
  'building-smithy': {
    kind: 'building',
    height: 6,
    door: { x: 0.33, width: 3.1, height: 2.3 },
    // The coals painted under the lean-to on its left.
    lights: [{ at: [-1.15, 1, 1.08], kind: 'forge' }],
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
  },
  'building-cottage-02': {
    kind: 'building',
    height: 5.5,
    front: '-z',
    door: { x: -1, width: 1.05, height: 2 },
  },
  'building-cottage-03': {
    kind: 'building',
    height: 8.5,
    front: '-x',
    door: { x: -0.14, width: 0.7, height: 1.8 },
  },
  'building-farmhouse': {
    kind: 'building',
    height: 9.5,
    door: { x: -0.1, width: 1.3, height: 2.1 },
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
