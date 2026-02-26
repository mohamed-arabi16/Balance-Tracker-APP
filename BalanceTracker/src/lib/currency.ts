import type { Currency } from "@/contexts/CurrencyContext";

interface ConvertAmountInput {
  amount: number;
  fromCurrency: Currency;
  toCurrency: Currency;
  usdToTryRate?: number;
  autoConvert?: boolean;
}

export const convertAmount = ({
  amount,
  fromCurrency,
  toCurrency,
  usdToTryRate,
  autoConvert = true,
}: ConvertAmountInput): number => {
  if (!autoConvert || !usdToTryRate || usdToTryRate <= 0 || fromCurrency === toCurrency) {
    return amount;
  }

  if (fromCurrency === "USD" && toCurrency === "TRY") {
    return amount * usdToTryRate;
  }

  if (fromCurrency === "TRY" && toCurrency === "USD") {
    return amount / usdToTryRate;
  }

  return amount;
};
