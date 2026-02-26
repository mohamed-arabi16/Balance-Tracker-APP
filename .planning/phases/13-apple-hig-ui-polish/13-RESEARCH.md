# Phase 13: Apple HIG UI Polish - Research

**Researched:** 2026-02-26
**Domain:** Apple Human Interface Guidelines, NativeWind v4, React Native visual design
**Confidence:** HIGH

---

## Summary

Phase 13 is a pure UI polish pass — no new features, no new dependencies. Every screen already exists and works; this phase upgrades visual quality to match native Apple app standards. The work is additive: better shadows/elevation on cards, iOS grouped-list styling on FlatLists, consistent input field styling across forms, Apple HIG typography tokens, and polished empty states with SF Symbol icons.

The codebase already has a solid structural foundation: `SafeScreen`, `FormScreen`, `EmptyState`, and three dashboard card components are all factored out. The styling is a mix of raw NativeWind className strings and StyleSheet.create objects — both are fine to polish. The Tailwind config already extends custom colors (primary, secondary, success, danger, warning) but does NOT define a typography token system or spacing tokens — those need to be added.

The biggest gaps identified by auditing the actual code:
1. **Shadow/elevation**: `NetWorthCard` and `IncomeExpenseChart` use `shadow-sm` (minimal). No `shadowColor`/`shadowOffset`/`shadowRadius`/`elevation` StyleSheet props are used anywhere. iOS native cards use explicit `shadowColor: '#000'`, `shadowOpacity: 0.1`, `shadowRadius: 8`, `shadowOffset: {width: 0, height: 2}`.
2. **List styling**: Rows are flat white backgrounds with a hairline separator. Apple HIG grouped lists use `backgroundColor: '#F2F2F7'` (system grouped background) for the screen, white row cells, and proper `insetGrouped` section logic.
3. **EmptyState**: The current `EmptyState` component has no SF Symbol icon — it only renders title, message, and CTA button. Adding a `SymbolView` icon at the top is the only missing piece.
4. **Typography**: No central token system. Font sizes are scattered raw numbers (11, 12, 13, 14, 15, 16, etc.) across StyleSheet objects. Apple HIG defines: largeTitle(34), title1(28), title2(22), title3(20), headline(17/semibold), body(17), callout(16), subheadline(15), footnote(13), caption1(12), caption2(11).
5. **Dark mode on list screens**: Rows are hardcoded `backgroundColor: '#ffffff'` and `color: '#111827'` — no dark mode adaptation. This breaks dark theme on list screens.
6. **FAB (Floating Action Button) inconsistency**: Transactions uses an absolute-positioned FAB; Debts/Assets use a headerBar button. Should unify pattern.

**Primary recommendation:** Create a shared `src/lib/tokens.ts` design token file (typography + spacing + colors + shadows) that every component references, then polish each component category (dashboard cards, list rows, form fields, empty states) in the four plan waves already defined in the roadmap.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| POLISH-01 | Dashboard uses Apple HIG card design — elevated cards with subtle shadows, rounded corners, clear visual hierarchy, and proper section spacing | Audit shows `NetWorthCard` uses `shadow-sm` only; needs explicit iOS shadow props. `FinancialSummaryCard` has a color left-border which is good hierarchy but needs stronger shadow. `IncomeExpenseChart` container is functional. All three need `shadowColor`, `shadowOpacity`, `shadowRadius`, `shadowOffset`, `elevation` and a standardized `borderRadius: 16` (Apple HIG uses 10-20pt for cards). |
| POLISH-02 | List screens (Transactions, Debts, Assets) use iOS-native grouped section styling with proper row heights, separators, and tappable row feedback | Audit shows rows are flat white with hairline separators. Apple HIG "insetGrouped" style requires: screen bg `#F2F2F7` (light) / `#1C1C1E` (dark), card cells white/`#2C2C2E`, 16pt horizontal margin, 44pt min row height, `borderRadius: 10` on cell groups, and `pressRetentionOffset` on Pressable for tap feedback. |
| POLISH-03 | Form sheets use consistent iOS input field styling (rounded rect, proper padding, clear labels, prominent primary action button) | Audit shows all four form screens (add-income, add-expense, add-debt, add-asset) already share identical styling: `borderRadius: 10`, 14px/10px padding, `#d1d5db` border. Good start. Gaps: dark mode not handled (no dark: NativeWind classes on StyleSheet inputs), label color is hardcoded `#374151`, save button borderRadius varies (10 vs 12). Need to standardize to tokens and add dark mode variants. |
| POLISH-04 | Typography and spacing follow Apple HIG throughout — SF Pro scale, 16pt base padding, 44pt minimum touch targets | No token system exists. Raw pixel sizes are scattered everywhere. Need `TYPOGRAPHY` and `SPACING` token objects in `src/lib/tokens.ts`, then replace all raw values with token references. The Tailwind config can be extended with these same values for NativeWind className usage. |
| POLISH-05 | Empty states and loading indicators are visually polished — SF Symbol icons, descriptive copy, consistent placement | `EmptyState` component exists with good structure but no SF Symbol icon. `SymbolView` from `expo-symbols` is already installed (used in tab bar). Loading states are bare `<Text>Loading...</Text>` — need `ActivityIndicator` with proper placement. Need to add optional `symbolName` prop to `EmptyState` and upgrade loading states in Dashboard. |
</phase_requirements>

---

## Standard Stack

### Core (already installed — no new dependencies needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| NativeWind v4 | ^4.2.1 | Tailwind CSS for RN — used for className styling | Already configured, works with dark: prefix |
| expo-symbols | ~1.0.8 | SF Symbols via SymbolView component | Already used in tab bar icons |
| react-native-safe-area-context | ~5.6.0 | Safe area insets for proper card/list padding | Already wired in SafeScreen |
| react-native-gesture-handler | ~2.28.0 | Swipeable rows (ReanimatedSwipeable) | Already used in all list screens |
| expo-haptics | ~15.0.8 | Haptic feedback via `haptics.ts` helper | Already wired in interactions |

### No New Dependencies Required

This phase is entirely a visual/styling pass. All required libraries are already installed. Zero new `npm install` or `expo install` commands needed.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| expo-symbols SymbolView | react-native-vector-icons | expo-symbols is already installed and provides native SF Symbol rendering — no reason to switch |
| StyleSheet.create | Fully NativeWind className | Mixed approach is already in codebase — keep it; StyleSheet.create handles platform-specific shadow props better |
| Custom shadow tokens | react-native-shadow-2 | Library adds complexity; iOS shadow via StyleSheet props is standard and sufficient |

**Installation:** None required.

---

## Architecture Patterns

### Recommended Project Structure Changes

```
src/
├── lib/
│   ├── tokens.ts          # NEW: design token constants (typography, spacing, shadows, colors)
│   └── haptics.ts         # existing
├── components/
│   ├── layout/
│   │   ├── SafeScreen.tsx  # existing — no change needed
│   │   └── FormScreen.tsx  # existing — no change needed
│   ├── ui/
│   │   └── EmptyState.tsx  # MODIFY: add optional symbolName prop
│   └── dashboard/
│       ├── NetWorthCard.tsx       # MODIFY: stronger shadow, elevated card style
│       ├── FinancialSummaryCard.tsx  # MODIFY: stronger shadow, remove left border, add SF symbol chevron
│       └── IncomeExpenseChart.tsx    # MODIFY: chart container shadow + section header
app/
└── (tabs)/
    ├── index.tsx             # MODIFY: screen bg to grouped, section headers
    ├── transactions/index.tsx # MODIFY: grouped section styling, dark mode row bg
    ├── debts/index.tsx       # MODIFY: grouped section styling, dark mode row bg
    └── assets/index.tsx      # MODIFY: grouped section styling, dark mode row bg
```

### Pattern 1: iOS Shadow Token

**What:** A reusable shadow style object that produces iOS-correct elevation.
**When to use:** Every card component (NetWorthCard, FinancialSummaryCard, chart container, settings sections).
**Example:**
```typescript
// src/lib/tokens.ts
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
```

### Pattern 2: Apple HIG Typography Scale

**What:** Named font size + weight constants matching SF Pro scale.
**When to use:** Every `Text` component in the app — replace all raw fontSize numbers.
**Example:**
```typescript
// src/lib/tokens.ts
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
```

### Pattern 3: iOS Grouped Section Colors

**What:** System color tokens for the iOS grouped list appearance.
**When to use:** TransactionsScreen, DebtsScreen, AssetsScreen — the screen background and row backgrounds.
**Example:**
```typescript
// src/lib/tokens.ts
export const COLORS = {
  // iOS system grouped background (behind card groups)
  groupedBg: { light: '#F2F2F7', dark: '#1C1C1E' },
  // iOS cell background (white cards within grouped lists)
  cellBg:    { light: '#FFFFFF', dark: '#2C2C2E' },
  // iOS separator color
  separator: { light: '#C6C6C8', dark: '#38383A' },
  // iOS label colors
  label:     { light: '#000000', dark: '#FFFFFF' },
  secondaryLabel: { light: '#3C3C43', dark: '#EBEBF5' },
  tertiaryLabel:  { light: '#3C3C4399', dark: '#EBEBF599' },
  // iOS system blue
  tint:      '#007AFF',
  destructive: '#FF3B30',
} as const;
```

### Pattern 4: EmptyState with SF Symbol

**What:** Add optional `symbolName` prop to the existing EmptyState component. Use SymbolView from expo-symbols.
**When to use:** All list screens' empty states.
**Example:**
```typescript
// src/components/ui/EmptyState.tsx — modified interface
interface EmptyStateProps {
  title: string;
  message: string;
  ctaLabel?: string;   // made optional — some empty states may not have a CTA
  onCta?: () => void;
  symbolName?: string; // SF Symbol name, e.g. 'dollarsign.circle', 'creditcard'
}

// Usage in component body:
import { SymbolView } from 'expo-symbols';
// ...
{symbolName ? (
  <SymbolView
    name={symbolName}
    tintColor="#9ca3af"
    size={56}
    type="hierarchical"
    style={{ marginBottom: 16 }}
  />
) : null}
```

### Pattern 5: Inset Grouped List Row

**What:** iOS-style list row with proper padding, min height, and press feedback.
**When to use:** Every row in FlatList screens (Transactions, Debts, Assets).
**Example:**
```typescript
// Row style baseline — use tokens
const rowStyle = {
  minHeight: 44,             // Apple HIG minimum touch target
  paddingHorizontal: 16,
  paddingVertical: 12,
  backgroundColor: COLORS.cellBg.light, // NativeWind handles dark mode via className
};

// Pressable press feedback
<Pressable
  style={({ pressed }) => [rowStyle, { opacity: pressed ? 0.6 : 1 }]}
  // ...
>
```

### Pattern 6: Section Header (Apple HIG style)

**What:** Uppercase small-caps label above a list group.
**When to use:** Dashboard section dividers, list screen group headers.
**Example:**
```typescript
<Text style={{
  fontSize: 13,
  fontWeight: '600',
  color: '#8E8E93',         // iOS secondary label
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  marginBottom: 6,
  paddingHorizontal: 16,
}}>
  {sectionTitle}
</Text>
```

### Anti-Patterns to Avoid

- **Hardcoded hex colors without dark mode**: `backgroundColor: '#ffffff'` in StyleSheet.create breaks dark mode. Use NativeWind `className="bg-white dark:bg-neutral-800"` or a ThemeContext-aware color from tokens.
- **Raw fontSize numbers**: `fontSize: 14` scattered everywhere — makes global typography changes impossible. Use TYPOGRAPHY tokens.
- **Missing `minHeight: 44` on touch targets**: Apple HIG mandates 44pt minimum for all tappable elements. The FAB, badge toggles, and action buttons need audit.
- **`shadow-sm` only via NativeWind**: NativeWind's shadow utilities are limited on iOS. iOS card shadows require explicit `shadowColor`, `shadowOpacity`, `shadowRadius`, `shadowOffset` in StyleSheet.create — NativeWind shadow utilities do NOT produce the same result on iOS as the StyleSheet shadow props.
- **`elevation` without `shadowColor` on Android**: Android elevation requires `elevation` prop, iOS requires shadow props. Always include both in card styles.
- **Spread StyleSheet objects for conditional styles**: `[styles.row, pressed && styles.rowPressed]` is correct. `{...styles.row, ...conditionalStyle}` creates new objects each render.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SF Symbol icon in EmptyState | Custom SVG icons | `SymbolView` from `expo-symbols` | Already installed; native rendering at all weights/sizes |
| Loading states | Custom spinner | `ActivityIndicator` from react-native | Native, matches iOS HIG spinner exactly |
| Dark mode color switching | Manual ThemeContext color lookup | NativeWind `dark:` prefix on className | Already configured and working in the codebase |
| Press feedback on rows | Custom opacity animation | `Pressable` with `style={({ pressed }) => [style, pressed && {opacity: 0.6}]}` | Built-in, no extra dep |

**Key insight:** This is a pure styling phase. Every visual element can be achieved with NativeWind className, StyleSheet.create, and already-installed components. Do not introduce new libraries.

---

## Common Pitfalls

### Pitfall 1: NativeWind shadow-sm ≠ iOS native shadow
**What goes wrong:** Using NativeWind's `shadow-sm` or `shadow-md` class on a card. It looks fine in Expo Go preview but produces a barely-visible or invisible shadow on physical iOS devices.
**Why it happens:** NativeWind converts Tailwind shadow utilities to `boxShadow` CSS, which is not the same as React Native's native iOS shadow props (`shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`).
**How to avoid:** Always use StyleSheet.create with explicit iOS shadow props for card components. Optionally combine NativeWind className for background/border-radius with StyleSheet for shadow.
**Warning signs:** Shadow looks right in web/Expo preview, invisible on physical iPhone.

### Pitfall 2: Dark mode breaks on hardcoded StyleSheet colors
**What goes wrong:** Row backgrounds and text are set to `backgroundColor: '#ffffff'` / `color: '#111827'` in StyleSheet.create objects. When user switches to dark mode, these do not change.
**Why it happens:** StyleSheet.create values are static. NativeWind `dark:` classes work, but only when applied via `className` prop, not inside a StyleSheet object.
**How to avoid:** For color values that must respond to dark mode: either (a) use NativeWind className with `dark:` prefix, or (b) use `useColorScheme()` from NativeWind to get the current scheme and select from a tokens object in the component body.
**Warning signs:** All list rows stay white in dark mode.

### Pitfall 3: SymbolView name mismatch crashes silently
**What goes wrong:** Passing an invalid SF Symbol name to `SymbolView` causes a blank space (no crash, no error) — making it look like the component just isn't rendering.
**Why it happens:** expo-symbols silently falls back to nothing on invalid symbol names. There is no runtime validation.
**How to avoid:** Always verify symbol names at https://developer.apple.com/sf-symbols/ before using. Common safe ones for finance: `dollarsign.circle`, `creditcard`, `chart.line.uptrend.xyaxis`, `tray`, `banknote`.
**Warning signs:** Empty space where icon should appear.

### Pitfall 4: 44pt touch target requirement missed on small badges
**What goes wrong:** Status badges (Received/Expected, Paid/Pending) have `paddingHorizontal: 8, paddingVertical: 3` — total height ~22pt. Apple HIG requires 44pt minimum.
**Why it happens:** Badges are styled to look small, but tappable area must still be 44pt. The visual size can be smaller if `hitSlop` is used.
**How to avoid:** Add `hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}` to any Pressable smaller than 44pt. Alternatively, increase paddingVertical to meet the target.
**Warning signs:** Users complain badges are hard to tap.

### Pitfall 5: Form styles not dark-mode adapted
**What goes wrong:** TextInput, pickerWrapper, and date button backgrounds are hardcoded `#ffffff` in all four form screens. In dark mode, white inputs on a dark background look jarring.
**Why it happens:** The form screens use StyleSheet.create for input styles, not NativeWind. StyleSheet values are static.
**How to avoid:** Either (a) migrate input styles to NativeWind className strings with dark: prefix, or (b) introduce a `useColorScheme` lookup for input background and border colors. Pattern (a) is simpler given the existing codebase style.
**Warning signs:** White input boxes on dark background in form screens.

### Pitfall 6: Inconsistent save button colors across forms
**What goes wrong:** `add-income` save button is `#2563eb` (blue). `add-expense` save button is `#ef4444` (red). `add-debt` and `add-asset` are `#2563eb`. This creates visual inconsistency between income/expense forms.
**Why it happens:** Each form was written independently with no shared design token.
**How to avoid:** Standardize all primary action buttons to `#007AFF` (iOS system blue) via a shared token. The income/expense distinction is already represented by the list color coding — the form button does not need to be color-coded.
**Warning signs:** Red "Add Expense" button clashes with blue "Add Income" button — feels like an error state.

### Pitfall 7: Missing section content for SafeScreen edges
**What goes wrong:** Some screens use `SafeScreen edges={['bottom']}` — meaning top safe area is NOT applied. If the screen has a visible header/nav bar, this is correct. But if the screen renders content starting at the top (like a title), the content will be behind the Dynamic Island.
**Why it happens:** The `edges` prop was set per-screen during Phase 7–9 based on whether a navigation header was shown. After Phase 13 polish (which may add section titles at the top of screens), this needs re-auditing.
**How to avoid:** Audit each screen's `edges` prop when adding top-level section headers. If no Expo Router Stack/Tabs header is shown above, include `'top'` in edges.

---

## Code Examples

Verified patterns appropriate for this codebase:

### Elevated Card (Apple HIG) — replaces NetWorthCard current style

```typescript
// Current: className="rounded-2xl bg-white dark:bg-neutral-900 p-5 shadow-sm mb-3"
// Replace with:
<View
  className="rounded-2xl bg-white dark:bg-neutral-900 p-5 mb-3"
  style={SHADOWS.card}
>
```

Where `SHADOWS.card` is defined in `src/lib/tokens.ts` as:
```typescript
export const SHADOWS = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
} as const;
```

### iOS Grouped Screen Background

```typescript
// In TransactionsScreen, DebtsScreen, AssetsScreen:
// Current SafeScreen: <SafeAreaView className="flex-1 bg-white dark:bg-gray-950 ...">
// List screens should use grouped background, not white:
<SafeAreaView className="flex-1 bg-[#F2F2F7] dark:bg-[#1C1C1E]">
```

Alternatively, add a `variant` prop to SafeScreen:
```typescript
// SafeScreen.tsx
export function SafeScreen({ children, className, edges = ['top', 'bottom'], grouped = false }) {
  const bgClass = grouped
    ? 'bg-[#F2F2F7] dark:bg-[#1C1C1E]'
    : 'bg-white dark:bg-gray-950';
  return (
    <SafeAreaView edges={edges} className={`flex-1 ${bgClass} ${className ?? ''}`}>
      {children}
    </SafeAreaView>
  );
}
```

### Row with Dark Mode + Press Feedback

```typescript
// TransactionsScreen IncomeRow — update row style
<Pressable
  onPress={handlePress}
  style={({ pressed }) => [
    styles.row,
    { opacity: pressed ? 0.7 : 1 },
  ]}
>
// ...
const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,  // ~44pt total with content
    minHeight: 44,        // Apple HIG minimum
    backgroundColor: '#ffffff', // will need dark mode handling
  },
});
// For dark mode on the row, use a useColorScheme hook:
import { useColorScheme } from 'nativewind';
const { colorScheme } = useColorScheme();
// then in component:
style={({ pressed }) => [
  styles.row,
  { backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#FFFFFF' },
  { opacity: pressed ? 0.7 : 1 },
]}
```

### EmptyState with SF Symbol

```typescript
// Usage in list screens:
<EmptyState
  symbolName="dollarsign.circle"   // income
  title="No income yet"
  message="Start tracking your income to see it here."
  ctaLabel="Add Income"
  onCta={handleAddIncome}
/>

// EmptyState component modification:
import { SymbolView } from 'expo-symbols';

export function EmptyState({ title, message, ctaLabel, onCta, symbolName }: EmptyStateProps) {
  return (
    <View style={styles.container} className="flex-1 items-center justify-center">
      {symbolName ? (
        <SymbolView
          name={symbolName as any}
          tintColor="#9ca3af"
          size={56}
          type="hierarchical"
          style={{ marginBottom: 20 }}
        />
      ) : null}
      {/* ... rest of component */}
    </View>
  );
}
```

### Dashboard Loading State (replace bare Text)

```typescript
// Current:
<View className="flex-1 items-center justify-center">
  <Text className="text-gray-500 dark:text-gray-400 text-base">Loading...</Text>
</View>

// Replace with:
import { ActivityIndicator } from 'react-native';
<View className="flex-1 items-center justify-center gap-3">
  <ActivityIndicator size="large" color="#007AFF" />
  <Text className="text-sm text-gray-500 dark:text-gray-400">
    Loading your finances…
  </Text>
</View>
```

---

## Current State Audit (What Exists vs. What Needs Polish)

### Dashboard (index.tsx + dashboard card components)

| Element | Current State | Gap |
|---------|--------------|-----|
| NetWorthCard | `shadow-sm`, `rounded-2xl`, no explicit iOS shadow props | Add `SHADOWS.card` StyleSheet prop |
| FinancialSummaryCard | `shadow-sm`, left color border | Add `SHADOWS.card`, consider replacing border with colored icon |
| IncomeExpenseChart container | `shadow-sm`, `rounded-2xl` | Add `SHADOWS.card`, add section title styling |
| Dashboard screen bg | `bg-white dark:bg-gray-950` | Consider grouped bg `#F2F2F7` for section feel |
| Loading state | `<Text>Loading...</Text>` | Replace with `ActivityIndicator` |
| Empty state | Has EmptyState component, no SF Symbol | Add `symbolName="house"` or `"chart.bar"` |
| Section spacing | `mb-3` on each card | Add section header "Overview" above cards |

### List Screens (Transactions, Debts, Assets)

| Element | Current State | Gap |
|---------|--------------|-----|
| Screen background | `bg-white dark:bg-gray-950` (from SafeScreen) | Switch to grouped `#F2F2F7 / #1C1C1E` |
| Row background | `backgroundColor: '#ffffff'` hardcoded | Add dark mode `#2C2C2E` via useColorScheme |
| Row height | `paddingVertical: 12-14` — ~38-42pt | Add `minHeight: 44` |
| Row press feedback | `onPress` only, no visual feedback | Add `style={({ pressed }) => [style, { opacity: pressed ? 0.7 : 1 }]}` |
| Section header | None | Add section header (e.g., "Income", "Expenses" for tab switcher header) |
| Separator | `height: 1, backgroundColor: '#f3f4f6'` | Update to `StyleSheet.hairlineWidth` and iOS separator color `#C6C6C8` |
| Delete action | `backgroundColor: '#ef4444'` | Add rounded trailing corner on last-in-group row |
| FAB (Transactions only) | Absolute-positioned circle button | Consistent with Debts/Assets headerBar button — either unify to FAB everywhere or remove FAB |
| Dark mode text | Hardcoded `color: '#111827'` in StyleSheet | Replace with dynamic color from useColorScheme or NativeWind |

### Form Screens (add-income, add-expense, add-debt, add-asset)

| Element | Current State | Gap |
|---------|--------------|-----|
| TextInput background | `backgroundColor: '#ffffff'` hardcoded | Dark mode: `backgroundColor: '#1C1C1E'` |
| TextInput border | `borderColor: '#d1d5db'` | Dark mode: `borderColor: '#38383A'` |
| TextInput text color | `color: '#111827'` | Dark mode: `color: '#FFFFFF'` |
| Label color | `color: '#374151'` | Dark mode: `color: '#EBEBF5'` |
| Save button color | Income: `#2563eb`, Expense: `#ef4444` | Standardize to `#007AFF` for all primary actions |
| Save button size | `paddingVertical: 14` — good | No change needed |
| Cancel affordance | Missing — no cancel button | Navigation back chevron exists via expo-router stack, but an explicit "Cancel" link improves clarity |
| Form spacing | `gap: 16` in container | Acceptable; consider `gap: 20` for more breathable layout |

### EmptyState Component

| Element | Current State | Gap |
|---------|--------------|-----|
| SF Symbol icon | Missing | Add optional `symbolName` prop using `SymbolView` |
| Title typography | `text-xl font-semibold` | Good — maps to ~title3 |
| Message typography | `text-base text-gray-500` | Good |
| CTA button | `bg-blue-600 rounded-xl py-3` | Good — 44pt+ height |
| ctaLabel/onCta | Required | Make optional — some empty states may be info-only |

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|-----------------|-------|
| `shadow-sm` NativeWind class | StyleSheet `shadowColor/shadowOffset/shadowOpacity/shadowRadius` | NativeWind shadows work for web; native iOS requires StyleSheet shadow props |
| Generic `bg-white` screen backgrounds | `#F2F2F7` grouped background | iOS system grouped background has been the HIG standard since iOS 13 |
| Flat list rows | Inset grouped card rows | iOS Settings app pattern — white cards with 16pt horizontal margin on grouped bg |
| Implicit touch feedback | Explicit `pressed` opacity via Pressable style function | Standard React Native pattern since RN 0.63 |
| Text `Loading...` | `ActivityIndicator` | Native spinner matches iOS HIG |

**Note on expo-symbols:** `SymbolView` accepts a `name` prop typed as `SymbolViewProps['name']`. The type is a union of all valid SF Symbol names. On iOS 16+, all standard SF Symbols are available. For iOS 15 compatibility, stick to symbols available since iOS 13. Key finance symbols confirmed available: `dollarsign.circle`, `creditcard`, `banknote`, `chart.line.uptrend.xyaxis`, `tray`, `tray.full`, `arrow.up.arrow.down.circle`.

---

## Open Questions

1. **FAB vs. headerBar button — which to unify to?**
   - What we know: Transactions uses an absolute FAB at bottom; Debts and Assets use a small headerBar `+ Add X` button at the top-right.
   - What's unclear: Apple HIG doesn't mandate either. FABs are more Material Design; iOS typically uses navigation bar buttons or inline list buttons.
   - Recommendation: Remove the Transactions FAB and add a nav bar `+` button (using expo-router Stack.Screen headerRight) for all list screens, consistent with the existing Debts/Assets pattern. This also removes z-index issues with the FAB overlapping list content.

2. **Should SafeScreen get a `grouped` variant, or should list screens override bg separately?**
   - What we know: Three screens need grouped background; SafeScreen currently hardcodes `bg-white dark:bg-gray-950`.
   - What's unclear: Adding a `grouped` prop to SafeScreen is cleaner but requires editing the shared component.
   - Recommendation: Add `grouped` boolean prop to SafeScreen. It's a one-line change and makes the intent explicit at the call site.

3. **Dark mode for StyleSheet-based row backgrounds — `useColorScheme` vs. className?**
   - What we know: NativeWind `dark:` classes work on `className` props only, not inside StyleSheet.create values.
   - What's unclear: Whether to (a) move row styles from StyleSheet to className, or (b) use `useColorScheme()` from nativewind to pick colors dynamically.
   - Recommendation: Use `useColorScheme()` from nativewind to pick the color in the component body and pass it directly to the style prop. This is the most explicit approach and doesn't require restructuring existing StyleSheet objects.

4. **Phase 13 runs after Phase 10 but Phase 11/12 are not done yet — will Phase 11 screens need polish too?**
   - What we know: ROADMAP says "Depends on: Phase 10" for Phase 13. Phase 11 (Clients, Invoices) screens will exist by the time Phase 13 executes.
   - What's unclear: Whether Phase 13 should cover Phase 11 screens (Clients, Invoices) given they are built in Phase 11.
   - Recommendation: Include Phase 11 screens in Phase 13 scope — but only after Phase 11 is complete. The four planned PLAN.md files (13-01 through 13-04) should include clients/invoices in the list screen and form sheet plans.

---

## Sources

### Primary (HIGH confidence)
- Direct audit of all screen and component files in `/Users/mohamedkhair/Coding/Balance-Tracker APP/BalanceTracker/` — confirmed current styling state
- `package.json` — confirmed installed dependencies and versions
- `tailwind.config.js` — confirmed NativeWind v4 configuration and existing theme tokens
- Apple Human Interface Guidelines — Typography, Layout, and Materials sections (HIG is design-stable, training knowledge)
- React Native documentation — StyleSheet shadow props, Pressable API (stable APIs)

### Secondary (MEDIUM confidence)
- expo-symbols documentation — SymbolView component props and available symbol names (verified against installed version ~1.0.8)
- NativeWind v4 documentation — confirmed `dark:` prefix behavior in className vs StyleSheet limitation

### Tertiary (LOW confidence — flag for validation)
- iOS system color values (`#F2F2F7`, `#2C2C2E`, `#C6C6C8`) — these are the documented UIKit dynamic system colors converted to hex. Verified against multiple sources but should be spot-checked on physical device in both light/dark.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies already installed; no new libraries needed
- Architecture: HIGH — token file pattern is standard; audited all files to confirm what exists
- Pitfalls: HIGH — dark mode gaps, shadow API difference, and 44pt target are confirmed by direct code audit
- Typography tokens: HIGH — Apple HIG values are published and stable

**Research date:** 2026-02-26
**Valid until:** 2026-04-26 (stable APIs; expo-symbols API is unlikely to change)
