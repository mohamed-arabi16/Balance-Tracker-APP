import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useUserSettings } from '@/hooks/useUserSettings';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  actualTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme') as Theme;
    return stored || 'light';
  });
  const { settings, updateSettings } = useUserSettings();
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const nextTheme = settings?.theme;
    if (!nextTheme || (nextTheme !== 'light' && nextTheme !== 'dark' && nextTheme !== 'system')) {
      return;
    }

    setThemeState((previousTheme) => (previousTheme === nextTheme ? previousTheme : nextTheme));
  }, [settings?.theme]);

  const setTheme = useCallback(
    (nextTheme: Theme) => {
      setThemeState(nextTheme);
      void updateSettings({ theme: nextTheme }).catch((error) => {
        console.error('Failed to persist theme preference:', error.message);
      });
    },
    [updateSettings],
  );

  useEffect(() => {
    localStorage.setItem('theme', theme);
    
    const updateActualTheme = () => {
      if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        setActualTheme(systemTheme);
        document.documentElement.classList.toggle('dark', systemTheme === 'dark');
      } else {
        setActualTheme(theme);
        document.documentElement.classList.toggle('dark', theme === 'dark');
      }
    };

    updateActualTheme();

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', updateActualTheme);
      return () => mediaQuery.removeEventListener('change', updateActualTheme);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, actualTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
