-- =============================================================================
-- Migration: Advanced Mode Schema (Phase 1)
-- Applied: via Supabase Dashboard SQL Editor (supabase CLI not installed)
-- Execution order: user_settings column → enum → clients → invoices →
--                  invoice_items → incomes.client_id → expenses.client_id
-- =============================================================================

-- Step 1: user_settings.app_mode column
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS app_mode TEXT NOT NULL DEFAULT 'simple';
UPDATE public.user_settings SET app_mode = 'simple' WHERE app_mode IS NULL;

-- Step 2: invoice_status enum
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');

-- Step 3: clients table
CREATE TABLE clients (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name       text        NOT NULL,
    email      text,
    phone      text,
    company    text,
    address    text,
    notes      text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX clients_user_idx ON clients(user_id);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user can manage own clients"
ON clients FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Step 4: invoices table
-- Note: client_id uses ON DELETE RESTRICT — cannot silently orphan an invoice
-- Note: UNIQUE(user_id, invoice_number) enforces no duplicate numbers per user
CREATE TABLE invoices (
    id             uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        uuid           NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id      uuid           NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    invoice_number text           NOT NULL,
    status         invoice_status NOT NULL DEFAULT 'draft',
    currency       currency_code  NOT NULL DEFAULT 'USD',
    issue_date     date           NOT NULL,
    due_date       date,
    subtotal       numeric(14,2)  NOT NULL DEFAULT 0,
    tax_rate       numeric(5,2)   NOT NULL DEFAULT 0,
    tax_amount     numeric(14,2)  GENERATED ALWAYS AS (ROUND(subtotal * tax_rate / 100, 2)) STORED,
    total          numeric(14,2)  GENERATED ALWAYS AS (ROUND(subtotal + (subtotal * tax_rate / 100), 2)) STORED,
    notes          text,
    created_at     timestamptz    NOT NULL DEFAULT now(),
    updated_at     timestamptz    NOT NULL DEFAULT now(),
    UNIQUE (user_id, invoice_number)
);
CREATE INDEX invoices_user_idx   ON invoices(user_id);
CREATE INDEX invoices_client_idx ON invoices(client_id);
CREATE INDEX invoices_status_idx ON invoices(user_id, status);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user can manage own invoices"
ON invoices FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Step 5: invoice_items table
-- Note: user_id is denormalized (derivable via invoice_id) but required for direct RLS
--       (same pattern as debt_amount_history and income_amount_history)
CREATE TABLE invoice_items (
    id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id  uuid          NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    user_id     uuid          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    description text          NOT NULL,
    quantity    numeric       NOT NULL DEFAULT 1,
    unit_price  numeric(14,2) NOT NULL,
    amount      numeric(14,2) GENERATED ALWAYS AS (ROUND(quantity * unit_price, 2)) STORED,
    sort_order  integer       NOT NULL DEFAULT 0
);
CREATE INDEX invoice_items_invoice_idx ON invoice_items(invoice_id);

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user can manage own invoice items"
ON invoice_items FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Step 6: incomes.client_id nullable FK
-- Note: ON DELETE SET NULL — deleting a client preserves income history
ALTER TABLE incomes
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id) ON DELETE SET NULL;
CREATE INDEX incomes_client_idx ON incomes(client_id) WHERE client_id IS NOT NULL;

-- Step 7: expenses.client_id nullable FK
-- Note: ON DELETE SET NULL — deleting a client preserves expense history
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id) ON DELETE SET NULL;
CREATE INDEX expenses_client_idx ON expenses(client_id) WHERE client_id IS NOT NULL;
