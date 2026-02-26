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

export default function SignInScreen() {
  const { t } = useTranslation();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);

    const { error: signInError } = await signIn(email, password);

    if (signInError) {
      haptics.onError();
      setError(signInError.message);
    } else {
      haptics.onSave();
      // Navigation handled automatically by Stack.Protected (Plan 02)
    }

    setLoading(false);
  };

  return (
    <FormScreen className="bg-white dark:bg-gray-950">
      <View className="flex-1 justify-center px-6 py-12">
        {/* App title area */}
        <View className="mb-10 items-center">
          <Text className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('auth.appName')}
          </Text>
          <Text className="mt-2 text-base text-gray-500 dark:text-gray-400">
            {t('auth.signIn.title')}
          </Text>
        </View>

        {/* Email input */}
        <View className="mb-4">
          <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('auth.signIn.emailLabel')}
          </Text>
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

        {/* Password input */}
        <View className="mb-4">
          <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('auth.signIn.passwordLabel')}
          </Text>
          <TextInput
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            value={password}
            onChangeText={setPassword}
            placeholder={t('auth.signIn.passwordPlaceholder')}
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            autoComplete="password"
            editable={!loading}
          />
        </View>

        {/* Error message */}
        {error ? (
          <Text className="mb-4 text-sm text-red-500">
            {error}
          </Text>
        ) : null}

        {/* Sign-in button */}
        <TouchableOpacity
          className="mb-4 w-full items-center rounded-lg bg-blue-500 px-4 py-3 disabled:opacity-50"
          onPress={handleSignIn}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-base font-semibold text-white">
              {t('auth.signIn.button')}
            </Text>
          )}
        </TouchableOpacity>

        {/* Forgot password link */}
        <View className="mb-2 items-center">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Link href={'/(auth)/forgot-password' as any}>
            <Text className="text-sm text-blue-500">
              {t('auth.signIn.forgotPassword')}
            </Text>
          </Link>
        </View>

        {/* Sign-up link */}
        <View className="flex-row items-center justify-center">
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            {t('auth.signIn.noAccount')}
          </Text>
          <Text className="text-sm"> </Text>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Link href={'/(auth)/sign-up' as any}>
            <Text className="text-sm font-medium text-blue-500">
              {t('auth.signIn.signUpLink')}
            </Text>
          </Link>
        </View>
      </View>
    </FormScreen>
  );
}
