import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';

import { SafeScreen } from '@/components/layout/SafeScreen';

// ─── Section component ──────────────────────────────────────────────────────────
function PolicySection({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.section}>
      <Text className="text-base font-bold text-gray-900 dark:text-white mb-2">{title}</Text>
      <Text className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">{body}</Text>
    </View>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────────
export default function PrivacyPolicyScreen() {
  const { t } = useTranslation();

  return (
    <SafeScreen>
      {/* Custom header row */}
      <View className="flex-row items-center px-4 pt-2 pb-3 border-b border-gray-100 dark:border-neutral-800">
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={styles.backButton}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <SymbolView name="chevron.left" tintColor="#007AFF" size={20} type="monochrome" />
          <Text className="text-base text-blue-500" style={styles.backLabel}>
            Back
          </Text>
        </TouchableOpacity>
        <Text className="flex-1 text-center text-base font-semibold text-gray-900 dark:text-white">
          {t('privacyPolicy.title', 'Privacy Policy')}
        </Text>
        {/* Spacer to keep title centered */}
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Title + last updated */}
        <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          {t('privacyPolicy.title', 'Privacy Policy')}
        </Text>
        <Text className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Last updated: February 2026
        </Text>

        {/* ── 1. Information We Collect ─────────────────────────────── */}
        <PolicySection
          title="1. Information We Collect"
          body="We collect the financial data you enter (income, expenses, debts, assets) and your email address for authentication. We do not collect location data, contacts, or any other personal information."
        />

        {/* ── 2. How We Use Your Information ───────────────────────── */}
        <PolicySection
          title="2. How We Use Your Information"
          body="Your financial data is stored securely in our database and used solely to provide you with the Balance Tracker service. We do not sell, share, or use your data for advertising."
        />

        {/* ── 3. Data Storage and Security ─────────────────────────── */}
        <PolicySection
          title="3. Data Storage and Security"
          body="Your data is stored using Supabase, a secure cloud database provider. Data is encrypted in transit using TLS. Row-level security ensures only you can access your data."
        />

        {/* ── 4. Data Deletion ─────────────────────────────────────── */}
        <PolicySection
          title="4. Data Deletion"
          body="You can delete your account and all associated data at any time from the Settings screen. Account deletion is immediate and permanent."
        />

        {/* ── 5. Contact ───────────────────────────────────────────── */}
        <PolicySection
          title="5. Contact"
          body="For privacy-related questions, contact us at privacy@balancetracker.app"
        />
      </ScrollView>
    </SafeScreen>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 60,
  },
  backLabel: {
    marginLeft: 2,
  },
  content: {
    padding: 20,
    paddingBottom: 48,
  },
  section: {
    marginBottom: 24,
  },
});
