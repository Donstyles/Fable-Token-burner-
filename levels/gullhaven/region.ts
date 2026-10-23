/**
 * Gullhaven (docs/ROADMAP.md: the starting region, hand-designed on the 640 m grid). A harbour
 * town on the north shore of a bay: the square with its well between the inn and the trader,
 * the stables and the smithy at the east end of the street, the temple on its knoll to the
 * west. The north road climbs past the farm to the wayside shrine at the crossroads and on to
 * the goblin hills, where a cave leads down into the old halls. The coast road runs west,
 * bandits on it, toward the next region; a track goes east to the ruin on the headland, where
 * the dead keep watch and a new party should not go yet. Hills close the land to the north and
 * west; the sea lies south and east to the horizon.
 *
 * Kernel space: x east, z north, metres from the map's centre; the map spans ±320 m.
 */
import type { RegionScript } from '../../kernel/terrain/region';
import type { P2 } from '../../kernel/terrain/spline';

/** The town square's centre: the street runs east and west through it. */
const SQUARE: P2 = [0, -120];
const CROSSROADS: P2 = [0, 20];
const CAVE: P2 = [112, 132];

const region: RegionScript = {
  id: 'gullhaven',
  seed: 11,
  width: 640,
  cell: 5,
  chunkCells: 16,
  base: 6,
  ripple: 1.5,
  sea: {
    level: 0,
    floor: -8,
    shore: 22,
    // The land, anticlockwise from the north-west, its corners beyond the map's edge.
    coast: [
      [-420, 420],
      [-420, -225],
      [-300, -218],
      [-230, -205],
      [-170, -190],
      [-115, -172],
      [-60, -168],
      [0, -170],
      [60, -172],
      [115, -160],
      [165, -128],
      [212, -82],
      [252, -28],
      [284, 36],
      [304, 96],
      [350, 120],
      [420, 130],
      [420, 420],
    ],
  },
  hills: [
    // The goblin hills, the cave in their south-western flank.
    { at: [158, 172], radius: 95, height: 34, stretch: [1.2, 0.9] },
    { at: [210, 215], radius: 70, height: 22 },
    // The headland and its ruin.
    { at: [232, 48], radius: 70, height: 22 },
    // The temple's knoll west of the square.
    { at: [-95, -88], radius: 32, height: 6 },
    // A long swell east of the north road, and the western downs.
    { at: [70, 30], radius: 120, height: 9, stretch: [1.4, 1] },
    { at: [-170, 40], radius: 110, height: 14 },
  ],
  ridges: [
    // The northern hills close the land; the western ridge stands over the coast road.
    {
      path: [
        [-330, 268],
        [-180, 292],
        [-40, 262],
        [90, 288],
        [240, 272],
        [330, 250],
      ],
      width: 95,
      height: 46,
    },
    {
      path: [
        [-300, -70],
        [-292, 60],
        [-302, 200],
      ],
      width: 70,
      height: 34,
    },
  ],
  flats: [
    // The town floor, above the beach.
    { at: [0, -114], halfA: 92, halfB: 34, heading: 0, y: 5, soft: 12 },
    // The farmyard.
    { at: [12, -38], halfA: 40, halfB: 24, heading: 0, y: 7.5, soft: 14 },
  ],
  roads: [
    {
      name: 'street',
      path: [[-110, -124], [-40, -121], SQUARE, [45, -121], [110, -126]],
      width: 9,
    },
    {
      name: 'north-road',
      path: [SQUARE, [4, -70], [0, -20], CROSSROADS, [24, 70], [70, 110], [98, 124]],
      width: 7,
    },
    {
      name: 'coast-road',
      path: [
        [-110, -124],
        [-160, -140],
        [-215, -160],
        [-265, -170],
        [-305, -172],
      ],
      width: 7,
    },
    { name: 'headland-track', path: [CROSSROADS, [80, 8], [160, 12], [214, 40]], width: 5 },
  ],
  squares: [
    { at: SQUARE, halfA: 20, halfB: 13, heading: 0 },
    // The waterfront below the square.
    { at: [10, -152], halfA: 48, halfB: 5, heading: 0 },
  ],
  lanes: [
    // Up the temple's knoll; to the stables' yard.
    { from: [-78, -121], to: [-90, -100], halfWidth: 2.2 },
    { from: [60, -125], to: [60, -134], halfWidth: 2.5 },
  ],
  forests: [
    {
      // The northern woods along the hills.
      area: [
        [-300, 130],
        [-120, 160],
        [-30, 200],
        [60, 236],
        [300, 230],
        [300, 305],
        [-305, 305],
      ],
      spacing: 7,
      density: 0.6,
      kinds: ['pine', 'spruce', 'broadleaf'],
    },
    {
      // The western woods over the coast road.
      area: [
        [-300, -110],
        [-200, -112],
        [-130, -70],
        [-110, 60],
        [-200, 120],
        [-300, 120],
      ],
      spacing: 8,
      density: 0.5,
      kinds: ['broadleaf', 'oak', 'pine'],
    },
    {
      // Scrub on the goblin hills.
      area: [
        [120, 175],
        [170, 225],
        [260, 230],
        [255, 150],
        [205, 120],
        [150, 140],
      ],
      spacing: 9,
      density: 0.45,
      kinds: ['spruce', 'pine', 'broadleaf'],
    },
    {
      // Trees standing alone and in twos over the meadows, as MM6's open country.
      area: [
        [-280, -100],
        [200, -100],
        [240, 60],
        [260, 200],
        [-280, 200],
      ],
      spacing: 14,
      density: 0.12,
      kinds: ['oak', 'broadleaf', 'broadleaf', 'pine'],
    },
    {
      // A copse below the headland.
      area: [
        [175, 70],
        [215, 92],
        [232, 80],
        [205, 55],
      ],
      spacing: 8,
      density: 0.6,
      kinds: ['oak', 'broadleaf'],
    },
  ],
  plots: [
    // The square: the inn on its north side, the trader across, the well in the middle.
    { model: 'building-inn', at: [-14, -97], face: [-14, -120] },
    { model: 'building-store', at: [18, -143], face: [18, -120] },
    { model: 'prop-well', at: [2, -116], face: [2, -140], light: true },
    { model: 'prop-market-stall', at: [-14, -131], face: [-14, -120], light: true },
    { model: 'prop-lantern-post', at: [14, -108], face: [14, -120], light: true },
    { model: 'prop-lantern-post', at: [-10, -133.5], face: [-10, -120], light: true },
    // East along the street: cottages, the stables by the yard, the smithy at the end.
    { model: 'building-cottage-01', at: [32, -104], face: [32, -121] },
    { model: 'building-cottage-03', at: [38, -140], face: [38, -121] },
    { model: 'building-stables', at: [64, -145], face: [64, -124] },
    { model: 'building-smithy', at: [86, -106], face: [86, -124] },
    { model: 'prop-woodpile', at: [96, -114], face: [96, -124], light: true },
    { model: 'prop-cart', at: [76, -133], face: [96, -133], light: true },
    // West along the street: cottages, the temple up its knoll.
    { model: 'building-cottage-02', at: [-46, -106], face: [-46, -121] },
    { model: 'building-cottage-01', at: [-44, -139], face: [-44, -121] },
    { model: 'prop-woodpile', at: [-36, -134], face: [-36, -121], light: true },
    { model: 'building-temple', at: [-95, -88], face: [-80, -121] },
    // The waterfront: a cart and a woodpile by the beach.
    { model: 'prop-cart', at: [-18, -153], face: [10, -153], light: true },
    { model: 'prop-woodpile', at: [30, -154], face: [30, -140], light: true },
    // The farm on the north road: the house, the barn across, haystacks, the fenced yard.
    { model: 'building-farmhouse', at: [-22, -40], face: [2, -40] },
    { model: 'building-barn', at: [30, -28], face: [3, -28] },
    { model: 'prop-haystack', at: [40, -50], face: [3, -50], light: true },
    { model: 'prop-haystack', at: [46, -44], face: [3, -44], light: true },
    { model: 'prop-cart', at: [16, -56], face: [16, -30], light: true },
    // The wayside shrine at the crossroads.
    { model: 'prop-shrine', at: [-8, 26], face: CROSSROADS, light: true },
  ],
  cave: { at: CAVE, facing: 225, target: { level: 'showcase', entry: 'exit' } },
  // The farm's yard, split rails the kernel builds (owner, 2026-10-23: the fence model never
  // looked like a fence).
  fences: [
    [
      [22, -60],
      [52, -60],
      [52, -38],
    ],
  ],
  residents: [
    // Maren by the well; Old Tobin at his farm gate.
    { kind: 'villager-woman', at: [6, -112], face: [6, -135] },
    { kind: 'villager-man', at: [-2, -44], face: [10, -44] },
  ],
  packs: [
    // Goblins about the cave and down the slope toward the road.
    { kind: 'goblin-scout', at: [94, 112], count: 3, spread: 6 },
    { kind: 'goblin-scout', at: [48, 88], count: 2, spread: 4 },
    { kind: 'goblin-scout', at: [-150, 55], count: 2, spread: 5 },
    // Bandits on the coast road.
    { kind: 'bandit', at: [-205, -152], count: 3, spread: 6 },
    { kind: 'bandit', at: [-275, -166], count: 2, spread: 5 },
    // The headland's dead: far too many for a new party.
    { kind: 'skeleton-warrior', at: [232, 50], count: 6, spread: 8 },
  ],
  points: [
    { name: 'square', at: SQUARE },
    { name: 'waterfront', at: [0, -152] },
    { name: 'crossroads', at: CROSSROADS },
    { name: 'goblin-hills', at: [96, 118] },
    { name: 'headland', at: [228, 46] },
    { name: 'road-west', at: [-295, -172] },
  ],
  // The party wakes at the foot of the square looking up at Maren by the well: the store at
  // the right, the inn ahead (the audit, 2026-10-23: from the waterfront she stood 38 m off,
  // eight pixels tall).
  start: { at: [0, -134], face: [6, -112] },
  environment: {
    lightColor: [0.9, 0.84, 0.74],
    ambientColor: [0.42, 0.42, 0.46],
    fogColor: [0.2, 0.31, 0.56],
    fogDensity: 0.0006,
    skyZenith: [0.14, 0.25, 0.52],
    skyHorizon: [0.2, 0.31, 0.56],
    cloudAmount: 0.45,
  },
  textures: { base: 'grass', path: 'path', scree: 'scree', snow: 'sand' },
};

export default region;
