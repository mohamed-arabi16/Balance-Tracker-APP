// SHADOWS — iOS-native shadow props (use in StyleSheet.create, NOT NativeWind className)
// NativeWind shadow-sm/md utilities do NOT produce iOS native shadows on physical devices.
export const SHADOWS = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3, // Android fallback
  },
  cardStrong: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
} as const;

// TYPOGRAPHY — Apple HIG SF Pro scale (use fontSize + fontWeight together)
export const TYPOGRAPHY = {
  largeTitle: { fontSize: 34, fontWeight: '700' as const },
  title1:     { fontSize: 28, fontWeight: '700' as const },
  title2:     { fontSize: 22, fontWeight: '700' as const },
  title3:     { fontSize: 20, fontWeight: '600' as const },
  headline:   { fontSize: 17, fontWeight: '600' as const },
  body:       { fontSize: 17, fontWeight: '400' as const },
  callout:    { fontSize: 16, fontWeight: '400' as const },
  subheadline:{ fontSize: 15, fontWeight: '400' as const },
  footnote:   { fontSize: 13, fontWeight: '400' as const },
  caption1:   { fontSize: 12, fontWeight: '400' as const },
  caption2:   { fontSize: 11, fontWeight: '400' as const },
} as const;

// SPACING — 8pt grid base (Apple HIG recommends 16pt base margin, 8pt sub-grid)
export const SPACING = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
} as const;

// RADIUS — consistent border radius values
export const RADIUS = {
  sm:  8,
  md:  10,
  lg:  12,
  xl:  16,
  full: 999,
} as const;

// COLORS — iOS system semantic colors (hex approximations of UIKit dynamic colors)
// Use NativeWind dark: prefix for component-level dark mode where possible.
// Use this object when StyleSheet.create requires color values that must change with scheme.
export const COLORS = {
  // iOS system grouped backgrounds
  groupedBg:  { light: '#F2F2F7', dark: '#1C1C1E' },
  // iOS cell backgrounds (white cards within grouped lists)
  cellBg:     { light: '#FFFFFF', dark: '#2C2C2E' },
  // iOS separator (hairline between rows)
  separator:  { light: '#C6C6C8', dark: '#38383A' },
  // iOS system label colors
  label:          { light: '#000000', dark: '#FFFFFF' },
  secondaryLabel: { light: '#3C3C43', dark: '#EBEBF5' },
  tertiaryLabel:  { light: '#3C3C4399', dark: '#EBEBF599' },
  // iOS system accent
  tint: '#007AFF',
  destructive: '#FF3B30',
  success: '#34C759',
  warning: '#FF9500',
} as const;
