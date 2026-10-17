/**
 * The valley (DESIGN.md 15): the first outdoor region. A river on a flat floor, forests on
 * the slopes, a serpentine road to a pass in the western ridge, a ravine to the east, snow on
 * the peaks. Built by `npm run level:build valley` through kernel/terrain.
 */
import type { TerrainSpec } from '../../kernel/terrain/build';

const spec: TerrainSpec = {
  seed: 7,
  width: 1600,
  cell: 5,
  chunkCells: 32,
  forest: { spacing: 6, density: 0.72, pineAbove: 110 },
};

export default spec;
