import { format } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SafeScreen } from '@/components/layout/SafeScreen';
import { useClient } from '@/hooks/useClients';
import { useIncomes } from '@/hooks/useIncomes';
import { useExpenses } from '@/hooks/useExpenses';
import type { Income } from '@/hooks/useIncomes';
import type { Expense } from '@/hooks/useExpenses';

// ─── InfoRow ──────────────────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

// ─── ClientDetailScreen ───────────────────────────────────────────────────────
export default function ClientDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: client, isLoading, isError } = useClient(id);
  const { data: incomes = [] } = useIncomes();
  const { data: expenses = [] } = useExpenses();

  const clientIncomes = incomes.filter((i: Income) => i.client_id === id);
  const clientExpenses = expenses.filter((e: Expense) => e.client_id === id);

  if (isLoading) {
    return (
      <SafeScreen>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </SafeScreen>
    );
  }

  if (isError || !client) {
    return (
      <SafeScreen>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Client not found.</Text>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen edges={['bottom']}>
      <FlatList
        data={[]}
        keyExtractor={() => 'unused'}
        renderItem={null}
        ListHeaderComponent={
          <View>
            {/* ─── Header row ────────────────────────────────────────── */}
            <View style={styles.header}>
              <Text style={styles.clientName}>{client.name}</Text>
              <Pressable
                onPress={() => router.push(`/(tabs)/clients/${id}/edit` as any)}
                style={styles.editButton}
                accessibilityRole="button"
                accessibilityLabel={`Edit client ${client.name}`}
              >
                <Text style={styles.editButtonText}>Edit</Text>
              </Pressable>
            </View>

            {/* ─── Client info ───────────────────────────────────────── */}
            <View style={styles.card}>
              <InfoRow label="Email" value={client.email} />
              <InfoRow label="Phone" value={client.phone} />
              <InfoRow label="Company" value={client.company} />
              <InfoRow label="Address" value={client.address} />
              <InfoRow label="Notes" value={client.notes} />
            </View>

            {/* ─── Linked Income ─────────────────────────────────────── */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Linked Income</Text>
              <Text style={styles.sectionCount}>({clientIncomes.length})</Text>
            </View>
            {clientIncomes.length === 0 ? (
              <Text style={styles.emptySection}>No income linked to this client.</Text>
            ) : (
              clientIncomes.map((item) => (
                <View key={item.id} style={styles.transactionRow}>
                  <View style={styles.transactionLeft}>
                    <Text style={styles.transactionTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.transactionDate}>
                      {format(new Date(item.date), 'MMM d, yyyy')}
                    </Text>
                  </View>
                  <Text style={[styles.transactionAmount, styles.incomeAmount]}>
                    +{item.currency} {item.amount.toLocaleString()}
                  </Text>
                </View>
              ))
            )}

            {/* ─── Linked Expenses ───────────────────────────────────── */}
            <View style={[styles.sectionHeader, styles.sectionHeaderSpaced]}>
              <Text style={styles.sectionTitle}>Linked Expenses</Text>
              <Text style={styles.sectionCount}>({clientExpenses.length})</Text>
            </View>
            {clientExpenses.length === 0 ? (
              <Text style={styles.emptySection}>No expenses linked to this client.</Text>
            ) : (
              clientExpenses.map((item) => (
                <View key={item.id} style={styles.transactionRow}>
                  <View style={styles.transactionLeft}>
                    <Text style={styles.transactionTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.transactionDate}>
                      {format(new Date(item.date), 'MMM d, yyyy')}
                    </Text>
                  </View>
                  <Text style={[styles.transactionAmount, styles.expenseAmount]}>
                    -{item.currency} {item.amount.toLocaleString()}
                  </Text>
                </View>
              ))
            )}

            <View style={styles.bottomPadding} />
          </View>
        }
      />
    </SafeScreen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  clientName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginEnd: 12,
  },
  editButton: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 10,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  card: {
    marginHorizontal: 16,
    marginTop: 4,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    width: 70,
    flexShrink: 0,
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 8,
  },
  sectionHeaderSpaced: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  sectionCount: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptySection: {
    fontSize: 13,
    color: '#9ca3af',
    paddingHorizontal: 16,
    fontStyle: 'italic',
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  transactionLeft: {
    flex: 1,
    marginEnd: 12,
    gap: 2,
  },
  transactionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  transactionDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  incomeAmount: {
    color: '#16a34a',
  },
  expenseAmount: {
    color: '#dc2626',
  },
  bottomPadding: {
    height: 32,
  },
});
