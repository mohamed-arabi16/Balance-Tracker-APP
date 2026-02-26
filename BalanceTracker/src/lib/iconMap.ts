import type { Ionicons } from '@expo/vector-icons';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

/**
 * Maps SF Symbol names to their nearest Ionicons equivalents.
 * Used by TabIcon and EmptyState for Android/Web fallback rendering.
 */
export const SF_TO_IONICONS: Record<string, IoniconsName> = {
  // Tab bar icons
  'house.fill':            'home',
  'list.bullet':           'list',
  'creditcard.fill':       'card',
  'chart.bar.fill':        'bar-chart',
  'ellipsis.circle.fill':  'ellipsis-horizontal-circle',
  'person.2.fill':         'people',
  'doc.text.fill':         'document-text',
  // EmptyState icons
  'chart.bar':             'bar-chart-outline',
  'arrow.up.circle':       'arrow-up-circle-outline',
  'arrow.down.circle':     'arrow-down-circle-outline',
  'creditcard':            'card-outline',
  'banknote':              'cash-outline',
};

/**
 * Returns the Ionicons icon name for a given SF Symbol name.
 * Falls back to 'help-circle-outline' if no mapping exists (safe default — shows
 * a question mark rather than blank).
 */
export function getIoniconsName(sfSymbol: string): IoniconsName {
  return SF_TO_IONICONS[sfSymbol] ?? 'help-circle-outline';
}
