import { Link } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { FormScreen } from '@/components/layout/FormScreen';
import { useAuth } from '@/contexts/AuthContext';
import { haptics } from '@/lib/haptics';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const handleResetPassword = async () => {
    setLoading(true);
    setError(null);

    const { error: resetError } = await resetPassword(email);

    if (resetError) {
      haptics.onError();
      setError(resetError.message);
    } else {
      haptics.onSave();
      setEmailSent(true);
    }

    setLoading(false);
  };

  if (emailSent) {
    return (
      <FormScreen className="bg-white dark:bg-gray-950">
        <View className="flex-1 items-center justify-center px-6 py-12">
          <Text className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
            {t('auth.forgotPassword.success')}
          </Text>
          <Text className="mb-8 text-center text-base text-gray-500 dark:text-gray-400">
            {t('auth.forgotPassword.sentMessage')}
          </Text>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Link href={'/(auth)/sign-in' as any}>
            <Text className="text-base font-medium text-blue-500">
              {t('auth.forgotPassword.backToSignIn')}
            </Text>
          </Link>
        </View>
      </FormScreen>
    );
  }

  return (
    <FormScreen className="bg-white dark:bg-gray-950">
      <View className="flex-1 justify-center px-6 py-12">
        {/* App title area */}
        <View className="mb-10 items-center">
          <Text className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('auth.forgotPassword.title')}
          </Text>
          <Text className="mt-2 text-center text-base text-gray-500 dark:text-gray-400">
            {t('auth.forgotPassword.subtitle')}
          </Text>
        </View>

        {/* Email input */}
        <View className="mb-4">
          <TextInput
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            value={email}
            onChangeText={setEmail}
            placeholder={t('auth.signIn.emailPlaceholder')}
            placeholderTextColor="#9CA3AF"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            editable={!loading}
          />
        </View>

        {/* Error message */}
        {error ? (
          <Text className="mb-4 text-sm text-red-500">
            {error}
          </Text>
        ) : null}

        {/* Send reset link button */}
        <TouchableOpacity
          className="mb-6 w-full items-center rounded-lg bg-blue-500 px-4 py-3 disabled:opacity-50"
          onPress={handleResetPassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-base font-semibold text-white">
              {t('auth.forgotPassword.button')}
            </Text>
          )}
        </TouchableOpacity>

        {/* Back to sign-in link */}
        <View className="items-center">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Link href={'/(auth)/sign-in' as any}>
            <Text className="text-sm font-medium text-blue-500">
              {t('auth.forgotPassword.backToSignIn')}
            </Text>
          </Link>
        </View>
      </View>
    </FormScreen>
  );
}
