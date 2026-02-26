// Centralized React Query key factory.
// All hooks — existing and new — should derive their query keys from this object.
// Existing hooks (useAssets, useIncomes, etc.) use inline arrays but do NOT need to be
// migrated now. New hooks in Phase 3+ use this factory from day one.

export const queryKeys = {
  userSettings: (userId: string) => ['userSettings', userId] as const,
  assets:       (userId: string) => ['assets',       userId] as const,
  incomes:      (userId: string) => ['incomes',      userId] as const,
  expenses:     (userId: string) => ['expenses',     userId] as const,
  debts:        (userId: string) => ['debts',        userId] as const,
  // Advanced mode — used by hooks created in Phase 3+
  clients:      (userId: string) => ['clients',      userId] as const,
  invoices:     (userId: string) => ['invoices',     userId] as const,
} as const;
