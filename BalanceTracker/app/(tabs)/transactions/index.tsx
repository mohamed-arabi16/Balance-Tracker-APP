import { format } from 'date-fns';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, type Href } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, { useAnimatedStyle } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

import { EmptyState } from '@/components/ui/EmptyState';
import { SafeScreen } from '@/components/layout/SafeScreen';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useDeleteIncome, useIncomes, useUpdateIncome, type Income } from '@/hooks/useIncomes';
import { haptics } from '@/lib/haptics';
import { incomeStatusBadgeClasses } from '@/lib/statusBadgeTheme';
import { ExpenseScreen } from './expenses';

type Tab = 'income' | 'expenses';

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
        accessibilityLabel="Delete income"
      >
        <Text className="text-white font-semibold text-sm">Delete</Text>
      </Pressable>
    </Reanimated.View>
  );
}

function StatusBadge({ item }: { item: Income }) {
  const updateIncome = useUpdateIncome();
  const isReceived = item.status === 'received';
  const statusKey = isReceived ? 'received' : 'expected';
  const statusClasses = incomeStatusBadgeClasses[statusKey];

  function handleToggle() {
    haptics.onToggle();
    updateIncome.mutate({
      id: item.id,
      title: item.title,
      date: item.date,
      status: isReceived ? 'expected' : 'received',
      currency: item.currency,
      category: item.category,
      amount: item.amount,
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
        {isReceived ? 'Received' : 'Expected'}
      </Text>
    </Pressable>
  );
}

function IncomeRow({ item, onDelete }: { item: Income; onDelete: (income: Income) => void }) {
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
              pathname: '/(tabs)/transactions/add-income',
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
              <View className="flex-row items-center mt-1.5">
                <Text className="text-xs text-gray-500 dark:text-gray-400">{formattedDate}</Text>
                <View className="ml-2 rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5">
                  <Text className="text-[11px] text-gray-600 dark:text-gray-300">{item.category}</Text>
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

function IncomeScreen() {
  const router = useRouter();
  const { data: incomes, isRefetching, refetch } = useIncomes();
  const deleteIncome = useDeleteIncome();
  const hasItems = (incomes?.length ?? 0) > 0;

  const renderItem = useCallback(
    ({ item }: { item: Income }) => (
      <IncomeRow
        item={item}
        onDelete={(income) => {
          deleteIncome.mutate(income);
        }}
      />
    ),
    [deleteIncome],
  );

  return (
    <FlatList
      className="flex-1"
      data={incomes ?? []}
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
          symbolName="arrow.up.circle"
          title="No income yet"
          message="Start tracking your income to see it here."
          ctaLabel="Add Income"
          onCta={() => {
            router.push('/(tabs)/transactions/add-income');
          }}
        />
      }
    />
  );
}

export default function TransactionsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('income');

  function handleTabPress(tab: Tab) {
    haptics.onToggle();
    setActiveTab(tab);
  }

  const fabRoute: Href =
    activeTab === 'income'
      ? '/(tabs)/transactions/add-income'
      : '/(tabs)/transactions/add-expense';

  return (
    <SafeScreen edges={['bottom']} grouped>
      <View className="flex-1">
        <View className="px-4 pt-3 pb-2 border-b border-gray-200 dark:border-gray-800">
          <View className="flex-row bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
            <Pressable
              onPress={() => handleTabPress('income')}
              className={`flex-1 rounded-lg py-2 items-center justify-center ${
                activeTab === 'income' ? 'bg-white dark:bg-gray-700' : ''
              }`}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'income' }}
            >
              <Text className={`text-sm font-medium ${
                activeTab === 'income'
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400'
              }`}>
                Income
              </Text>
            </Pressable>
            <Pressable
              onPress={() => handleTabPress('expenses')}
              className={`flex-1 rounded-lg py-2 items-center justify-center ${
                activeTab === 'expenses' ? 'bg-white dark:bg-gray-700' : ''
              }`}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'expenses' }}
            >
              <Text className={`text-sm font-medium ${
                activeTab === 'expenses'
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400'
              }`}>
                Expenses
              </Text>
            </Pressable>
          </View>
        </View>

        {activeTab === 'income' ? <IncomeScreen /> : <ExpenseScreen />}

        <Pressable
          onPress={() => {
            haptics.onToggle();
            router.push(fabRoute);
          }}
          className={`absolute bottom-6 right-6 w-14 h-14 rounded-full items-center justify-center shadow-lg ${
            activeTab === 'income'
              ? 'bg-balance-500 dark:bg-balance-600'
              : 'bg-expense-500 dark:bg-expense-600'
          }`}
          accessibilityRole="button"
          accessibilityLabel={activeTab === 'income' ? 'Add Income' : 'Add Expense'}
        >
          <Ionicons name="add" size={28} color="#ffffff" />
        </Pressable>
      </View>
    </SafeScreen>
  );
}
