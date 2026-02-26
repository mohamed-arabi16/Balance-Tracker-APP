import { useState } from "react";
import { FinancialCard } from "@/components/ui/financial-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Gem,
  Calendar,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Currency, useCurrency } from "@/contexts/CurrencyContext";
import { useDate } from "@/contexts/DateContext";
import { Skeleton } from "@/components/ui/skeleton";
import { useIncomes } from "@/hooks/useIncomes";
import { useExpenses } from "@/hooks/useExpenses";
import { useDebts } from "@/hooks/useDebts";
import { useAssets } from "@/hooks/useAssets";
import { useRecentActivity } from "@/hooks/useRecentActivity";
import { useFilteredData } from "@/hooks/useFilteredData";
import { useUserSettings } from "@/hooks/useUserSettings";
import { sumInDisplayCurrency } from "@/lib/finance";
import { buildFinancialInsights } from "@/lib/insights";
import { parseNetWorthConfig } from "@/lib/netWorth";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from 'date-fns';
import { arSA, enUS } from "date-fns/locale";
import { getLocaleFromLanguage } from "@/lib/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AddIncomeForm } from "./Income";
import { AddExpenseForm } from "./Expenses";
import { AddDebtForm } from "./Debts";

export default function Dashboard() {
  const {
    formatCurrency,
    convertCurrency,
    currency,
    autoConvert,
    exchangeRateStatus,
    exchangeRateWarning,
    exchangeRateLastUpdated,
    refreshExchangeRate,
  } = useCurrency();
  const { selectedMonth, isCurrentMonth } = useDate();
  const { settings } = useUserSettings();
  const { t, i18n } = useTranslation();

  const { data: incomesData, isLoading: incomesLoading } = useIncomes();
  const { data: expensesData, isLoading: expensesLoading } = useExpenses();
  const { data: debtsData, isLoading: debtsLoading } = useDebts();
  const { data: assetsData, isLoading: assetsLoading } = useAssets();
  const { data: activities, isLoading: activitiesLoading, isError: activitiesError } = useRecentActivity(5);

  const [isAddIncomeOpen, setIsAddIncomeOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isAddDebtOpen, setIsAddDebtOpen] = useState(false);

  const incomes = useFilteredData(incomesData || []);
  const expenses = useFilteredData(expensesData || []);
  const debts = useFilteredData(debtsData || [], 'due_date');
  const assets = assetsData || [];
  const includeLongTermDebt = settings?.include_long_term ?? true;

  const totalIncome = sumInDisplayCurrency(
    incomes,
    (income) => income.amount,
    (income) => income.currency as Currency,
    convertCurrency,
  );
  const totalReceivedIncome = sumInDisplayCurrency(
    incomes.filter(i => i.status === 'received'),
    (income) => income.amount,
    (income) => income.currency as Currency,
    convertCurrency,
  )
  const totalExpectedIncome = sumInDisplayCurrency(
    incomes.filter(i => i.status === 'expected'),
    (income) => income.amount,
    (income) => income.currency as Currency,
    convertCurrency,
  )
  const expectedLoans = sumInDisplayCurrency(
    debts.filter(d => ('is_receivable' in d && d.is_receivable === true) && d.status === 'pending'),
    (debt) => debt.amount,
    (debt) => debt.currency as Currency,
    convertCurrency
  )
  const totalExpenses = sumInDisplayCurrency(
    expenses,
    (expense) => expense.amount,
    (expense) => expense.currency as Currency,
    convertCurrency,
  );
  const debtSource = includeLongTermDebt
    ? debts
    : debts.filter((debt) => debt.type === "short");

  // Only count debts that are actually owed BY the user (liabilities)
  const liabilitiesSource = debtSource.filter((d) => !('is_receivable' in d && d.is_receivable === true));
  const totalDebt = sumInDisplayCurrency(
    liabilitiesSource,
    (debt) => debt.amount,
    (debt) => debt.currency as Currency,
    convertCurrency,
  );
  const totalAssets = sumInDisplayCurrency(
    assets,
    (asset) => asset.quantity * asset.price_per_unit,
    (asset) => asset.currency as Currency,
    convertCurrency,
  );

  const nwConfig = parseNetWorthConfig(settings?.net_worth_calculation);

  let customNetWorth = 0;
  if (nwConfig.balance) customNetWorth += (totalReceivedIncome - totalExpenses);
  if (nwConfig.expectedIncome) customNetWorth += totalExpectedIncome;
  if (nwConfig.assets) customNetWorth += (totalAssets + expectedLoans);
  if (nwConfig.debts) customNetWorth -= totalDebt;

  const data = {
    balance: totalReceivedIncome - totalExpenses,
    income: totalReceivedIncome,
    expectedIncome: totalExpectedIncome,
    expenses: totalExpenses,
    debt: totalDebt, // Liabilities only
    assets: totalAssets + expectedLoans, // Receivables count towards assets
    netWorth: customNetWorth,
  };
  const insights = buildFinancialInsights({
    income: data.income,
    expenses: data.expenses,
    debt: data.debt,
    assets: data.assets,
  });

  const isLoading = incomesLoading || expensesLoading || debtsLoading || assetsLoading;
  const locale = getLocaleFromLanguage(i18n.language);

  const getSubtitle = () => {
    if (selectedMonth === 'all') return t("dashboard.allDates");
    if (isCurrentMonth()) return t("dashboard.subtitle");
    const [year, month] = selectedMonth.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return `${t("dashboard.forPrefix")} ${date.toLocaleDateString(locale, { year: 'numeric', month: 'long' })}`;
  };

  if (isLoading) {
    return <DashboardSkeleton />
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-gradient-dashboard min-h-screen">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("dashboard.title")}</h1>
        <p className="text-muted-foreground">{getSubtitle()}</p>
      </div>

      {autoConvert && exchangeRateWarning && (
        <Card className="border border-amber-500/40 bg-amber-500/10">
          <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2 text-sm text-amber-900 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="space-y-1">
                <p>
                  {exchangeRateWarning === "fallback"
                    ? t("dashboard.exchangeRate.warningFallback")
                    : t("dashboard.exchangeRate.warningStale")}
                </p>
                <p className="text-xs">
                  {t("dashboard.exchangeRate.statusLabel")}: {t(`dashboard.exchangeRate.${exchangeRateStatus}`)}
                  {exchangeRateLastUpdated
                    ? ` • ${t("dashboard.exchangeRate.updatedLabel")}: ${new Date(exchangeRateLastUpdated).toLocaleString(locale)}`
                    : ""}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                void refreshExchangeRate();
              }}
            >
              <RefreshCw className="me-2 h-4 w-4" />
              {t("dashboard.exchangeRate.refreshButton")}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <FinancialCard variant="balance" title={t("dashboard.cards.balance.title")} value={formatCurrency(data.balance, currency)} subtitle={t("dashboard.cards.balance.subtitle")} icon={<DollarSign className="h-5 w-5" />} />
        <FinancialCard variant="income" title={t("dashboard.cards.income.title")} value={formatCurrency(data.expectedIncome, currency)} subtitle={t("dashboard.cards.income.subtitle")} icon={<TrendingUp className="h-5 w-5" />} />
        <FinancialCard variant="expense" title={t("dashboard.cards.expenses.title")} value={formatCurrency(data.expenses, currency)} subtitle={t("dashboard.cards.expenses.subtitle")} icon={<TrendingDown className="h-5 w-5" />} />
        <FinancialCard
          variant="debt"
          title={includeLongTermDebt ? t("dashboard.cards.debt.totalTitle") : t("dashboard.cards.debt.shortTitle")}
          value={formatCurrency(data.debt, currency)}
          subtitle={includeLongTermDebt ? t("dashboard.cards.debt.totalSubtitle") : t("dashboard.cards.debt.shortSubtitle")}
          icon={<CreditCard className="h-5 w-5" />}
        />
        <FinancialCard variant="asset" title={t("dashboard.cards.assets.title")} value={formatCurrency(data.assets, currency)} subtitle={t("dashboard.cards.assets.subtitle")} icon={<Gem className="h-5 w-5" />} />
        <FinancialCard title={t("dashboard.cards.netWorth.title")} value={formatCurrency(data.netWorth, currency)} subtitle={t("dashboard.cards.netWorth.subtitle")} icon={<Calendar className="h-5 w-5" />} />
      </div>

      <Card className="bg-gradient-card border border-border shadow-card">
        <CardHeader>
          <CardTitle>{t("insights.title")}</CardTitle>
          <CardDescription>{t("insights.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((insight) => {
            const value =
              insight.id === "savingsRate"
                ? `${(insight.value ?? 0).toFixed(1)}%`
                : insight.value === null
                  ? t("insights.runway.stableValue")
                  : t("insights.runway.monthsValue", {
                    value: insight.value.toFixed(1),
                  });

            const descriptionKey =
              insight.id === "savingsRate"
                ? insight.state === "positive"
                  ? "insights.savingsRate.positive"
                  : "insights.savingsRate.warning"
                : insight.state === "stable"
                  ? "insights.runway.stable"
                  : "insights.runway.warning";

            return (
              <div
                key={insight.id}
                className="rounded-lg border border-border bg-background/60 p-4 space-y-1"
              >
                <p className="text-sm text-muted-foreground">
                  {t(`insights.${insight.id}.title`)}
                </p>
                <p className="text-2xl font-semibold">{value}</p>
                <p className="text-sm text-muted-foreground">{t(descriptionKey)}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-gradient-card rounded-lg p-4 sm:p-6 border border-border shadow-card">
          <h2 className="text-xl font-semibold mb-4">{t("dashboard.quickActions.title")}</h2>
          <div className="space-y-3">
            <Dialog open={isAddIncomeOpen} onOpenChange={setIsAddIncomeOpen}>
              <DialogTrigger asChild>
                <button className="w-full p-3 text-left rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors">
                  <div className="font-medium">{t("dashboard.quickActions.addIncome.title")}</div>
                  <div className="text-sm text-muted-foreground">{t("dashboard.quickActions.addIncome.subtitle")}</div>
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{t("dashboard.quickActions.addIncome.dialogTitle")}</DialogTitle><DialogDescription>{t("dashboard.quickActions.addIncome.dialogDescription")}</DialogDescription></DialogHeader>
                <AddIncomeForm setDialogOpen={setIsAddIncomeOpen} />
              </DialogContent>
            </Dialog>
            <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
              <DialogTrigger asChild>
                <button className="w-full p-3 text-left rounded-lg bg-destructive/10 hover:bg-destructive/20 transition-colors">
                  <div className="font-medium">{t("dashboard.quickActions.addExpense.title")}</div>
                  <div className="text-sm text-muted-foreground">{t("dashboard.quickActions.addExpense.subtitle")}</div>
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{t("dashboard.quickActions.addExpense.dialogTitle")}</DialogTitle><DialogDescription>{t("dashboard.quickActions.addExpense.dialogDescription")}</DialogDescription></DialogHeader>
                <AddExpenseForm setDialogOpen={setIsAddExpenseOpen} />
              </DialogContent>
            </Dialog>
            <Dialog open={isAddDebtOpen} onOpenChange={setIsAddDebtOpen}>
              <DialogTrigger asChild>
                <button className="w-full p-3 text-left rounded-lg bg-orange-500/10 hover:bg-orange-500/20 transition-colors">
                  <div className="font-medium">{t("dashboard.quickActions.addDebt.title")}</div>
                  <div className="text-sm text-muted-foreground">{t("dashboard.quickActions.addDebt.subtitle")}</div>
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{t("dashboard.quickActions.addDebt.dialogTitle")}</DialogTitle><DialogDescription>{t("dashboard.quickActions.addDebt.dialogDescription")}</DialogDescription></DialogHeader>
                <AddDebtForm setDialogOpen={setIsAddDebtOpen} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="bg-gradient-card rounded-lg p-4 sm:p-6 border border-border shadow-card">
          <h2 className="text-xl font-semibold mb-4">{t("dashboard.recentActivity.title")}</h2>
          <div className="space-y-3">
            {activitiesLoading && (
              <>
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </>
            )}
            {activitiesError && <p className="text-muted-foreground">{t("dashboard.recentActivity.error")}</p>}
            {!activitiesLoading && !activitiesError && activities && activities.length === 0 && (
              <p className="text-muted-foreground">{t("dashboard.recentActivity.empty")}</p>
            )}
            {!activitiesLoading && !activitiesError && activities && activities.map(activity => (
              <div key={activity.id} className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-full">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm">{activity.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.timestamp), {
                      addSuffix: true,
                      locale: i18n.language.startsWith("ar") ? arSA : enUS,
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-6 bg-gradient-dashboard min-h-screen">
      <div className="space-y-2">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-5 w-96" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
      </div>
    </div>
  );
}
