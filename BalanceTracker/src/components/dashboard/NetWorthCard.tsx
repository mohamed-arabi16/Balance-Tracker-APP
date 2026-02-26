import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Text, View } from 'react-native';

import { SHADOWS } from '@/lib/tokens';

interface NetWorthCardProps {
  netWorth: number;
  currency: string;
  label: string;
}

export function NetWorthCard({ netWorth, currency, label }: NetWorthCardProps) {
  const isPositive = netWorth >= 0;
  const trendColor = isPositive ? '#34C759' : '#FF3B30';
  const formatted = `${currency} ${Math.abs(netWorth).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

  return (
    <View
      className="rounded-3xl border border-balance-200 dark:border-balance-800 bg-balance-50 dark:bg-balance-950 p-6 mb-5"
      style={SHADOWS.cardStrong}
    >
      <Text className="text-xs font-semibold uppercase tracking-wider text-balance-700 dark:text-balance-300">
        {label}
      </Text>
      <Text className="text-4xl font-bold text-balance-700 dark:text-balance-300 mt-2">
        {netWorth < 0 ? '−' : ''}{formatted}
      </Text>
      <View className="h-px bg-balance-200 dark:bg-balance-800 my-4" />
      <View className="flex-row items-center">
        <Ionicons
          name={isPositive ? 'trending-up' : 'trending-down'}
          color={trendColor}
          size={15}
        />
        <Text className={`text-sm font-medium ml-1.5 ${isPositive ? 'text-income-600 dark:text-income-400' : 'text-expense-600 dark:text-expense-400'}`}>
          {isPositive ? 'Positive net worth' : 'Negative net worth'}
        </Text>
      </View>
    </View>
  );
}
