import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useUserSettings } from '@/hooks/useUserSettings';

export type AppMode = 'simple' | 'advanced';

interface ModeContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  isAdvanced: boolean;
  isUpdating: boolean;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export const useMode = () => {
  const context = useContext(ModeContext);
  if (context === undefined) {
    throw new Error('useMode must be used within a ModeProvider');
  }
  return context;
};

export const ModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<AppMode>('simple');
  const { settings, updateSettings, isUpdating } = useUserSettings();

  // Sync from DB when settings load — mirrors ThemeContext's settings?.theme sync
  useEffect(() => {
    const nextMode = settings?.app_mode;
    if (nextMode !== 'simple' && nextMode !== 'advanced') return;
    setModeState((prev) => (prev === nextMode ? prev : nextMode));
  }, [settings?.app_mode]);

  const setMode = useCallback(
    (nextMode: AppMode) => {
      setModeState(nextMode);
      void updateSettings({ app_mode: nextMode }).catch((error: Error) => {
        console.error('Failed to persist mode preference:', error.message);
      });
    },
    [updateSettings],
  );

  return (
    <ModeContext.Provider value={{ mode, setMode, isAdvanced: mode === 'advanced', isUpdating }}>
      {children}
    </ModeContext.Provider>
  );
};
