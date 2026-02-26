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

export default function SignUpScreen() {
  const { t } = useTranslation();
  const { signUp } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const handleSignUp = async () => {
    setError(null);

    // Client-side password match validation
    if (password !== confirmPassword) {
      setError(t('auth.signUp.passwordMismatch'));
      return;
    }

    setLoading(true);

    const { error: signUpError } = await signUp(email, password);

    if (signUpError) {
      haptics.onError();
      setError(signUpError.message);
    } else {
      // Show check-email state
      // If email confirmation is disabled, onAuthStateChange fires SIGNED_IN
      // and Stack.Protected (Plan 02) redirects to tabs automatically.
      // If enabled, user sees this message and waits.
      setEmailSent(true);
    }

    setLoading(false);
  };

  if (emailSent) {
    return (
      <FormScreen className="bg-white dark:bg-gray-950">
        <View className="flex-1 items-center justify-center px-6 py-12">
          <Text className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
            {t('auth.signUp.success')}
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
            {t('auth.appName')}
          </Text>
          <Text className="mt-2 text-base text-gray-500 dark:text-gray-400">
            {t('auth.signUp.title')}
          </Text>
        </View>

        {/* Email input */}
        <View className="mb-4">
          <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('auth.signUp.emailLabel')}
          </Text>
          <TextInput
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            value={email}
            onChangeText={setEmail}
            placeholder={t('auth.signUp.emailPlaceholder')}
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
            {t('auth.signUp.passwordLabel')}
          </Text>
          <TextInput
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            value={password}
            onChangeText={setPassword}
            placeholder={t('auth.signUp.passwordPlaceholder')}
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            autoComplete="new-password"
            editable={!loading}
          />
        </View>

        {/* Confirm password input */}
        <View className="mb-4">
          <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('auth.signUp.confirmPasswordLabel')}
          </Text>
          <TextInput
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder={t('auth.signUp.confirmPasswordPlaceholder')}
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            autoComplete="new-password"
            editable={!loading}
          />
        </View>

        {/* Error message */}
        {error ? (
          <Text className="mb-4 text-sm text-red-500">
            {error}
          </Text>
        ) : null}

        {/* Sign-up button */}
        <TouchableOpacity
          className="mb-6 w-full items-center rounded-lg bg-blue-500 px-4 py-3 disabled:opacity-50"
          onPress={handleSignUp}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-base font-semibold text-white">
              {t('auth.signUp.button')}
            </Text>
          )}
        </TouchableOpacity>

        {/* Sign-in link */}
        <View className="flex-row items-center justify-center">
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            {t('auth.signUp.hasAccount')}
          </Text>
          <Text className="text-sm"> </Text>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Link href={'/(auth)/sign-in' as any}>
            <Text className="text-sm font-medium text-blue-500">
              {t('auth.signUp.signInLink')}
            </Text>
          </Link>
        </View>
      </View>
    </FormScreen>
  );
}
