import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'nativewind';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';

const THEME_KEY = 'app_theme';

interface ThemeContextValue {
  theme: ThemePreference;
  isDark: boolean;
  setTheme: (t: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { colorScheme, setColorScheme } = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>('system');

  // Load saved preference on mount and apply it
  useEffect(() => {
    async function loadPreference() {
      const saved = await AsyncStorage.getItem(THEME_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setPreference(saved);
        setColorScheme(saved);
      } else {
        // No saved preference — follow system appearance
        setColorScheme('system');
      }
    }
    loadPreference();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSetTheme = useCallback(
    (t: ThemePreference) => {
      setPreference(t);
      setColorScheme(t);
      AsyncStorage.setItem(THEME_KEY, t);
    },
    [setColorScheme],
  );

  const isDark = colorScheme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme: preference, isDark, setTheme: handleSetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
