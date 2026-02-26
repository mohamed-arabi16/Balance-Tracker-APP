import React, { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';

import { SafeScreen } from '@/components/layout/SafeScreen';
import { useAuth } from '@/contexts/AuthContext';
import { useIncomes } from '@/hooks/useIncomes';
import { useExpenses } from '@/hooks/useExpenses';
import { useDebts } from '@/hooks/useDebts';
import { useAssets } from '@/hooks/useAssets';
import { exportCsv } from '@/lib/exportCsv';
import { haptics } from '@/lib/haptics';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const [isExporting, setIsExporting] = useState(false);

  const { data: incomeData } = useIncomes();
  const { data: expenseData } = useExpenses();
  const { data: debtData } = useDebts();
  const { data: assetData } = useAssets();

  const handleSignOut = async () => {
    haptics.onDelete();
    await signOut();
    // Stack.Protected in _layout.tsx handles redirect to (auth) automatically
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await exportCsv(
        incomeData ?? [],
        expenseData ?? [],
        debtData ?? [],
        assetData ?? []
      );
      haptics.onSave();
    } catch (error) {
      haptics.onError();
      Alert.alert(
        t('settings.exportError'),
        error instanceof Error ? error.message : 'Unknown error',
        [{ text: 'OK' }]
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <SafeScreen>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Screen title */}
        <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          {t('nav.settings', 'Settings')}
        </Text>

        {/* Signed in as */}
        {user?.email ? (
          <View className="bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 mb-6">
            <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              {t('settings.signedInAs')}
            </Text>
            <Text className="text-sm font-medium text-gray-900 dark:text-white">
              {user.email}
            </Text>
          </View>
        ) : null}

        {/* Data Export Section */}
        <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-1">
          {t('settings.exportTitle', 'Data Export')}
        </Text>
        <View className="rounded-2xl bg-white dark:bg-neutral-900 p-4 shadow-sm mb-6">
          <Text className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            {t('settings.exportDescription')}
          </Text>
          <TouchableOpacity
            onPress={handleExport}
            disabled={isExporting}
            activeOpacity={0.7}
            className="bg-blue-500 rounded-xl py-3 px-4 flex-row items-center justify-center"
            style={{ opacity: isExporting ? 0.6 : 1 }}
          >
            {isExporting ? (
              <ActivityIndicator color="white" size="small" style={{ marginEnd: 8 }} />
            ) : null}
            <Text className="text-white font-semibold text-center">
              {isExporting ? 'Exporting...' : t('settings.exportButton', 'Export All Data (CSV)')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Appearance Placeholder */}
        <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-1">
          {t('settings.themeLabel', 'Appearance')}
        </Text>
        <View className="rounded-2xl bg-white dark:bg-neutral-900 p-4 shadow-sm mb-6">
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            Theme and language settings — coming in a future update.
          </Text>
        </View>

        {/* Account Section */}
        <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-1">
          Account
        </Text>
        <View className="rounded-2xl bg-white dark:bg-neutral-900 shadow-sm mb-6 overflow-hidden">
          <TouchableOpacity
            onPress={handleSignOut}
            className="px-4 py-4 items-center"
            activeOpacity={0.7}
          >
            <Text className="text-red-600 dark:text-red-400 font-semibold text-base">
              {t('settings.signOut')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeScreen>
  );
}
