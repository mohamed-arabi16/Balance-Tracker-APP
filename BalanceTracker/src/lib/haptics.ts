import * as Haptics from 'expo-haptics';

/**
 * Named haptic feedback actions for common app interactions.
 *
 * Usage:
 *   haptics.onSave()   — light impact for successful saves
 *   haptics.onDelete() — warning notification for destructive actions
 *   haptics.onError()  — error notification for failed operations
 *   haptics.onToggle() — selection feedback for toggles and navigation
 */
export const haptics = {
  onSave: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  onDelete: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  onError: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  onToggle: () => Haptics.selectionAsync(),
};
