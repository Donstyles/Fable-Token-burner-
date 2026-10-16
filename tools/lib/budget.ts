/**
 * Meshy credit budget (DESIGN.md 5.1): the owner grants a number of credits that batches may
 * spend without a per-batch approval; `asset run` refuses a batch whose estimate would take
 * the total past the grant. Spending is recorded from each run's reported cost.
 */
import { readFile } from 'node:fs/promises';
import { writeJsonFile } from './json';

export const BUDGET_PATH = 'pipeline/budget.json';

export interface Budget {
  /** Credits the owner allowed without further approval, and when. */
  granted: number;
  grantedOn: string;
  note?: string;
  /** Credits spent against the grant, per batch. */
  spent: { batch: number; credits: number; date: string }[];
}

export async function readBudget(path = BUDGET_PATH): Promise<Budget | null> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as Budget;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw e;
  }
}

export function spentTotal(budget: Budget): number {
  return budget.spent.reduce((sum, s) => sum + s.credits, 0);
}

export function remaining(budget: Budget): number {
  return budget.granted - spentTotal(budget);
}

export async function recordSpend(
  budget: Budget,
  batch: number,
  credits: number,
  path = BUDGET_PATH,
): Promise<void> {
  const existing = budget.spent.find((s) => s.batch === batch);
  if (existing) existing.credits = credits;
  else budget.spent.push({ batch, credits, date: new Date().toISOString().slice(0, 10) });
  await writeJsonFile(path, budget);
}
