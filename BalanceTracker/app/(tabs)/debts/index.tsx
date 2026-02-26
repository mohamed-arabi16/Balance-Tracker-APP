import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import React from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Reanimated, { useAnimatedStyle } from 'react-native-reanimated';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import type { SharedValue } from 'react-native-reanimated';

import { SafeScreen } from '@/components/layout/SafeScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDebts, useDeleteDebt, useUpdateDebt, Debt } from '@/hooks/useDebts';
import { haptics } from '@/lib/haptics';
import { COLORS } from '@/lib/tokens';

// ─── DeleteAction ────────────────────────────────────────────────────────────
function DeleteAction(
  prog: SharedValue<number>,
  drag: SharedValue<number>,
  onDelete: () => void,
) {
  const styleAnimation = useAnimatedStyle(() => ({
    transform: [{ translateX: drag.value + 80 }],
  }));

  return (
    <Reanimated.View style={[styles.deleteContainer, styleAnimation]}>
      <Pressable
        onPress={() => {
          haptics.onDelete();
          onDelete();
        }}
        style={styles.deleteButton}
        accessibilityRole="button"
        accessibilityLabel="Delete debt"
      >
        <Text style={styles.deleteText}>Delete</Text>
      </Pressable>
    </Reanimated.View>
  );
}

// ─── DebtStatusBadge ─────────────────────────────────────────────────────────
function DebtStatusBadge({ item }: { item: Debt }) {
  const updateDebt = useUpdateDebt();

  function handleToggle() {
    haptics.onToggle();
    const newStatus = item.status === 'pending' ? 'paid' : 'pending';
    updateDebt.mutate({
      id: item.id,
      title: item.title,
      creditor: item.creditor,
      amount: item.amount,
      currency: item.currency,
      type: item.type,
      due_date: item.due_date,
      is_receivable: item.is_receivable,
      status: newStatus,
      note: 'Updated',
    });
  }

  const isPaid = item.status === 'paid';
  return (
    <Pressable
      onPress={handleToggle}
      style={[styles.badge, isPaid ? styles.badgePaid : styles.badgePending]}
      accessibilityRole="button"
      accessibilityLabel={`Status: ${item.status}. Tap to toggle.`}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Text style={[styles.badgeText, isPaid ? styles.badgePaidText : styles.badgePendingText]}>
        {isPaid ? 'Paid' : 'Pending'}
      </Text>
    </Pressable>
  );
}

// ─── DebtRow ─────────────────────────────────────────────────────────────────
function DebtRow({ item, onDelete }: { item: Debt; onDelete: () => void }) {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const rowBg = colorScheme === 'dark' ? COLORS.cellBg.dark : COLORS.cellBg.light;

  const formattedDueDate = item.due_date
    ? format(new Date(item.due_date), 'MMM d, yyyy')
    : 'No due date';

  return (
    <Swipeable
      friction={2}
      rightThreshold={40}
      renderRightActions={(prog, drag) => DeleteAction(prog, drag, onDelete)}
    >
      <Pressable
        onPress={() => router.push(`/(tabs)/debts/${item.id}` as any)}
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: rowBg },
          { opacity: pressed ? 0.7 : 1 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`View payment history for ${item.title}`}
      >
        {/* Top row: title + status badge */}
        <View style={styles.rowTopLine}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <DebtStatusBadge item={item} />
        </View>

        {/* Creditor */}
        <Text style={styles.rowCreditor}>{item.creditor}</Text>

        {/* Amount + currency */}
        <View style={styles.rowMetaLine}>
          <Text style={styles.rowAmount}>
            {item.currency} {item.amount.toLocaleString()}
          </Text>
          {/* Type chip */}
          <View style={styles.typeChip}>
            <Text style={styles.typeChipText}>
              {item.type === 'short' ? 'Short-term' : 'Long-term'}
            </Text>
          </View>
          {/* Receivable label */}
          <Text style={styles.receivableLabel}>
            {item.is_receivable ? 'Owed to me' : 'I owe'}
          </Text>
        </View>

        {/* Due date */}
        <Text style={styles.rowDueDate}>Due: {formattedDueDate}</Text>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <Pressable
            onPress={() => router.push(`/(tabs)/debts/add-debt?id=${item.id}` as any)}
            style={[styles.actionButton, styles.editButton]}
            accessibilityRole="button"
            accessibilityLabel={`Edit debt ${item.title}`}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push(`/(tabs)/debts/payment?id=${item.id}` as any)}
            style={[styles.actionButton, styles.payButton]}
            accessibilityRole="button"
            accessibilityLabel={`Make payment for ${item.title}`}
          >
            <Text style={styles.payButtonText}>Make Payment</Text>
          </Pressable>
        </View>
      </Pressable>
    </Swipeable>
  );
}

// ─── DebtsScreen ─────────────────────────────────────────────────────────────
export default function DebtsScreen() {
  const router = useRouter();
  const { data: debts, isLoading, isRefetching, refetch } = useDebts();
  const deleteDebtMutation = useDeleteDebt();

  function handleDelete(item: Debt) {
    Alert.alert(
      'Delete Debt',
      `Are you sure you want to delete "${item.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteDebtMutation.mutate(item, {
              onError: () => haptics.onError(),
            });
          },
        },
      ],
    );
  }

  return (
    <SafeScreen edges={['bottom']} grouped>
      <FlatList
        data={debts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <DebtRow item={item} onDelete={() => handleDelete(item)} />
        )}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        contentContainerStyle={debts?.length === 0 ? styles.emptyContainer : undefined}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              symbolName="creditcard"
              title="No Debts Yet"
              message="Track debts you owe or are owed to stay on top of your finances."
              ctaLabel="Add Debt"
              onCta={() => router.push('/(tabs)/debts/add-debt' as any)}
            />
          ) : null
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Pressable
              onPress={() => router.push('/(tabs)/debts/add-debt' as any)}
              style={styles.addButton}
              accessibilityRole="button"
              accessibilityLabel="Add new debt"
            >
              <Text style={styles.addButtonText}>+ Add Debt</Text>
            </Pressable>
          </View>
        }
      />
    </SafeScreen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'flex-end',
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 6,
    minHeight: 44,
  },
  rowTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginEnd: 8,
  },
  rowCreditor: {
    fontSize: 14,
    color: '#6b7280',
  },
  rowMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  rowAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  typeChip: {
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  typeChipText: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '500',
  },
  receivableLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  rowDueDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  editButton: {
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
  },
  editButtonText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  payButton: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  payButtonText: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '600',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#C6C6C8',
    marginStart: 16,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 99,
  },
  badgePaid: {
    backgroundColor: '#dcfce7',
  },
  badgePending: {
    backgroundColor: '#fef9c3',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgePaidText: {
    color: '#15803d',
  },
  badgePendingText: {
    color: '#92400e',
  },
  deleteContainer: {
    width: 80,
    height: '100%',
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
});
