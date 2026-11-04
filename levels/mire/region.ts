/**
 * The Mire (docs/CAMPAIGN.md step 8; DESIGN.md 17.25): the fen north of Harrowmere's downs,
 * our own world's [haunted-marsh], two days through the reeds from the pass. An estuary opens
 * east to the sea and reaches into the land as the mere; the fen lies low about it, cut by
 * causeways that stand a stride above the wet. Fenwick, the village, sits on the one dry rise
 * at the mere's west shore: a street of houses on stilts in all but name, the Reed and Lantern
 * inn, the Hall of the Fen, the Guild of Spirit, the chandler's, the smith's and the temple at
 * the street's head. North-west on a rise the ruined abbey, its outcrops where the walls stood,
 * the cult's cave into its crypt; north-east on the fen's one knoll the reavers' holt; on the
 * mere's north shore the knoll with the cave down to the Sunken Hall, the third door. Reeds and
 * willows everywhere the ground is wet; the lantern road runs out along the causeway to the
 * ferry's far light.
 *
 * Drawn as a map: x east, z north, metres from the map's centre, the map ±320 m; headings a
 * compass's (kernel/terrain/region.ts `fromMap`).
 */
import type { Plot } from '../../kernel/terrain/plots';
import type { RegionScript } from '../../kernel/terrain/region';
import type { P2 } from '../../kernel/terrain/spline';
import { along, prop, ring, row as rowAlong, type RowItem } from '../lib/plots';

/** The village street runs east and west along the rise; the square at its middle. */
const SQUARE: P2 = [-60, -40];
const STREET = -40;
const ABBEY: P2 = [-160, 110];
const HOLT: P2 = [150, 150];
const SUNKEN: P2 = [80, 60];
const FAR_LIGHT: P2 = [210, -140];
const SOUTH_PASS: P2 = [-100, -306];

/** A row of houses along the street (levels/lib/plots.ts). */
const row = (front: number, x: number, dir: 1 | -1, items: RowItem[]): Plot[] =>
  rowAlong(STREET, front, x, dir, items);

const village: Plot[] = [
  // The square: the Reed and Lantern on its north side with the Hall of the Fen at one shoulder
  // and the Guild of Spirit at the other, the chandler's across; the well, a stall, lanterns.
  { model: 'building-inn', at: [-64, -26], face: [-64, STREET], name: 'fen-inn' },
  { model: 'building-cottage-03', at: [-73.6, -26], face: [-73.6, STREET], name: 'fen-hall' },
  { model: 'building-cottage-02', at: [-55.4, -26.9], face: [-55.4, STREET], name: 'fen-guild' },
  { model: 'building-store', at: [-66, -57.6], face: [-66, STREET], name: 'fen-chandler' },
  prop('prop-well', [-60, -36], [-60, -60]),
  prop('prop-market-stall', [-70, -47.5], [-70, -34]),
  prop('prop-cart', [-51, -46], [-64, -46]),
  prop('prop-lantern-post', [-72.6, -32.6], SQUARE),
  prop('prop-lantern-post', [-47.4, -47.6], SQUARE),
  prop('prop-lantern-post', [-72.6, -47.6], SQUARE),
  prop('prop-woodpile', [-49.5, -25.5], [-49.5, STREET]),
  // The street west: the north row to the smith's at the street's end, the south row short.
  ...row(-35, -78, -1, [
    'building-cottage-01',
    2.5,
    { model: 'building-cottage-03', name: 'house' },
    2,
    'building-cottage-02',
    3,
    { model: 'building-smithy', name: 'fen-smith' },
  ]),
  ...row(-45, -76, -1, [
    'building-cottage-02',
    2,
    { model: 'building-cottage-03', name: 'house' },
    2.5,
    'building-cottage-01',
    2,
    { model: 'building-cottage-03', name: 'house' },
  ]),
  // The street east: toward the mere; the temple at the street's head on the rise's end.
  ...row(-35, -41, 1, [
    { model: 'building-cottage-03', name: 'house' },
    2,
    'building-cottage-01',
    2.5,
    'building-cottage-02',
    2,
    { model: 'building-cottage-03', name: 'house' },
  ]),
  ...row(-45, -39, 1, [
    'building-cottage-01',
    2,
    { model: 'building-cottage-03', name: 'house' },
    2,
    'building-cottage-02',
    3,
    'building-cottage-01',
  ]),
  { model: 'building-temple', at: [6, -44], face: [-20, -40], name: 'fen-temple' },
  prop('prop-shrine', [-2, -36], [-20, -40]),
  // The smith's yard, wood and hay against the back walls, carts, hedges of reed-willow.
  prop('prop-woodpile', [-112, -31], [-112, STREET]),
  prop('prop-woodpile', [-110, -28], [-110, STREET]),
  prop('prop-cart', [-106, -23], [-106, -12]),
  prop('prop-woodpile', [-82, -27.5], [-82, -18]),
  prop('prop-woodpile', [-40, -27.5], [-40, -18]),
  prop('prop-haystack', [-96, -54], [-96, STREET]),
  prop('prop-cart', [-90, -56], [-80, -56]),
  prop('prop-woodpile', [-54, -58], [-54, -72]),
  ...along('bush-01', [-100, -20], [-80, -20], 4.2, [-90, -32]),
  ...along('bush-01', [-36, -20], [-16, -20], 4.2, [-26, -32]),
  ...along('bush-02', [-100, -62], [-80, -64], 4.4, [-90, -52]),
  // The quay on the mere below the temple: stalls for the eels, the ferry's cart, lanterns.
  prop('prop-market-stall', [14, -60], [14, -48]),
  prop('prop-market-stall', [20, -60], [20, -48]),
  prop('prop-cart', [28, -58], [40, -58]),
  prop('prop-lantern-post', [10, -66], [10, -50]),
  prop('prop-lantern-post', [30, -66], [30, -50]),
  { model: 'building-cottage-02', at: [40, -50], face: [26, -52], name: 'hut' },
  prop('rock-boulder-02', [46, -64], [20, -56]),
];

const wilds: Plot[] = [
  // The ruined abbey: outcrops where the walls stood, a ring of fallen stones, the shrine.
  ...ring([ABBEY[0], ABBEY[1] - 6], 9, 6),
  prop('rock-outcrop-01', [ABBEY[0] - 16, ABBEY[1] + 2], ABBEY),
  prop('rock-outcrop-01', [ABBEY[0] + 16, ABBEY[1]], ABBEY),
  prop('rock-outcrop-01', [ABBEY[0] - 10, ABBEY[1] - 18], ABBEY),
  prop('prop-shrine', [-146, 96], ABBEY),
  prop('prop-cart', [-140, 92], ABBEY),
  // The reavers' holt on the knoll: carts drawn up, hay, wood, a lookout's rock.
  prop('prop-cart', [140, 136], HOLT),
  prop('prop-cart', [160, 138], HOLT),
  prop('prop-haystack', [146, 146], HOLT),
  prop('prop-woodpile', [154, 142], HOLT),
  prop('prop-market-stall', [138, 146], HOLT),
  prop('rock-outcrop-01', [166, 160], HOLT),
  prop('rock-boulder-01', [132, 156], HOLT),
  // The mere's north shore by the Sunken Hall's knoll: stones and a drowned cart.
  prop('rock-outcrop-01', [66, 52], SUNKEN),
  prop('rock-boulder-02', [92, 48], SUNKEN),
  prop('prop-cart', [72, 44], SUNKEN),
  // The far light at the causeway's end: the ferry's lantern, the ferryman's hut.
  prop('prop-lantern-post', FAR_LIGHT, [200, -130]),
  { model: 'building-cottage-01', at: [204, -150], face: [210, -140], name: 'hut' },
  prop('prop-cart', [198, -134], FAR_LIGHT),
  prop('rock-boulder-01', [216, -152], FAR_LIGHT),
  // The pass's foot: a wayside shrine's stones and a drover's cart left at the reeds' edge.
  prop('rock-outcrop-01', [-110, -270], SOUTH_PASS),
  prop('prop-cart', [-94, -262], SOUTH_PASS),
  // Stones along the fen's edges so nothing stands bare.
  prop('rock-outcrop-01', [-220, -60], SQUARE),
  prop('rock-boulder-01', [-200, 20], ABBEY),
  prop('rock-outcrop-01', [-30, 120], ABBEY),
  prop('rock-boulder-02', [40, 160], HOLT),
  prop('rock-outcrop-01', [120, -80], FAR_LIGHT),
  prop('rock-boulder-01', [-170, -180], SOUTH_PASS),
  prop('rock-outcrop-01', [-40, -200], SOUTH_PASS),
];

const region: RegionScript = {
  id: 'mire',
  seed: 41,
  width: 640,
  cell: 5,
  chunkCells: 16,
  base: 3,
  ripple: 1,
  sea: {
    level: 0,
    floor: -6,
    shore: 14,
    // The estuary opens east; the mere is its bight reaching into the fen.
    coast: [
      [-420, 420],
      [-420, -420],
      [420, -420],
      [420, -200],
      [240, -170],
      [170, -120],
      [120, -70],
      [40, -20],
      [30, 20],
      [60, 46],
      [110, 60],
      [180, 40],
      [260, 20],
      [420, 10],
      [420, 420],
    ],
  },
  hills: [
    // Fenwick's rise, the abbey's rise, the reavers' knoll, the Sunken Hall's knoll.
    { at: [-50, -40], radius: 80, height: 5 },
    { at: [ABBEY[0], ABBEY[1] + 25], radius: 50, height: 16 },
    { at: [HOLT[0], HOLT[1] + 24], radius: 46, height: 18 },
    { at: [93, 107], radius: 40, height: 14 },
    // The southern downs the pass comes over.
    { at: [-100, -250], radius: 70, height: 22 },
  ],
  ridges: [
    // The ridge the pass climbs, Harrowmere's northern ridge seen from its far side.
    {
      path: [
        [-330, -300],
        [-170, -312],
        [-30, -300],
        [120, -312],
        [330, -302],
      ],
      width: 70,
      height: 40,
    },
    // The western wall of the fen.
    {
      path: [
        [-266, -200],
        [-250, 0],
        [-262, 200],
      ],
      width: 60,
      height: 30,
    },
    // The north.
    {
      path: [
        [-330, 250],
        [-150, 262],
        [0, 250],
        [120, 262],
        [330, 250],
      ],
      width: 80,
      height: 42,
    },
  ],
  flats: [
    // The village on its rise, the abbey's court, the holt's top, the pass's foot.
    { at: SQUARE, halfA: 70, halfB: 28, heading: 0, y: 5.5, soft: 10 },
    { at: [ABBEY[0], ABBEY[1] - 5], halfA: 22, halfB: 14, heading: 0, y: 12, soft: 10 },
    { at: [HOLT[0], HOLT[1] - 4], halfA: 22, halfB: 12, heading: 0, y: 14, soft: 10 },
    { at: [-100, -258], halfA: 20, halfB: 20, heading: 0, y: 9, soft: 10 },
    { at: [204, -144], halfA: 16, halfB: 12, heading: 0, y: 4.5, soft: 8 },
    // The landing below the Sunken Hall's cave, level from the shore track to the mouth.
    { at: [72, 74], halfA: 14, halfB: 9, heading: 0, y: 4.5, soft: 8 },
  ],
  roads: [
    // The causeway from the pass to the village, and the street through it.
    {
      name: 'pass-road',
      path: [SOUTH_PASS, [-100, -250], [-96, -190], [-84, -120], [-70, -70], SQUARE],
      width: 6,
    },
    { name: 'street', path: [[-116, -40], SQUARE, [-10, -40], [20, -46]], width: 5 },
    // The lantern road: the causeway east along the shore to the ferry's far light.
    {
      name: 'lantern-road',
      path: [[20, -46], [60, -70], [110, -100], [160, -120], FAR_LIGHT],
      width: 5,
    },
    // The abbey track north-west; the shore track north to the Sunken Hall's knoll and on to
    // the reavers' holt.
    {
      name: 'abbey-track',
      path: [
        [-80, -40],
        [-100, 0],
        [-130, 50],
        [-150, 90],
      ],
      width: 4,
    },
    {
      name: 'shore-track',
      path: [
        [-10, -40],
        [-10, 0],
        [20, 40],
        [60, 70],
        [100, 110],
        [136, 134],
      ],
      width: 4,
    },
  ],
  squares: [
    { at: SQUARE, halfA: 14, halfB: 9, heading: 0 },
    { at: [18, -56], halfA: 18, halfB: 6, heading: 0 },
    { at: ABBEY, halfA: 12, halfB: 10, heading: 0 },
    { at: HOLT, halfA: 12, halfB: 9, heading: 0 },
    { at: [204, -144], halfA: 10, halfB: 7, heading: 0 },
  ],
  lanes: [
    // Onto the three caves' aprons.
    { from: [-150, 90], to: [-160, 121], halfWidth: 1.8 },
    { from: [136, 134], to: [150, 161], halfWidth: 2 },
    { from: [60, 70], to: [80, 85], halfWidth: 2 },
  ],
  forests: [
    {
      // The reed-beds south of the village, willows and alders by the water.
      area: [
        [-230, -200],
        [-120, -200],
        [-60, -150],
        [40, -120],
        [20, -70],
        [-110, -75],
        [-230, -80],
      ],
      spacing: 5,
      density: 0.75,
      kinds: ['broadleaf', 'palm'],
    },
    {
      // The fen north of the village between the abbey and the mere.
      area: [
        [-230, -60],
        [-110, -20],
        [-30, 10],
        [0, 90],
        [-60, 150],
        [-120, 170],
        [-230, 150],
      ],
      spacing: 5.5,
      density: 0.7,
      kinds: ['broadleaf', 'palm', 'oak'],
    },
    {
      // The reeds north and east of the mere up to the holt.
      area: [
        [0, 100],
        [60, 100],
        [120, 90],
        [200, 80],
        [240, 160],
        [200, 220],
        [20, 200],
      ],
      spacing: 5.5,
      density: 0.7,
      kinds: ['broadleaf', 'palm'],
    },
    {
      // Along the lantern road's landward side.
      area: [
        [40, -110],
        [130, -150],
        [200, -180],
        [240, -220],
        [60, -200],
      ],
      spacing: 5,
      density: 0.72,
      kinds: ['palm', 'broadleaf'],
    },
    {
      // Pines on the southern downs about the pass.
      area: [
        [-250, -290],
        [-40, -290],
        [-40, -210],
        [-250, -210],
      ],
      spacing: 6,
      density: 0.6,
      kinds: ['pine', 'spruce'],
    },
  ],
  clearings: [
    { at: ABBEY, radius: 28 },
    { at: HOLT, radius: 28 },
    { at: SUNKEN, radius: 22 },
    { at: [-100, -258], radius: 26 },
    { at: [204, -144], radius: 20 },
    { at: [-200, -150], radius: 10 },
  ],
  trees: [
    // The square's willow; the alders by the quay.
    { kind: 'broadleaf', at: [-72, -31.5], scale: 0.75 },
    { kind: 'broadleaf', at: [36, -62], scale: 0.8 },
    { kind: 'oak', at: [-130, -30], scale: 0.9 },
  ],
  plots: [...village, ...wilds],
  caves: [
    // The cult's cave into the abbey's crypt, the reavers' holt, the Sunken Hall under the mere.
    {
      name: 'abbey',
      at: [-160, 124],
      facing: 180,
      target: { level: 'drowned-abbey', entry: 'abbey-mouth' },
    },
    {
      name: 'holt',
      at: [150, 164],
      facing: 180,
      target: { level: 'reed-holt', entry: 'holt-mouth' },
    },
    {
      name: 'sunken',
      at: [80, 86],
      facing: 211,
      target: { level: 'sunken-hall', entry: 'sunken-mouth' },
    },
  ],
  // The third stone, on the fen's edge west of the pass road (docs/CAMPAIGN.md).
  obelisks: [{ name: 'obelisk', at: [-200, -150] }],
  exits: [
    // The pass south: two days to Harrowmere's barrows.
    {
      name: 'south-pass',
      at: SOUTH_PASS,
      facing: 180,
      target: { level: 'harrowmere', entry: 'north-pass' },
      days: 2,
    },
  ],
  fences: [
    [
      [-120, -62],
      [-104, -62],
      [-104, -50],
    ],
  ],
  residents: [
    // Reeve Aldith before the inn; Hob the ferryman at the quay; Mother Gefa by the well;
    // Brother Oddo at the abbey's gate; Pim the chandler before his shop.
    { kind: 'fen-reeve', at: [-68, -32], face: [-60, -36] },
    { kind: 'ferryman', at: [24, -54], face: [24, -64] },
    { kind: 'wisewoman', at: [-56, -38], face: [-60, -36] },
    { kind: 'brother', at: [-150, 94], face: [-160, 110] },
    { kind: 'chandler', at: [-72, -52], face: [-60, -36] },
  ],
  packs: [
    // Thugs on the pass road's causeway; reavers at the holt and on the shore track.
    { kind: 'thug', at: [-90, -160], count: 3, spread: 5 },
    { kind: 'thug', at: [-78, -100], count: 2, spread: 4 },
    { kind: 'reaver', at: [120, 120], count: 3, spread: 5 },
    { kind: 'reaver-archer', at: [146, 150], count: 2, spread: 4 },
    { kind: 'reaver', at: [152, 144], count: 2, spread: 4 },
    // Witches in the reeds north of the village; the drowned on the mere's shores.
    { kind: 'hedge-witch', at: [-120, 40], count: 2, spread: 5 },
    { kind: 'marsh-witch', at: [-60, 110], count: 1, spread: 0 },
    { kind: 'drowned', at: [40, 20], count: 3, spread: 6 },
    { kind: 'drowned', at: [96, 58], count: 2, spread: 4 },
    { kind: 'drowned-warrior', at: [70, 70], count: 1, spread: 0 },
    // Cultists at the abbey's gate.
    { kind: 'acolyte', at: [-150, 102], count: 2, spread: 4 },
    { kind: 'cultist', at: [-164, 100], count: 1, spread: 0 },
    // Reavers on the lantern road, where the ferryman's light draws them.
    { kind: 'reaver', at: [130, -110], count: 2, spread: 4 },
    { kind: 'bruiser', at: [180, -130], count: 1, spread: 0 },
  ],
  points: [
    { name: 'square', at: SQUARE },
    { name: 'quay', at: [18, -56] },
    { name: 'abbey-gate', at: [-150, 94] },
    { name: 'holt-foot', at: [136, 134] },
    { name: 'mere-shore', at: [60, 70] },
    { name: 'far-light', at: [206, -142] },
    { name: 'pass-foot', at: [-100, -250] },
    { name: 'well', at: [-60, -36] },
    { name: 'shrine', at: [-146, 96] },
  ],
  start: { at: [-60, -52], face: [-60, -36] },
  environment: {
    lightColor: [0.84, 0.86, 0.78],
    ambientColor: [0.4, 0.44, 0.42],
    fogColor: [0.4, 0.46, 0.44],
    fogDensity: 0.0014,
    skyZenith: [0.3, 0.38, 0.46],
    skyHorizon: [0.44, 0.5, 0.48],
    cloudAmount: 0.8,
  },
  textures: { base: 'grass', path: 'path', scree: 'rock', snow: 'sand' },
};

export default region;
