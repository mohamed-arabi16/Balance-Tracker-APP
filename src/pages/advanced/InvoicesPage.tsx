import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useInvoices, getDisplayStatus } from '@/hooks/useInvoices';
import { useClients } from '@/hooks/useClients';
import { InvoiceStatusBadge } from '@/components/invoice/InvoiceStatusBadge';
import { useCurrency } from '@/contexts/CurrencyContext';

type FilterTab = 'all' | 'draft' | 'sentAndOverdue' | 'paid';

export default function InvoicesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const { data: invoices = [], isLoading } = useInvoices();
  const { data: clients = [] } = useClients();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  // Build a client map for O(1) lookups by id
  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c]));

  const filteredInvoices = invoices.filter((inv) => {
    const display = getDisplayStatus(inv.status, inv.due_date);
    if (activeTab === 'all') return true;
    if (activeTab === 'draft') return display === 'draft';
    if (activeTab === 'sentAndOverdue') return display === 'sent' || display === 'overdue';
    if (activeTab === 'paid') return display === 'paid';
    return true;
  });

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('invoices.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('invoices.subtitle')}</p>
        </div>
        <Button onClick={() => navigate('/invoices/new')}>
          <Plus className="h-4 w-4 mr-2" />
          {t('invoices.addInvoice')}
        </Button>
      </div>

      {/* Filter Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FilterTab)}>
        <TabsList>
          <TabsTrigger value="all">{t('invoices.filter.all')}</TabsTrigger>
          <TabsTrigger value="draft">{t('invoices.filter.draft')}</TabsTrigger>
          <TabsTrigger value="sentAndOverdue">{t('invoices.filter.sentAndOverdue')}</TabsTrigger>
          <TabsTrigger value="paid">{t('invoices.filter.paid')}</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredInvoices.length === 0 && (
        <div className="text-center py-12">
          <p className="text-lg font-medium">{t('invoices.empty.title')}</p>
          <p className="text-sm text-muted-foreground mt-1">{t('invoices.empty.description')}</p>
        </div>
      )}

      {/* Invoice List */}
      {!isLoading && filteredInvoices.length > 0 && (
        <div className="space-y-3">
          {filteredInvoices.map((invoice) => {
            const displayStatus = getDisplayStatus(invoice.status, invoice.due_date);
            const client = invoice.client_id ? clientMap[invoice.client_id] : null;

            return (
              <div
                key={invoice.id}
                className="border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/invoices/${invoice.id}`)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">
                        {t('invoices.number', { number: invoice.invoice_number })}
                      </span>
                      <InvoiceStatusBadge status={displayStatus} />
                    </div>
                    {client && (
                      <p className="text-sm text-muted-foreground mt-0.5 truncate">{client.name}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">{invoice.issue_date}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="font-bold text-lg">
                      {formatCurrency(Number(invoice.total ?? invoice.subtotal ?? 0))}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
