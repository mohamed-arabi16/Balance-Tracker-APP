import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { FormScreen } from '@/components/layout/FormScreen';
import { supabase } from '@/integrations/supabase/client';

// ─── Reset Password Screen ────────────────────────────────────────────────────
//
// This screen is reached via the Supabase password recovery deep link.
// When the user taps the recovery email link on iPhone, the OS opens
// balancetracker://reset-password → Expo Router renders this screen.
//
// Supabase fires onAuthStateChange with event PASSWORD_RECOVERY and sets a
// temporary session — the user is authenticated long enough to call updateUser.
//
// After a successful password update: sign out + redirect to sign-in.
// If the screen is opened without a recovery session: redirect to sign-in.

export default function ResetPasswordScreen() {
  const { t } = useTranslation();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRecoverySession, setIsRecoverySession] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // wait for onAuthStateChange
  const [isUpdating, setIsUpdating] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Track whether the auth-state listener already handled the recovery event
  const recoveryHandled = useRef(false);

  useEffect(() => {
    // Subscribe to auth state changes — Supabase fires PASSWORD_RECOVERY when
    // the user arrives via the recovery deep link.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setIsRecoverySession(true);
        setIsLoading(false);
        recoveryHandled.current = true;
      }
    });

    // If no PASSWORD_RECOVERY event fires within 3 seconds the user probably
    // navigated here directly (not via deep link) — redirect them to sign-in.
    const timeout = setTimeout(() => {
      if (!recoveryHandled.current) {
        setIsLoading(false);
        router.replace('/(auth)/sign-in' as any);
      }
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleUpdatePassword = async () => {
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError(t('auth.passwordMismatch', 'Passwords do not match'));
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    try {
      setIsUpdating(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      // Sign out so the user proceeds through the normal sign-in flow
      await supabase.auth.signOut();

      Alert.alert(
        t('auth.updatePassword', 'Update Password'),
        t('auth.passwordUpdated', 'Password updated. Please sign in.'),
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(auth)/sign-in' as any),
          },
        ]
      );
    } catch (err) {
      Alert.alert(
        t('auth.updatePassword', 'Update Password'),
        err instanceof Error ? err.message : 'An error occurred. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsUpdating(false);
    }
  };

  // While waiting for the recovery event, show a spinner
  if (isLoading) {
    return (
      <FormScreen>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text className="text-sm text-gray-500 dark:text-gray-400 mt-4 text-center">
            Verifying recovery link...
          </Text>
        </View>
      </FormScreen>
    );
  }

  // Guard: only render the form when a valid recovery session is present
  if (!isRecoverySession) {
    return null;
  }

  return (
    <FormScreen>
      <View style={styles.container}>
        {/* Title */}
        <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {t('auth.updatePassword', 'Update Password')}
        </Text>
        <Text className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          Enter your new password below.
        </Text>

        {/* New Password */}
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('auth.newPassword', 'New Password')}
        </Text>
        <TextInput
          style={styles.input}
          className="bg-white dark:bg-neutral-800 text-gray-900 dark:text-white border border-gray-200 dark:border-neutral-700 rounded-xl px-4 py-3 mb-4"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Min. 6 characters"
          placeholderTextColor="#9CA3AF"
          returnKeyType="next"
          editable={!isUpdating}
        />

        {/* Confirm Password */}
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('auth.confirmPassword', 'Confirm Password')}
        </Text>
        <TextInput
          style={styles.input}
          className="bg-white dark:bg-neutral-800 text-gray-900 dark:text-white border border-gray-200 dark:border-neutral-700 rounded-xl px-4 py-3 mb-2"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Re-enter password"
          placeholderTextColor="#9CA3AF"
          returnKeyType="done"
          onSubmitEditing={handleUpdatePassword}
          editable={!isUpdating}
        />

        {/* Inline validation error */}
        {passwordError ? (
          <Text className="text-sm text-red-600 dark:text-red-400 mb-4">{passwordError}</Text>
        ) : (
          <View style={styles.errorSpacer} />
        )}

        {/* Submit button */}
        <TouchableOpacity
          style={[styles.button, isUpdating && styles.buttonDisabled]}
          onPress={handleUpdatePassword}
          disabled={isUpdating}
          activeOpacity={0.8}
        >
          {isUpdating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonLabel}>
              {t('auth.updatePassword', 'Update Password')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </FormScreen>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 48,
  },
  input: {
    fontSize: 16,
  },
  errorSpacer: {
    height: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
