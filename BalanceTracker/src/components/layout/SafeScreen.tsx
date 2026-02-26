import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

interface SafeScreenProps {
  children: React.ReactNode;
  className?: string;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

/**
 * Screen wrapper that respects safe areas (notch, Dynamic Island, home indicator).
 * Every screen in the app wraps its content in SafeScreen instead of a bare View.
 */
export function SafeScreen({ children, className, edges = ['top', 'bottom'] }: SafeScreenProps) {
  return (
    <SafeAreaView edges={edges} className={`flex-1 bg-white dark:bg-gray-950 ${className ?? ''}`}>
      {children}
    </SafeAreaView>
  );
}
