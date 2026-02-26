import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, { useAnimatedStyle } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

import { EmptyState } from '@/components/ui/EmptyState';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useDeleteExpense, useExpenses, useUpdateExpense, type Expense } from '@/hooks/useExpenses';
import { haptics } from '@/lib/haptics';
import { expenseDebtStatusBadgeClasses } from '@/lib/statusBadgeTheme';

function DeleteAction(
  _prog: SharedValue<number>,
  drag: SharedValue<number>,
  onDelete: () => void,
) {
  const styleAnimation = useAnimatedStyle(() => ({
    transform: [{ translateX: drag.value + 88 }],
  }));

  return (
    <Reanimated.View style={[styleAnimation, { width: 88, overflow: 'hidden' }]}>
      <Pressable
        onPress={() => {
          haptics.onDelete();
          onDelete();
        }}
        className="w-[88px] h-full items-center justify-center bg-expense-500 dark:bg-expense-600"
        accessibilityRole="button"
        accessibilityLabel="Delete expense"
      >
        <Text className="text-white font-semibold text-sm">Delete</Text>
      </Pressable>
    </Reanimated.View>
  );
}

function StatusBadge({ item }: { item: Expense }) {
  const updateExpense = useUpdateExpense();
  const isPaid = item.status === 'paid';
  const statusKey = isPaid ? 'paid' : 'pending';
  const statusClasses = expenseDebtStatusBadgeClasses[statusKey];

  function handleToggle() {
    haptics.onToggle();
    updateExpense.mutate({
      id: item.id,
      title: item.title,
      date: item.date,
      status: isPaid ? 'pending' : 'paid',
      currency: item.currency,
      category: item.category,
      amount: item.amount,
      type: item.type,
      client_id: item.client_id,
    });
  }

  return (
    <Pressable
      onPress={handleToggle}
      className={`mt-1.5 px-2 py-0.5 rounded-full ${statusClasses.container}`}
      accessibilityRole="button"
      accessibilityLabel={`Status: ${item.status}. Tap to toggle.`}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Text className={`text-[11px] font-semibold ${statusClasses.text}`}>
        {isPaid ? 'Paid' : 'Pending'}
      </Text>
    </Pressable>
  );
}

function ExpenseRow({ item, onDelete }: { item: Expense; onDelete: (expense: Expense) => void }) {
  const router = useRouter();
  const { formatCurrency } = useCurrency();

  const formattedDate = format(new Date(item.date), 'MMM d, yyyy');
  const formattedAmount = formatCurrency(item.amount, item.currency);

  const renderRightActions = useCallback(
    (prog: SharedValue<number>, drag: SharedValue<number>) =>
      DeleteAction(prog, drag, () => onDelete(item)),
    [item, onDelete],
  );

  return (
    <Swipeable
      friction={2}
      rightThreshold={40}
      renderRightActions={renderRightActions}
    >
      <View className="px-4 mb-3">
        <Pressable
          onPress={() => {
            router.push({
              pathname: '/(tabs)/transactions/add-expense',
              params: { id: item.id },
            });
          }}
          className="rounded-2xl bg-white dark:bg-neutral-900"
          style={({ pressed }) => [{ opacity: pressed ? 0.82 : 1 }]}
        >
          <View className="flex-row items-start justify-between px-4 py-3 min-h-[72px]">
            <View className="flex-1 mr-3">
              <Text className="text-base font-semibold text-gray-900 dark:text-white" numberOfLines={1}>
                {item.title}
              </Text>
              <View className="flex-row items-center mt-1.5 flex-wrap">
                <Text className="text-xs text-gray-500 dark:text-gray-400">{formattedDate}</Text>
                <View className="ml-2 rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5">
                  <Text className="text-[11px] text-gray-600 dark:text-gray-300">{item.category}</Text>
                </View>
                <View className="ml-2 rounded-md bg-asset-100 dark:bg-asset-900 px-2 py-0.5">
                  <Text className="text-[11px] text-asset-700 dark:text-asset-300">{item.type}</Text>
                </View>
              </View>
            </View>
            <View className="items-end">
              <Text className="text-base font-bold text-gray-900 dark:text-white">{formattedAmount}</Text>
              <StatusBadge item={item} />
            </View>
          </View>
        </Pressable>
      </View>
    </Swipeable>
  );
}

export function ExpenseScreen() {
  const router = useRouter();
  const { data: expenses, isRefetching, refetch } = useExpenses();
  const deleteExpense = useDeleteExpense();
  const hasItems = (expenses?.length ?? 0) > 0;

  const renderItem = useCallback(
    ({ item }: { item: Expense }) => (
      <ExpenseRow
        item={item}
        onDelete={(expense) => {
          deleteExpense.mutate(expense);
        }}
      />
    ),
    [deleteExpense],
  );

  return (
    <FlatList
      className="flex-1"
      data={expenses ?? []}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={
        hasItems
          ? { paddingTop: 12, paddingBottom: 120 }
          : { flexGrow: 1, paddingTop: 24, paddingBottom: 120 }
      }
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
      ListEmptyComponent={
        <EmptyState
          symbolName="arrow.down.circle"
          title="No expenses yet"
          message="Start tracking your expenses to see them here."
          ctaLabel="Add Expense"
          onCta={() => {
            router.push('/(tabs)/transactions/add-expense');
          }}
        />
      }
    />
  );
}

export default ExpenseScreen;
