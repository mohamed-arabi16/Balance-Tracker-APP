import * as z from 'zod';

// ─── Shared Invoice Form Schema ───────────────────────────────────────────────
// Used by both InvoiceNewScreen and InvoiceEditScreen.
// CRITICAL (FIX-01): tax_amount and amount are generated columns — they MUST
// NOT appear in this schema and are never included in INSERT/UPDATE payloads.
//
// NOTE: z.number() is used instead of z.coerce.number() for react-hook-form
// compatibility. react-hook-form stores numbers in state; TextInput values are
// converted via onChangeText with parseFloat() at the field level.
//
// NOTE: No .default() on fields — defaults are provided via useForm defaultValues
// so that input and output types are identical (required for zodResolver compat).

export const lineItemSchema = z.object({
  description: z.string().min(1, 'Description required'),
  quantity: z.number().min(0.01, 'Quantity must be > 0'),
  unit_price: z.number().min(0, 'Unit price must be >= 0'),
});

export const invoiceFormSchema = z.object({
  client_id: z.string().min(1, 'Client required'),
  issue_date: z.string().min(1, 'Issue date required'),
  due_date: z.string().optional(),
  currency: z.enum(['USD', 'TRY']),
  tax_rate: z.number().min(0).max(100),
  notes: z.string().optional(),
  items: z.array(lineItemSchema).min(1, 'At least one line item required'),
});

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;
