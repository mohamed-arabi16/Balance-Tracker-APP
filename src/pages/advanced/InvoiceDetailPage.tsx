import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Download, Edit, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useInvoice,
  useUpdateInvoiceStatus,
  useDeleteInvoice,
  getDisplayStatus,
} from '@/hooks/useInvoices';
import type { Invoice } from '@/hooks/useInvoices';
import { useClient } from '@/hooks/useClients';
import { useAuth } from '@/contexts/AuthContext';
import { InvoiceStatusBadge } from '@/components/invoice/InvoiceStatusBadge';
import { useAddIncome } from '@/hooks/useIncomes';
import { Currency } from '@/contexts/CurrencyContext';
import i18n from '@/i18n';

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [exporting, setExporting] = useState(false);
  const [showIncomePrompt, setShowIncomePrompt] = useState(false);
  const [paidInvoiceData, setPaidInvoiceData] = useState<Invoice | null>(null);

  const { data: invoiceWithItems, isLoading: invoiceLoading } = useInvoice(id!);
  const { data: client } = useClient(invoiceWithItems?.client_id ?? '');
  const updateStatus = useUpdateInvoiceStatus();
  const deleteInvoice = useDeleteInvoice();
  const addIncome = useAddIncome();

  const isLoading = invoiceLoading;
  const invoice = invoiceWithItems;
  const items = invoice?.items ?? [];
  const displayStatus = invoice ? getDisplayStatus(invoice.status, invoice.due_date) : 'draft';
  const isEditable = invoice?.status === 'draft';

  // PDF export handler — @react-pdf/renderer and InvoicePdfDocument loaded lazily.
  // This keeps @react-pdf/renderer out of the main bundle.
  const handleExportPdf = async () => {
    if (!invoice || !client) return;
    setExporting(true);
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const { InvoicePdfDocument } = await import('@/components/invoice/InvoicePdfDocument');

      const blob = await pdf(
        // @ts-ignore — JSX element created at runtime from dynamically imported component
        <InvoicePdfDocument
          invoice={invoice}
          client={client}
          items={invoice.items ?? []}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoice.invoice_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('PDF generation failed');
    } finally {
      setExporting(false);
    }
  };

  // Status transition handlers
  const handleMarkSent = () => {
    updateStatus.mutate(
      { id: id!, status: 'sent' },
      {
        onSuccess: () => toast.success(t('invoices.toast.statusSuccess')),
        onError: (err) => toast.error(t('invoices.toast.statusError', { error: err.message })),
      }
    );
  };

  const handleMarkPaid = () => {
    updateStatus.mutate(
      { id: id!, status: 'paid' },
      {
        onSuccess: (updated) => {
          toast.success(t('invoices.toast.statusSuccess'));
          setPaidInvoiceData(updated);
          setShowIncomePrompt(true);
        },
        onError: (err) => toast.error(t('invoices.toast.statusError', { error: err.message })),
      }
    );
  };

  const handleDelete = () => {
    if (!window.confirm('Delete this invoice?')) return;
    deleteInvoice.mutate(id!, {
      onSuccess: () => {
        toast.success(t('invoices.toast.deleteSuccess'));
        navigate('/invoices');
      },
      onError: (err) => toast.error(t('invoices.toast.deleteError', { error: err.message })),
    });
  };

  // Paid → income prompt: creates an income entry via useAddIncome (not raw Supabase)
  // useAddIncome also creates the income_amount_history record
  const handleCreateIncome = () => {
    if (!paidInvoiceData) return;
    addIncome.mutate(
      {
        title: `Invoice #${paidInvoiceData.invoice_number}`,
        amount: Number(paidInvoiceData.total ?? paidInvoiceData.subtotal ?? 0),
        currency: paidInvoiceData.currency as Currency,
        category: 'invoice',
        status: 'received',
        date: new Date().toISOString().split('T')[0],
        client_id: paidInvoiceData.client_id ?? null,
        user_id: user!.id,
      },
      {
        onSuccess: () => {
          toast.success(t('income.toast.addSuccess'));
          setShowIncomePrompt(false);
        },
        onError: (err) => {
          toast.error(err.message);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!invoice) {
    return <div className="p-4 sm:p-6">Invoice not found.</div>;
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      {/* Header: invoice number + status badge + action buttons */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">
              {t('invoices.number', { number: invoice.invoice_number })}
            </h1>
            <InvoiceStatusBadge status={displayStatus} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {t('invoices.detail.issuedOn')}: {invoice.issue_date}
            {invoice.due_date && ` · ${t('invoices.detail.dueOn')}: ${invoice.due_date}`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* PDF Export button — always visible */}
          <Button
            variant="outline"
            onClick={handleExportPdf}
            disabled={exporting}
          >
            {exporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('invoices.pdf.exporting')}
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                {t('invoices.actions.exportPdf')}
              </>
            )}
          </Button>

          {/* Edit button — Draft only */}
          {isEditable && (
            <Button
              variant="outline"
              onClick={() => navigate(`/invoices/${id}/edit`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              {t('invoices.actions.edit')}
            </Button>
          )}

          {/* Mark as Sent — Draft only */}
          {invoice.status === 'draft' && (
            <Button onClick={handleMarkSent} disabled={updateStatus.isPending}>
              {t('invoices.actions.markSent')}
            </Button>
          )}

          {/* Mark as Paid — Sent only (overdue is still status=sent in DB) */}
          {invoice.status === 'sent' && (
            <Button onClick={handleMarkPaid} disabled={updateStatus.isPending}>
              {t('invoices.actions.markPaid')}
            </Button>
          )}

          {/* Delete — Draft only */}
          {invoice.status === 'draft' && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteInvoice.isPending}
            >
              {t('invoices.actions.delete')}
            </Button>
          )}
        </div>
      </div>

      {/* Arabic PDF notice — PDF is generated in English only */}
      {i18n.language === 'ar' && (
        <p className="text-xs text-muted-foreground">{t('invoices.pdf.arabicNotice')}</p>
      )}

      {/* Read-only notice for sent/paid/cancelled invoices (INV-04) */}
      {!isEditable && invoice.status !== 'draft' && (
        <div className="rounded-md bg-muted px-4 py-2 text-sm text-muted-foreground">
          {t('invoices.readOnly.notice')}
        </div>
      )}

      {/* Bill To */}
      {client && (
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
            {t('invoices.detail.billTo')}
          </p>
          <p className="font-semibold">{client.name}</p>
          {client.company && (
            <p className="text-sm text-muted-foreground">{client.company}</p>
          )}
          {client.email && (
            <p className="text-sm text-muted-foreground">{client.email}</p>
          )}
        </div>
      )}

      {/* Line items table — read-only */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">
                {t('invoices.form.items.description')}
              </th>
              <th className="text-right p-3 font-medium">
                {t('invoices.form.items.quantity')}
              </th>
              <th className="text-right p-3 font-medium">
                {t('invoices.form.items.unitPrice')}
              </th>
              <th className="text-right p-3 font-medium">
                {t('invoices.form.items.amount')}
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="p-3">{item.description}</td>
                <td className="p-3 text-right">{item.quantity}</td>
                <td className="p-3 text-right">{Number(item.unit_price).toFixed(2)}</td>
                <td className="p-3 text-right font-medium">
                  {Number(item.amount ?? item.quantity * item.unit_price).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="space-y-1 text-sm text-right">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('invoices.form.subtotal')}</span>
          <span>{Number(invoice.subtotal ?? 0).toFixed(2)}</span>
        </div>
        {Number(invoice.tax_rate) > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {t('invoices.form.tax')} ({invoice.tax_rate}%)
            </span>
            <span>{Number(invoice.tax_amount ?? 0).toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-base border-t pt-1">
          <span>{t('invoices.form.total')}</span>
          <span>{Number(invoice.total ?? invoice.subtotal ?? 0).toFixed(2)}</span>
        </div>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Notes</p>
          <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
        </div>
      )}

      {/* Paid → Income AlertDialog (INV-06) */}
      <AlertDialog open={showIncomePrompt} onOpenChange={setShowIncomePrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('invoices.paidPrompt.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('invoices.paidPrompt.description', {
                amount: `${paidInvoiceData?.currency ?? ''} ${Number(paidInvoiceData?.total ?? 0).toFixed(2)}`,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('invoices.paidPrompt.dismiss')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCreateIncome}
              disabled={addIncome.isPending}
            >
              {t('invoices.paidPrompt.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
