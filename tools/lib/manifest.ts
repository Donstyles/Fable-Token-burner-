/**
 * The asset manifest (DESIGN.md 10.9): every asset that enters the repo is recorded here
 * with where it came from, what it cost and which files it owns. Textures keep their own
 * manifest in assets/textures/ (written by `npm run textures`); `validate` reads both.
 */
import { readFile } from 'node:fs/promises';
import { writeJsonFile } from './json';

export const MANIFEST_PATH = 'assets/manifest.json';

export type AssetKind =
  'character' | 'prop' | 'building' | 'portrait' | 'icon' | 'image' | 'sound' | 'font';

export interface MeshyRecord {
  /** Task ids in pipeline order (image-to-3D, rigging, animation). */
  taskIds: string[];
  /** The request parameters that produced the asset, minus anything secret. */
  params: Record<string, unknown>;
  /** Credits reported by Meshy for every task of this asset. */
  consumedCredits: number;
}

export interface AssetEntry {
  id: string;
  kind: AssetKind;
  /** Where the input came from: the owner's ChatGPT image, Meshy, Poly Haven, Freesound… */
  source: string;
  /** The exact prompt used for a generated input, if any. */
  prompt?: string;
  meshy?: MeshyRecord;
  licence: string;
  /** Files under assets/, relative to the repo root. */
  files: string[];
  /** ISO date the asset was committed. */
  date: string;
  notes?: string;
}

export interface Manifest {
  assets: AssetEntry[];
}

export async function readManifest(path = MANIFEST_PATH): Promise<Manifest> {
  try {
    const parsed: unknown = JSON.parse(await readFile(path, 'utf8'));
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      Array.isArray((parsed as Manifest).assets)
    ) {
      return parsed as Manifest;
    }
    throw new Error(`${path}: expected { assets: [] }`);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return { assets: [] };
    throw e;
  }
}

export async function writeManifest(manifest: Manifest, path = MANIFEST_PATH): Promise<void> {
  manifest.assets.sort((a, b) => a.id.localeCompare(b.id));
  await writeJsonFile(path, manifest);
}

export function upsertAsset(manifest: Manifest, entry: AssetEntry): void {
  const i = manifest.assets.findIndex((a) => a.id === entry.id);
  if (i >= 0) manifest.assets[i] = entry;
  else manifest.assets.push(entry);
}

export const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidId(id: string): boolean {
  return ID_PATTERN.test(id);
}
