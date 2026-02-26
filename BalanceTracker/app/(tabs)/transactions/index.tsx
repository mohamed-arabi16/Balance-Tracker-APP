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
import { useDeleteIncome, useIncomes, useUpdateIncome, type Income } from '@/hooks/useIncomes';
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
// Main income screen
// ─────────────────────────────────────────────
export default function IncomeScreen() {
  const router = useRouter();
  const { data: incomes, isRefetching, refetch } = useIncomes();
  const deleteIncome = useDeleteIncome();

  function handleDelete(income: Income) {
    deleteIncome.mutate(income);
  }

  function handleAddIncome() {
    router.push('/(tabs)/transactions/add-income' as any);
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
    <SafeScreen edges={['bottom']}>
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
            title="No income yet"
            message="Start tracking your income to see it here."
            ctaLabel="Add Income"
            onCta={handleAddIncome}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
      <TouchableOpacity
        onPress={handleAddIncome}
        style={styles.fab}
        accessibilityRole="button"
        accessibilityLabel="Add Income"
      >
        <Text style={styles.fabText}>+ Add Income</Text>
      </TouchableOpacity>
    </SafeScreen>
  );
}

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
    height: 1,
    backgroundColor: '#f3f4f6',
    marginStart: 16,
  },
  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    backgroundColor: '#2563eb',
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
