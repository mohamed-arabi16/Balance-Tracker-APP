import { describe, expect, it } from "vitest";
import { convertAmount } from "@/lib/currency";

describe("convertAmount", () => {
  it("converts USD to TRY when auto convert is enabled", () => {
    const result = convertAmount({
      amount: 100,
      fromCurrency: "USD",
      toCurrency: "TRY",
      usdToTryRate: 30,
      autoConvert: true,
    });

    expect(result).toBe(3000);
  });

  it("converts TRY to USD when auto convert is enabled", () => {
    const result = convertAmount({
      amount: 3000,
      fromCurrency: "TRY",
      toCurrency: "USD",
      usdToTryRate: 30,
      autoConvert: true,
    });

    expect(result).toBe(100);
  });

  it("keeps source amount when auto convert is disabled", () => {
    const result = convertAmount({
      amount: 100,
      fromCurrency: "USD",
      toCurrency: "TRY",
      usdToTryRate: 30,
      autoConvert: false,
    });

    expect(result).toBe(100);
  });
});
