import { useInvoices, getDisplayStatus } from '@/hooks/useInvoices';
import { useClients } from '@/hooks/useClients';
import { useCurrency } from '@/contexts/CurrencyContext';
import type { Currency } from '@/contexts/CurrencyContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next';
import { InvoiceStatusBadge } from '@/components/invoice/InvoiceStatusBadge';

function AdvancedDashboardSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-6 bg-gradient-dashboard min-h-screen">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-5 w-96" />
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}

export default function AdvancedDashboard() {
  const { t } = useTranslation();
  const { formatCurrency, convertCurrency } = useCurrency();
  const { data: invoices = [], isLoading: invoicesLoading } = useInvoices();
  const { data: clients = [], isLoading: clientsLoading } = useClients();

  const isLoading = invoicesLoading || clientsLoading;
  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c]));

  // DASH-01: Revenue per client — group paid invoices, convert to display currency, sort descending
  const revenueByClient = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce<Record<string, number>>((acc, inv) => {
      const key = inv.client_id ?? 'unknown';
      const converted = convertCurrency(Number(inv.total ?? 0), inv.currency as Currency);
      acc[key] = (acc[key] ?? 0) + converted;
      return acc;
    }, {});

  const sortedRevenue = Object.entries(revenueByClient)
    .map(([clientId, total]) => ({
      clientId,
      clientName: clientMap[clientId]?.name ?? t('common.notAvailable'),
      total,
    }))
    .sort((a, b) => b.total - a.total);

  // DASH-02: Outstanding invoices — DB status 'sent' (includes both sent and display-overdue)
  // Sort by due_date ascending (soonest due first; null due_date sorted last)
  const outstandingInvoices = invoices
    .filter((inv) => inv.status === 'sent')
    .map((inv) => ({
      ...inv,
      displayStatus: getDisplayStatus(inv.status, inv.due_date),
      clientName: inv.client_id ? (clientMap[inv.client_id]?.name ?? null) : null,
    }))
    .sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });

  const totalOutstanding = outstandingInvoices.reduce(
    (sum, inv) => sum + convertCurrency(Number(inv.total ?? 0), inv.currency as Currency),
    0,
  );

  if (isLoading) return <AdvancedDashboardSkeleton />;

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-gradient-dashboard min-h-screen">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          {t('advancedDashboard.title')}
        </h1>
        <p className="text-muted-foreground">{t('advancedDashboard.subtitle')}</p>
      </div>

      {/* DASH-01: Revenue per Client */}
      <Card>
        <CardHeader>
          <CardTitle>{t('advancedDashboard.revenue.title')}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t('advancedDashboard.revenue.subtitle')}
          </p>
        </CardHeader>
        <CardContent>
          {sortedRevenue.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('advancedDashboard.revenue.empty')}
            </p>
          ) : (
            <div className="space-y-1">
              {sortedRevenue.map(({ clientId, clientName, total }) => (
                <div
                  key={clientId}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <span className="font-medium text-sm">{clientName}</span>
                  <span className="font-bold text-sm">{formatCurrency(total)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* DASH-02: Outstanding Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>{t('advancedDashboard.outstanding.title')}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t('advancedDashboard.outstanding.subtitle')}
          </p>
        </CardHeader>
        <CardContent>
          {outstandingInvoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('advancedDashboard.outstanding.empty')}
            </p>
          ) : (
            <div className="space-y-1">
              {outstandingInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">#{inv.invoice_number}</span>
                      <InvoiceStatusBadge status={inv.displayStatus} />
                    </div>
                    {inv.clientName && (
                      <p className="text-xs text-muted-foreground mt-0.5">{inv.clientName}</p>
                    )}
                    {inv.due_date && (
                      <p className="text-xs text-muted-foreground">
                        {inv.due_date}
                      </p>
                    )}
                  </div>
                  <span className="font-bold text-sm flex-shrink-0 ml-4">
                    {formatCurrency(
                      convertCurrency(Number(inv.total ?? 0), inv.currency as Currency),
                    )}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-3 border-t font-semibold text-sm">
                <span>{t('advancedDashboard.outstanding.total')}</span>
                <span>{formatCurrency(totalOutstanding)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
