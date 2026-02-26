import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, { useAnimatedStyle } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

import { EmptyState } from '@/components/ui/EmptyState';
import { SafeScreen } from '@/components/layout/SafeScreen';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useDeleteExpense, useExpenses, useUpdateExpense, type Expense } from '@/hooks/useExpenses';
import { haptics } from '@/lib/haptics';

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
        accessibilityLabel="Delete expense"
      >
        <Text style={styles.deleteText}>Delete</Text>
      </Pressable>
    </Reanimated.View>
  );
}

// ─────────────────────────────────────────────
// Inline status badge — toggles pending/paid
// ─────────────────────────────────────────────
interface StatusBadgeProps {
  item: Expense;
}

function StatusBadge({ item }: StatusBadgeProps) {
  const updateExpense = useUpdateExpense();
  const isPaid = item.status === 'paid';

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
      style={[styles.badge, isPaid ? styles.badgePaid : styles.badgePending]}
      accessibilityRole="button"
      accessibilityLabel={`Status: ${item.status}. Tap to toggle.`}
    >
      <Text style={[styles.badgeText, isPaid ? styles.badgeTextPaid : styles.badgeTextPending]}>
        {isPaid ? 'Paid' : 'Pending'}
      </Text>
    </Pressable>
  );
}

// ─────────────────────────────────────────────
// Single expense row with swipe-to-delete
// ─────────────────────────────────────────────
interface ExpenseRowProps {
  item: Expense;
  onDelete: (expense: Expense) => void;
}

function ExpenseRow({ item, onDelete }: ExpenseRowProps) {
  const router = useRouter();
  const { formatCurrency } = useCurrency();

  const formattedDate = format(new Date(item.date), 'MMM d, yyyy');
  const formattedAmount = formatCurrency(item.amount, item.currency);

  const renderRightActions = useCallback(
    (prog: SharedValue<number>, drag: SharedValue<number>) =>
      DeleteAction(prog, drag, () => onDelete(item)),
    [item, onDelete],
  );

  function handlePress() {
    router.push(`/(tabs)/transactions/add-expense?id=${item.id}` as any);
  }

  return (
    <Swipeable
      friction={2}
      rightThreshold={40}
      renderRightActions={renderRightActions}
    >
      <Pressable onPress={handlePress} style={styles.row}>
        <View style={styles.rowLeft}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={styles.rowMeta}>
            <Text style={styles.rowDate}>{formattedDate}</Text>
            <View style={styles.categoryChip}>
              <Text style={styles.categoryText}>{item.category}</Text>
            </View>
            <View style={styles.typeChip}>
              <Text style={styles.typeText}>{item.type}</Text>
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
// Main expense screen (named + default export)
// ─────────────────────────────────────────────
export function ExpenseScreen() {
  const router = useRouter();
  const { data: expenses, isRefetching, refetch } = useExpenses();
  const deleteExpense = useDeleteExpense();

  function handleDelete(expense: Expense) {
    deleteExpense.mutate(expense);
  }

  function handleAddExpense() {
    router.push('/(tabs)/transactions/add-expense' as any);
  }

  const renderItem = useCallback(
    ({ item }: { item: Expense }) => (
      <ExpenseRow item={item} onDelete={handleDelete} />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const keyExtractor = useCallback((item: Expense) => item.id, []);

  return (
    <SafeScreen edges={['bottom']}>
      <FlatList
        data={expenses ?? []}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={
          (expenses?.length ?? 0) === 0 ? styles.emptyContainer : styles.listContainer
        }
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <EmptyState
            title="No expenses yet"
            message="Start tracking your expenses to see them here."
            ctaLabel="Add Expense"
            onCta={handleAddExpense}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
      <TouchableOpacity
        onPress={handleAddExpense}
        style={styles.fab}
        accessibilityRole="button"
        accessibilityLabel="Add Expense"
      >
        <Text style={styles.fabText}>+ Add Expense</Text>
      </TouchableOpacity>
    </SafeScreen>
  );
}

export default ExpenseScreen;

const styles = StyleSheet.create({
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
  badgePaid: {
    backgroundColor: '#dcfce7',
  },
  badgePending: {
    backgroundColor: '#fef9c3',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  badgeTextPaid: {
    color: '#166534',
  },
  badgeTextPending: {
    color: '#854d0e',
  },
  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
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
    flexWrap: 'wrap',
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
  typeChip: {
    backgroundColor: '#ede9fe',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  typeText: {
    fontSize: 11,
    color: '#5b21b6',
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
    height: 1,
    backgroundColor: '#f3f4f6',
    marginStart: 16,
  },
  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    backgroundColor: '#ef4444',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  fabText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
