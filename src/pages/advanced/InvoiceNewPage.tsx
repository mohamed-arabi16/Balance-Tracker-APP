import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
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
import { useAddInvoice } from '@/hooks/useInvoices';
import { useClients } from '@/hooks/useClients';
import { InvoiceLineItemsField } from '@/components/invoice/InvoiceLineItemsField';

// ─── Zod Schema ───────────────────────────────────────────────────────────────

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

export default function InvoiceNewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const addInvoice = useAddInvoice();
  const { data: clients = [] } = useClients();

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      client_id: '',
      issue_date: new Date().toISOString().split('T')[0],
      due_date: '',
      currency: 'USD',
      tax_rate: 0,
      notes: '',
      items: [{ description: '', quantity: 1, unit_price: 0 }],
    },
  });

  const onSubmit = (values: InvoiceFormValues) => {
    addInvoice.mutate(
      {
        client_id: values.client_id,
        issue_date: values.issue_date,
        due_date: values.due_date || null,
        currency: values.currency,
        tax_rate: values.tax_rate,
        notes: values.notes || null,
        items: values.items,
      },
      {
        onSuccess: (invoice) => {
          toast.success(t('invoices.toast.addSuccess'));
          navigate(`/invoices/${invoice.id}`);
        },
        onError: (err) => {
          toast.error(t('invoices.toast.addError', { error: err.message }));
        },
      }
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('invoices.addInvoice')}</h1>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
          {form.formState.errors.items?.root && (
            <p className="text-sm text-destructive">{form.formState.errors.items.root.message}</p>
          )}
          {typeof form.formState.errors.items?.message === 'string' && (
            <p className="text-sm text-destructive">{form.formState.errors.items.message}</p>
          )}

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => navigate('/invoices')}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={addInvoice.isPending}>
              {addInvoice.isPending ? t('common.saving') : t('invoices.addInvoice')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
