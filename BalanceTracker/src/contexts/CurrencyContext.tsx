import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useUserSettings } from '@/hooks/useUserSettings';
import { convertAmount } from '@/lib/currency';
import { useTranslation } from 'react-i18next';
import { getLocaleFromLanguage } from '@/lib/locale';

export type Currency = 'USD' | 'TRY';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  autoConvert: boolean;
  setAutoConvert: (enabled: boolean) => void;
  formatCurrency: (amount: number, fromCurrency?: Currency) => string;
  convertCurrency: (amount: number, fromCurrency: Currency) => number;
  exchangeRate: number;
  exchangeRateStatus: 'live' | 'fallback';
  exchangeRateStale: boolean;
  exchangeRateLastUpdated: string | null;
  exchangeRateWarning: 'fallback' | 'stale' | null;
  refreshExchangeRate: () => Promise<unknown>;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

interface CurrencyProviderProps {
  children: ReactNode;
}

export const CurrencyProvider: React.FC<CurrencyProviderProps> = ({ children }) => {
  const [currency, setCurrencyState] = useState<Currency>('USD');
  const [autoConvert, setAutoConvertState] = useState(true);
  const { settings, updateSettings } = useUserSettings();
  const { i18n } = useTranslation();

  const {
    data: rates,
    error: ratesError,
    isLoading: ratesLoading,
    isStale: ratesStale,
    dataUpdatedAt,
    refetch: refetchRates,
  } = useExchangeRate('USD');

  useEffect(() => {
    if (!settings) return;
    setCurrencyState(settings.default_currency as Currency);
    setAutoConvertState(settings.auto_convert);
  }, [settings]);

  const exchangeRate = rates?.TRY ?? 0;
  const exchangeRateStatus: 'live' | 'fallback' = rates?.TRY && !ratesError ? 'live' : 'fallback';
  const exchangeRateLastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toISOString() : null;
  const exchangeRateWarning =
    !autoConvert
      ? null
      : exchangeRateStatus === 'fallback'
        ? 'fallback'
        : ratesStale
          ? 'stale'
          : null;

  const setCurrency = useCallback(
    (nextCurrency: Currency) => {
      setCurrencyState(nextCurrency);
      void updateSettings({ default_currency: nextCurrency }).catch((error) => {
        console.error('Failed to persist default currency:', error.message);
      });
    },
    [updateSettings],
  );

  const setAutoConvert = useCallback(
    (enabled: boolean) => {
      setAutoConvertState(enabled);
      void updateSettings({ auto_convert: enabled }).catch((error) => {
        console.error('Failed to persist auto-convert preference:', error.message);
      });
    },
    [updateSettings],
  );

  const convertCurrency = (amount: number, fromCurrency: Currency): number => {
    return convertAmount({
      amount,
      fromCurrency,
      toCurrency: currency,
      usdToTryRate: ratesError || ratesLoading ? undefined : rates?.TRY,
      autoConvert,
    });
  };

  const formatCurrency = (amount: number, fromCurrency: Currency = 'USD'): string => {
    const convertedAmount = convertCurrency(amount, fromCurrency);
    const locale = getLocaleFromLanguage(i18n.language);

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(convertedAmount);
  };

  return (
    <CurrencyContext.Provider value={{
      currency,
      setCurrency,
      autoConvert,
      setAutoConvert,
      formatCurrency,
      convertCurrency,
      exchangeRate,
      exchangeRateStatus,
      exchangeRateStale: ratesStale,
      exchangeRateLastUpdated,
      exchangeRateWarning,
      refreshExchangeRate: () => refetchRates(),
    }}>
      {children}
    </CurrencyContext.Provider>
  );
};
