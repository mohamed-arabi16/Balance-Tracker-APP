import { useNavigate } from 'react-router-dom';
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
import { useAddClient } from '@/hooks/useClients';

const clientSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  email: z.string().email({ message: 'Invalid email address' }).optional().or(z.literal('')),
  phone: z.string().optional(),
  company: z.string().optional(),
  notes: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

export default function ClientNewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const addClient = useAddClient();

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: { name: '', email: '', phone: '', company: '', notes: '' },
  });

  const onSubmit = (values: ClientFormValues) => {
    addClient.mutate(values, {
      onSuccess: (newClient) => {
        toast.success(t('clients.toast.addSuccess'));
        navigate(`/clients/${newClient.id}`);
      },
      onError: (err) => {
        toast.error(t('clients.toast.addError', { error: err.message }));
      },
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('clients.new.title')}</h1>
        <p className="text-muted-foreground">{t('clients.new.subtitle')}</p>
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
            <Button type="submit" disabled={addClient.isPending}>
              {t('common.save')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
