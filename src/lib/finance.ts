import type { Currency } from "@/contexts/CurrencyContext";

export const sumInDisplayCurrency = <T>(
  items: T[],
  getAmount: (item: T) => number,
  getCurrency: (item: T) => Currency,
  convertCurrency: (amount: number, fromCurrency: Currency) => number,
) =>
  items.reduce(
    (total, item) => total + convertCurrency(getAmount(item), getCurrency(item)),
    0,
  );
