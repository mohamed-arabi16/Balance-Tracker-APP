import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

interface FormScreenProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Keyboard-aware scrollable form wrapper.
 *
 * Scrolls content above the keyboard automatically on iOS.
 * Uses KeyboardAvoidingView + ScrollView (Expo Go compatible).
 * When the project moves to a dev build (Phase 8+), this can be upgraded
 * to react-native-keyboard-controller's KeyboardAwareScrollView for
 * more precise control via bottomOffset.
 */
export function FormScreen({ children, className }: FormScreenProps) {
  return (
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
});
