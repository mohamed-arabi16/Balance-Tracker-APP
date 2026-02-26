import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface FormScreenProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Keyboard-aware scrollable form wrapper with safe area insets.
 *
 * Wraps content in SafeAreaView so auth screens respect the notch/Dynamic Island.
 * Scrolls content above the keyboard automatically on iOS.
 */
export function FormScreen({ children, className }: FormScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
          className={className}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
});
