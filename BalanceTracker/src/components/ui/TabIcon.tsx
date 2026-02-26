import { Ionicons } from '@expo/vector-icons';
import { SymbolView } from 'expo-symbols';
import React from 'react';

import { getIoniconsName } from '@/lib/iconMap';

interface TabIconProps {
  /** SF Symbol name for iOS (e.g. 'house.fill'). Passed to SymbolView name prop. */
  sfSymbol: string;
  /** Icon color — passed to both SymbolView tintColor and Ionicons color. */
  color: string;
  /** Icon size. Defaults to 24. */
  size?: number;
}

/**
 * Cross-platform tab bar icon.
 *
 * - iOS/tvOS: renders SF Symbol via SymbolView (high quality, system-integrated)
 * - Android/Web: renders Ionicons via SymbolView fallback prop
 *
 * The fallback prop is the official expo-symbols solution for non-iOS platforms.
 * @see https://docs.expo.dev/versions/v54.0.0/sdk/symbols/#fallback
 */
export function TabIcon({ sfSymbol, color, size = 24 }: TabIconProps) {
  return (
    <SymbolView
      name={sfSymbol as any}
      tintColor={color}
      size={size}
      type="monochrome"
      fallback={
        <Ionicons
          name={getIoniconsName(sfSymbol)}
          size={size}
          color={color}
        />
      }
    />
  );
}
