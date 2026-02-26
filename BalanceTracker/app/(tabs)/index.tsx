import React, { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { SafeScreen } from '@/components/layout/SafeScreen';
import { NetWorthCard } from '@/components/dashboard/NetWorthCard';
import { FinancialSummaryCard } from '@/components/dashboard/FinancialSummaryCard';
import { IncomeExpenseChart } from '@/components/dashboard/IncomeExpenseChart';
import { EmptyState } from '@/components/ui/EmptyState';

import { useIncomes } from '@/hooks/useIncomes';
import { useExpenses } from '@/hooks/useExpenses';
import { useDebts } from '@/hooks/useDebts';
import { useAssets } from '@/hooks/useAssets';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useCurrency } from '@/contexts/CurrencyContext';

import { parseNetWorthConfig } from '@/lib/netWorth';
import { sumInDisplayCurrency } from '@/lib/finance';

export default function DashboardScreen() {
  const { t } = useTranslation();
  const { currency, convertCurrency } = useCurrency();

  const { data: incomesData, isLoading: incomesLoading } = useIncomes();
  const { data: expensesData, isLoading: expensesLoading } = useExpenses();
  const { data: debtsData, isLoading: debtsLoading } = useDebts();
  const { data: assetsData, isLoading: assetsLoading } = useAssets();
  const { settings, isLoading: settingsLoading } = useUserSettings();

  const isLoading =
    incomesLoading || expensesLoading || debtsLoading || assetsLoading || settingsLoading;

  const incomes = incomesData ?? [];
  const expenses = expensesData ?? [];
  const debts = debtsData ?? [];
  const assets = assetsData ?? [];

  const isAllEmpty =
    incomes.length === 0 &&
    expenses.length === 0 &&
    debts.length === 0 &&
    assets.length === 0;

  const displayCurrency = settings?.default_currency ?? currency;
  const nwConfig = parseNetWorthConfig(settings?.net_worth_calculation);

  // Calculate financial totals in display currency
  const totalIncome = useMemo(
    () =>
      sumInDisplayCurrency(
        incomes,
        (item) => item.amount,
        (item) => item.currency,
        convertCurrency,
      ),
    [incomes, convertCurrency],
  );

  const totalExpenses = useMemo(
    () =>
      sumInDisplayCurrency(
        expenses,
        (item) => item.amount,
        (item) => item.currency,
        convertCurrency,
      ),
    [expenses, convertCurrency],
  );

  const totalDebt = useMemo(
    () =>
      sumInDisplayCurrency(
        debts.filter((d) => d.status === 'pending'),
        (item) => item.amount,
        (item) => item.currency,
        convertCurrency,
      ),
    [debts, convertCurrency],
  );

  const totalAssets = useMemo(
    () =>
      sumInDisplayCurrency(
        assets,
        (item) => item.quantity * item.price_per_unit,
        (item) => item.currency,
        convertCurrency,
      ),
    [assets, convertCurrency],
  );

  // Net worth calculation based on user's configured formula
  const netWorth = useMemo(() => {
    let value = 0;
    if (nwConfig.balance) value += totalIncome - totalExpenses;
    if (nwConfig.assets) value += totalAssets;
    if (nwConfig.debts) value -= totalDebt;
    return value;
  }, [nwConfig, totalIncome, totalExpenses, totalAssets, totalDebt]);

  // Format currency value for summary cards
  const formatValue = (amount: number) =>
    `${displayCurrency} ${amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;

  // Map incomes/expenses to simplified date+amount shape for chart
  const chartIncomes = useMemo(
    () => incomes.map((i) => ({ date: i.date, amount: i.amount })),
    [incomes],
  );
  const chartExpenses = useMemo(
    () => expenses.map((e) => ({ date: e.date, amount: e.amount })),
    [expenses],
  );

  if (isLoading) {
    return (
      <SafeScreen>
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500 dark:text-gray-400 text-base">Loading...</Text>
        </View>
      </SafeScreen>
    );
  }

  if (isAllEmpty) {
    return (
      <SafeScreen>
        <EmptyState
          title={t('dashboard.title')}
          message={t('dashboard.subtitle')}
          ctaLabel={t('dashboard.quickActions.addIncome.title')}
          onCta={() => {}}
        />
      </SafeScreen>
    );
  }

  return (
    <SafeScreen edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          {t('dashboard.title')}
        </Text>

        {/* Net Worth Card */}
        <NetWorthCard
          netWorth={netWorth}
          currency={displayCurrency}
          label={t('dashboard.cards.netWorth.title')}
        />

        {/* Income vs Expenses Chart */}
        <IncomeExpenseChart
          incomes={chartIncomes}
          expenses={chartExpenses}
          title={t('dashboard.subtitle')}
        />

        {/* Financial Summary Cards */}
        <FinancialSummaryCard
          title={t('dashboard.cards.income.title')}
          value={formatValue(totalIncome)}
          subtitle={t('dashboard.cards.income.subtitle')}
          route="/(tabs)/transactions"
          color="#34C759"
        />
        <FinancialSummaryCard
          title={t('dashboard.cards.expenses.title')}
          value={formatValue(totalExpenses)}
          subtitle={t('dashboard.cards.expenses.subtitle')}
          route="/expenses"
          color="#FF3B30"
        />
        <FinancialSummaryCard
          title={t('dashboard.cards.debt.totalTitle')}
          value={formatValue(totalDebt)}
          subtitle={t('dashboard.cards.debt.totalSubtitle')}
          route="/debts"
          color="#FF9500"
        />
        <FinancialSummaryCard
          title={t('dashboard.cards.assets.title')}
          value={formatValue(totalAssets)}
          subtitle={t('dashboard.cards.assets.subtitle')}
          route="/assets"
          color="#007AFF"
        />
      </ScrollView>
    </SafeScreen>
  );
}
