-- Migration: delete_user_data RPC
-- Atomically deletes all data for the authenticated user then removes the auth user record.
-- Required for Apple App Store Guideline 5.1.1 (in-app account deletion).
--
-- Usage (from client):
--   await supabase.rpc('delete_user_data')
--
-- The function runs as SECURITY DEFINER with search_path = public, auth so it can
-- DELETE from auth.users (requires superuser-level access in Supabase).

CREATE OR REPLACE FUNCTION public.delete_user_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- 1. Delete invoice line items (FK: invoice_items → invoices)
  DELETE FROM public.invoice_items
  WHERE invoice_id IN (
    SELECT id FROM public.invoices WHERE user_id = auth.uid()
  );

  -- 2. Delete invoices
  DELETE FROM public.invoices WHERE user_id = auth.uid();

  -- 3. Delete clients
  DELETE FROM public.clients WHERE user_id = auth.uid();

  -- 4. Delete incomes
  DELETE FROM public.incomes WHERE user_id = auth.uid();

  -- 5. Delete expenses
  DELETE FROM public.expenses WHERE user_id = auth.uid();

  -- 6. Delete debts
  DELETE FROM public.debts WHERE user_id = auth.uid();

  -- 7. Delete assets
  DELETE FROM public.assets WHERE user_id = auth.uid();

  -- 8. Delete user settings
  DELETE FROM public.user_settings WHERE user_id = auth.uid();

  -- 9. Delete recent_activity if the table exists (optional table, added in some migrations)
  DO $$
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'recent_activity'
    ) THEN
      DELETE FROM public.recent_activity WHERE user_id = auth.uid();
    END IF;
  END $$;

  -- 10. Delete the auth user record itself (cascades auth.sessions, auth.identities, etc.)
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

-- Grant execute to authenticated users only (anonymous users cannot call this)
GRANT EXECUTE ON FUNCTION public.delete_user_data() TO authenticated;
