-- Drop existing column just in case to be safe, alter to add if it doesn't exist already
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS net_worth_calculation TEXT NOT NULL DEFAULT 'assets_minus_debts';

-- Since there are rows already we can run update just to be safe
UPDATE public.user_settings SET net_worth_calculation = 'assets_minus_debts' WHERE net_worth_calculation IS NULL;
