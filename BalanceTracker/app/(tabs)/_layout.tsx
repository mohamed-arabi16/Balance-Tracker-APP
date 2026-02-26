import { Tabs } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorScheme } from 'nativewind';

import { CurrencyProvider } from '@/contexts/CurrencyContext';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(active: IoniconName, inactive: IoniconName) {
  return ({ color, focused }: { color: string; focused: boolean }) => (
    <Ionicons
      name={focused ? active : inactive}
      color={color}
      size={24}
    />
  );
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <CurrencyProvider>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',   // iOS system blue
        tabBarInactiveTintColor: '#8E8E93', // iOS system gray
        tabBarStyle: {
          borderTopColor: isDark ? '#374151' : '#e5e7eb',
          backgroundColor: isDark ? '#1c1c1e' : '#ffffff',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.dashboard'),
          tabBarIcon: tabIcon('home', 'home-outline'),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: t('tabs.transactions'),
          tabBarIcon: tabIcon('list', 'list-outline'),
        }}
      />
      <Tabs.Screen
        name="debts"
        options={{
          title: t('tabs.debts'),
          tabBarIcon: tabIcon('card', 'card-outline'),
        }}
      />
      <Tabs.Screen
        name="assets"
        options={{
          title: t('tabs.assets'),
          tabBarIcon: tabIcon('bar-chart', 'bar-chart-outline'),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.more'),
          tabBarIcon: tabIcon('ellipsis-horizontal-circle', 'ellipsis-horizontal-circle-outline'),
        }}
      />
      <Tabs.Screen name="dashboard" options={{ href: null }} />
      {/* Advanced mode screens — always hidden from tab bar, accessible via More screen */}
      <Tabs.Screen
        name="clients"
        options={{
          href: null,
          title: t('nav.clients', 'Clients'),
          tabBarIcon: tabIcon('people', 'people-outline'),
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          href: null,
          title: t('nav.invoices', 'Invoices'),
          tabBarIcon: tabIcon('document-text', 'document-text-outline'),
        }}
      />
    </Tabs>
    </CurrencyProvider>
  );
}
