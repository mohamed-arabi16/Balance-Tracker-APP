import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useClient, useUpdateClient } from '@/hooks/useClients';

const clientSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  email: z.string().email({ message: 'Invalid email address' }).optional().or(z.literal('')),
  phone: z.string().optional(),
  company: z.string().optional(),
  notes: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

export default function ClientEditPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: client, isLoading } = useClient(id!);
  const updateClient = useUpdateClient();

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: { name: '', email: '', phone: '', company: '', notes: '' },
  });

  // CRITICAL: Populate form when data loads (defaultValues only run at init)
  useEffect(() => {
    if (client) {
      form.reset({
        name: client.name,
        email: client.email ?? '',
        phone: client.phone ?? '',
        company: client.company ?? '',
        notes: client.notes ?? '',
      });
    }
  }, [client, form]);

  const onSubmit = (values: ClientFormValues) => {
    updateClient.mutate(
      { id: id!, ...values },
      {
        onSuccess: (updated) => {
          toast.success(t('clients.toast.updateSuccess'));
          navigate(`/clients/${updated.id}`);
        },
        onError: (err) => {
          toast.error(t('clients.toast.updateError', { error: err.message }));
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('clients.edit.title')}</h1>
        <p className="text-muted-foreground">
          {t('clients.edit.subtitle', { name: client?.name ?? '' })}
        </p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('clients.form.name')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('clients.form.placeholder.name')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('clients.form.email')}</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder={t('clients.form.placeholder.email')}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('clients.form.phone')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('clients.form.placeholder.phone')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="company"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('clients.form.company')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('clients.form.placeholder.company')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('clients.form.notes')}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t('clients.form.placeholder.notes')}
                    className="resize-none"
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={updateClient.isPending}>
              {t('common.save')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
