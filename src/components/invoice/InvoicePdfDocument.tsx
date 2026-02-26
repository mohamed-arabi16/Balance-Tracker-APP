// WARNING: Import this file ONLY via dynamic import() — never statically.
// Static import would bundle @react-pdf/renderer into the main chunk (~450 KB).
import { Document, Page, View, Text, StyleSheet, Font } from '@react-pdf/renderer';

// Register Noto Sans font for cross-platform text rendering
// Font.register runs once at module initialization — not inside render
Font.register({
  family: 'NotoSans',
  fonts: [
    {
      src: 'https://fonts.gstatic.com/s/notosans/v27/o-0IIpQlx3QUlC5A4PNr4AxMTSo.ttf',
      fontWeight: 400,
    },
    {
      src: 'https://fonts.gstatic.com/s/notosans/v27/o-0JIpQlx3QUlC5A4PNjDhFSZwp1W0.ttf',
      fontWeight: 700,
    },
  ],
});

const styles = StyleSheet.create({
  page:     { padding: 40, fontFamily: 'NotoSans', fontSize: 10, color: '#1a1a1a' },
  header:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28 },
  title:    { fontSize: 24, fontWeight: 700 },
  metaBlock: { alignItems: 'flex-end' },
  metaRow:  { flexDirection: 'row', gap: 8, marginBottom: 2 },
  metaLabel: { color: '#666', width: 70 },
  metaValue: { fontWeight: 700 },
  sectionLabel: { fontSize: 9, color: '#666', marginBottom: 6, textTransform: 'uppercase' },
  clientBlock: { marginBottom: 24 },
  clientName: { fontWeight: 700, fontSize: 12 },
  clientSub:  { color: '#444', marginTop: 2 },
  table:    { marginTop: 16 },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: 6, marginBottom: 4 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0', paddingVertical: 5 },
  col1:     { flex: 3, paddingRight: 8 },
  col2:     { flex: 1, textAlign: 'right' },
  col3:     { flex: 1, textAlign: 'right' },
  col4:     { flex: 1, textAlign: 'right' },
  colHeader: { fontWeight: 700, fontSize: 9, color: '#555' },
  totalsBlock: { marginTop: 16, alignItems: 'flex-end' },
  totalRow: { flexDirection: 'row', gap: 24, marginBottom: 3 },
  totalLabel: { color: '#555', width: 80, textAlign: 'right' },
  totalValue: { width: 80, textAlign: 'right' },
  grandTotal: { fontWeight: 700, fontSize: 12 },
  notes:    { marginTop: 24, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 12 },
  notesLabel: { fontWeight: 700, marginBottom: 4 },
});

interface PdfItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount?: number | null;
}

interface PdfClient {
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
}

interface PdfInvoice {
  invoice_number: string;
  issue_date: string;
  due_date?: string | null;
  currency: string;
  subtotal?: number | null;
  tax_rate?: number | null;
  tax_amount?: number | null;
  total?: number | null;
  notes?: string | null;
}

interface InvoicePdfDocumentProps {
  invoice: PdfInvoice;
  client: PdfClient;
  items: PdfItem[];
}

export function InvoicePdfDocument({ invoice, client, items }: InvoicePdfDocumentProps) {
  const subtotal = Number(invoice.subtotal ?? 0);
  const taxRate  = Number(invoice.tax_rate ?? 0);
  const taxAmount = Number(invoice.tax_amount ?? subtotal * (taxRate / 100));
  const total    = Number(invoice.total ?? subtotal + taxAmount);
  const currency = invoice.currency ?? '';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header: Title + Invoice meta */}
        <View style={styles.header}>
          <Text style={styles.title}>INVOICE</Text>
          <View style={styles.metaBlock}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Invoice #</Text>
              <Text style={styles.metaValue}>{invoice.invoice_number}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Issued</Text>
              <Text style={styles.metaValue}>{invoice.issue_date}</Text>
            </View>
            {invoice.due_date && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Due</Text>
                <Text style={styles.metaValue}>{invoice.due_date}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Bill To */}
        <View style={styles.clientBlock}>
          <Text style={styles.sectionLabel}>Bill To</Text>
          <Text style={styles.clientName}>{client.name}</Text>
          {client.company && <Text style={styles.clientSub}>{client.company}</Text>}
          {client.email && <Text style={styles.clientSub}>{client.email}</Text>}
          {client.phone && <Text style={styles.clientSub}>{client.phone}</Text>}
        </View>

        {/* Line items table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.col1, styles.colHeader]}>Description</Text>
            <Text style={[styles.col2, styles.colHeader]}>Qty</Text>
            <Text style={[styles.col3, styles.colHeader]}>Rate</Text>
            <Text style={[styles.col4, styles.colHeader]}>Amount</Text>
          </View>
          {items.map((item, idx) => {
            const amount = item.amount ?? item.quantity * item.unit_price;
            return (
              <View key={String(idx)} style={styles.tableRow}>
                <Text style={styles.col1}>{item.description}</Text>
                <Text style={styles.col2}>{item.quantity}</Text>
                <Text style={styles.col3}>{currency} {Number(item.unit_price).toFixed(2)}</Text>
                <Text style={styles.col4}>{currency} {Number(amount).toFixed(2)}</Text>
              </View>
            );
          })}
        </View>

        {/* Totals */}
        <View style={styles.totalsBlock}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{currency} {subtotal.toFixed(2)}</Text>
          </View>
          {taxRate > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax ({taxRate}%)</Text>
              <Text style={styles.totalValue}>{currency} {taxAmount.toFixed(2)}</Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, styles.grandTotal]}>Total</Text>
            <Text style={[styles.totalValue, styles.grandTotal]}>{currency} {total.toFixed(2)}</Text>
          </View>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={styles.notes}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text>{invoice.notes}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
