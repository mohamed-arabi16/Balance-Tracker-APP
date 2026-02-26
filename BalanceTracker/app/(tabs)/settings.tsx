import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { SafeScreen } from '@/components/layout/SafeScreen';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import { useIncomes } from '@/hooks/useIncomes';
import { useExpenses } from '@/hooks/useExpenses';
import { useDebts } from '@/hooks/useDebts';
import { useAssets } from '@/hooks/useAssets';
import { exportCsv } from '@/lib/exportCsv';
import { haptics } from '@/lib/haptics';
import { SHADOWS } from '@/lib/tokens';

// ─── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ label }: { label: string }) {
  return (
    <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 mt-6 px-1">
      {label}
    </Text>
  );
}

// ─── Grouped card ──────────────────────────────────────────────────────────────
function SettingsCard({ children }: { children: React.ReactNode }) {
  return (
    <View
      className="rounded-2xl bg-white dark:bg-neutral-900 overflow-hidden mt-2"
      style={cardStyles.card}
    >
      {children}
    </View>
  );
}

// ─── Row with optional separator ──────────────────────────────────────────────
function SettingsRow({
  icon,
  iconBg,
  label,
  sublabel,
  right,
  onPress,
  separator = true,
  destructive = false,
}: {
  icon: SymbolViewProps['name'];
  iconBg: string;
  label: string;
  sublabel?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  separator?: boolean;
  destructive?: boolean;
}) {
  const Inner = (
    <View className="flex-row items-center px-4 py-3">
      {/* Icon badge */}
      <View
        className="w-8 h-8 rounded-lg items-center justify-center mr-3 flex-shrink-0"
        style={{ backgroundColor: iconBg }}
      >
        <SymbolView name={icon} tintColor="#fff" size={17} type="monochrome" />
      </View>

      {/* Labels */}
      <View className="flex-1">
        <Text
          className={`text-base font-medium ${destructive ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}
        >
          {label}
        </Text>
        {sublabel ? (
          <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sublabel}</Text>
        ) : null}
      </View>

      {/* Right element */}
      {right ? <View className="ml-2 flex-shrink-0">{right}</View> : null}
    </View>
  );

  return (
    <>
      {onPress ? (
        <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
          {Inner}
        </TouchableOpacity>
      ) : (
        Inner
      )}
      {separator ? (
        <View className="h-px bg-gray-100 dark:bg-neutral-800 ml-14" />
      ) : null}
    </>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { isAdvanced, setMode, isUpdating } = useMode();
  const [isExporting, setIsExporting] = useState(false);

  const { data: incomeData } = useIncomes();
  const { data: expenseData } = useExpenses();
  const { data: debtData } = useDebts();
  const { data: assetData } = useAssets();

  const handleToggleAdvanced = (value: boolean) => {
    haptics.onSave();
    setMode(value ? 'advanced' : 'simple');
  };

  const handleSignOut = () => {
    Alert.alert(
      t('settings.signOut'),
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: t('settings.signOut'),
          style: 'destructive',
          onPress: async () => {
            haptics.onDelete();
            await signOut();
          },
        },
      ]
    );
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
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Text className="text-2xl font-bold text-gray-900 dark:text-white mt-2 mb-1">
          {t('nav.settings', 'Settings')}
        </Text>

        {/* Account info chip */}
        {user?.email ? (
          <Text className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            {user.email}
          </Text>
        ) : null}

        {/* ── MODE ───────────────────────────────────────────────────── */}
        <SectionHeader label="Mode" />
        <SettingsCard>
          <SettingsRow
            icon="slider.horizontal.3"
            iconBg="#5856D6"
            label="Advanced Mode"
            sublabel={
              isAdvanced
                ? 'Clients, invoices & advanced dashboard'
                : 'Enable to unlock clients, invoices & PDF export'
            }
            separator={false}
            right={
              <Switch
                value={isAdvanced}
                onValueChange={handleToggleAdvanced}
                disabled={isUpdating}
                trackColor={{ false: '#D1D5DB', true: '#5856D6' }}
                thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
              />
            }
          />
        </SettingsCard>

        {/* ── DATA ───────────────────────────────────────────────────── */}
        <SectionHeader label={t('settings.exportTitle', 'Data')} />
        <SettingsCard>
          <SettingsRow
            icon="arrow.up.doc.fill"
            iconBg="#34C759"
            label={t('settings.exportButton', 'Export All Data (CSV)')}
            sublabel="Income, expenses, debts & assets"
            separator={false}
            onPress={isExporting ? undefined : handleExport}
            right={
              isExporting ? (
                <ActivityIndicator size="small" color="#34C759" />
              ) : (
                <SymbolView
                  name="chevron.right"
                  tintColor="#C7C7CC"
                  size={14}
                  type="monochrome"
                />
              )
            }
          />
        </SettingsCard>

        {/* ── APPEARANCE ─────────────────────────────────────────────── */}
        <SectionHeader label={t('settings.themeLabel', 'Appearance')} />
        <SettingsCard>
          <SettingsRow
            icon="paintbrush.fill"
            iconBg="#FF9500"
            label="Theme & Language"
            sublabel="Coming in a future update"
            separator={false}
          />
        </SettingsCard>

        {/* ── ACCOUNT ────────────────────────────────────────────────── */}
        <SectionHeader label="Account" />
        <SettingsCard>
          <SettingsRow
            icon="rectangle.portrait.and.arrow.right.fill"
            iconBg="#FF3B30"
            label={t('settings.signOut')}
            separator={false}
            destructive
            onPress={handleSignOut}
          />
        </SettingsCard>
      </ScrollView>
    </SafeScreen>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const cardStyles = StyleSheet.create({
  card: SHADOWS.card,
});
