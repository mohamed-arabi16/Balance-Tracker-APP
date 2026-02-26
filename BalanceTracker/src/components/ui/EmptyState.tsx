import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { haptics } from '@/lib/haptics';

interface EmptyStateProps {
  title: string;
  message: string;
  ctaLabel?: string;   // optional — some empty states are info-only
  onCta?: () => void;  // optional — paired with ctaLabel
  symbolName?: string; // SF Symbol name, e.g. 'dollarsign.circle', 'creditcard'
}

/**
 * Minimal Apple HIG-style empty state component.
 *
 * Design principles:
 * - SF Symbol icon above title (when symbolName provided)
 * - No custom illustrations (minimal, clean)
 * - Encouraging tone: "Start tracking your income to see it here."
 *   (not "No income yet." — which feels dismissive)
 * - Haptic feedback on CTA press for tactile confirmation
 * - RTL compatible via logical properties (marginStart/End, paddingStart/End)
 * - ctaLabel and onCta are optional — info-only screens omit the button
 */
export function EmptyState({ title, message, ctaLabel, onCta, symbolName }: EmptyStateProps) {
  function handlePress() {
    haptics.onToggle();
    onCta?.();
  }

  return (
    <View style={styles.container} className="flex-1 items-center justify-center">
      {symbolName ? (
        <SymbolView
          name={symbolName as any}
          tintColor="#9ca3af"
          size={56}
          type="hierarchical"
          style={{ marginBottom: 20 }}
        />
      ) : null}
      <Text
        style={styles.title}
        className="text-xl font-semibold text-gray-900 dark:text-gray-100 text-center"
      >
        {title}
      </Text>
      <Text
        style={styles.message}
        className="text-base text-gray-500 dark:text-gray-400 text-center"
      >
        {message}
      </Text>
      {ctaLabel && onCta ? (
        <TouchableOpacity
          onPress={handlePress}
          style={styles.button}
          className="bg-blue-600 dark:bg-blue-500 rounded-xl py-3"
          accessibilityRole="button"
        >
          <Text className="text-white text-base font-semibold text-center">
            {ctaLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingStart: 24,
    paddingEnd: 24,
  },
  title: {
    marginBottom: 8,
  },
  message: {
    marginBottom: 32,
    marginStart: 16,
    marginEnd: 16,
  },
  button: {
    paddingStart: 24,
    paddingEnd: 24,
  },
});
