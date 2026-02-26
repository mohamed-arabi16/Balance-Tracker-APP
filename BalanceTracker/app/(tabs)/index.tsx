import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { useMode } from '@/contexts/ModeContext';
import { useInvoices, getDisplayStatus } from '@/hooks/useInvoices';
import type { Invoice } from '@/hooks/useInvoices';
import { useClients } from '@/hooks/useClients';

import { parseNetWorthConfig } from '@/lib/netWorth';
import { sumInDisplayCurrency } from '@/lib/finance';

// ─── Types ────────────────────────────────────────────────────────────────────
type DisplayStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

const STATUS_COLORS: Record<DisplayStatus, { bg: string; text: string }> = {
  draft:     { bg: '#f3f4f6', text: '#6b7280' },
  sent:      { bg: '#dbeafe', text: '#1d4ed8' },
  paid:      { bg: '#d1fae5', text: '#065f46' },
  overdue:   { bg: '#fee2e2', text: '#b91c1c' },
  cancelled: { bg: '#f3f4f6', text: '#6b7280' },
};

const STATUS_LABELS: Record<DisplayStatus, string> = {
  draft:     'Draft',
  sent:      'Sent',
  paid:      'Paid',
  overdue:   'Overdue',
  cancelled: 'Cancelled',
};

// ─── RevenuePerClientWidget ───────────────────────────────────────────────────
interface RevenuePerClientWidgetProps {
  invoices: Invoice[];
  clientMap: Record<string, string>;
  displayCurrency: string;
  convertCurrency: (amount: number, fromCurrency: 'USD' | 'TRY') => number;
  t: (key: string) => string;
}

function RevenuePerClientWidget({
  invoices,
  clientMap,
  displayCurrency,
  convertCurrency,
  t,
}: RevenuePerClientWidgetProps) {
  const revenueByClient = useMemo(() => {
    const paidInvoices = invoices.filter((inv) => inv.status === 'paid');
    const map: Record<string, number> = {};
    paidInvoices.forEach((inv) => {
      const clientId = inv.client_id ?? 'unknown';
      // CRITICAL: convert before summing to avoid mixed-currency errors
      const converted = convertCurrency(Number(inv.total ?? 0), inv.currency);
      map[clientId] = (map[clientId] ?? 0) + converted;
    });
    return map;
  }, [invoices, convertCurrency]);

  const entries = Object.entries(revenueByClient).sort(([, a], [, b]) => b - a);

  const fmt = (n: number) =>
    `${displayCurrency} ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <View style={widgetStyles.container}>
      <Text style={widgetStyles.title}>{t('advancedDashboard.revenue.title')}</Text>
      <Text style={widgetStyles.subtitle}>{t('advancedDashboard.revenue.subtitle')}</Text>

      {entries.length === 0 ? (
        <Text style={widgetStyles.empty}>{t('advancedDashboard.revenue.empty')}</Text>
      ) : (
        entries.map(([clientId, revenue]) => (
          <View key={clientId} style={widgetStyles.row}>
            <Text style={widgetStyles.rowLabel} numberOfLines={1}>
              {clientMap[clientId] ?? 'Unknown Client'}
            </Text>
            <Text style={widgetStyles.rowValue}>{fmt(revenue)}</Text>
          </View>
        ))
      )}
    </View>
  );
}

// ─── OutstandingInvoicesWidget ────────────────────────────────────────────────
interface OutstandingInvoicesWidgetProps {
  invoices: Invoice[];
  clientMap: Record<string, string>;
  displayCurrency: string;
  convertCurrency: (amount: number, fromCurrency: 'USD' | 'TRY') => number;
  t: (key: string) => string;
}

function OutstandingInvoicesWidget({
  invoices,
  clientMap,
  displayCurrency,
  convertCurrency,
  t,
}: OutstandingInvoicesWidgetProps) {
  // Outstanding = status 'sent' (includes overdue — detected via getDisplayStatus)
  // Sort by due_date ascending (soonest first), nulls last
  const outstandingInvoices = useMemo(() => {
    return invoices
      .filter((inv) => inv.status === 'sent')
      .sort((a, b) => {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return a.due_date.localeCompare(b.due_date);
      });
  }, [invoices]);

  const totalOutstanding = useMemo(() => {
    return outstandingInvoices.reduce((sum, inv) => {
      // CRITICAL: convert before summing to avoid mixed-currency errors
      const converted = convertCurrency(Number(inv.total ?? 0), inv.currency);
      return sum + converted;
    }, 0);
  }, [outstandingInvoices, convertCurrency]);

  const fmt = (n: number) =>
    `${displayCurrency} ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <View style={widgetStyles.container}>
      <Text style={widgetStyles.title}>{t('advancedDashboard.outstanding.title')}</Text>
      <Text style={widgetStyles.subtitle}>{t('advancedDashboard.outstanding.subtitle')}</Text>

      {outstandingInvoices.length === 0 ? (
        <Text style={widgetStyles.empty}>{t('advancedDashboard.outstanding.empty')}</Text>
      ) : (
        <>
          {/* Total outstanding */}
          <View style={widgetStyles.totalOutstandingRow}>
            <Text style={widgetStyles.totalOutstandingLabel}>
              {t('advancedDashboard.outstanding.total')}
            </Text>
            <Text style={widgetStyles.totalOutstandingValue}>{fmt(totalOutstanding)}</Text>
          </View>

          {/* Individual invoices */}
          {outstandingInvoices.map((inv) => {
            const displayStatus = getDisplayStatus(inv.status, inv.due_date);
            const statusColor = STATUS_COLORS[displayStatus];
            const clientName = clientMap[inv.client_id] ?? 'Unknown Client';
            const amount = fmt(convertCurrency(Number(inv.total ?? 0), inv.currency));

            return (
              <View key={inv.id} style={widgetStyles.invoiceRow}>
                <View style={widgetStyles.invoiceRowLeft}>
                  <Text style={widgetStyles.invoiceNumber}>
                    INV-{inv.invoice_number}
                  </Text>
                  <Text style={widgetStyles.invoiceClient} numberOfLines={1}>
                    {clientName}
                  </Text>
                  {inv.due_date ? (
                    <Text style={widgetStyles.invoiceDueDate}>Due: {inv.due_date}</Text>
                  ) : null}
                </View>
                <View style={widgetStyles.invoiceRowRight}>
                  <Text style={widgetStyles.invoiceAmount}>{amount}</Text>
                  <View style={[widgetStyles.statusBadge, { backgroundColor: statusColor.bg }]}>
                    <Text style={[widgetStyles.statusText, { color: statusColor.text }]}>
                      {STATUS_LABELS[displayStatus]}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </>
      )}
    </View>
  );
}

// ─── DashboardScreen ──────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const { t } = useTranslation();
  const { currency, convertCurrency } = useCurrency();
  const { isAdvanced } = useMode();

  const { data: incomesData, isLoading: incomesLoading } = useIncomes();
  const { data: expensesData, isLoading: expensesLoading } = useExpenses();
  const { data: debtsData, isLoading: debtsLoading } = useDebts();
  const { data: assetsData, isLoading: assetsLoading } = useAssets();
  const { settings, isLoading: settingsLoading } = useUserSettings();

  // Advanced mode hooks — always called (rules of hooks), used only when isAdvanced
  const { data: invoicesData } = useInvoices();
  const { data: clientsData } = useClients();

  const isLoading =
    incomesLoading || expensesLoading || debtsLoading || assetsLoading || settingsLoading;

  const incomes = incomesData ?? [];
  const expenses = expensesData ?? [];
  const debts = debtsData ?? [];
  const assets = assetsData ?? [];
  const invoices = invoicesData ?? [];

  const isAllEmpty =
    incomes.length === 0 &&
    expenses.length === 0 &&
    debts.length === 0 &&
    assets.length === 0;

  const displayCurrency = settings?.default_currency ?? currency;
  const nwConfig = parseNetWorthConfig(settings?.net_worth_calculation);

  // O(1) client name lookup for advanced widgets
  const clientMap: Record<string, string> = useMemo(
    () => Object.fromEntries((clientsData ?? []).map((c) => [c.id, c.name])),
    [clientsData],
  );

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

        {/* Advanced mode widgets */}
        {isAdvanced && (
          <RevenuePerClientWidget
            invoices={invoices}
            clientMap={clientMap}
            displayCurrency={displayCurrency}
            convertCurrency={convertCurrency}
            t={t}
          />
        )}
        {isAdvanced && (
          <OutstandingInvoicesWidget
            invoices={invoices}
            clientMap={clientMap}
            displayCurrency={displayCurrency}
            convertCurrency={convertCurrency}
            t={t}
          />
        )}
      </ScrollView>
    </SafeScreen>
  );
}

// ─── Widget Styles ────────────────────────────────────────────────────────────
const widgetStyles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 14,
  },
  empty: {
    fontSize: 13,
    color: '#9ca3af',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },
  // Revenue per client rows
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  rowLabel: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
    marginRight: 8,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065f46',
  },
  // Outstanding total row
  totalOutstandingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff7ed',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  totalOutstandingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9a3412',
  },
  totalOutstandingValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#9a3412',
  },
  // Individual invoice rows
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  invoiceRowLeft: {
    flex: 1,
    marginRight: 8,
  },
  invoiceRowRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  invoiceNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
  },
  invoiceClient: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 1,
  },
  invoiceDueDate: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  invoiceAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
