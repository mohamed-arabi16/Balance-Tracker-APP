import React from 'react';
import { View, Text } from 'react-native';
import { SHADOWS } from '@/lib/tokens';

interface NetWorthCardProps {
  netWorth: number;
  currency: string;
  label: string;
}

export function NetWorthCard({ netWorth, currency, label }: NetWorthCardProps) {
  const formatted = `${currency} ${netWorth.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  return (
    <View className="rounded-2xl bg-white dark:bg-neutral-900 p-5 mb-3" style={SHADOWS.card}>
      <Text className="text-sm text-gray-500 dark:text-gray-400 mb-1">{label}</Text>
      <Text className="text-3xl font-bold text-gray-900 dark:text-white">{formatted}</Text>
    </View>
  );
}
