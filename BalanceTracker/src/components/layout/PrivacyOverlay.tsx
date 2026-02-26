import { BlurView } from 'expo-blur';
import React, { useEffect, useState } from 'react';
import { AppState, AppStateStatus, StyleSheet, Text } from 'react-native';

/**
 * Privacy overlay that blurs the screen when the app enters the app switcher.
 *
 * iOS captures the app screenshot at the `inactive` transition (not `background`).
 * Showing the blur on `inactive` ensures sensitive financial data is never visible
 * in the app switcher.
 *
 * Mount this once as the last child in the root layout so it renders above all content.
 * Returns null when the app is active.
 */
export function PrivacyOverlay() {
  const [isInactive, setIsInactive] = useState(false);

  useEffect(() => {
    function handleAppStateChange(nextState: AppStateStatus) {
      // Show on inactive — this is the moment iOS captures the app switcher screenshot
      setIsInactive(nextState === 'inactive');
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  if (!isInactive) {
    return null;
  }

  return (
    <BlurView intensity={80} tint="systemChromeMaterial" style={StyleSheet.absoluteFill}>
      <Text style={styles.appName}>{'Balance Tracker'}</Text>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  appName: {
    position: 'absolute',
    top: '50%',
    alignSelf: 'center',
    fontSize: 24,
    fontWeight: '600',
    color: '#333333',
  },
});
