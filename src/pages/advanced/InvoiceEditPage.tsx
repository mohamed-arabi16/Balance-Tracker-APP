import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useInvoice, useUpdateInvoice } from '@/hooks/useInvoices';
import { useClients } from '@/hooks/useClients';
import { InvoiceLineItemsField } from '@/components/invoice/InvoiceLineItemsField';

// ─── Zod Schema (identical to InvoiceNewPage) ─────────────────────────────────

const lineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.coerce.number().min(0.01, 'Quantity must be greater than 0'),
  unit_price: z.coerce.number().min(0, 'Rate must be 0 or greater'),
});

const invoiceSchema = z.object({
  client_id: z.string().min(1, 'Client is required'),
  issue_date: z.string().min(1, 'Issue date is required'),
  due_date: z.string().optional(),
  currency: z.enum(['USD', 'TRY']),
  tax_rate: z.coerce.number().min(0).max(100).default(0),
  notes: z.string().optional(),
  items: z.array(lineItemSchema).min(1, 'At least one line item is required'),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

// ─── Page Component ───────────────────────────────────────────────────────────

export default function InvoiceEditPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: invoiceWithItems, isLoading } = useInvoice(id!);
  const { data: clients = [] } = useClients();
  const updateInvoice = useUpdateInvoice();

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      client_id: '',
      issue_date: '',
      due_date: '',
      currency: 'USD',
      tax_rate: 0,
      notes: '',
      items: [{ description: '', quantity: 1, unit_price: 0 }],
    },
  });

  // CRITICAL: Redirect guard — if invoice is not draft, redirect to detail page.
  // This runs AFTER data loads. It prevents editing sent/paid invoices even via direct URL.
  useEffect(() => {
    if (invoiceWithItems && invoiceWithItems.status !== 'draft') {
      toast.error(t('invoices.readOnly.notice'));
      navigate(`/invoices/${id}`, { replace: true });
    }
  }, [invoiceWithItems, id, navigate, t]);

  // Pre-populate form with invoice data once loaded (same pattern as ClientEditPage)
  useEffect(() => {
    if (invoiceWithItems && invoiceWithItems.status === 'draft') {
      form.reset({
        client_id: invoiceWithItems.client_id ?? '',
        issue_date: invoiceWithItems.issue_date ?? '',
        due_date: invoiceWithItems.due_date ?? '',
        currency: (invoiceWithItems.currency as 'USD' | 'TRY') ?? 'USD',
        tax_rate: Number(invoiceWithItems.tax_rate ?? 0),
        notes: invoiceWithItems.notes ?? '',
        items: (invoiceWithItems.items ?? []).map((item) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
        })),
      });
    }
  }, [invoiceWithItems, form]);

  const onSubmit = (values: InvoiceFormValues) => {
    updateInvoice.mutate(
      {
        id: id!,
        client_id: values.client_id,
        issue_date: values.issue_date,
        due_date: values.due_date || null,
        currency: values.currency,
        tax_rate: values.tax_rate,
        notes: values.notes || null,
        items: values.items,
      },
      {
        onSuccess: () => {
          toast.success(t('invoices.toast.updateSuccess'));
          navigate(`/invoices/${id}`);
        },
        onError: (err) => {
          toast.error(t('invoices.toast.updateError', { error: err.message }));
        },
      }
    );
  };

  // Loading skeleton while invoice data loads
  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  // If redirect will fire (non-draft), render nothing while navigating
  if (!invoiceWithItems || invoiceWithItems.status !== 'draft') {
    return null;
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('invoices.actions.edit')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('invoices.number', { number: invoiceWithItems.invoice_number })}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('invoices.form.details')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* Client select */}
              <FormField
                control={form.control}
                name="client_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('invoices.form.client')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('invoices.form.clientPlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}{client.company ? ` — ${client.company}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Issue date */}
              <FormField
                control={form.control}
                name="issue_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('invoices.form.issueDate')}</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Due date (optional) */}
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('invoices.form.dueDate')}</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Currency */}
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('invoices.form.currency')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="TRY">TRY (&#8378;)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tax rate */}
              <FormField
                control={form.control}
                name="tax_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('invoices.form.taxRate')}</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min="0" max="100" step="0.1" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('invoices.form.notes')}</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder={t('invoices.form.notesPlaceholder')}
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Line Items section */}
          <Card>
            <CardContent className="pt-6">
              <InvoiceLineItemsField control={form.control} />
            </CardContent>
          </Card>

          {/* Form-level error for items array */}
          {typeof form.formState.errors.items?.message === 'string' && (
            <p className="text-sm text-destructive">{form.formState.errors.items.message}</p>
          )}

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => navigate(`/invoices/${id}`)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={updateInvoice.isPending}>
              {updateInvoice.isPending ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
