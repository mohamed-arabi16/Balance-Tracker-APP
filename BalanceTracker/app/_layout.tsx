import 'react-native-url-polyfill/auto';
import '../global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PrivacyOverlay } from '@/components/layout/PrivacyOverlay';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { initI18n } from '@/i18n';
import { queryClient } from '@/lib/queryClient';

// Prevent the splash screen from auto-hiding.
// It will be hidden once auth and i18n are initialized.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      // Initialize i18n with device language detection and RTL setup
      await initI18n();
      setI18nReady(true);
      // Hide splash screen after i18n is ready
      await SplashScreen.hideAsync();
    }
    prepare();
  }, []);

  // Block rendering until i18n is initialized to prevent flash of untranslated content
  if (!i18nReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <Slot />
        </ThemeProvider>
      </QueryClientProvider>
      {/* PrivacyOverlay is outside providers so it renders above everything */}
      <PrivacyOverlay />
    </SafeAreaProvider>
  );
}
