export type SummaryAccentVariant =
  | 'balance'
  | 'income'
  | 'expense'
  | 'debt'
  | 'asset';

export type IncomeStatusBadge = 'received' | 'expected';
export type ExpenseDebtStatusBadge = 'paid' | 'pending';
export type InvoiceDisplayStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
export type AssetWarningBadge = 'stale';

interface SummaryAccentClassSet {
  container: string;
  value: string;
}

interface BadgeClassSet {
  container: string;
  text: string;
}

export const summaryAccentClasses: Record<SummaryAccentVariant, SummaryAccentClassSet> = {
  balance: {
    container: 'border-l-4 border-balance-500 bg-balance-50 dark:bg-balance-950',
    value: 'text-balance-700 dark:text-balance-300',
  },
  income: {
    container: 'border-l-4 border-income-500 bg-income-50 dark:bg-income-950',
    value: 'text-income-700 dark:text-income-300',
  },
  expense: {
    container: 'border-l-4 border-expense-500 bg-expense-50 dark:bg-expense-950',
    value: 'text-expense-700 dark:text-expense-300',
  },
  debt: {
    container: 'border-l-4 border-debt-500 bg-debt-50 dark:bg-debt-950',
    value: 'text-debt-700 dark:text-debt-300',
  },
  asset: {
    container: 'border-l-4 border-asset-500 bg-asset-50 dark:bg-asset-950',
    value: 'text-asset-700 dark:text-asset-300',
  },
};

export const incomeStatusBadgeClasses: Record<IncomeStatusBadge, BadgeClassSet> = {
  received: {
    container: 'bg-income-100 dark:bg-income-900',
    text: 'text-income-700 dark:text-income-300',
  },
  expected: {
    container: 'bg-debt-100 dark:bg-debt-900',
    text: 'text-debt-700 dark:text-debt-300',
  },
};

export const expenseDebtStatusBadgeClasses: Record<ExpenseDebtStatusBadge, BadgeClassSet> = {
  paid: {
    container: 'bg-income-100 dark:bg-income-900',
    text: 'text-income-700 dark:text-income-300',
  },
  pending: {
    container: 'bg-debt-100 dark:bg-debt-900',
    text: 'text-debt-700 dark:text-debt-300',
  },
};

export const invoiceStatusBadgeClasses: Record<InvoiceDisplayStatus, BadgeClassSet> = {
  draft: {
    container: 'bg-secondary-100 dark:bg-secondary-700',
    text: 'text-secondary-700 dark:text-secondary-300',
  },
  sent: {
    container: 'bg-balance-100 dark:bg-balance-900',
    text: 'text-balance-700 dark:text-balance-300',
  },
  paid: {
    container: 'bg-income-100 dark:bg-income-900',
    text: 'text-income-700 dark:text-income-300',
  },
  overdue: {
    container: 'bg-expense-100 dark:bg-expense-900',
    text: 'text-expense-700 dark:text-expense-300',
  },
  cancelled: {
    container: 'bg-secondary-100 dark:bg-secondary-700',
    text: 'text-secondary-700 dark:text-secondary-300',
  },
};

export const assetWarningBadgeClasses: Record<AssetWarningBadge, BadgeClassSet> = {
  stale: {
    container: 'bg-debt-100 dark:bg-debt-900',
    text: 'text-debt-700 dark:text-debt-300',
  },
};

export const semanticStatusDefaults = {
  received: 'income',
  paid: 'income',
  expected: 'debt',
  pending: 'debt',
  sent: 'balance',
  overdue: 'expense',
  draft: 'secondary',
  cancelled: 'secondary',
} as const;
