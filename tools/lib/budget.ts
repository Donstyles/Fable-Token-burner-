/**
 * Meshy credit budget (DESIGN.md 5.1): the owner grants a number of credits that batches may
 * spend without a per-batch approval; `asset run` refuses a batch whose estimate would take
 * the total past the grant. Spending is recorded from each run's reported cost.
 */
import { readFile } from 'node:fs/promises';
import { writeJsonFile } from './json';

export const BUDGET_PATH = 'pipeline/budget.json';

export interface Spend {
  batch: number;
  credits: number;
  date: string;
}

/**
 * A grant for one purpose (owner, 2026-10-17: "100 meshy credits to dial in the art style of
 * the spell icons"): only batches that name it in `grant` spend it, and they spend nothing
 * else.
 */
export interface Grant {
  purpose: string;
  granted: number;
  grantedOn: string;
  note?: string;
  spent: Spend[];
}

export interface Budget {
  /** Credits the owner allowed without further approval, and when. */
  granted: number;
  grantedOn: string;
  note?: string;
  /** Credits spent against the grant, per batch. */
  spent: Spend[];
  /** Grants for a named purpose, apart from the general one. */
  grants?: Grant[];
}

export async function readBudget(path = BUDGET_PATH): Promise<Budget | null> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as Budget;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw e;
  }
}

export function spentTotal(budget: { spent: Spend[] }): number {
  return budget.spent.reduce((sum, s) => sum + s.credits, 0);
}

export function remaining(budget: Budget): number {
  return budget.granted - spentTotal(budget);
}

export function grantOf(budget: Budget, purpose: string): Grant | null {
  return budget.grants?.find((g) => g.purpose === purpose) ?? null;
}

/** Credits left for a batch: its purpose's grant when it names one (none if unknown), else the general grant. */
export function remainingFor(budget: Budget, purpose?: string): number {
  if (!purpose) return remaining(budget);
  const grant = grantOf(budget, purpose);
  return grant ? grant.granted - spentTotal(grant) : 0;
}

export async function recordSpend(
  budget: Budget,
  batch: number,
  credits: number,
  path = BUDGET_PATH,
  purpose?: string,
): Promise<void> {
  const ledger = purpose ? grantOf(budget, purpose)?.spent : budget.spent;
  if (!ledger) throw new Error(`no grant for ${purpose}`);
  const existing = ledger.find((s) => s.batch === batch);
  if (existing) existing.credits = credits;
  else ledger.push({ batch, credits, date: new Date().toISOString().slice(0, 10) });
  await writeJsonFile(path, budget);
}
