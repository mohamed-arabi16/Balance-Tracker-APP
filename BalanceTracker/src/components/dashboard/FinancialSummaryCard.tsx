import React from 'react';
import { Pressable, View, Text } from 'react-native';
import { router, type Href } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorScheme } from 'nativewind';
import { haptics } from '@/lib/haptics';
import { SHADOWS } from '@/lib/tokens';
import {
  summaryAccentClasses,
  type SummaryAccentVariant,
} from '@/lib/statusBadgeTheme';

interface FinancialSummaryCardProps {
  title: string;
  value: string;
  subtitle?: string;
  route: Href;
  variant: SummaryAccentVariant;
}

export function FinancialSummaryCard({
  title,
  value,
  subtitle,
  route,
  variant,
}: FinancialSummaryCardProps) {
  const { colorScheme } = useColorScheme();
  const chevronColor = colorScheme === 'dark' ? '#6B7280' : '#9CA3AF';
  const accentClasses = summaryAccentClasses[variant];

  return (
    <Pressable
      onPress={() => {
        haptics.onToggle();
        router.push(route);
      }}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [
        {
          transform: [{ scale: pressed ? 0.985 : 1 }],
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <View
        className={`rounded-2xl p-4 flex-row items-center min-h-[108px] ${accentClasses.container}`}
        style={SHADOWS.card}
      >
        <View className="flex-1">
          <Text className="text-sm text-gray-500 dark:text-gray-400">{title}</Text>
          <Text className={`text-xl font-bold mt-0.5 ${accentClasses.value}`}>{value}</Text>
          {subtitle ? (
            <Text className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{subtitle}</Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" color={chevronColor} size={18} />
      </View>
    </Pressable>
  );
}
