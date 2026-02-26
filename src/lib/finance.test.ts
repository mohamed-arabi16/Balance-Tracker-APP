import { describe, expect, it } from "vitest";
import { sumInDisplayCurrency } from "@/lib/finance";
import type { Currency } from "@/contexts/CurrencyContext";

describe("sumInDisplayCurrency", () => {
  it("normalizes mixed currencies before aggregation", () => {
    const records = [
      { amount: 100, currency: "USD" as Currency },
      { amount: 3000, currency: "TRY" as Currency },
    ];

    const total = sumInDisplayCurrency(
      records,
      (item) => item.amount,
      (item) => item.currency,
      (amount, fromCurrency) => (fromCurrency === "TRY" ? amount / 30 : amount),
    );

    expect(total).toBe(200);
  });
});
