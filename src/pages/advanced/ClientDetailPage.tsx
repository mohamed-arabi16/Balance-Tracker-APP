import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useClient } from '@/hooks/useClients';
import { queryKeys } from '@/lib/queryKeys';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function ClientDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: client, isLoading: clientLoading } = useClient(id!);

  // Filtered invoices for this client
  const { data: invoices = [] } = useQuery({
    queryKey: [...queryKeys.invoices(user!.id), 'by-client', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, status, total, created_at')
        .eq('user_id', user!.id)
        .eq('client_id', id!)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!user && !!id,
  });

  // Filtered income entries for this client
  const { data: linkedIncomes = [] } = useQuery({
    queryKey: [...queryKeys.incomes(user!.id), 'by-client', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incomes')
        .select('id, title, amount, currency, date')
        .eq('user_id', user!.id)
        .eq('client_id', id!)
        .order('date', { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!user && !!id,
  });

  // Filtered expense entries for this client
  const { data: linkedExpenses = [] } = useQuery({
    queryKey: [...queryKeys.expenses(user!.id), 'by-client', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('id, title, amount, currency, date')
        .eq('user_id', user!.id)
        .eq('client_id', id!)
        .order('date', { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!user && !!id,
  });

  if (clientLoading) {
    return <div className="p-6">{/* Loading skeleton */}</div>;
  }

  if (!client) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Client not found.</p>
        <Button variant="link" onClick={() => navigate('/clients')}>Back to Clients</Button>
      </div>
    );
  }

  const allTransactions = [
    ...linkedIncomes.map(i => ({ ...i, type: 'income' as const })),
    ...linkedExpenses.map(e => ({ ...e, type: 'expense' as const })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{client.name}</h1>
          {client.company && <p className="text-muted-foreground">{client.company}</p>}
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate(`/clients/${id}/edit`)}>
          <Pencil className="h-4 w-4 mr-2" />
          {t('common.edit')}
        </Button>
      </div>

      {/* Client info card */}
      <Card>
        <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {client.email && (
            <div>
              <span className="text-muted-foreground">{t('clients.card.email')}: </span>
              <span>{client.email}</span>
            </div>
          )}
          {client.phone && (
            <div>
              <span className="text-muted-foreground">{t('clients.card.phone')}: </span>
              <span>{client.phone}</span>
            </div>
          )}
          {client.notes && (
            <div className="col-span-full">
              <span className="text-muted-foreground">Notes: </span>
              <span>{client.notes}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoices section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('clients.detail.invoices')}</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('clients.detail.noInvoices')}</p>
          ) : (
            <div className="space-y-2">
              {invoices.map(inv => (
                <div key={inv.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                  <span className="font-medium">#{inv.invoice_number}</span>
                  <Badge variant="secondary">{inv.status}</Badge>
                  <span>{inv.total != null ? `${inv.total}` : '—'}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Linked transactions section (income + expenses combined) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('clients.detail.transactions')}</CardTitle>
        </CardHeader>
        <CardContent>
          {allTransactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('clients.detail.noTransactions')}</p>
          ) : (
            <div className="space-y-2">
              {allTransactions.map(txn => (
                <div key={`${txn.type}-${txn.id}`} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                  <span>{txn.title}</span>
                  <Badge variant={txn.type === 'income' ? 'default' : 'destructive'}>
                    {txn.type}
                  </Badge>
                  <span>{txn.amount} {txn.currency}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
