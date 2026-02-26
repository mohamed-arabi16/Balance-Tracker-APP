import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { isBefore, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/lib/queryKeys';
import type { Database } from '@/integrations/supabase/types';

// ─── Types ───────────────────────────────────────────────────────────────────

export type Invoice = Database['public']['Tables']['invoices']['Row'];
export type InvoiceItem = Database['public']['Tables']['invoice_items']['Row'];

// Composite type used by InvoiceDetailPage and InvoiceEditPage
export type InvoiceWithItems = Invoice & { items: InvoiceItem[] };

// Payload for creating a new invoice (excludes DB-managed fields)
type InvoiceItemCreatePayload = Pick<
  Database['public']['Tables']['invoice_items']['Insert'],
  'description' | 'quantity' | 'unit_price'
>;

type InvoiceCreatePayload = Pick<
  Database['public']['Tables']['invoices']['Insert'],
  'client_id' | 'issue_date' | 'due_date' | 'currency' | 'tax_rate' | 'notes'
> & { items: InvoiceItemCreatePayload[] };

type InvoiceUpdatePayload = Pick<
  Database['public']['Tables']['invoices']['Update'],
  'client_id' | 'issue_date' | 'due_date' | 'currency' | 'tax_rate' | 'notes'
> & { items: InvoiceItemCreatePayload[] };

// ─── Overdue Derivation ───────────────────────────────────────────────────────

/**
 * Derives the display status of an invoice.
 * CRITICAL: 'overdue' is NEVER written to the database. The DB stores 'sent'.
 * This function computes 'overdue' client-side when status === 'sent' and due_date is past.
 */
export function getDisplayStatus(
  status: string,
  due_date: string | null
): 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' {
  if (status === 'sent' && due_date && isBefore(parseISO(due_date), new Date())) {
    return 'overdue';
  }
  return status as 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
}

// ─── 1. useInvoices — fetch all invoices for the current user ─────────────────

const fetchInvoices = async (userId: string): Promise<Invoice[]> => {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data as Invoice[];
};

export const useInvoices = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.invoices(user!.id),
    queryFn: () => fetchInvoices(user!.id),
    enabled: !!user,
  });
};

// ─── 2. useInvoice — fetch single invoice with its line items ─────────────────

const fetchInvoiceById = async (invoiceId: string, userId: string): Promise<InvoiceWithItems> => {
  const { data, error } = await supabase
    .from('invoices')
    .select('*, items:invoice_items(*)')
    .eq('id', invoiceId)
    .eq('user_id', userId)
    .order('sort_order', { referencedTable: 'invoice_items', ascending: true })
    .single();

  if (error) {
    if (error.code === 'PGRST116') throw new Error('Invoice not found');
    throw new Error(error.message);
  }
  return data as unknown as InvoiceWithItems;
};

export const useInvoice = (invoiceId: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...queryKeys.invoices(user!.id), invoiceId],
    queryFn: () => fetchInvoiceById(invoiceId, user!.id),
    enabled: !!user && !!invoiceId,
  });
};

// ─── 3. useAddInvoice — atomic invoice number + invoice + line items ──────────

export const useAddInvoice = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (payload: InvoiceCreatePayload): Promise<Invoice> => {
      // Step 1: Generate invoice number atomically via RPC (SELECT FOR UPDATE)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: invoiceNumber, error: rpcError } = await (supabase as any)
        .rpc('generate_invoice_number', { p_user_id: user!.id });
      if (rpcError) throw new Error(rpcError.message);

      // Step 2: Insert the invoice with the generated number
      const { items, ...invoicePayload } = payload;
      const { data: invoice, error: invError } = await supabase
        .from('invoices')
        .insert([{
          ...invoicePayload,
          user_id: user!.id,
          invoice_number: invoiceNumber as string,
          status: 'draft' as const,
        }])
        .select()
        .single();
      if (invError) throw new Error(invError.message);

      // Step 3: Bulk-insert line items (invoice_items.amount is a generated column — do not include)
      if (items.length > 0) {
        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(
            items.map((item, i) => ({
              description: item.description,
              quantity: item.quantity,
              unit_price: item.unit_price,
              invoice_id: invoice.id,
              user_id: user!.id,
              sort_order: i,
            }))
          );
        if (itemsError) throw new Error(itemsError.message);
      }

      return invoice as Invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices(user!.id) });
    },
  });
};

// ─── 4. useUpdateInvoice — edit Draft invoice fields + replace line items ─────

export const useUpdateInvoice = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: { id: string } & InvoiceUpdatePayload): Promise<Invoice> => {
      const { items, ...invoicePayload } = payload;

      // Update invoice header fields
      const { data: invoice, error: invError } = await supabase
        .from('invoices')
        .update({ ...invoicePayload, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user!.id)
        .select()
        .single();
      if (invError) throw new Error(invError.message);

      // Replace all line items: delete existing then insert new (simplest correct approach)
      const { error: deleteError } = await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', id)
        .eq('user_id', user!.id);
      if (deleteError) throw new Error(deleteError.message);

      if (items.length > 0) {
        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(
            items.map((item, i) => ({
              description: item.description,
              quantity: item.quantity,
              unit_price: item.unit_price,
              invoice_id: id,
              user_id: user!.id,
              sort_order: i,
            }))
          );
        if (itemsError) throw new Error(itemsError.message);
      }

      return invoice as Invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices(user!.id) });
    },
  });
};

// ─── 5. useUpdateInvoiceStatus — status transitions only ─────────────────────
// CRITICAL: only 'sent', 'paid', 'cancelled' are valid writes.
// 'overdue' is NEVER passed to this mutation — it is derived client-side by getDisplayStatus().

export const useUpdateInvoiceStatus = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: 'sent' | 'paid' | 'cancelled';
    }): Promise<Invoice> => {
      const { data, error } = await supabase
        .from('invoices')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user!.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as Invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices(user!.id) });
    },
  });
};

// ─── 6. useDeleteInvoice — delete by id (UI restricts to Draft only) ──────────

export const useDeleteInvoice = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (invoiceId: string): Promise<void> => {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId)
        .eq('user_id', user!.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices(user!.id) });
    },
  });
};
