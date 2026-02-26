import { format } from 'date-fns';
import { Stack, useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, { useAnimatedStyle } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

import { EmptyState } from '@/components/ui/EmptyState';
import { SafeScreen } from '@/components/layout/SafeScreen';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useDeleteIncome, useIncomes, useUpdateIncome, type Income } from '@/hooks/useIncomes';
import { haptics } from '@/lib/haptics';
import { COLORS } from '@/lib/tokens';
import { ExpenseScreen } from './expenses';

// ─────────────────────────────────────────────
// Delete action rendered inside the swipeable
// ─────────────────────────────────────────────
function DeleteAction(
  _prog: SharedValue<number>,
  drag: SharedValue<number>,
  onDelete: () => void,
) {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const styleAnimation = useAnimatedStyle(() => ({
    transform: [{ translateX: drag.value + 80 }],
  }));

  return (
    <Reanimated.View style={[styleAnimation, styles.deleteContainer]}>
      <Pressable
        onPress={() => {
          haptics.onDelete();
          onDelete();
        }}
        style={styles.deleteButton}
        accessibilityRole="button"
        accessibilityLabel="Delete income"
      >
        <Text style={styles.deleteText}>Delete</Text>
      </Pressable>
    </Reanimated.View>
  );
}

// ─────────────────────────────────────────────
// Inline status badge — toggles expected/received
// ─────────────────────────────────────────────
interface StatusBadgeProps {
  item: Income;
}

function StatusBadge({ item }: StatusBadgeProps) {
  const updateIncome = useUpdateIncome();
  const isReceived = item.status === 'received';

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
      style={[styles.badge, isReceived ? styles.badgeReceived : styles.badgeExpected]}
      accessibilityRole="button"
      accessibilityLabel={`Status: ${item.status}. Tap to toggle.`}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Text style={[styles.badgeText, isReceived ? styles.badgeTextReceived : styles.badgeTextExpected]}>
        {isReceived ? 'Received' : 'Expected'}
      </Text>
    </Pressable>
  );
}

// ─────────────────────────────────────────────
// Single income row with swipe-to-delete
// ─────────────────────────────────────────────
interface IncomeRowProps {
  item: Income;
  onDelete: (income: Income) => void;
}

function IncomeRow({ item, onDelete }: IncomeRowProps) {
  const router = useRouter();
  const { formatCurrency } = useCurrency();
  const { colorScheme } = useColorScheme();
  const rowBg = colorScheme === 'dark' ? COLORS.cellBg.dark : COLORS.cellBg.light;

  const formattedDate = format(new Date(item.date), 'MMM d, yyyy');
  const formattedAmount = formatCurrency(item.amount, item.currency);

  const renderRightActions = useCallback(
    (prog: SharedValue<number>, drag: SharedValue<number>) =>
      DeleteAction(prog, drag, () => onDelete(item)),
    [item, onDelete],
  );

  function handlePress() {
    router.push(`/(tabs)/transactions/add-income?id=${item.id}` as any);
  }

  return (
    <Swipeable
      friction={2}
      rightThreshold={40}
      renderRightActions={renderRightActions}
    >
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: rowBg },
          { opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <View style={styles.rowLeft}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={styles.rowMeta}>
            <Text style={styles.rowDate}>{formattedDate}</Text>
            <View style={styles.categoryChip}>
              <Text style={styles.categoryText}>{item.category}</Text>
            </View>
          </View>
        </View>
        <View style={styles.rowRight}>
          <Text style={styles.rowAmount}>{formattedAmount}</Text>
          <StatusBadge item={item} />
        </View>
      </Pressable>
    </Swipeable>
  );
}

// ─────────────────────────────────────────────
// Income list content (used when tab = 'income')
// ─────────────────────────────────────────────
function IncomeScreen() {
  const { data: incomes, isRefetching, refetch } = useIncomes();
  const deleteIncome = useDeleteIncome();

  function handleDelete(income: Income) {
    deleteIncome.mutate(income);
  }

  function handleAddIncome() {
    // Handled via headerRight nav button in TransactionsScreen
  }

  const renderItem = useCallback(
    ({ item }: { item: Income }) => (
      <IncomeRow item={item} onDelete={handleDelete} />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const keyExtractor = useCallback((item: Income) => item.id, []);

  return (
    <FlatList
      data={incomes ?? []}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      contentContainerStyle={
        (incomes?.length ?? 0) === 0 ? styles.emptyContainer : styles.listContainer
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
          onCta={handleAddIncome}
        />
      }
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

// ─────────────────────────────────────────────
// Main transactions screen with tab switcher
// ─────────────────────────────────────────────
type Tab = 'income' | 'expenses';

export default function TransactionsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('income');

  function handleTabPress(tab: Tab) {
    haptics.onToggle();
    setActiveTab(tab);
  }

  return (
    <SafeScreen edges={['bottom']} grouped>
      <Stack.Screen
        options={{
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push(
                activeTab === 'income'
                  ? '/(tabs)/transactions/add-income'
                  : '/(tabs)/transactions/add-expense' as any
              )}
              style={{ paddingHorizontal: 8 }}
              accessibilityRole="button"
              accessibilityLabel={activeTab === 'income' ? 'Add Income' : 'Add Expense'}
            >
              <Text style={{ color: '#007AFF', fontSize: 17 }}>+</Text>
            </TouchableOpacity>
          ),
        }}
      />
      {/* Tab chip switcher */}
      <View style={styles.tabBar}>
        <Pressable
          onPress={() => handleTabPress('income')}
          style={[styles.tabChip, activeTab === 'income' && styles.tabChipActive]}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'income' }}
        >
          <Text style={[styles.tabChipText, activeTab === 'income' && styles.tabChipTextActive]}>
            Income
          </Text>
        </Pressable>
        <Pressable
          onPress={() => handleTabPress('expenses')}
          style={[styles.tabChip, activeTab === 'expenses' && styles.tabChipActive]}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'expenses' }}
        >
          <Text style={[styles.tabChipText, activeTab === 'expenses' && styles.tabChipTextActive]}>
            Expenses
          </Text>
        </Pressable>
      </View>

      {/* Content */}
      {activeTab === 'income' ? <IncomeScreen /> : <ExpenseScreen />}
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  // Tab bar
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C6C6C8',
  },
  tabChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  tabChipActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  tabChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  tabChipTextActive: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
  // Delete action
  deleteContainer: {
    width: 80,
    overflow: 'hidden',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    width: 80,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  // Badge
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 6,
  },
  badgeReceived: {
    backgroundColor: '#dcfce7',
  },
  badgeExpected: {
    backgroundColor: '#fef9c3',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  badgeTextReceived: {
    color: '#166534',
  },
  badgeTextExpected: {
    color: '#854d0e',
  },
  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
  },
  rowLeft: {
    flex: 1,
    marginEnd: 12,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  rowDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  categoryChip: {
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  categoryText: {
    fontSize: 11,
    color: '#374151',
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  rowAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  // List
  listContainer: {
    paddingBottom: 80,
  },
  emptyContainer: {
    flex: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#C6C6C8',
    marginStart: 16,
  },
});
