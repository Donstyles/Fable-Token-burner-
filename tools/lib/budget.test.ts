import { describe, expect, it } from 'vitest';
import { remaining, spentTotal, type Budget } from './budget';

describe('credit grant', () => {
  it('counts what batches spent against the grant', () => {
    const b: Budget = {
      granted: 900,
      grantedOn: '2026-10-16',
      spent: [
        { batch: 3, credits: 50, date: '2026-10-16' },
        { batch: 4, credits: 15, date: '2026-10-16' },
      ],
    };
    expect(spentTotal(b)).toBe(65);
    expect(remaining(b)).toBe(835);
  });
});
