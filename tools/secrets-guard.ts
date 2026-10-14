/**
 * Scan the working tree (or staged files, or the build output) for credentials.
 *
 *   npm run secrets:guard            tracked + untracked (not ignored) files
 *   npm run secrets:guard -- --staged   files staged for commit (pre-commit hook)
 *   npm run secrets:guard -- --dist     the above plus dist/ (CI, after build)
 *
 * Exit code 1 on any hit. Previews are redacted; the value is never printed.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { isScannable, scanText, type SecretHit } from './lib/secrets';

const args = new Set(process.argv.slice(2));
const staged = args.has('--staged');
const includeDist = args.has('--dist');

function git(...cmd: string[]): string[] {
  return execFileSync('git', cmd, { encoding: 'utf8' })
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

function listFiles(): string[] {
  if (staged) return git('diff', '--cached', '--name-only', '--diff-filter=ACMR');
  const files = git('ls-files', '-co', '--exclude-standard');
  if (includeDist && existsSync('dist')) {
    files.push(...git('ls-files', '-co', '--exclude-standard', '--ignored', 'dist'));
  }
  return files;
}

function readStaged(file: string): string | null {
  try {
    return execFileSync('git', ['show', `:${file}`], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch {
    return null;
  }
}

const MAX_BYTES = 8 * 1024 * 1024;
const hits: SecretHit[] = [];
let scanned = 0;

for (const file of listFiles()) {
  if (!isScannable(file)) continue;
  const path = join(process.cwd(), file);
  let text: string | null;
  if (staged) {
    text = readStaged(file);
  } else {
    if (!existsSync(path) || !statSync(path).isFile() || statSync(path).size > MAX_BYTES) continue;
    text = readFileSync(path, 'utf8');
  }
  if (text === null) continue;
  scanned += 1;
  hits.push(...scanText(file, text));
}

if (hits.length > 0) {
  console.error(`secrets-guard: ${hits.length} possible secret(s) in ${scanned} scanned file(s):`);
  for (const h of hits) console.error(`  ${h.file}:${h.line}  [${h.rule}]  ${h.preview}`);
  console.error(
    'Remove the value, load it from the environment, or mark a documented example with "secrets-guard:allow".',
  );
  process.exit(1);
}
console.info(
  `secrets-guard: clean (${scanned} files${staged ? ', staged' : ''}${includeDist ? ', incl. dist' : ''})`,
);
