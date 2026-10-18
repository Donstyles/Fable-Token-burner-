# Held for the owner

Work that is ready but waits on an owner's decision. Each patch applies with
`git am docs/held/<file>` on the development branch.

- `0001-mm6-stat-table.patch` (2026-10-18): MM6's statistic effect table
  (MM6-GAPS.md 3): 13 to 14 gives 0, 15 +1, 17 +2 ... 30 +6, 35 +7, where
  ours is one step high from 4 to 399 (the sheet shows Might 32 as +7; MM6
  +6). It updates the src/game tests; two assertions in src/ui still encode
  the old table and fail until changed: `src/ui/creation-model.test.ts`
  (Might 17: 2) and `src/ui/sheet-model.test.ts` (Might 32: 6). The session
  that wrote it was not allowed to change those two tests, so it waits for
  you.
