import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocaleFromLanguage } from '@/lib/locale';

interface DateContextType {
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  getMonthOptions: () => { value: string; label: string }[];
  getFilteredDate: () => { start: Date; end: Date };
  isCurrentMonth: () => boolean;
}

const DateContext = createContext<DateContextType | undefined>(undefined);

export const useDate = () => {
  const context = useContext(DateContext);
  if (context === undefined) {
    throw new Error('useDate must be used within a DateProvider');
  }
  return context;
};

interface DateProviderProps {
  children: ReactNode;
}

export const DateProvider: React.FC<DateProviderProps> = ({ children }) => {
  // Start with 'all' as default; hydrate from AsyncStorage after mount
  const [selectedMonth, setSelectedMonthState] = useState('all');

  useEffect(() => {
    AsyncStorage.getItem('selectedMonth').then((value) => {
      if (value) {
        setSelectedMonthState(value);
      }
    }).catch(() => {
      // ignore read errors, keep default 'all'
    });
  }, []);

  const setSelectedMonth = (month: string) => {
    setSelectedMonthState(month);
    AsyncStorage.setItem('selectedMonth', month).catch(() => {
      // ignore write errors
    });
  };

  const getMonthOptions = () => {
    const locale = getLocaleFromLanguage();
    const options = [{ value: 'all', label: 'All Dates' }];
    const currentDate = new Date();

    // Generate last 36 months
    for (let i = 0; i < 36; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString(locale, { year: 'numeric', month: 'long' });
      options.push({ value, label });
    }

    return options;
  };

  const getFilteredDate = () => {
    if (selectedMonth === 'all') {
      return { start: new Date(0), end: new Date() };
    }
    const [year, month] = selectedMonth.split('-').map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);
    return { start, end };
  };

  const isCurrentMonth = () => {
    if (selectedMonth === 'all') return false;
    const now = new Date();
    const currentMonthValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return selectedMonth === currentMonthValue;
  };

  return (
    <DateContext.Provider value={{
      selectedMonth,
      setSelectedMonth,
      getMonthOptions,
      getFilteredDate,
      isCurrentMonth
    }}>
      {children}
    </DateContext.Provider>
  );
};
