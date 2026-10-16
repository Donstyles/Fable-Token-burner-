import type { TerrainSpec } from '../../kernel/terrain/build';

/** The desert beyond the pass (DESIGN.md 15.5): 1.6 km of dunes, mesas and an oasis. */
const desert: TerrainSpec = { region: 'desert', seed: 11, width: 1600, cell: 5, chunkCells: 32 };

export default desert;
