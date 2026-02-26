import { useFieldArray, useWatch, Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';

// The shape of a line item in the form
export interface LineItemFormValues {
  description: string;
  quantity: number;
  unit_price: number;
}

// The parent form must have this shape for items
export interface InvoiceFormWithItems {
  items: LineItemFormValues[];
  tax_rate?: number;
  [key: string]: unknown;
}

interface InvoiceLineItemsFieldProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
  currencySymbol?: string;
}

export function InvoiceLineItemsField({ control, currencySymbol = '' }: InvoiceLineItemsFieldProps) {
  const { t } = useTranslation();

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  // Watch all items for live subtotal calculation
  const items = useWatch({ control, name: 'items' }) as LineItemFormValues[];
  const taxRate = useWatch({ control, name: 'tax_rate' }) as number;

  const subtotal = (items ?? []).reduce((sum, item) => {
    return sum + (Number(item?.quantity) || 0) * (Number(item?.unit_price) || 0);
  }, 0);

  const taxAmount = subtotal * ((Number(taxRate) || 0) / 100);
  const total = subtotal + taxAmount;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{t('invoices.form.items.header')}</h3>
      </div>

      {/* Column headers */}
      <div className="hidden sm:grid grid-cols-[1fr_80px_100px_36px] gap-2 text-sm text-muted-foreground px-1">
        <span>{t('invoices.form.items.description')}</span>
        <span>{t('invoices.form.items.quantity')}</span>
        <span>{t('invoices.form.items.unitPrice')}</span>
        <span />
      </div>

      {/* Line item rows — key={field.id} is REQUIRED for stable identity */}
      {fields.map((field, index) => (
        <div key={field.id} className="grid grid-cols-[1fr_80px_100px_36px] gap-2 items-start">
          <FormField
            control={control}
            name={`items.${index}.description`}
            render={({ field: f }) => (
              <FormItem>
                <FormControl>
                  <Input
                    {...f}
                    placeholder={t('invoices.form.items.placeholder.description')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`items.${index}.quantity`}
            render={({ field: f }) => (
              <FormItem>
                <FormControl>
                  <Input {...f} type="number" min="0.01" step="0.01" placeholder="1" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`items.${index}.unit_price`}
            render={({ field: f }) => (
              <FormItem>
                <FormControl>
                  <Input {...f} type="number" min="0" step="0.01" placeholder="0.00" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => remove(index)}
            disabled={fields.length === 1}
            className="mt-0.5"
            aria-label={t('invoices.form.items.remove')}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append({ description: '', quantity: 1, unit_price: 0 })}
      >
        <Plus className="h-4 w-4 mr-2" />
        {t('invoices.form.items.add')}
      </Button>

      {/* Live totals */}
      <Separator />
      <div className="space-y-1 text-sm text-right">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('invoices.form.subtotal')}</span>
          <span>{currencySymbol}{subtotal.toFixed(2)}</span>
        </div>
        {Number(taxRate) > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('invoices.form.tax')} ({taxRate}%)</span>
            <span>{currencySymbol}{taxAmount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between font-semibold text-base border-t pt-1 mt-1">
          <span>{t('invoices.form.total')}</span>
          <span>{currencySymbol}{total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
