import { useRouter } from 'expo-router';
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
import {
  useInvoices,
  useDeleteInvoice,
  getDisplayStatus,
} from '@/hooks/useInvoices';
import type { Invoice } from '@/hooks/useInvoices';
import { useClients } from '@/hooks/useClients';
import { haptics } from '@/lib/haptics';

// ─── Status badge colors ──────────────────────────────────────────────────────
type DisplayStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

const STATUS_COLORS: Record<DisplayStatus, { bg: string; text: string }> = {
  draft: { bg: '#f3f4f6', text: '#6b7280' },
  sent: { bg: '#dbeafe', text: '#1d4ed8' },
  paid: { bg: '#d1fae5', text: '#065f46' },
  overdue: { bg: '#fee2e2', text: '#b91c1c' },
  cancelled: { bg: '#f3f4f6', text: '#6b7280' },
};

const STATUS_LABELS: Record<DisplayStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
};

// ─── DeleteAction ─────────────────────────────────────────────────────────────
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
        onPress={onDelete}
        style={styles.deleteButton}
        accessibilityRole="button"
        accessibilityLabel="Delete invoice"
      >
        <Text style={styles.deleteText}>Delete</Text>
      </Pressable>
    </Reanimated.View>
  );
}

// ─── InvoiceRow ───────────────────────────────────────────────────────────────
interface InvoiceRowProps {
  item: Invoice;
  clientName: string;
  onDelete: () => void;
}

function InvoiceRow({ item, clientName, onDelete }: InvoiceRowProps) {
  const router = useRouter();
  const displayStatus = getDisplayStatus(item.status, item.due_date);
  const statusColor = STATUS_COLORS[displayStatus];
  const total = `${Number(item.total ?? 0).toFixed(2)} ${item.currency}`;

  const rowContent = (
    <Pressable
      onPress={() => router.push(`/(tabs)/invoices/${item.id}` as any)}
      style={styles.row}
      accessibilityRole="button"
      accessibilityLabel={`View invoice ${item.invoice_number}`}
    >
      <View style={styles.rowTop}>
        <Text style={styles.invoiceNumber} numberOfLines={1}>
          INV-{item.invoice_number}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
          <Text style={[styles.statusText, { color: statusColor.text }]}>
            {STATUS_LABELS[displayStatus]}
          </Text>
        </View>
      </View>
      <View style={styles.rowBottom}>
        <Text style={styles.clientName} numberOfLines={1}>
          {clientName}
        </Text>
        <Text style={styles.total} numberOfLines={1}>
          {total}
        </Text>
      </View>
      {item.issue_date ? (
        <Text style={styles.date}>{item.issue_date}</Text>
      ) : null}
    </Pressable>
  );

  // Only Draft invoices can be swiped to delete
  if (displayStatus === 'draft') {
    return (
      <Swipeable
        friction={2}
        rightThreshold={40}
        renderRightActions={(prog, drag) => DeleteAction(prog, drag, onDelete)}
      >
        {rowContent}
      </Swipeable>
    );
  }

  return rowContent;
}

// ─── InvoicesScreen ───────────────────────────────────────────────────────────
export default function InvoicesScreen() {
  const router = useRouter();

  const { data: invoices, isLoading, isRefetching, refetch } = useInvoices();
  const { data: clients } = useClients();
  const deleteInvoiceMutation = useDeleteInvoice();

  // O(1) client name lookup
  const clientMap: Record<string, string> = React.useMemo(
    () =>
      Object.fromEntries((clients ?? []).map((c) => [c.id, c.name])),
    [clients],
  );

  function handleDelete(item: Invoice) {
    Alert.alert(
      'Delete Invoice',
      `Are you sure you want to delete invoice INV-${item.invoice_number}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            haptics.onDelete();
            deleteInvoiceMutation.mutate(item.id, {
              onError: () => haptics.onError(),
            });
          },
        },
      ],
    );
  }

  return (
    <SafeScreen edges={['bottom']}>
      <FlatList
        data={invoices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <InvoiceRow
            item={item}
            clientName={clientMap[item.client_id] ?? 'Unknown Client'}
            onDelete={() => handleDelete(item)}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        contentContainerStyle={invoices?.length === 0 ? styles.emptyContainer : undefined}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              title="No invoices yet"
              message="Create your first invoice to get started."
              ctaLabel="New Invoice"
              onCta={() => router.push('/(tabs)/invoices/new' as any)}
            />
          ) : null
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Invoices</Text>
            <Pressable
              onPress={() => router.push('/(tabs)/invoices/new' as any)}
              style={styles.addButton}
              accessibilityRole="button"
              accessibilityLabel="Create new invoice"
            >
              <Text style={styles.addButtonText}>+ New Invoice</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#2563eb',
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
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  clientName: {
    fontSize: 13,
    color: '#6b7280',
    flex: 1,
  },
  total: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  date: {
    fontSize: 12,
    color: '#9ca3af',
  },
  separator: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginHorizontal: 16,
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
