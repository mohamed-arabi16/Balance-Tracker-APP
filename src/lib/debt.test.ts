import { addDays, format } from "date-fns";
import { describe, expect, it } from "vitest";
import { getDebtTypeFromDueDate } from "@/lib/debt";

describe("getDebtTypeFromDueDate", () => {
  const reference = new Date("2026-01-01T00:00:00.000Z");

  it("returns short for due dates at the exact one-year threshold", () => {
    const dueDate = addDays(reference, 365);
    expect(getDebtTypeFromDueDate(dueDate, reference)).toBe("short");
  });

  it("returns long for due dates after the one-year threshold", () => {
    const dueDate = addDays(reference, 366);
    expect(getDebtTypeFromDueDate(format(dueDate, "yyyy-MM-dd"), reference)).toBe("long");
  });

  it("returns short for null/invalid due dates", () => {
    expect(getDebtTypeFromDueDate(null, reference)).toBe("short");
    expect(getDebtTypeFromDueDate("not-a-date", reference)).toBe("short");
  });
});
