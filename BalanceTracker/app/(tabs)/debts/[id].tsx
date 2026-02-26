import { format } from 'date-fns';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { SafeScreen } from '@/components/layout/SafeScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDebts, DebtAmountHistory } from '@/hooks/useDebts';
import { expenseDebtStatusBadgeClasses } from '@/lib/statusBadgeTheme';

// ─── PaymentHistoryRow ────────────────────────────────────────────────────────
function PaymentHistoryRow({ entry }: { entry: DebtAmountHistory }) {
  const formattedDate = format(new Date(entry.logged_at), 'MMM d, yyyy');
  return (
    <View style={styles.historyRow}>
      <View style={styles.historyLeft}>
        <Text style={styles.historyNote}>{entry.note}</Text>
        <Text style={styles.historyDate}>{formattedDate}</Text>
      </View>
      <Text style={styles.historyAmount}>{entry.amount.toLocaleString()}</Text>
    </View>
  );
}

// ─── DebtDetailScreen ─────────────────────────────────────────────────────────
export default function DebtDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: debts, isLoading } = useDebts();

  const debt = debts?.find((d) => d.id === id);

  if (isLoading) {
    return (
      <SafeScreen edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      </SafeScreen>
    );
  }

  if (!debt) {
    return (
      <SafeScreen edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Debt not found.</Text>
        </View>
      </SafeScreen>
    );
  }

  // Sort payment history by logged_at descending (newest first)
  const history = [...(debt.debt_amount_history ?? [])].sort(
    (a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime(),
  );

  const isPaid = debt.status === 'paid';
  const statusKey = isPaid ? 'paid' : 'pending';
  const statusClasses = expenseDebtStatusBadgeClasses[statusKey];

  return (
    <SafeScreen edges={['bottom']}>
      {/* Debt header */}
      <View style={styles.debtHeader}>
        <Text style={styles.debtTitle}>{debt.title}</Text>
        <Text style={styles.debtCreditor}>{debt.creditor}</Text>
        <View style={styles.debtMetaRow}>
          <Text style={styles.debtAmount}>
            {debt.currency} {debt.amount.toLocaleString()}
          </Text>
          <View style={styles.statusBadge} className={statusClasses.container}>
            <Text style={styles.statusText} className={statusClasses.text}>
              {isPaid ? 'Paid' : 'Pending'}
            </Text>
          </View>
        </View>
        {debt.is_receivable && (
          <Text style={styles.receivableTag}>Owed to me</Text>
        )}
      </View>

      {/* Payment history section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Payment History</Text>
      </View>

      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PaymentHistoryRow entry={item} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={history.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={
          <EmptyState
            title="No Payment History"
            message="Payments recorded for this debt will appear here."
            ctaLabel="Record Payment"
            onCta={() => {}}
          />
        }
      />
    </SafeScreen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  debtHeader: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 4,
  },
  debtTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  debtCreditor: {
    fontSize: 15,
    color: '#6b7280',
  },
  debtMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  debtAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 99,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  receivableTag: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 2,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    flex: 1,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },
  historyLeft: {
    flex: 1,
    gap: 2,
  },
  historyNote: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  historyDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  historyAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  separator: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginHorizontal: 16,
  },
});
