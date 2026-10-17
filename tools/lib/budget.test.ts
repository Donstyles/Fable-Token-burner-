import { describe, expect, it } from 'vitest';
import { grantOf, remaining, remainingFor, spentTotal, type Budget } from './budget';

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

describe('purpose grants', () => {
  const b: Budget = {
    granted: 900,
    grantedOn: '2026-10-16',
    spent: [{ batch: 3, credits: 853, date: '2026-10-17' }],
    grants: [
      {
        purpose: 'spell-icons',
        granted: 100,
        grantedOn: '2026-10-17',
        spent: [{ batch: 6, credits: 27, date: '2026-10-17' }],
      },
    ],
  };
  it('spends a named grant apart from the general one', () => {
    expect(remainingFor(b)).toBe(47);
    expect(remainingFor(b, 'spell-icons')).toBe(73);
  });
  it('gives nothing to a purpose the owner did not name', () => {
    expect(remainingFor(b, 'portraits')).toBe(0);
    expect(grantOf(b, 'portraits')).toBeNull();
  });
});
