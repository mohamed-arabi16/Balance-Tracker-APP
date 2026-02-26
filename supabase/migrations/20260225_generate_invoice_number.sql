-- Migration: create generate_invoice_number RPC
-- Purpose: atomically generate the next sequential invoice number per user
-- Called from: useAddInvoice mutationFn via supabase.rpc('generate_invoice_number', { p_user_id })

CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_next_number integer;
BEGIN
  -- Lock all invoice rows for this user to prevent concurrent number generation.
  -- SELECT FOR UPDATE serializes concurrent calls; one transaction waits for the other.
  PERFORM id FROM public.invoices
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Find the current maximum numeric invoice number for this user.
  -- The regex guard (invoice_number ~ '^\d+$') safely skips any non-numeric numbers.
  -- COALESCE(MAX(...), 0) + 1 means the first invoice gets number 1.
  SELECT COALESCE(MAX(CAST(invoice_number AS integer)), 0) + 1
  INTO v_next_number
  FROM public.invoices
  WHERE user_id = p_user_id
    AND invoice_number ~ '^\d+$';

  RETURN v_next_number::text;
END;
$$;

-- Grant execute to authenticated users (RLS policies on the table still apply)
GRANT EXECUTE ON FUNCTION public.generate_invoice_number(uuid) TO authenticated;
