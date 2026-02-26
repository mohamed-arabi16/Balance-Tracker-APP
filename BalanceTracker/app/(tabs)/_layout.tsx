import { Tabs } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { TabIcon } from '@/components/ui/TabIcon';

export default function TabsLayout() {
  const { t } = useTranslation();

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
          tabBarIcon: ({ color }) => <TabIcon sfSymbol="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: t('tabs.transactions'),
          tabBarIcon: ({ color }) => <TabIcon sfSymbol="list.bullet" color={color} />,
        }}
      />
      <Tabs.Screen
        name="debts"
        options={{
          title: t('tabs.debts'),
          tabBarIcon: ({ color }) => <TabIcon sfSymbol="creditcard.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="assets"
        options={{
          title: t('tabs.assets'),
          tabBarIcon: ({ color }) => <TabIcon sfSymbol="chart.bar.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.more'),
          tabBarIcon: ({ color }) => <TabIcon sfSymbol="ellipsis.circle.fill" color={color} />,
        }}
      />
      <Tabs.Screen name="dashboard" options={{ href: null }} />
      {/* Advanced mode screens — always hidden from tab bar, accessible via More screen */}
      <Tabs.Screen
        name="clients"
        options={{
          href: null,
          title: t('nav.clients', 'Clients'),
          tabBarIcon: ({ color }) => <TabIcon sfSymbol="person.2.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          href: null,
          title: t('nav.invoices', 'Invoices'),
          tabBarIcon: ({ color }) => <TabIcon sfSymbol="doc.text.fill" color={color} />,
        }}
      />
    </Tabs>
    </CurrencyProvider>
  );
}
