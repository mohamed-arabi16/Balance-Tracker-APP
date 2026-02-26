export interface FinancialInsightInput {
  income: number;
  expenses: number;
  debt: number;
  assets: number;
}

export interface FinancialInsight {
  id: "savingsRate" | "runway";
  value: number | null;
  valueType: "percent" | "months";
  state: "positive" | "warning" | "stable";
}

export const buildFinancialInsights = ({
  income,
  expenses,
  assets,
}: FinancialInsightInput): FinancialInsight[] => {
  const monthlyNet = income - expenses;
  const savingsRate = income > 0 ? (monthlyNet / income) * 100 : 0;
  const burnRate = Math.max(expenses - income, 0);
  const runwayMonths = burnRate > 0 ? assets / burnRate : null;

  return [
    {
      id: "savingsRate",
      value: savingsRate,
      valueType: "percent",
      state: monthlyNet >= 0 ? "positive" : "warning",
    },
    {
      id: "runway",
      value: runwayMonths,
      valueType: "months",
      state: runwayMonths === null ? "stable" : "warning",
    },
  ];
};
