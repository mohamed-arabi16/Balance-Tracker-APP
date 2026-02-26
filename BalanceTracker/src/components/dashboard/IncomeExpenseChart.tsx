import React, { useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import { CartesianChart, Line, useChartPressState } from 'victory-native';
import { Circle, useFont } from '@shopify/react-native-skia';
import { useAnimatedReaction, runOnJS } from 'react-native-reanimated';

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
    const key = item.date.slice(0, 7); // "YYYY-MM"
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

export function IncomeExpenseChart({ incomes, expenses, title }: Props) {
  const font = useFont(require('../../../assets/fonts/Inter-Medium.ttf'), 11);
  const { state, isActive } = useChartPressState({ x: 0, y: { income: 0, expenses: 0 } });

  // Sync pressed income value to JS state for callout label
  const [pressedIncome, setPressedIncome] = useState(0);
  useAnimatedReaction(
    () => state.y.income.value.value,
    (val) => {
      runOnJS(setPressedIncome)(val);
    },
    [state],
  );

  const chartData = useMemo(
    () => buildChartData(incomes, expenses),
    [incomes, expenses],
  );

  if (chartData.length === 0) {
    return (
      <View className="h-56 rounded-2xl bg-white dark:bg-neutral-900 p-4 items-center justify-center mb-3">
        <Text className="text-gray-400 dark:text-gray-500 text-sm">
          No data for last 6 months
        </Text>
      </View>
    );
  }

  return (
    <View className="rounded-2xl bg-white dark:bg-neutral-900 p-4 mb-3">
      {title ? (
        <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {title}
        </Text>
      ) : null}

      {/* Callout value label — shown above chart while a point is pressed */}
      {isActive ? (
        <Text className="text-xs text-blue-500 font-semibold text-center mb-1">
          {`Income: ${pressedIncome.toFixed(0)}`}
        </Text>
      ) : null}

      <View style={{ height: 200 }}>
        <CartesianChart
          data={chartData}
          xKey="month"
          yKeys={['income', 'expenses']}
          axisOptions={font ? { font } : undefined}
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
              {isActive && (
                <>
                  <Circle
                    cx={state.x.position}
                    cy={state.y.income.position}
                    r={6}
                    color="#34C759"
                  />
                  <Circle
                    cx={state.x.position}
                    cy={state.y.expenses.position}
                    r={6}
                    color="#FF3B30"
                  />
                </>
              )}
            </>
          )}
        </CartesianChart>
      </View>

      {/* Legend */}
      <View className="flex-row justify-center gap-4 mt-2">
        <View className="flex-row items-center gap-1">
          <View
            style={{ width: 12, height: 3, backgroundColor: '#34C759', borderRadius: 2 }}
          />
          <Text className="text-xs text-gray-500 dark:text-gray-400">Income</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <View
            style={{ width: 12, height: 3, backgroundColor: '#FF3B30', borderRadius: 2 }}
          />
          <Text className="text-xs text-gray-500 dark:text-gray-400">Expenses</Text>
        </View>
      </View>
    </View>
  );
}
