import 'react-native-url-polyfill/auto';
import '../global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PrivacyOverlay } from '@/components/layout/PrivacyOverlay';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { initI18n } from '@/i18n';
import { queryClient } from '@/lib/queryClient';

// Prevent the splash screen from auto-hiding.
// It will be hidden once BOTH auth and i18n are initialized (inside RootNavigator).
SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore errors when running in Expo Go (no native splash screen registered)
});

/**
 * RootNavigator: Handles auth-based routing using Stack.Protected.
 * Waits for auth to resolve before hiding splash screen.
 * Returns null while loading so the splash screen covers the gap.
 */
function RootNavigator() {
  const { session, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isLoading]);

  // While auth is loading, return null — splash screen stays visible
  if (isLoading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      // Initialize i18n with device language detection and RTL setup
      await initI18n();
      setI18nReady(true);
      // Note: SplashScreen.hideAsync() is now delegated to RootNavigator,
      // which waits for BOTH i18n (i18nReady gate here) AND auth (isLoading from AuthContext).
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
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
      {/* PrivacyOverlay is outside providers so it renders above everything */}
      <PrivacyOverlay />
    </SafeAreaProvider>
  );
}
