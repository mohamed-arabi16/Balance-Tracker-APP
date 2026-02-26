import React, { useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import { useColorScheme } from 'nativewind';
import { CartesianChart, Line, useChartPressState } from 'victory-native';
import { Circle, useFont } from '@shopify/react-native-skia';
import { useAnimatedReaction, runOnJS } from 'react-native-reanimated';

import interMedium from '../../../assets/fonts/Inter-Medium.ttf';

import { SHADOWS } from '@/lib/tokens';

interface Props {
  incomes: Array<{ date: string; amount: number }>;
  expenses: Array<{ date: string; amount: number }>;
  title?: string;
}

function groupByMonth(
  items: Array<{ date: string; amount: number }>,
): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    if (!item.date) return acc;
    const key = item.date.slice(0, 7);
    acc[key] = (acc[key] ?? 0) + item.amount;
    return acc;
  }, {});
}

function buildChartData(
  incomes: Array<{ date: string; amount: number }>,
  expenses: Array<{ date: string; amount: number }>,
  months = 6,
) {
  const incomeByMonth = groupByMonth(incomes);
  const expenseByMonth = groupByMonth(expenses);
  const result = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('default', { month: 'short' });
    result.push({
      month: i,
      label,
      income: incomeByMonth[key] ?? 0,
      expenses: expenseByMonth[key] ?? 0,
    });
  }

  return result;
}

function formatValue(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function IncomeExpenseChart({ incomes, expenses, title }: Props) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const font = useFont(interMedium, 11);
  const { state, isActive } = useChartPressState({
    x: 0,
    y: { income: 0, expenses: 0 },
  });

  const [pressedIncome, setPressedIncome] = useState(0);
  const [pressedExpense, setPressedExpense] = useState(0);
  const [pressedMonth, setPressedMonth] = useState(0);

  useAnimatedReaction(
    () => state.y.income.value.value,
    (value) => {
      runOnJS(setPressedIncome)(Number(value ?? 0));
    },
    [state],
  );

  useAnimatedReaction(
    () => state.y.expenses.value.value,
    (value) => {
      runOnJS(setPressedExpense)(Number(value ?? 0));
    },
    [state],
  );

  useAnimatedReaction(
    () => state.x.value.value,
    (value) => {
      runOnJS(setPressedMonth)(Number(value ?? 0));
    },
    [state],
  );

  const chartData = useMemo(
    () => buildChartData(incomes, expenses),
    [incomes, expenses],
  );

  const axisLabelColor = isDark ? '#9CA3AF' : '#6B7280';
  const axisLineColor = isDark ? '#374151' : '#E5E7EB';
  const monthLabel = chartData[pressedMonth]?.label ?? '';

  if (chartData.length === 0) {
    return (
      <View
        className="h-56 rounded-2xl bg-white dark:bg-neutral-900 p-4 items-center justify-center mb-6"
        style={SHADOWS.card}
      >
        <Text className="text-gray-400 dark:text-gray-500 text-sm">
          No data for last 6 months
        </Text>
      </View>
    );
  }

  return (
    <View className="rounded-2xl bg-white dark:bg-neutral-900 p-4 mb-6" style={SHADOWS.card}>
      {title ? (
        <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {title}
        </Text>
      ) : null}

      {isActive ? (
        <View className="rounded-lg px-3 py-2 border border-balance-200 dark:border-balance-800 bg-balance-50 dark:bg-balance-950 mb-2">
          <Text className="text-[11px] font-semibold text-balance-700 dark:text-balance-300 mb-0.5">
            {monthLabel}
          </Text>
          <Text className="text-xs text-income-700 dark:text-income-300">
            Income: {formatValue(pressedIncome)}
          </Text>
          <Text className="text-xs text-expense-700 dark:text-expense-300">
            Expenses: {formatValue(pressedExpense)}
          </Text>
        </View>
      ) : null}

      <View style={{ height: 228 }}>
        <CartesianChart
          data={chartData}
          xKey="month"
          yKeys={['income', 'expenses']}
          axisOptions={{
            font,
            formatXLabel: (value) => chartData[Number(value)]?.label ?? '',
            tickCount: { x: 6, y: 4 },
            labelColor: { x: axisLabelColor, y: axisLabelColor },
            lineColor: { grid: axisLineColor, frame: axisLineColor },
          }}
          chartPressState={state}
        >
          {({ points }) => (
            <>
              <Line
                points={points.income}
                color="#34C759"
                strokeWidth={2.5}
                animate={{ type: 'timing', duration: 300 }}
              />
              <Line
                points={points.expenses}
                color="#FF3B30"
                strokeWidth={2.5}
                animate={{ type: 'timing', duration: 300 }}
              />
              {isActive ? (
                <>
                  <Circle
                    cx={state.x.position}
                    cy={state.y.income.position}
                    r={5.5}
                    color="#34C759"
                  />
                  <Circle
                    cx={state.x.position}
                    cy={state.y.expenses.position}
                    r={5.5}
                    color="#FF3B30"
                  />
                </>
              ) : null}
            </>
          )}
        </CartesianChart>
      </View>

      <View className="flex-row justify-center gap-6 mt-3 mb-1">
        <View className="flex-row items-center gap-2">
          <View style={{ width: 20, height: 4, borderRadius: 2, backgroundColor: '#34C759' }} />
          <Text className="text-sm text-gray-600 dark:text-gray-300">Income</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <View style={{ width: 20, height: 4, borderRadius: 2, backgroundColor: '#FF3B30' }} />
          <Text className="text-sm text-gray-600 dark:text-gray-300">Expenses</Text>
        </View>
      </View>
    </View>
  );
}
