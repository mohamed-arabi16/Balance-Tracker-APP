export interface NetWorthConfig {
  balance: boolean;
  expectedIncome: boolean;
  assets: boolean;
  debts: boolean;
}

export const parseNetWorthConfig = (configStr: string | null | undefined): NetWorthConfig => {
  if (!configStr) return { balance: true, expectedIncome: true, assets: true, debts: true };

  if (configStr === 'assets_minus_debts') {
    return { balance: false, expectedIncome: false, assets: true, debts: true };
  }
  if (configStr === 'incomes_plus_assets') {
    return { balance: true, expectedIncome: true, assets: true, debts: false };
  }

  try {
    return JSON.parse(configStr) as NetWorthConfig;
  } catch {
    return { balance: true, expectedIncome: true, assets: true, debts: true };
  }
};

export const stringifyNetWorthConfig = (config: NetWorthConfig): string => {
  return JSON.stringify(config);
};
