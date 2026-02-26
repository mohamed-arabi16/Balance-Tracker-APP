ALTER TABLE debts ADD COLUMN IF NOT EXISTS is_receivable boolean NOT NULL DEFAULT false;
