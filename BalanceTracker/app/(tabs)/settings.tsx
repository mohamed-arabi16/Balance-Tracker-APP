import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useColorScheme } from 'nativewind';

import { SafeScreen } from '@/components/layout/SafeScreen';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency, type Currency } from '@/contexts/CurrencyContext';
import { useMode, type AppMode } from '@/contexts/ModeContext';
import { useTheme, type ThemePreference } from '@/contexts/ThemeContext';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useIncomes } from '@/hooks/useIncomes';
import { useExpenses } from '@/hooks/useExpenses';
import { useDebts } from '@/hooks/useDebts';
import { useAssets } from '@/hooks/useAssets';
import { changeLanguage } from '@/i18n';
import { supabase } from '@/integrations/supabase/client';
import { exportCsv } from '@/lib/exportCsv';
import { haptics } from '@/lib/haptics';
import { SHADOWS } from '@/lib/tokens';

type AppLanguage = 'en' | 'ar';
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function SectionHeader({ label }: { label: string }) {
  return (
    <Text className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 mt-6 px-1">
      {label}
    </Text>
  );
}

function SettingsCard({ children }: { children: React.ReactNode }) {
  return (
    <View
      className="rounded-2xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 overflow-hidden"
      style={styles.card}
    >
      {children}
    </View>
  );
}

function IconBadge({ icon, iconBg }: { icon: IoniconName; iconBg: string }) {
  return (
    <View
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        flexShrink: 0,
        backgroundColor: iconBg,
      }}
    >
      <Ionicons name={icon} color="#fff" size={17} />
    </View>
  );
}

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
  icon: IoniconName;
  iconBg: string;
  label: string;
  sublabel?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  separator?: boolean;
  destructive?: boolean;
}) {
  const content = (
    <View className="flex-row items-center justify-between px-4 min-h-[52px] py-2">
      <View className="flex-row items-center flex-1 mr-3">
        <IconBadge icon={icon} iconBg={iconBg} />
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
      </View>
      {right ? <View className="ml-2">{right}</View> : null}
    </View>
  );

  return (
    <>
      {onPress ? (
        <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
          {content}
        </TouchableOpacity>
      ) : (
        content
      )}
      {separator ? <View className="h-px bg-gray-100 dark:bg-neutral-800 ml-14" /> : null}
    </>
  );
}

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: ReadonlyArray<{ label: string; value: T }>;
  onChange: (next: T) => void;
}) {
  return (
    <View className="flex-row bg-gray-100 dark:bg-gray-800 rounded-xl p-1 border border-gray-200 dark:border-gray-700">
      {options.map((option) => {
        const active = value === option.value;
        return (
          <TouchableOpacity
            key={option.value}
            activeOpacity={0.8}
            onPress={() => onChange(option.value)}
            className={`flex-1 min-h-[38px] px-3 rounded-lg items-center justify-center ${
              active ? 'bg-white dark:bg-gray-700' : ''
            }`}
          >
            <Text className={`text-sm font-medium ${active ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function SegmentedPreferenceRow<T extends string>({
  icon,
  iconBg,
  label,
  sublabel,
  value,
  options,
  onChange,
  separator = true,
}: {
  icon: IoniconName;
  iconBg: string;
  label: string;
  sublabel?: string;
  value: T;
  options: ReadonlyArray<{ label: string; value: T }>;
  onChange: (next: T) => void;
  separator?: boolean;
}) {
  return (
    <>
      <View className="px-4 py-3">
        <View className="flex-row items-center">
          <IconBadge icon={icon} iconBg={iconBg} />
          <View className="flex-1">
            <Text className="text-base font-medium text-gray-900 dark:text-white">{label}</Text>
            {sublabel ? (
              <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sublabel}</Text>
            ) : null}
          </View>
        </View>
        <View className="mt-3">
          <SegmentedControl<T> value={value} options={options} onChange={onChange} />
        </View>
      </View>
      {separator ? <View className="h-px bg-gray-100 dark:bg-neutral-800 ml-4" /> : null}
    </>
  );
}

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { colorScheme } = useColorScheme();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { mode, isAdvanced, setMode, isUpdating: isUpdatingMode } = useMode();
  const {
    currency,
    setCurrency,
    autoConvert,
    setAutoConvert,
    exchangeRate,
    exchangeRateStatus,
    exchangeRateWarning,
    exchangeRateLastUpdated,
    refreshExchangeRate,
  } = useCurrency();
  const { updateSettings, isUpdating: isUpdatingSettings } = useUserSettings();

  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showRtlRestartBanner, setShowRtlRestartBanner] = useState(false);

  const { data: incomeData } = useIncomes();
  const { data: expenseData } = useExpenses();
  const { data: debtData } = useDebts();
  const { data: assetData } = useAssets();

  const chevronColor = colorScheme === 'dark' ? '#8E8E93' : '#C7C7CC';
  const switchTrackOff = colorScheme === 'dark' ? '#4B5563' : '#D1D5DB';
  const currentLanguage: AppLanguage = i18n.language.startsWith('ar') ? 'ar' : 'en';
  const avatarLetter = useMemo(
    () => user?.email?.slice(0, 1).toUpperCase() ?? 'U',
    [user?.email],
  );

  const exchangeStatusLabel = useMemo(() => {
    if (!autoConvert) return 'Disabled';
    if (exchangeRateWarning === 'fallback') return t('dashboard.exchangeRate.fallback', 'Fallback');
    if (exchangeRateWarning === 'stale') return t('assets.priceStatus.stale', 'Stale');
    return t('dashboard.exchangeRate.live', 'Live');
  }, [autoConvert, exchangeRateWarning, t]);

  const exchangeStatusClassName = useMemo(() => {
    if (!autoConvert) return 'text-gray-500 dark:text-gray-400';
    if (exchangeRateWarning === 'fallback') return 'text-expense-700 dark:text-expense-300';
    if (exchangeRateWarning === 'stale') return 'text-debt-700 dark:text-debt-300';
    return 'text-income-700 dark:text-income-300';
  }, [autoConvert, exchangeRateWarning]);

  const handleThemeChange = (nextTheme: ThemePreference) => {
    if (nextTheme === theme) return;
    haptics.onToggle();
    setTheme(nextTheme);
    void updateSettings({ theme: nextTheme }).catch((error) => {
      console.error('Failed to persist theme preference:', error.message);
    });
  };

  const handleCurrencyChange = (nextCurrency: Currency) => {
    if (nextCurrency === currency) return;
    haptics.onToggle();
    setCurrency(nextCurrency);
  };

  const handleAutoConvertToggle = (enabled: boolean) => {
    haptics.onToggle();
    setAutoConvert(enabled);
  };

  const handleLanguageChange = async (nextLanguage: AppLanguage) => {
    if (nextLanguage === currentLanguage) return;
    try {
      haptics.onToggle();
      const needsRestart = await changeLanguage(nextLanguage);
      setShowRtlRestartBanner(needsRestart);
      await updateSettings({ language: nextLanguage });
    } catch (error) {
      haptics.onError();
      Alert.alert(
        t('settings.languageLabel', 'Language'),
        error instanceof Error ? error.message : 'Failed to change language.',
      );
    }
  };

  const handleModeChange = (nextMode: AppMode) => {
    if (nextMode === mode) return;
    haptics.onToggle();
    setMode(nextMode);
  };

  const handleSignOut = () => {
    Alert.alert(
      t('settings.signOut'),
      t('settings.signedInAs', 'Signed in as') + ` ${user?.email ?? ''}`,
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('settings.signOut'),
          style: 'destructive',
          onPress: async () => {
            haptics.onDelete();
            await signOut();
          },
        },
      ],
    );
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await exportCsv(
        incomeData ?? [],
        expenseData ?? [],
        debtData ?? [],
        assetData ?? [],
      );
      haptics.onSave();
    } catch (error) {
      haptics.onError();
      Alert.alert(
        t('settings.exportError'),
        error instanceof Error ? error.message : 'Unknown error',
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('settings.deleteAccount.title'),
      t('settings.deleteAccount.confirm'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('settings.deleteAccount.button'),
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              haptics.onDelete();
              const { error } = await supabase.rpc('delete_user_data');
              if (error) throw error;
              await supabase.auth.signOut();
              router.replace('/(auth)/sign-in');
            } catch (error) {
              haptics.onError();
              Alert.alert(
                t('settings.deleteAccount.title'),
                error instanceof Error ? error.message : 'An error occurred. Please try again.',
              );
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeScreen grouped>
      <ScrollView
        className="bg-[#F2F2F7] dark:bg-[#1C1C1E]"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-3xl font-bold text-gray-900 dark:text-white mt-1 mb-1">
          {t('settings.title', 'Settings')}
        </Text>
        <Text className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          {t('settings.subtitle', 'Customize your Balance Tracker experience')}
        </Text>

        <SectionHeader label={t('settings.profile.title', 'Account Info')} />
        <SettingsCard>
          <View className="flex-row items-center px-4 py-4 min-h-[64px]">
            <View className="w-12 h-12 rounded-full bg-balance-100 dark:bg-balance-900 items-center justify-center mr-3">
              <Text className="text-lg font-semibold text-balance-700 dark:text-balance-300">
                {avatarLetter}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-base font-medium text-gray-900 dark:text-white">
                {user?.email ?? t('common.notAvailable', 'N/A')}
              </Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {t('settings.signedInAs', 'Signed in as')}
              </Text>
            </View>
          </View>
        </SettingsCard>

        <SectionHeader label={t('settings.currency', 'Currency Preferences')} />
        <SettingsCard>
          <SegmentedPreferenceRow<Currency>
            icon="wallet"
            iconBg="#34C759"
            label={t('settings.defaultCurrency', 'Default Currency')}
            value={currency}
            options={[
              { label: 'USD', value: 'USD' },
              { label: 'TRY', value: 'TRY' },
            ]}
            onChange={handleCurrencyChange}
          />
          <SettingsRow
            icon="sync-circle"
            iconBg="#007AFF"
            label={t('settings.autoConvert', 'Automatically convert between currencies')}
            separator
            right={(
              <Switch
                value={autoConvert}
                onValueChange={handleAutoConvertToggle}
                trackColor={{ false: switchTrackOff, true: '#34C759' }}
                thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
              />
            )}
          />
          <SettingsRow
            icon="pulse"
            iconBg="#FF9500"
            label={t('dashboard.exchangeRate.statusLabel', 'Rate source')}
            sublabel={
              exchangeRateLastUpdated
                ? `${t('dashboard.exchangeRate.updatedLabel', 'Last updated')}: ${new Date(exchangeRateLastUpdated).toLocaleString()}`
                : undefined
            }
            separator={false}
            right={(
              <View className="items-end">
                <Text className={`text-sm font-semibold ${exchangeStatusClassName}`}>
                  {exchangeStatusLabel}
                </Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    haptics.onToggle();
                    void refreshExchangeRate();
                  }}
                >
                  <Text className="text-xs text-balance-600 dark:text-balance-300 mt-0.5">
                    {t('dashboard.exchangeRate.refreshButton', 'Refresh rates')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          />
        </SettingsCard>

        <SectionHeader label={t('settings.appearance', 'Appearance')} />
        <SettingsCard>
          <SegmentedPreferenceRow<ThemePreference>
            icon="color-palette"
            iconBg="#AF52DE"
            label={t('settings.themeLabel', 'Theme')}
            value={theme}
            options={[
              { label: t('settings.theme.light', 'Light'), value: 'light' },
              { label: t('settings.theme.dark', 'Dark'), value: 'dark' },
              { label: t('settings.theme.system', 'System'), value: 'system' },
            ]}
            onChange={handleThemeChange}
            separator={false}
          />
        </SettingsCard>

        <SectionHeader label={t('settings.language', 'Language & Region')} />
        <SettingsCard>
          <SegmentedPreferenceRow<AppLanguage>
            icon="language"
            iconBg="#007AFF"
            label={t('settings.languageLabel', 'Language')}
            value={currentLanguage}
            options={[
              { label: 'English', value: 'en' },
              { label: 'العربية', value: 'ar' },
            ]}
            onChange={(next) => {
              void handleLanguageChange(next);
            }}
            separator={false}
          />
        </SettingsCard>
        {showRtlRestartBanner ? (
          <View className="rounded-xl border border-debt-200 dark:border-debt-800 bg-debt-50 dark:bg-debt-950 px-3 py-2 mt-2">
            <Text className="text-sm font-medium text-debt-800 dark:text-debt-200">
              Restart the app to apply RTL changes.
            </Text>
          </View>
        ) : null}

        <SectionHeader label={t('settings.modeTitle', 'Mode')} />
        <SettingsCard>
          <SegmentedPreferenceRow<AppMode>
            icon="options"
            iconBg="#5856D6"
            label={t('settings.modeLabel', 'Default Mode')}
            sublabel={
              isAdvanced
                ? 'Advanced mode enables Clients and Invoices screens.'
                : 'Simple mode keeps only core personal finance screens.'
            }
            value={mode}
            options={[
              { label: t('settings.mode.simple', 'Simple'), value: 'simple' },
              { label: t('settings.mode.advanced', 'Advanced'), value: 'advanced' },
            ]}
            onChange={handleModeChange}
            separator={false}
          />
        </SettingsCard>

        {isAdvanced ? (
          <>
            <SectionHeader label="Business" />
            <SettingsCard>
              <SettingsRow
                icon="people"
                iconBg="#007AFF"
                label={t('nav.clients', 'Clients')}
                sublabel="Manage your client list"
                separator
                onPress={() => router.push('/(tabs)/clients')}
                right={<Ionicons name="chevron-forward" color={chevronColor} size={14} />}
              />
              <SettingsRow
                icon="document-text"
                iconBg="#5856D6"
                label={t('nav.invoices', 'Invoices')}
                sublabel="Create and track invoices"
                separator={false}
                onPress={() => router.push('/(tabs)/invoices')}
                right={<Ionicons name="chevron-forward" color={chevronColor} size={14} />}
              />
            </SettingsCard>
          </>
        ) : null}

        <SectionHeader label={t('settings.exportTitle', 'Data Export')} />
        <SettingsCard>
          <SettingsRow
            icon="download"
            iconBg="#34C759"
            label={t('settings.exportButton', 'Export All Data (CSV)')}
            sublabel={t('settings.exportDescription', 'Export your financial data for backup or external analysis')}
            separator={false}
            onPress={isExporting ? undefined : handleExport}
            right={
              isExporting ? (
                <ActivityIndicator size="small" color="#34C759" />
              ) : (
                <Ionicons name="chevron-forward" color={chevronColor} size={14} />
              )
            }
          />
        </SettingsCard>

        <SectionHeader label="Account" />
        <SettingsCard>
          <SettingsRow
            icon="shield-checkmark"
            iconBg="#636366"
            label={t('settings.privacyPolicy')}
            separator
            onPress={() => router.push('/privacy-policy')}
            right={<Ionicons name="chevron-forward" color={chevronColor} size={14} />}
          />
          <SettingsRow
            icon="log-out"
            iconBg="#FF3B30"
            label={t('settings.signOut')}
            separator
            destructive
            onPress={handleSignOut}
          />
          <SettingsRow
            icon="trash"
            iconBg="#FF3B30"
            label={isDeleting ? t('settings.deleteAccount.deleting') : t('settings.deleteAccount.button')}
            sublabel={t('settings.deleteAccount.confirm')}
            separator={false}
            destructive
            onPress={isDeleting ? undefined : handleDeleteAccount}
            right={isDeleting ? <ActivityIndicator size="small" color="#FF3B30" /> : null}
          />
        </SettingsCard>

        {(isUpdatingMode || isUpdatingSettings) ? (
          <View className="items-center mt-4">
            <Text className="text-xs text-gray-500 dark:text-gray-400">Saving preferences…</Text>
          </View>
        ) : null}

        {autoConvert ? (
          <Text className="text-xs text-gray-400 dark:text-gray-500 mt-4 px-1">
            1 USD = {exchangeRate > 0 ? exchangeRate.toFixed(2) : 'N/A'} TRY
          </Text>
        ) : null}
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  card: SHADOWS.card,
});
