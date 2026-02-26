CREATE OR REPLACE FUNCTION set_debt_type_from_due_date()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.due_date IS NULL THEN
    NEW.type := 'short'::debt_type;
  ELSIF NEW.due_date <= (CURRENT_DATE + INTERVAL '365 days') THEN
    NEW.type := 'short'::debt_type;
  ELSE
    NEW.type := 'long'::debt_type;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_debt_type ON debts;

CREATE TRIGGER trg_set_debt_type
BEFORE INSERT OR UPDATE OF due_date
ON debts
FOR EACH ROW
EXECUTE FUNCTION set_debt_type_from_due_date();

UPDATE debts
SET type = CASE
  WHEN due_date IS NULL THEN 'short'::debt_type
  WHEN due_date <= (CURRENT_DATE + INTERVAL '365 days') THEN 'short'::debt_type
  ELSE 'long'::debt_type
END;
