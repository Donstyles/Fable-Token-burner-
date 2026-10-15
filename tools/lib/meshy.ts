/**
 * Meshy client (DESIGN.md 10.0, PLAN.md Phase 4 step 3): a thin wrapper around the official
 * `@meshy-ai/cli`, which already handles submission, polling, downloads and a local journal.
 *
 * The API key never enters this environment. It is a network secret of the cloud environment:
 * the outbound proxy injects the Authorization header into requests to api.meshy.ai, so the
 * CLI runs with a placeholder key and Node's fetch is routed through the proxy
 * (`NODE_USE_ENV_PROXY=1`, proxy CA bundle). Nothing here prints the environment.
 *
 * Every create carries an `--operation-id`; the CLI replays a repeated id from its journal
 * instead of billing again. The batch file is the durable record of task ids (the journal
 * lives in the ephemeral container), so `asset run` resumes from it.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export type MeshyResource = 'image-to-3d' | 'rigging' | 'animate';
export type DownloadKind = 'model' | 'rig' | 'animation' | 'texture' | 'thumbnail';

/** The CLI's `--output-schema v1` envelope: exactly one JSON object on stdout. */
export interface Envelope {
  schema_version: string;
  command: string;
  ok: boolean;
  result: Record<string, unknown> | null;
  error: {
    code?: string;
    message?: string;
    recovery?: { command?: string };
  } | null;
  warnings: unknown[];
}

export interface TaskOutcome {
  taskId: string;
  /** Server task state (PENDING, IN_PROGRESS, SUCCEEDED, FAILED, …) or DRY_RUN. */
  status: string;
  /** Credits the server reported for this task; null when it did not say. */
  consumedCredits: number | null;
  faceCount: number | null;
}

export const TERMINAL_STATES: ReadonlySet<string> = new Set([
  'SUCCEEDED',
  'FAILED',
  'CANCELED',
  'CANCELLED',
  'EXPIRED',
  'DRY_RUN',
]);

/** CLI exit codes we act on (the rest are plain failures). */
export const EXIT_TIMED_OUT = 8;
export const EXIT_SUBMISSION_UNKNOWN = 10;

export class MeshyError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly exitCode: number,
    readonly taskId: string | null,
    readonly recovery: string | null = null,
  ) {
    super(message);
    this.name = 'MeshyError';
  }
}

export const CA_BUNDLE = '/root/.ccr/ca-bundle.crt';
/** Stands in for the key the proxy injects; a real `MESHY_API_KEY` in the environment wins. */
export const PLACEHOLDER_KEY = 'proxy-injected';

export function meshyEnv(base: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...base, NODE_NO_WARNINGS: '1' };
  if (env['HTTPS_PROXY'] || env['https_proxy']) env['NODE_USE_ENV_PROXY'] ??= '1';
  if (!env['NODE_EXTRA_CA_CERTS'] && existsSync(CA_BUNDLE)) env['NODE_EXTRA_CA_CERTS'] = CA_BUNDLE;
  if (!env['MESHY_API_KEY']) env['MESHY_API_KEY'] = PLACEHOLDER_KEY;
  return env;
}

export function meshyBin(cwd = process.cwd()): string {
  return join(cwd, 'node_modules', '.bin', 'meshy');
}

export interface RunResult {
  envelope: Envelope;
  exitCode: number;
}

/**
 * Run one CLI command and parse its v1 envelope. Progress lines go to our stderr; the
 * command line is echoed (it never contains a secret: the key lives in the environment).
 */
export function runMeshy(args: string[], opts: { quiet?: boolean } = {}): Promise<RunResult> {
  const full = [...args, '--format', 'json', '--output-schema', 'v1'];
  return new Promise((resolve, reject) => {
    const child = spawn(meshyBin(), full, {
      env: meshyEnv(),
      stdio: ['ignore', 'pipe', opts.quiet ? 'ignore' : 'inherit'],
    });
    let out = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => (out += chunk));
    child.on('error', reject);
    child.on('close', (code) => {
      const exitCode = code ?? -1;
      try {
        resolve({ envelope: JSON.parse(out) as Envelope, exitCode });
      } catch {
        reject(
          new MeshyError(
            `meshy ${args.slice(0, 2).join(' ')}: no JSON envelope on stdout (exit ${exitCode})`,
            'no_output',
            exitCode,
            null,
          ),
        );
      }
    });
  });
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v ? v : null;
}

function record(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

/** Task id from any shape the envelope may carry it in (`result.task_id`, `result.submission`). */
export function taskIdOf(envelope: Envelope): string | null {
  const r = envelope.result ?? {};
  return (
    str(r['task_id']) ??
    str(record(r['submission'])?.['task_id']) ??
    str(record(r['task'])?.['task_id']) ??
    null
  );
}

export function outcomeOf(envelope: Envelope): TaskOutcome {
  const r = envelope.result ?? {};
  const task = record(r['task']) ?? r;
  const taskId = taskIdOf(envelope);
  if (!taskId) throw new MeshyError('envelope carries no task id', 'no_task_id', 0, null);
  return {
    taskId,
    status: str(task['status']) ?? 'PENDING',
    consumedCredits: num(task['consumed_credits']),
    faceCount: num(task['face_count']),
  };
}

function failure(res: RunResult, what: string): MeshyError {
  const { envelope, exitCode } = res;
  const code = envelope.error?.code ?? `exit_${exitCode}`;
  const message = envelope.error?.message ?? 'unknown error';
  return new MeshyError(
    `${what}: ${code}: ${message}`,
    code,
    exitCode,
    taskIdOf(envelope),
    envelope.error?.recovery?.command ?? null,
  );
}

export interface MeshyClientOptions {
  /** Print the commands instead of running anything billable (`balance` still runs). */
  dryRun?: boolean;
  /** Seconds a create or wait may poll before the CLI returns with the task still running. */
  timeoutSeconds?: number;
  log?: (line: string) => void;
}

export class MeshyClient {
  readonly dryRun: boolean;
  private readonly timeoutSeconds: number;
  private readonly log: (line: string) => void;

  constructor(opts: MeshyClientOptions = {}) {
    this.dryRun = opts.dryRun ?? false;
    this.timeoutSeconds = opts.timeoutSeconds ?? 1800;
    this.log = opts.log ?? ((line) => console.info(line));
  }

  /** Free query. */
  async balance(): Promise<{ balance: number; monthly: number; permanent: number }> {
    const res = await runMeshy(['balance'], { quiet: true });
    if (!res.envelope.ok) throw failure(res, 'balance');
    const r = res.envelope.result ?? {};
    const balance = num(r['balance']);
    if (balance === null)
      throw new MeshyError('balance missing from envelope', 'no_balance', 0, null);
    return {
      balance,
      monthly: num(r['monthly_credits']) ?? 0,
      permanent: num(r['permanent_credits']) ?? 0,
    };
  }

  /**
   * Submit a task with exactly one POST and return its id at once, so the caller can record
   * it before polling with `wait`; a crash while waiting then loses nothing.
   */
  async create(
    resource: MeshyResource,
    flags: string[],
    operationId: string,
  ): Promise<TaskOutcome> {
    const args = [resource, 'create', ...flags, '--async', '--operation-id', operationId];
    this.log(`  meshy ${args.join(' ')}`);
    if (this.dryRun) {
      return {
        taskId: `dry-${resource}`,
        status: 'DRY_RUN',
        consumedCredits: null,
        faceCount: null,
      };
    }
    const res = await runMeshy(args);
    if (!res.envelope.ok) throw failure(res, `${resource} create`);
    const taskId = taskIdOf(res.envelope);
    if (!taskId) throw new MeshyError(`${resource} create: no task id`, 'no_task_id', 0, null);
    return { taskId, status: 'PENDING', consumedCredits: null, faceCount: null };
  }

  /** Poll an existing task until it is terminal or the timeout passes. */
  async wait(resource: MeshyResource, taskId: string): Promise<TaskOutcome> {
    const args = [resource, 'wait', taskId, '--timeout', String(this.timeoutSeconds)];
    this.log(`  meshy ${args.join(' ')}`);
    if (this.dryRun) return { taskId, status: 'DRY_RUN', consumedCredits: null, faceCount: null };
    const res = await runMeshy(args);
    if (!res.envelope.ok) {
      if (res.exitCode === EXIT_TIMED_OUT) {
        return { taskId, status: 'IN_PROGRESS', consumedCredits: null, faceCount: null };
      }
      throw failure(res, `${resource} wait ${taskId}`);
    }
    return outcomeOf(res.envelope);
  }

  /** Download every asset of one kind from a task into `outputDir`; returns the written paths. */
  async download(
    resource: MeshyResource,
    taskId: string,
    kind: DownloadKind,
    outputDir: string,
  ): Promise<string[]> {
    const args = [
      'download',
      '--resource',
      resource,
      '--task-id',
      taskId,
      '--kind',
      kind,
      '--output-dir',
      outputDir,
      '--overwrite',
    ];
    this.log(`  meshy ${args.join(' ')}`);
    if (this.dryRun) return [];
    const res = await runMeshy(args);
    const downloads = record(res.envelope.result?.['downloads']);
    const files = Array.isArray(downloads?.['files']) ? (downloads['files'] as unknown[]) : [];
    const written = files
      .map(record)
      .filter((f): f is Record<string, unknown> => f !== null && f['status'] === 'written')
      .map((f) => str(f['path']))
      .filter((p): p is string => p !== null);
    if (!res.envelope.ok || !written.length) {
      throw failure(res, `download ${resource} ${taskId} (${kind})`);
    }
    return written;
  }
}
