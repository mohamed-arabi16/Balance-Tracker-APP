import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

interface SafeScreenProps {
  children: React.ReactNode;
  className?: string;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  grouped?: boolean;
}

/**
 * Screen wrapper that respects safe areas (notch, Dynamic Island, home indicator).
 * Every screen in the app wraps its content in SafeScreen instead of a bare View.
 *
 * Pass `grouped` to switch background to iOS system grouped color (#F2F2F7 / #1C1C1E).
 * Default background is white / gray-950.
 */
export function SafeScreen({ children, className, edges = ['top', 'bottom'], grouped = false }: SafeScreenProps) {
  const bgClass = grouped
    ? 'bg-[#F2F2F7] dark:bg-[#1C1C1E]'
    : 'bg-white dark:bg-gray-950';
  return (
    <SafeAreaView edges={edges} className={`flex-1 ${bgClass} ${className ?? ''}`}>
      {children}
    </SafeAreaView>
  );
}
