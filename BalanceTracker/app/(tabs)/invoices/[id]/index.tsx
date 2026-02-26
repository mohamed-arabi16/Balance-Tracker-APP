import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { SafeScreen } from '@/components/layout/SafeScreen';
import {
  useInvoice,
  useUpdateInvoiceStatus,
  getDisplayStatus,
} from '@/hooks/useInvoices';
import { useClients } from '@/hooks/useClients';
import { haptics } from '@/lib/haptics';
import { generateInvoiceHtml } from '@/lib/pdfTemplate';
import {
  invoiceStatusBadgeClasses,
  type InvoiceDisplayStatus,
} from '@/lib/statusBadgeTheme';

const STATUS_LABELS: Record<InvoiceDisplayStatus, string> = {
  draft:     'Draft',
  sent:      'Sent',
  paid:      'Paid',
  overdue:   'Overdue',
  cancelled: 'Cancelled',
};

// ─── Inline status transition map ─────────────────────────────────────────────
// CRITICAL: overdue maps to 'paid' — 'overdue' is display-only, never written to DB
const nextStatusMap: Record<string, 'sent' | 'paid' | null> = {
  draft:     'sent',
  sent:      'paid',
  overdue:   'paid',   // overdue is display-only; DB write is 'paid'
  paid:      null,
  cancelled: null,
};

const nextStatusLabel: Record<string, string> = {
  draft:   'Mark Sent',
  sent:    'Mark Paid',
  overdue: 'Mark Paid',
};

// ─── InvoiceDetailScreen ──────────────────────────────────────────────────────
export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const {
    data: invoice,
    isLoading,
    isError,
    error,
  } = useInvoice(id ?? '');

  const { data: clients } = useClients();
  const updateStatus = useUpdateInvoiceStatus();

  // O(1) client name lookup
  const clientMap: Record<string, string> = React.useMemo(
    () => Object.fromEntries((clients ?? []).map((c) => [c.id, c.name])),
    [clients],
  );

  // ─── Loading / Error states ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <SafeScreen>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeScreen>
    );
  }

  if (isError || !invoice) {
    return (
      <SafeScreen>
        <View style={styles.centered}>
          <Text style={styles.errorText}>
            {(error as Error)?.message ?? 'Invoice not found'}
          </Text>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeScreen>
    );
  }

  // Narrow invoice to non-undefined for closures below
  const inv = invoice;

  // ─── Computed values ───────────────────────────────────────────────────────
  const displayStatus = getDisplayStatus(inv.status, inv.due_date);
  const statusClasses = invoiceStatusBadgeClasses[displayStatus];
  const clientName = clientMap[inv.client_id] ?? 'Unknown Client';

  const subtotal = inv.items.reduce((sum, item) => {
    const amount = Number(item.amount ?? item.quantity * item.unit_price);
    return sum + amount;
  }, 0);
  const taxRate = Number(inv.tax_rate ?? 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ─── Status toggle ─────────────────────────────────────────────────────────
  const nextStatus = nextStatusMap[displayStatus] ?? null;

  function handleStatusToggle() {
    if (!nextStatus) return;
    haptics.onToggle();
    updateStatus.mutate(
      { id: inv.id, status: nextStatus },
      { onError: () => haptics.onError() },
    );
  }

  // ─── PDF Export ────────────────────────────────────────────────────────────
  async function handleExportPdf() {
    try {
      const html = generateInvoiceHtml(inv, clientName);
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        UTI: 'com.adobe.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `Invoice ${inv.invoice_number}`,
      });
    } catch (err) {
      haptics.onError();
      Alert.alert('Export Failed', (err as Error).message);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeScreen edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Section 1: Header ─────────────────────────────────────────── */}
        <View style={styles.headerSection}>
          <View style={styles.headerRow}>
            <Text style={styles.invoiceNumber}>
              INV-{inv.invoice_number}
            </Text>
            <View style={styles.statusBadge} className={statusClasses.container}>
              <Text style={styles.statusText} className={statusClasses.text}>
                {STATUS_LABELS[displayStatus]}
              </Text>
            </View>
          </View>

          {/* Edit button — only for Draft invoices */}
          {displayStatus === 'draft' && (
            <TouchableOpacity
              onPress={() =>
                router.push(`/(tabs)/invoices/${inv.id}/edit` as any)
              }
              style={styles.editButton}
              accessibilityRole="button"
              accessibilityLabel="Edit invoice"
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Section 2: Client + Dates ─────────────────────────────────── */}
        <View style={styles.metaSection}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Bill To</Text>
            <Text style={styles.metaValue}>{clientName}</Text>
          </View>
          {inv.issue_date ? (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Issue Date</Text>
              <Text style={styles.metaValue}>{inv.issue_date}</Text>
            </View>
          ) : null}
          {inv.due_date ? (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Due Date</Text>
              <Text
                style={[
                  styles.metaValue,
                  displayStatus === 'overdue' && styles.overdueText,
                ]}
              >
                {inv.due_date}
              </Text>
            </View>
          ) : null}
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Currency</Text>
            <Text style={styles.metaValue}>{inv.currency}</Text>
          </View>
        </View>

        {/* ── Section 3: Line Items ─────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Line Items</Text>

          {/* Table header */}
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCell, styles.tableHeaderText, styles.descCell]}>
              Description
            </Text>
            <Text
              style={[
                styles.tableCell,
                styles.tableHeaderText,
                styles.qtyCell,
                styles.textCenter,
              ]}
            >
              Qty
            </Text>
            <Text
              style={[
                styles.tableCell,
                styles.tableHeaderText,
                styles.priceCell,
                styles.textRight,
              ]}
            >
              Unit Price
            </Text>
            <Text
              style={[
                styles.tableCell,
                styles.tableHeaderText,
                styles.amountCell,
                styles.textRight,
              ]}
            >
              Amount
            </Text>
          </View>

          {/* Table rows */}
          {inv.items.map((item) => {
            const amount = Number(
              item.amount ?? item.quantity * item.unit_price,
            );
            return (
              <View key={item.id} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.descCell]} numberOfLines={2}>
                  {item.description}
                </Text>
                <Text
                  style={[styles.tableCell, styles.qtyCell, styles.textCenter]}
                >
                  {item.quantity}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    styles.priceCell,
                    styles.textRight,
                  ]}
                >
                  {fmt(Number(item.unit_price))}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    styles.amountCell,
                    styles.textRight,
                  ]}
                >
                  {fmt(amount)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* ── Section 4: Totals ─────────────────────────────────────────── */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>
              {fmt(subtotal)} {inv.currency}
            </Text>
          </View>
          {taxRate > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax ({taxRate}%)</Text>
              <Text style={styles.totalValue}>
                {fmt(taxAmount)} {inv.currency}
              </Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.totalFinalRow]}>
            <Text style={styles.totalFinalLabel}>Total</Text>
            <Text style={styles.totalFinalValue}>
              {fmt(total)} {inv.currency}
            </Text>
          </View>
        </View>

        {/* ── Section 5: Notes ──────────────────────────────────────────── */}
        {inv.notes ? (
          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{inv.notes}</Text>
          </View>
        ) : null}

        {/* ── Section 6: Action Buttons ─────────────────────────────────── */}
        <View style={styles.actionsSection}>
          {/* Status toggle button — only shown when transition is available */}
          {nextStatus !== null && (
            <TouchableOpacity
              onPress={handleStatusToggle}
              disabled={updateStatus.isPending}
              style={[
                styles.actionButton,
                styles.statusButton,
                updateStatus.isPending && styles.buttonDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel={nextStatusLabel[displayStatus]}
            >
              {updateStatus.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.actionButtonText}>
                  {nextStatusLabel[displayStatus]}
                </Text>
              )}
            </TouchableOpacity>
          )}

          {/* Export PDF button */}
          <TouchableOpacity
            onPress={handleExportPdf}
            style={[styles.actionButton, styles.exportButton]}
            accessibilityRole="button"
            accessibilityLabel="Export PDF"
          >
            <Text style={[styles.actionButtonText, styles.exportButtonText]}>
              Export PDF
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeScreen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },

  // Header
  headerSection: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  invoiceNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  editButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  editButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Meta
  metaSection: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  metaValue: {
    fontSize: 13,
    color: '#111',
    fontWeight: '500',
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  overdueText: {
    color: '#b91c1c',
  },

  // Section
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },

  // Table
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 8,
  },
  tableHeader: {
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    borderBottomWidth: 2,
    borderBottomColor: '#d1d5db',
  },
  tableCell: {
    fontSize: 13,
    color: '#374151',
    paddingHorizontal: 4,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  descCell: { flex: 3 },
  qtyCell:  { flex: 1 },
  priceCell: { flex: 2 },
  amountCell: { flex: 2 },
  textCenter: { textAlign: 'center' },
  textRight:  { textAlign: 'right' },

  // Totals
  totalsSection: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
    marginBottom: 20,
    gap: 6,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  totalLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  totalValue: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  totalFinalRow: {
    borderTopWidth: 2,
    borderTopColor: '#374151',
    paddingTop: 8,
    marginTop: 4,
  },
  totalFinalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  totalFinalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },

  // Notes
  notesSection: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  notesText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 20,
  },

  // Actions
  actionsSection: {
    gap: 12,
  },
  actionButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusButton: {
    backgroundColor: '#007AFF',
  },
  exportButton: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#007AFF',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  exportButtonText: {
    color: '#007AFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
