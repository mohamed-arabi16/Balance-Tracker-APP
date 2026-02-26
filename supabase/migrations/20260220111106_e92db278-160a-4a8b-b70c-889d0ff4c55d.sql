
CREATE OR REPLACE FUNCTION update_debt_amount(
    in_debt_id uuid,
    in_new_amount numeric,
    in_note text DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM debts WHERE id = in_debt_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Debt not found or not owned by user';
    END IF;

    UPDATE debts SET amount = in_new_amount WHERE id = in_debt_id;

    INSERT INTO debt_amount_history (debt_id, user_id, amount, note)
    VALUES (in_debt_id, auth.uid(), in_new_amount, COALESCE(in_note,''));
END;
$$;

CREATE OR REPLACE FUNCTION update_income_amount(
    in_income_id uuid,
    in_new_amount numeric,
    in_note text DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM incomes WHERE id = in_income_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Income not found or not owned by user';
    END IF;

    UPDATE incomes SET amount = in_new_amount WHERE id = in_income_id;

    INSERT INTO income_amount_history (income_id, user_id, amount, note)
    VALUES (in_income_id, auth.uid(), in_new_amount, COALESCE(in_note,''));
END;
$$;
