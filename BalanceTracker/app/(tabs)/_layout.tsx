import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { useMode } from '@/contexts/ModeContext';

export default function TabsLayout() {
  const { t } = useTranslation();
  const { isAdvanced } = useMode();

  return (
    <CurrencyProvider>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',   // iOS system blue
        tabBarInactiveTintColor: '#8E8E93', // iOS system gray
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.dashboard'),
          tabBarIcon: ({ color }) => (
            <SymbolView name="house.fill" tintColor={color} size={24} type="monochrome" />
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: t('tabs.transactions'),
          tabBarIcon: ({ color }) => (
            <SymbolView name="list.bullet" tintColor={color} size={24} type="monochrome" />
          ),
        }}
      />
      <Tabs.Screen
        name="debts"
        options={{
          title: t('tabs.debts'),
          tabBarIcon: ({ color }) => (
            <SymbolView name="creditcard.fill" tintColor={color} size={24} type="monochrome" />
          ),
        }}
      />
      <Tabs.Screen
        name="assets"
        options={{
          title: t('tabs.assets'),
          tabBarIcon: ({ color }) => (
            <SymbolView name="chart.bar.fill" tintColor={color} size={24} type="monochrome" />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.more'),
          tabBarIcon: ({ color }) => (
            <SymbolView name="ellipsis.circle.fill" tintColor={color} size={24} type="monochrome" />
          ),
        }}
      />
      <Tabs.Screen name="dashboard" options={{ href: null }} />
      {/* Advanced mode tabs — hidden via href: null when not in advanced mode */}
      <Tabs.Screen
        name="clients"
        options={{
          title: t('nav.clients', 'Clients'),
          href: isAdvanced ? undefined : null,
          tabBarIcon: ({ color }) => (
            <SymbolView name="person.2.fill" tintColor={color} size={24} type="monochrome" />
          ),
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          title: t('nav.invoices', 'Invoices'),
          href: isAdvanced ? undefined : null,
          tabBarIcon: ({ color }) => (
            <SymbolView name="doc.text.fill" tintColor={color} size={24} type="monochrome" />
          ),
        }}
      />
    </Tabs>
    </CurrencyProvider>
  );
}
