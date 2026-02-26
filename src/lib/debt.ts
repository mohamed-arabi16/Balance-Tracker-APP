import { addDays, isAfter } from "date-fns";

export type DebtType = "short" | "long";

export const SHORT_TERM_DEBT_DAYS = 365;
export const SHORT_TERM_DEBT_SUBTITLE = "Due within 1 year";
export const LONG_TERM_DEBT_SUBTITLE = "Due after 1 year";

export const getDebtTypeFromDueDate = (
  dueDate: Date | string | null | undefined,
  referenceDate: Date = new Date(),
): DebtType => {
  if (!dueDate) {
    return "short";
  }

  const parsedDueDate = dueDate instanceof Date ? dueDate : new Date(dueDate);
  if (Number.isNaN(parsedDueDate.getTime())) {
    return "short";
  }

  const shortTermThreshold = addDays(referenceDate, SHORT_TERM_DEBT_DAYS);
  return isAfter(parsedDueDate, shortTermThreshold) ? "long" : "short";
};
