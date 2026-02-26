import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { router } from 'expo-router';
import { haptics } from '@/lib/haptics';
import { SHADOWS } from '@/lib/tokens';

interface FinancialSummaryCardProps {
  title: string;
  value: string;
  subtitle?: string;
  route: string;
  color?: string;
}

export function FinancialSummaryCard({
  title,
  value,
  subtitle,
  route,
  color = '#007AFF',
}: FinancialSummaryCardProps) {
  return (
    <TouchableOpacity
      onPress={() => {
        haptics.onToggle();
        router.push(route as any);
      }}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View
        className="rounded-2xl bg-white dark:bg-neutral-900 p-4 mb-3 flex-row items-center"
        style={[{ borderLeftWidth: 3, borderLeftColor: color }, SHADOWS.card]}
      >
        <View className="flex-1">
          <Text className="text-sm text-gray-500 dark:text-gray-400">{title}</Text>
          <Text className="text-xl font-bold text-gray-900 dark:text-white">{value}</Text>
          {subtitle ? (
            <Text className="text-xs text-gray-400 dark:text-gray-500">{subtitle}</Text>
          ) : null}
        </View>
        <Text className="text-gray-400 dark:text-gray-500 text-lg">›</Text>
      </View>
    </TouchableOpacity>
  );
}
