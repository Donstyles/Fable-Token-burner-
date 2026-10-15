/**
 * JSON files the tools write (batches, manifests) are committed, and the pre-commit hook runs
 * Prettier on them, so they are written in Prettier's layout to begin with.
 */
import { writeFile } from 'node:fs/promises';
import { format, resolveConfig } from 'prettier';

export async function formatJson(value: unknown, path: string): Promise<string> {
  const config = (await resolveConfig(path)) ?? {};
  return format(JSON.stringify(value, null, 2), { ...config, parser: 'json', filepath: path });
}

export async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await writeFile(path, await formatJson(value, path));
}
