import type { InvoiceWithItems } from '@/hooks/useInvoices';

/**
 * Generates a complete HTML document string for expo-print.
 *
 * CRITICAL constraints:
 * 1. NO local file:// URLs — all styles inline, system fonts only
 * 2. English-only output — per i18n design decision
 * 3. Computes subtotal, tax, and total client-side from invoice.items
 *    — does NOT read invoice.total (generated column, can be null)
 * 4. Uses Number(item.amount ?? item.quantity * item.unit_price) for each line item
 */
export function generateInvoiceHtml(
  invoice: InvoiceWithItems,
  clientName: string,
): string {
  // ─── Compute totals from line items ──────────────────────────────────────────
  const subtotal = invoice.items.reduce((sum, item) => {
    const amount = Number(item.amount ?? item.quantity * item.unit_price);
    return sum + amount;
  }, 0);

  const taxRate = Number(invoice.tax_rate ?? 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ─── Status badge color mapping ───────────────────────────────────────────────
  const statusColors: Record<string, { bg: string; text: string }> = {
    draft: { bg: '#f3f4f6', text: '#6b7280' },
    sent: { bg: '#dbeafe', text: '#1d4ed8' },
    paid: { bg: '#d1fae5', text: '#065f46' },
    overdue: { bg: '#fee2e2', text: '#b91c1c' },
    cancelled: { bg: '#f3f4f6', text: '#6b7280' },
  };
  const statusStyle = statusColors[invoice.status] ?? statusColors.draft;
  const statusLabel =
    invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1);

  // ─── Line items rows ──────────────────────────────────────────────────────────
  const lineItemRows = invoice.items
    .map((item) => {
      const amount = Number(item.amount ?? item.quantity * item.unit_price);
      return `
      <tr>
        <td>${item.description}</td>
        <td style="text-align:center;">${item.quantity}</td>
        <td style="text-align:right;">${fmt(Number(item.unit_price))} ${invoice.currency}</td>
        <td style="text-align:right;">${fmt(amount)} ${invoice.currency}</td>
      </tr>`;
    })
    .join('');

  // ─── Tax row (only if tax_rate > 0) ──────────────────────────────────────────
  const taxRow =
    taxRate > 0
      ? `<div class="totals-row">
           <span>Tax (${taxRate}%)</span>
           <span>${fmt(taxAmount)} ${invoice.currency}</span>
         </div>`
      : '';

  // ─── Notes section ────────────────────────────────────────────────────────────
  const notesSection = invoice.notes
    ? `<div class="notes">
         <h3>Notes</h3>
         <p>${invoice.notes}</p>
       </div>`
    : '';

  // ─── Due date ─────────────────────────────────────────────────────────────────
  const dueDateRow = invoice.due_date
    ? `<p class="meta">Due Date: <strong>${invoice.due_date}</strong></p>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, Helvetica, Arial, sans-serif;
      padding: 40px;
      color: #333;
      font-size: 14px;
      line-height: 1.5;
    }
    h1 { font-size: 24px; margin-bottom: 4px; }
    h3 { font-size: 16px; margin-bottom: 8px; color: #555; }
    .meta { color: #666; margin-bottom: 8px; font-size: 13px; }
    .header-section { margin-bottom: 32px; }
    .invoice-title { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .status {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      background: ${statusStyle.bg};
      color: ${statusStyle.text};
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      margin-bottom: 20px;
    }
    th {
      background: #f5f5f5;
      font-weight: 600;
      font-size: 13px;
      color: #555;
    }
    th, td {
      padding: 8px 12px;
      border: 1px solid #ddd;
      text-align: left;
    }
    .totals {
      text-align: right;
      margin-top: 16px;
      margin-bottom: 24px;
    }
    .totals-row {
      display: flex;
      justify-content: flex-end;
      gap: 48px;
      margin-bottom: 4px;
      font-size: 14px;
      color: #555;
    }
    .totals-row.subtotal { border-top: 1px solid #ddd; padding-top: 8px; }
    .totals-row.total-final {
      font-size: 18px;
      font-weight: bold;
      color: #111;
      border-top: 2px solid #333;
      padding-top: 8px;
      margin-top: 4px;
    }
    .notes {
      margin-top: 32px;
      padding: 16px;
      background: #f9fafb;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
    }
    .notes p { color: #555; font-size: 13px; }
    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
  </style>
</head>
<body>
  <div class="header-section">
    <div class="invoice-title">
      <h1>Invoice</h1>
      <span class="status">${statusLabel}</span>
    </div>
    <p class="meta">Invoice #: <strong>${invoice.invoice_number}</strong></p>
    <p class="meta">Bill To: <strong>${clientName}</strong></p>
    ${invoice.issue_date ? `<p class="meta">Issue Date: <strong>${invoice.issue_date}</strong></p>` : ''}
    ${dueDateRow}
  </div>

  <hr class="divider"/>

  <h3>Line Items</h3>
  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th style="text-align:center; width:60px;">Qty</th>
        <th style="text-align:right; width:120px;">Unit Price</th>
        <th style="text-align:right; width:120px;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${lineItemRows}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row subtotal">
      <span>Subtotal</span>
      <span>${fmt(subtotal)} ${invoice.currency}</span>
    </div>
    ${taxRow}
    <div class="totals-row total-final">
      <span>Total</span>
      <span>${fmt(total)} ${invoice.currency}</span>
    </div>
  </div>

  ${notesSection}
</body>
</html>`;
}
