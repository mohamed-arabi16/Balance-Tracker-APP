# Mobile UI Overhaul Report — Balance Tracker iOS/Android App

**Date**: 2026-02-26
**Scope**: Complete UI audit of the Expo React Native mobile app vs. the production web app
**Goal**: Make the mobile app visually match or exceed the web version, following Apple Human Interface Guidelines (HIG) and Material Design 3 conventions for a polished, native-feeling financial app

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Global / Cross-Cutting Issues](#2-global--cross-cutting-issues)
3. [Component-by-Component Audit](#3-component-by-component-audit)
   - 3.1 [SafeScreen (Layout Wrapper)](#31-safescreen-layout-wrapper)
   - 3.2 [Tab Bar & Navigation](#32-tab-bar--navigation)
   - 3.3 [Dashboard Screen](#33-dashboard-screen)
   - 3.4 [NetWorthCard Component](#34-networthcard-component)
   - 3.5 [IncomeExpenseChart Component](#35-incomeexpensechart-component)
   - 3.6 [FinancialSummaryCard Component](#36-financialsummarycard-component)
   - 3.7 [Transactions Screen (Income List)](#37-transactions-screen-income-list)
   - 3.8 [Expenses Screen (Expense List)](#38-expenses-screen-expense-list)
   - 3.9 [Debts Screen (Debt List)](#39-debts-screen-debt-list)
   - 3.10 [Debt Detail Screen](#310-debt-detail-screen)
   - 3.11 [Assets Screen (Asset List)](#311-assets-screen-asset-list)
   - 3.12 [Settings Screen](#312-settings-screen)
   - 3.13 [Form Screens (Add/Edit Income, Expense, Debt, Asset, Payment)](#313-form-screens-addedit-income-expense-debt-asset-payment)
   - 3.14 [Auth Screens (Sign In, Sign Up, Forgot Password)](#314-auth-screens-sign-in-sign-up-forgot-password)
   - 3.15 [EmptyState Component](#315-emptystate-component)
4. [Styling Architecture Overhaul](#4-styling-architecture-overhaul)
5. [Success Criteria & Acceptance Checklist](#5-success-criteria--acceptance-checklist)

---

## 1. Executive Summary

The Balance Tracker mobile app is functionally operational — authentication, CRUD operations, navigation, and data flow all work. However, the UI has significant visual shortcomings when compared to the polished web version:

**Critical Issues:**
- **Split styling system**: Dashboard/Settings use NativeWind `className`, while Transactions/Debts/Assets use `StyleSheet.create` with hardcoded light-mode hex colors. This breaks dark mode on ~60% of screens.
- **No dark mode on list screens**: Income, Expenses, Debts, Assets, Debt Detail, Payment, and all form screens are white-only. Users who set dark mode will see white cards on dark backgrounds.
- **Settings screen is incomplete**: ThemeContext, ModeContext, CurrencyContext, and i18n are all fully ported and functional in the codebase, but the Settings screen exposes none of them — it just shows a placeholder string.
- **No visual hierarchy**: Cards are flat white rectangles with no shadows, elevation, or color accents. The dashboard looks like a list of plain text rather than an interactive financial dashboard.
- **Tab bar icons are iOS-only**: SF Symbols via `expo-symbols` do not render on Android.

**The fix requires**: Converting all screens to a unified NativeWind styling approach with `dark:` variants, implementing the missing Settings sections, applying Apple HIG grouped-list patterns, and adding visual depth/hierarchy to cards and surfaces.

---

## 2. Global / Cross-Cutting Issues

### 2.1 Mixed Styling Systems

**Current State:**
- `dashboard.tsx`, `settings.tsx`, `NetWorthCard.tsx`, `FinancialSummaryCard.tsx`, `IncomeExpenseChart.tsx`, `SafeScreen.tsx`, `sign-in.tsx`, `sign-up.tsx`, `forgot-password.tsx` → Use NativeWind `className` with `dark:` variants
- `transactions/index.tsx`, `transactions/expenses.tsx`, `debts/index.tsx`, `debts/[id].tsx`, `debts/payment.tsx`, `debts/add-debt.tsx`, `assets/index.tsx`, `transactions/add-income.tsx`, `transactions/add-expense.tsx`, `assets/add-asset.tsx` → Use `StyleSheet.create` with hardcoded hex colors (`#ffffff`, `#111827`, `#6b7280`, etc.)

**Requirement:**
- Unify ALL screens and components to use NativeWind `className` exclusively
- Remove all `StyleSheet.create` blocks that contain color values
- `StyleSheet.create` may remain ONLY for layout-specific properties that NativeWind cannot express (e.g., `position: 'absolute'` coordinates), but NEVER for colors, backgrounds, borders, or text colors
- Every color must include a `dark:` variant

**Success Criteria:**
- [ ] Zero hardcoded color hex values in any `StyleSheet.create` block across the entire `BalanceTracker/` directory
- [ ] Every `Text`, `View`, `Pressable`, `TextInput` uses `className` for colors
- [ ] Running the app in dark mode shows correct colors on ALL screens without any white flash or unthemed surface

---

### 2.2 Dark Mode Compliance

**Current State:**
The `ThemeContext.tsx` is fully functional — it reads system appearance, allows manual override (light/dark/system), and persists to AsyncStorage. NativeWind's `useColorScheme` integration works. But only 5 out of ~15 screens actually use `dark:` class variants.

**Requirement:**
Every visible surface must adapt to the current color scheme. Specifically:

| Element | Light Mode | Dark Mode |
|---------|-----------|-----------|
| Screen background | `bg-white` or `bg-gray-50` | `bg-gray-950` or `bg-gray-900` |
| Card surface | `bg-white` | `bg-gray-900` or `bg-neutral-900` |
| Primary text | `text-gray-900` | `text-white` or `text-gray-100` |
| Secondary text | `text-gray-600` | `text-gray-400` |
| Muted text | `text-gray-400` | `text-gray-500` |
| Borders/dividers | `border-gray-200` | `border-gray-800` |
| Input fields | `bg-white border-gray-300` | `bg-gray-800 border-gray-600` |
| Separator lines | `bg-gray-100` | `bg-gray-800` |
| Status badges | Retain semantic colors (green/yellow/red) but adjust lightness for dark backgrounds |

**Success Criteria:**
- [ ] Toggle device appearance to dark mode → every screen renders correctly with no white/light surfaces leaking through
- [ ] All form inputs are readable in dark mode (text color, placeholder color, border color, background)
- [ ] Status badges (Received/Expected/Paid/Pending) remain legible in both modes
- [ ] The tab bar, navigation headers, and all chrome elements follow the system appearance

---

### 2.3 Tab Bar Icons — Cross-Platform Compatibility

**Current State:**
`(tabs)/_layout.tsx` uses `expo-symbols` (`SymbolView`) for all tab icons. SF Symbols only work on iOS 17+. On Android and older iOS versions, icons may be invisible.

**Requirement:**
Replace `SymbolView` with a cross-platform icon solution. Options (in order of Apple HIG alignment):
1. **`@expo/vector-icons` (Ionicons set)** — ships with Expo, no install needed, has iOS-style icons
2. **`lucide-react-native`** — matches the web app's `lucide-react` icon set, ensuring visual consistency
3. **Custom SVG icons** — maximum control

The recommended approach is `@expo/vector-icons` using the **Ionicons** family, which provides iOS-native-looking icons that also work perfectly on Android.

**Icon mapping:**
| Tab | Current SF Symbol | Replacement (Ionicons) |
|-----|-------------------|----------------------|
| Dashboard | `house.fill` | `home` / `home-outline` |
| Transactions | `list.bullet` | `list` / `list-outline` |
| Debts | `creditcard.fill` | `card` / `card-outline` |
| Assets | `chart.bar.fill` | `bar-chart` / `bar-chart-outline` |
| Settings/More | `ellipsis.circle.fill` | `ellipsis-horizontal-circle` / `ellipsis-horizontal-circle-outline` |

Use filled variants for the active state and outline variants for inactive state, following Apple's tab bar convention.

**Success Criteria:**
- [ ] All 5 tab icons visible on both iOS and Android
- [ ] Active tab shows filled icon, inactive tabs show outline icon
- [ ] Icons are 24pt and tinted with `tabBarActiveTintColor` / `tabBarInactiveTintColor`

---

### 2.4 Typography

**Current State:**
The app uses the system font (San Francisco on iOS, Roboto on Android). The web app uses the "Outfit" Google Font. There is an `Inter-Medium.ttf` loaded for chart axis labels only.

**Requirement:**
- Keep the system font as the primary typeface — this is correct per Apple HIG. Do NOT import Outfit or custom fonts for body text. System fonts provide optimal rendering, Dynamic Type support, and native feel.
- The chart axis font (`Inter-Medium.ttf`) is acceptable as-is.
- Establish a consistent type scale using NativeWind:

| Role | Class | Size | Weight |
|------|-------|------|--------|
| Large title | `text-3xl font-bold` | 30pt | Bold |
| Title | `text-2xl font-bold` | 24pt | Bold |
| Headline | `text-lg font-semibold` | 18pt | Semibold |
| Body | `text-base` | 16pt | Regular |
| Callout | `text-sm` | 14pt | Regular |
| Caption | `text-xs` | 12pt | Regular |
| Overline/Section | `text-xs font-semibold uppercase tracking-wider` | 12pt | Semibold |

**Success Criteria:**
- [ ] Consistent type scale applied across all screens
- [ ] Section headers use the Overline style (uppercase, semibold, tracking-wider, muted color)
- [ ] No text smaller than 12pt (Apple minimum for legibility)
- [ ] No custom font imports for body text (system font only)

---

### 2.5 Color Palette & Design Tokens

**Current State:**
The mobile `tailwind.config.js` defines only 5 basic colors (`primary`, `secondary`, `success`, `danger`, `warning`). The web app has a rich design token system with financial-specific colors (income green, expense red, debt orange, asset purple), gradients, shadows, and HSL-based theming.

**Requirement:**
Extend the mobile `tailwind.config.js` to include financial semantic colors:

```js
colors: {
  // Existing
  primary: { DEFAULT: '#4F8EF7', dark: '#6BA3FF' },
  // Financial semantic colors
  income: { DEFAULT: '#34C759', light: '#dcfce7', dark: '#166534' },
  expense: { DEFAULT: '#FF3B30', light: '#fee2e2', dark: '#991b1b' },
  debt: { DEFAULT: '#FF9500', light: '#fef3c7', dark: '#92400e' },
  asset: { DEFAULT: '#AF52DE', light: '#f3e8ff', dark: '#6b21a8' },
  balance: { DEFAULT: '#007AFF', light: '#dbeafe', dark: '#1e40af' },
}
```

**Success Criteria:**
- [ ] `tailwind.config.js` includes all 5 financial semantic colors with light/dark shades
- [ ] Dashboard summary cards use these semantic colors for their accent elements
- [ ] Status badges reference semantic colors rather than hardcoded hex values

---

### 2.6 Spacing & Layout Constants

**Requirement:**
Establish consistent spacing tokens (already available via NativeWind's Tailwind scale):

| Purpose | Value | Tailwind Class |
|---------|-------|---------------|
| Screen horizontal padding | 16pt | `px-4` |
| Section gap (between card groups) | 24pt | `mb-6` or `gap-6` |
| Card internal padding | 16pt | `p-4` |
| Card border radius | 16pt | `rounded-2xl` |
| Item separator inset | 16pt from leading edge | `ml-4` |
| Touch target minimum | 44pt height | `min-h-[44px]` |

**Success Criteria:**
- [ ] All screens use `px-4` horizontal padding consistently
- [ ] All card surfaces use `rounded-2xl` (16pt radius)
- [ ] All interactive elements meet the 44pt minimum touch target (Apple HIG requirement)
- [ ] Section spacing is consistent at 24pt between groups

---

## 3. Component-by-Component Audit

---

### 3.1 SafeScreen (Layout Wrapper)

**File:** `src/components/layout/SafeScreen.tsx`

**Current State:**
```tsx
<SafeAreaView edges={edges} className={`flex-1 bg-white dark:bg-gray-950 ${className ?? ''}`}>
```
Functional and dark-mode aware. No changes needed.

**Requirement:** No changes. This component is correct.

**Success Criteria:**
- [x] Respects safe areas (notch, Dynamic Island, home indicator)
- [x] Dark mode background works

---

### 3.2 Tab Bar & Navigation

**File:** `app/(tabs)/_layout.tsx`

**Current State:**
- 5 tabs (Dashboard, Transactions, Debts, Assets, Settings) + 2 conditional advanced tabs
- Uses `expo-symbols` (SF Symbols) for icons — iOS-only
- `tabBarActiveTintColor: '#007AFF'`, `tabBarInactiveTintColor: '#8E8E93'` — correct iOS system colors
- `headerShown: false` for all tabs

**Requirements:**

1. **Replace `SymbolView` with cross-platform icons** (see Section 2.3)
2. **Add `tabBarStyle`** for consistent styling:
   ```
   tabBarStyle: {
     borderTopColor: light ? '#e5e7eb' : '#374151',
     backgroundColor: light ? '#ffffff' : '#1c1c1e',
   }
   ```
   Or use NativeWind-compatible approach.
3. **Consider adding a subtle blur background** to the tab bar for a more premium iOS feel (using `expo-blur`'s `BlurView` if needed, though the default iOS tab bar already has this)
4. **For screens that use `headerShown: false`**, ensure each screen provides its own navigation header or title area in the scroll content

**Success Criteria:**
- [ ] Tab icons render on both iOS and Android
- [ ] Tab bar respects dark/light mode (background, border, tint)
- [ ] Active/inactive icon states are visually distinct (filled vs outline)
- [ ] Tab bar does not overlap content (safe area respected)

---

### 3.3 Dashboard Screen

**File:** `app/(tabs)/index.tsx` (also duplicated at `app/(tabs)/dashboard.tsx`)

**Current State:**
- Title "Financial Dashboard" in plain `text-2xl font-bold`
- `NetWorthCard` component (plain white card)
- `IncomeExpenseChart` component (functional but minimal)
- 4 `FinancialSummaryCard` components stacked vertically
- No section headers between the chart and summary cards
- No visual grouping or hierarchy

**Web Version Reference:**
The web dashboard has:
- A gradient background (`bg-gradient-dashboard`)
- 6 `FinancialCard` components in a responsive grid with colored variants (balance, income, expense, debt, asset)
- An insights section with AI-generated financial insights
- Quick Actions and Recent Activity cards at the bottom
- Each card has shadows, hover effects, and color-coded accents

**Requirements:**

1. **Add a "Summary" section header** between the chart and the financial cards:
   ```tsx
   <Text className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 mt-4 px-1">
     Summary
   </Text>
   ```

2. **Arrange summary cards in a 2-column grid** instead of a vertical stack (matching the web's grid layout):
   ```tsx
   <View className="flex-row flex-wrap gap-3">
     <View className="flex-1 min-w-[48%]">
       <FinancialSummaryCard ... />
     </View>
     <View className="flex-1 min-w-[48%]">
       <FinancialSummaryCard ... />
     </View>
     ...
   </View>
   ```

3. **Add a subtle background tint** to the scroll area to differentiate from card surfaces:
   - Light: `bg-gray-50` (a very subtle off-white)
   - Dark: `bg-gray-950` (the default dark)

4. **Add vertical spacing** between sections (title → net worth → chart → summary) using `mb-4` or `mb-6` instead of the current uniform `mb-3`

5. **Remove the duplicate `dashboard.tsx`** — it is identical to `index.tsx` and is hidden via `href: null`. If it's not needed for deep-linking, delete it to reduce maintenance.

**Success Criteria:**
- [ ] Dashboard has a clear visual hierarchy: hero card (Net Worth) → chart → section header → summary grid
- [ ] Summary cards are displayed in a 2-column grid on all phone sizes
- [ ] Background is `bg-gray-50` (light) / `bg-gray-950` (dark), creating contrast with white/dark cards
- [ ] Section labels exist above grouped content
- [ ] All elements fully themed for dark mode

---

### 3.4 NetWorthCard Component

**File:** `src/components/dashboard/NetWorthCard.tsx`

**Current State:**
```tsx
<View className="rounded-2xl bg-white dark:bg-neutral-900 p-5 shadow-sm mb-3">
  <Text className="text-sm text-gray-500 ...">{label}</Text>
  <Text className="text-3xl font-bold text-gray-900 ...">{formatted}</Text>
</View>
```
A plain white card — indistinguishable from the summary cards below.

**Web Version Reference:**
The web uses a `FinancialCard` with `variant="balance"` which has:
- `bg-primary/10` background (light indigo tint)
- `border-primary/30` colored border
- `shadow-md` elevated shadow
- The value is displayed in an accent color, making it the page's hero element

**Requirements:**

1. **Apply a gradient or tinted background** to make this the visual hero:
   - Light mode: `bg-blue-50` or a linear gradient from `#EBF5FF` to `#DBEAFE`
   - Dark mode: `bg-blue-950` or `bg-[#0C1929]`

2. **Add a colored accent border**:
   ```
   border border-blue-200 dark:border-blue-800
   ```

3. **Style the net worth value in the primary/accent color**:
   ```
   text-blue-600 dark:text-blue-400
   ```
   instead of plain `text-gray-900`

4. **Increase the card padding and spacing** to give it more visual weight:
   - `p-6` instead of `p-5`
   - `mb-5` instead of `mb-3` (more separation from the next section)

5. **Add a subtle shadow** for elevation:
   ```
   shadow-md shadow-blue-500/10
   ```

6. **Optional — add a small trend indicator** (arrow up/down with percentage) below the value, matching the web's financial card pattern

**Success Criteria:**
- [ ] Net Worth card is visually distinct from all other cards on the dashboard — it is clearly the "hero" element
- [ ] Background has a blue/indigo tint, not plain white
- [ ] The dollar value is displayed in an accent color (blue), not gray
- [ ] The card has visible elevation (shadow) even on iOS
- [ ] Card looks correct in both light and dark mode

---

### 3.5 IncomeExpenseChart Component

**File:** `src/components/dashboard/IncomeExpenseChart.tsx`

**Current State:**
- Victory Native `CartesianChart` with green (income) and red (expenses) lines
- `useChartPressState` for tap interaction with Skia `Circle` indicators
- Small inline legend at the bottom (12x3px colored lines with "Income" / "Expenses" text)
- Chart height is fixed at 200px
- Title shown above chart in `text-sm font-semibold`

**Requirements:**

1. **Improve the legend**:
   - Increase indicator size: `width: 20, height: 4, borderRadius: 2` instead of `width: 12, height: 3`
   - Increase legend text: `text-sm` instead of `text-xs`
   - Add spacing: `gap-6` instead of `gap-4`
   - Position legend below the chart with `mt-3 mb-1` spacing

2. **Add axis labels** (month abbreviations) along the x-axis. Currently `axisOptions` only passes the font but no formatting. Add:
   ```
   axisOptions={{
     font,
     formatXLabel: (val) => chartData[val]?.label ?? '',
     tickCount: { x: 6, y: 4 },
   }}
   ```

3. **Increase chart height** from 200 to 220-240px to give data more room to breathe

4. **Add a callout tooltip** that shows both income AND expense values when pressed (currently only shows income via `pressedIncome` state). Add `pressedExpense` state synced from `state.y.expenses.value.value`.

5. **Ensure chart respects dark mode** — the chart card itself uses `className` so it themes correctly, but check that:
   - Axis label text color is readable (adjust via `axisOptions.labelColor` or Skia paint)
   - Grid lines (if any) use a subtle dark-mode-appropriate color

**Success Criteria:**
- [ ] Legend is clearly readable with adequately sized color indicators and text
- [ ] Month labels appear on the x-axis (Sep, Oct, Nov, Dec, Jan, Feb)
- [ ] Pressing a point shows both income AND expense values in the callout
- [ ] Chart renders correctly in dark mode (text, grid, lines all visible)
- [ ] Chart height is 220-240px

---

### 3.6 FinancialSummaryCard Component

**File:** `src/components/dashboard/FinancialSummaryCard.tsx`

**Current State:**
```tsx
<View
  className="rounded-2xl bg-white dark:bg-neutral-900 p-4 shadow-sm mb-3 flex-row items-center"
  style={{ borderLeftWidth: 3, borderLeftColor: color }}
>
  <View className="flex-1">
    <Text className="text-sm text-gray-500 ...">{title}</Text>
    <Text className="text-xl font-bold text-gray-900 ...">{value}</Text>
    {subtitle && <Text className="text-xs text-gray-400 ...">{subtitle}</Text>}
  </View>
  <Text className="text-gray-400 ... text-lg">›</Text>
</View>
```

**Issues:**
- `shadow-sm` doesn't reliably render on Android (needs `elevation` style or explicit shadow properties)
- The chevron `›` is a plain text character, not a proper icon
- The colored left border is via inline `style` — works but could be more elegant
- No active/pressed state feedback

**Requirements:**

1. **Replace the text chevron with a proper icon**:
   ```tsx
   <Ionicons name="chevron-forward" size={18} color={isDark ? '#6b7280' : '#9ca3af'} />
   ```
   (or equivalent from `@expo/vector-icons`)

2. **Add Android-compatible elevation**:
   ```
   className="... shadow-sm" style={{ elevation: 2 }}
   ```
   Or use `Platform.select` to apply `elevation` only on Android.

3. **Add pressed state** using `TouchableOpacity` with `activeOpacity={0.7}` (already has this) — ensure the visual feedback is noticeable. Consider adding a scale animation on press:
   ```tsx
   <Pressable style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
   ```

4. **Add a subtle colored tint** to the background matching the card's accent color:
   - For Income (green): `bg-green-50/50 dark:bg-green-950/30`
   - For Expenses (red): `bg-red-50/50 dark:bg-red-950/30`
   - For Debts (orange): `bg-amber-50/50 dark:bg-amber-950/30`
   - For Assets (blue): `bg-blue-50/50 dark:bg-blue-950/30`

   This matches the web's `FinancialCard` variants which use `bg-income/10`, `bg-expense/10`, etc.

5. **Make the value text use the card's accent color** for visual pop:
   - Income value: `text-green-600 dark:text-green-400`
   - Expense value: `text-red-600 dark:text-red-400`
   - Debt value: `text-amber-600 dark:text-amber-400`
   - Asset value: `text-blue-600 dark:text-blue-400`

   Pass a `textColor` prop or derive it from the existing `color` prop.

**Success Criteria:**
- [ ] Each summary card has a subtle tinted background matching its semantic color
- [ ] The value amount is displayed in the card's accent color
- [ ] A proper chevron icon replaces the `›` text character
- [ ] Shadow/elevation is visible on both iOS and Android
- [ ] Cards respond to press with subtle visual feedback (opacity or scale)
- [ ] All text colors adapt to dark mode

---

### 3.7 Transactions Screen (Income List)

**File:** `app/(tabs)/transactions/index.tsx`

**Current State:**
- Tab switcher (Income / Expenses) at top with hardcoded light colors
- `IncomeRow` component with swipe-to-delete, status badge, category chip
- Floating action button ("+ Add Income") at bottom
- **Entire screen uses `StyleSheet.create` with hardcoded hex colors** — zero dark mode support

**Specific hardcoded colors that must be replaced:**
```
tabBar: backgroundColor: '#ffffff', borderBottomColor: '#f3f4f6'
tabChip: borderColor: '#e5e7eb', backgroundColor: '#f9fafb'
tabChipActive: backgroundColor: '#dbeafe', borderColor: '#3b82f6'
tabChipText: color: '#6b7280'
tabChipTextActive: color: '#1d4ed8'
row: backgroundColor: '#ffffff'
rowTitle: color: '#111827'
rowDate: color: '#6b7280'
categoryChip: backgroundColor: '#f3f4f6'
categoryText: color: '#374151'
rowAmount: color: '#111827'
badgeReceived: backgroundColor: '#dcfce7'
badgeExpected: backgroundColor: '#fef9c3'
separator: backgroundColor: '#f3f4f6'
fab: backgroundColor: '#2563eb'
```

**Requirements:**

1. **Convert ALL styling to NativeWind `className`** with dark mode variants. Example conversion:
   ```tsx
   // Before (broken in dark mode):
   <Pressable style={styles.row}>

   // After (dark mode aware):
   <Pressable className="flex-row items-start justify-between px-4 py-3 bg-white dark:bg-gray-900">
   ```

2. **Style the tab switcher** to follow Apple's segmented control pattern:
   - Container: `bg-gray-100 dark:bg-gray-800 rounded-xl p-1`
   - Inactive chip: `rounded-lg py-2 flex-1 items-center`
   - Active chip: `bg-white dark:bg-gray-700 rounded-lg py-2 flex-1 items-center shadow-sm`
   - This gives the native iOS segmented control look

3. **Add card containment to list rows**:
   - Wrap the list in a card container with rounded corners
   - Or add rounded corners + margins to the FlatList itself
   - Rows should have inset separators (`ml-4`) following Apple HIG grouped list pattern

4. **Improve the FAB** to use a proper SF-style circle button:
   - `w-14 h-14 rounded-full bg-blue-500 items-center justify-center shadow-lg`
   - Use a `+` icon (Ionicons `add`) instead of text "Add Income"
   - Position: `absolute bottom-6 right-6`

5. **Ensure status badges adapt to dark mode**:
   - Received (green): `bg-green-100 dark:bg-green-900/40` with `text-green-700 dark:text-green-300`
   - Expected (yellow): `bg-yellow-100 dark:bg-yellow-900/40` with `text-yellow-700 dark:text-yellow-300`

**Success Criteria:**
- [ ] Zero `StyleSheet.create` color values remain in this file
- [ ] Tab switcher looks like an iOS segmented control
- [ ] All rows, badges, text, and separators correctly theme in dark mode
- [ ] FAB is a circular icon button (not a text pill)
- [ ] Swipe-to-delete action renders correctly in both light and dark mode
- [ ] Category and status chips are legible in both modes

---

### 3.8 Expenses Screen (Expense List)

**File:** `app/(tabs)/transactions/expenses.tsx`

**Current State:**
Near-identical to the Income screen, same problems — all hardcoded colors via `StyleSheet.create`.

**Additional issue:** The FAB uses `backgroundColor: '#ef4444'` (red) — good semantic choice for expenses, but still hardcoded.

**Requirements:**
Same as Section 3.7 (Transactions Screen), plus:
1. The FAB should use the expense semantic color (`bg-red-500` via NativeWind)
2. An additional `typeChip` shows "fixed"/"variable" — this needs dark mode:
   - `bg-purple-100 dark:bg-purple-900/40` with `text-purple-700 dark:text-purple-300`

**Success Criteria:**
- [ ] Same as Section 3.7 criteria, applied to expenses
- [ ] Type chip (fixed/variable) is themed for dark mode
- [ ] FAB color is semantically red for expenses

---

### 3.9 Debts Screen (Debt List)

**File:** `app/(tabs)/debts/index.tsx`

**Current State:**
- `DebtRow` component with title, creditor, amount, type chip, due date, status badge, and action buttons (Edit, Make Payment)
- Swipe-to-delete
- All colors hardcoded — zero dark mode support
- Rows have no card containment (just white backgrounds with 1px separator)
- Action buttons (Edit, Make Payment) are tiny with thin borders

**Requirements:**

1. **Convert ALL styling to NativeWind `className`** — same approach as Transactions

2. **Add card containment** — each debt should feel like a discrete card:
   ```tsx
   <View className="mx-4 mb-3 rounded-2xl bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
     <Pressable className="p-4 gap-2">
       ...
     </Pressable>
   </View>
   ```

3. **Improve action buttons** to follow Apple HIG button patterns:
   - "Edit": Outline style → `border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2`
   - "Make Payment": Filled style → `bg-blue-500 rounded-lg px-4 py-2`
   - Both should be 44pt minimum height (current `paddingVertical: 6` makes them ~32pt — too small)

4. **Status badge** dark mode:
   - Paid: `bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300`
   - Pending: `bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300`

5. **Type chip** (Short-term/Long-term) dark mode:
   - `bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300`

6. **Receivable label** style:
   - "Owed to me" → `text-green-600 dark:text-green-400`
   - "I owe" → `text-red-600 dark:text-red-400`

7. **"+ Add Debt" button** in the header:
   - Currently a blue pill button positioned at `flex-end` — acceptable but should theme for dark mode
   - Consider using the navigation header's right slot instead

**Success Criteria:**
- [ ] Each debt is displayed in a proper card with rounded corners, shadow, and containment
- [ ] All text, badges, chips, and buttons theme correctly in dark mode
- [ ] Action buttons meet 44pt minimum touch target
- [ ] Status badges and receivable labels use semantic colors
- [ ] Zero hardcoded color values in StyleSheet

---

### 3.10 Debt Detail Screen

**File:** `app/(tabs)/debts/[id].tsx`

**Current State:**
- Header showing debt info (title, creditor, amount, status badge)
- Payment history list
- All hardcoded colors — `backgroundColor: '#ffffff'`, `color: '#111827'`, etc.
- Section header (`Payment History`) has a gray background `#f9fafb`

**Requirements:**

1. **Convert all colors to NativeWind** with dark variants
2. **Debt header** should use a tinted background similar to NetWorthCard approach:
   - `bg-orange-50 dark:bg-orange-950/30` for debt-themed tint
   - Or neutral: `bg-gray-50 dark:bg-gray-900`
3. **Section header** ("Payment History") should follow the Apple grouped list section header style:
   - `bg-gray-50 dark:bg-gray-900 px-4 py-2`
   - `text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400`
4. **Payment history rows** need dark mode colors
5. **Loading and empty states** should also be dark-mode aware

**Success Criteria:**
- [ ] Debt detail screen is fully themed for dark mode
- [ ] Section headers follow Apple HIG grouped list style
- [ ] Payment history rows adapt to dark mode
- [ ] Empty state is themed

---

### 3.11 Assets Screen (Asset List)

**File:** `app/(tabs)/assets/index.tsx`

**Current State:**
- `AssetRow` with asset type, quantity, unit, value, optional stale-price warning
- Swipe-to-delete
- All hardcoded light colors — `backgroundColor: '#ffffff'`, `color: '#111827'`, etc.
- "Add Asset" header button

**Requirements:**

Same pattern as Debts and Transactions:

1. **Convert all colors to NativeWind** with dark variants
2. **Add card containment** to asset rows (or use the Apple HIG inset grouped list style)
3. **Style the header bar** for dark mode:
   ```
   borderBottomColor: → border-gray-200 dark:border-gray-800
   ```
4. **Warning badge** (stale price): ensure the amber `⚠` character is supplemented with a proper styled badge:
   ```tsx
   <View className="bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded">
     <Text className="text-amber-600 dark:text-amber-400 text-xs font-medium">Stale</Text>
   </View>
   ```
5. **Loading indicator** dark mode: use a dark-mode-appropriate tint color

**Success Criteria:**
- [ ] All asset rows, headers, separators themed for dark mode
- [ ] Stale price warning is clearly visible with a proper badge
- [ ] Asset value text and quantity text are legible in both modes
- [ ] Zero hardcoded colors in StyleSheet

---

### 3.12 Settings Screen

**File:** `app/(tabs)/settings.tsx`

**Current State:**
The settings screen is the most critically incomplete screen in the app. It currently has only 3 sections:
1. Data Export (CSV button)
2. Appearance placeholder ("Theme and language settings — coming in a future update")
3. Account (Sign Out)

Meanwhile, the web Settings page has **8 full sections**: Profile, Security, Currency, Appearance, Financial, Language, Mode, and Data Export.

The mobile codebase already has all the context providers and hooks needed:
- `ThemeContext` — `useTheme()` exposes `theme` (light/dark/system) and `setTheme()`
- `ModeContext` — `useMode()` exposes `mode` (simple/advanced), `setMode()`, and `isAdvanced`
- `CurrencyContext` — `useCurrency()` exposes `currency` (USD/TRY), `setCurrency()`, `autoConvert`, `setAutoConvert()`
- `i18n` — `useTranslation()` exposes `i18n.changeLanguage()`

**Requirements — Build the following settings sections:**

**Section 1: Account Info (existing, minor improvements needed)**
- Show user email in a card (currently works)
- Add avatar placeholder (first letter of email in a colored circle)
- Style: Apple HIG profile header pattern

**Section 2: Currency**
- Default Currency selector: `USD` / `TRY` (segmented control or picker)
- Auto-Convert toggle: `Switch` component
- Wire to: `useCurrency().setCurrency()` and `useCurrency().setAutoConvert()`
- Exchange rate status indicator (live/fallback/stale)
- Style: Apple HIG grouped list with icon + label + control

**Section 3: Appearance (Theme)**
- Three-option selector: Light / Dark / System
- Style: Segmented control or three tappable cards with icons (sun / moon / phone)
- Wire to: `useTheme().setTheme()`
- Show current active selection

**Section 4: Language**
- Two-option selector: English / Arabic
- Wire to: `i18n.changeLanguage()`
- Show warning banner when changing to/from Arabic: "Restart the app to apply RTL changes"
- Style: Apple HIG grouped list row with label + current value + chevron → modal picker

**Section 5: Mode**
- Toggle: Simple / Advanced
- Wire to: `useMode().setMode()`
- Description text explaining what Advanced mode adds (Clients & Invoices tabs)
- Style: Switch or segmented control in a grouped card

**Section 6: Data Export (existing, keep as-is)**
- CSV export button — currently works, no changes needed

**Section 7: Account (existing, enhance)**
- Sign Out button (currently works)
- Add "Delete Account" button (destructive, red text, with confirmation dialog)
- Style: Apple HIG destructive action at bottom of settings

**Section Layout — Apple HIG Grouped List Pattern:**
Each section should follow this pattern:
```tsx
{/* Section header */}
<Text className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 px-1">
  Appearance
</Text>

{/* Section card */}
<View className="rounded-2xl bg-white dark:bg-gray-900 shadow-sm overflow-hidden mb-6">
  {/* Row 1 */}
  <View className="flex-row items-center justify-between px-4 min-h-[44px]">
    <Text className="text-base text-gray-900 dark:text-white">Theme</Text>
    {/* Control (switch, picker, etc.) */}
  </View>
  {/* Separator */}
  <View className="h-px bg-gray-100 dark:bg-gray-800 ml-4" />
  {/* Row 2 */}
  ...
</View>
```

**Success Criteria:**
- [ ] Settings screen has sections for: Account Info, Currency, Appearance, Language, Mode, Data Export, Account Actions
- [ ] Theme selector (Light/Dark/System) is functional and immediately changes the app's appearance
- [ ] Language selector (English/Arabic) is functional and shows a restart banner for RTL changes
- [ ] Mode selector (Simple/Advanced) is functional and shows/hides Clients & Invoices tabs
- [ ] Currency selector (USD/TRY) and Auto-Convert toggle are functional
- [ ] All sections follow the Apple HIG grouped list pattern (section header + rounded card + rows with 44pt height)
- [ ] All controls are wired to existing context providers (no new backend work needed)
- [ ] Settings scroll view is fully themed for dark mode
- [ ] Removing the "coming in a future update" placeholder text

---

### 3.13 Form Screens (Add/Edit Income, Expense, Debt, Asset, Payment)

**Files:**
- `app/(tabs)/transactions/add-income.tsx`
- `app/(tabs)/transactions/add-expense.tsx`
- `app/(tabs)/debts/add-debt.tsx`
- `app/(tabs)/debts/payment.tsx`
- `app/(tabs)/assets/add-asset.tsx`

**Current State:**
All 5 form screens share the same pattern:
- Wrapped in `FormScreen` (KeyboardAvoidingView + ScrollView)
- Fields: `TextInput`, `Picker`, segmented toggle buttons, `DateTimePicker`, `Switch`
- All styling via `StyleSheet.create` with hardcoded light colors
- Labels: `color: '#374151'`
- Inputs: `backgroundColor: '#ffffff'`, `borderColor: '#d1d5db'`, `color: '#111827'`
- Pickers: `backgroundColor: '#ffffff'`
- Save button: `backgroundColor: '#2563eb'`

**Requirements:**

1. **Convert all 5 form screens to NativeWind** with dark mode variants:

   | Element | Light | Dark |
   |---------|-------|------|
   | Label | `text-gray-700` | `text-gray-300` |
   | Input background | `bg-white` | `bg-gray-800` |
   | Input border | `border-gray-300` | `border-gray-600` |
   | Input text | `text-gray-900` | `text-white` |
   | Input placeholder | `text-gray-400` | `text-gray-500` |
   | Picker wrapper | `bg-white border-gray-300` | `bg-gray-800 border-gray-600` |
   | Toggle button (inactive) | `bg-gray-50 border-gray-300` | `bg-gray-800 border-gray-600` |
   | Toggle button (active) | `bg-blue-100 border-blue-500` | `bg-blue-900/40 border-blue-400` |
   | Toggle text (inactive) | `text-gray-500` | `text-gray-400` |
   | Toggle text (active) | `text-blue-700` | `text-blue-300` |
   | Save button | `bg-blue-500` | `bg-blue-600` |
   | Save button (disabled) | `bg-blue-300` | `bg-blue-800` |
   | Context card (payment screen) | `bg-blue-50 border-blue-200` | `bg-blue-950/40 border-blue-800` |

2. **Improve the Picker component** for iOS:
   - On iOS, `@react-native-picker/picker` renders as a large scroll wheel by default
   - Consider wrapping in a bottom sheet or modal for a cleaner look
   - Or set `Picker` to `mode="dropdown"` on Android

3. **Add proper form section grouping**:
   - Group related fields in rounded cards (matching the Settings section card pattern)
   - e.g., Title + Amount in one card, Currency + Category in another, Status + Date in another

4. **Ensure the Debt form's Switch component** (`isReceivable`) themes properly:
   - `Switch` with `trackColor` and `thumbColor` set for both modes
   - Label and description text themed for dark mode

**Success Criteria:**
- [ ] All 5 form screens render correctly in dark mode
- [ ] All input fields have visible borders, readable text, and appropriate background in both modes
- [ ] Toggle buttons (Expected/Received, Short/Long, Pending/Paid) show clear active/inactive states in both modes
- [ ] Save/Submit buttons maintain their visual weight in dark mode
- [ ] Picker components are functional and styled on both iOS and Android
- [ ] Zero hardcoded color values in any form screen's StyleSheet

---

### 3.14 Auth Screens (Sign In, Sign Up, Forgot Password)

**Files:**
- `app/(auth)/sign-in.tsx`
- `app/(auth)/sign-up.tsx`
- `app/(auth)/forgot-password.tsx`

**Current State:**
These screens already use NativeWind `className` with dark mode variants. They are the best-styled screens in the app.

**Minor Improvements:**

1. **Add an app icon/logo** above the "Balance Tracker" title:
   - Use the existing `icon.png` from assets
   - `w-16 h-16 rounded-2xl mb-4` — centered above the title
   - Or use a text logo with a gradient effect matching the web's sidebar logo

2. **Improve the Sign In button** to be more prominent:
   - Increase height: `py-4` instead of `py-3`
   - Add a subtle shadow: `shadow-sm`

3. **Add "Sign in with Apple" button** (optional, future consideration):
   - This is the expected primary auth method on iOS per Apple HIG
   - Not required for this overhaul but worth noting

4. **Error message styling**:
   - Current: `text-sm text-red-500` — minimal
   - Improvement: Wrap in a card with red tint:
     ```
     bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-3
     ```

**Success Criteria:**
- [ ] Auth screens look polished with an app logo/icon at the top
- [ ] Error messages are displayed in a styled error card (not plain red text)
- [ ] All auth screens maintain full dark mode support (already mostly there)
- [ ] Buttons meet 44pt minimum height

---

### 3.15 EmptyState Component

**File:** `src/components/ui/EmptyState.tsx`

**Current State:**
Uses both `StyleSheet.create` (for spacing) and NativeWind `className` (for colors). The dark mode support exists via className.

**Requirements:**

1. **Add an illustration or icon** above the title:
   - Use a large muted icon (e.g., `tray` from Ionicons for empty list, `wallet` for no income, etc.)
   - `size={64}` with `text-gray-300 dark:text-gray-600` color
   - This follows Apple's empty state pattern (icon + title + message + CTA)

2. **Improve spacing**:
   - Icon: `mb-4`
   - Title: `mb-2`
   - Message: `mb-8`
   - CTA button: `px-8 py-3 rounded-xl`

3. **Accept an optional `icon` prop** so each screen can pass a contextually appropriate icon

**Success Criteria:**
- [ ] Empty states have a large muted icon above the title
- [ ] CTA button is prominent and meets 44pt minimum touch height
- [ ] Component works correctly in both light and dark mode
- [ ] Text is centered and well-spaced

---

## 4. Styling Architecture Overhaul

### 4.1 Tailwind Config Enhancement

**File:** `BalanceTracker/tailwind.config.js`

**Current config is minimal** — only 5 basic colors. Needs expansion:

```js
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './app/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#007AFF',  // iOS system blue
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#007AFF',
          600: '#0066d6',
          700: '#004db3',
          900: '#001d4a',
          950: '#00112e',
        },
        income: {
          DEFAULT: '#34C759',  // iOS system green
          light: '#dcfce7',
          dark: '#166534',
        },
        expense: {
          DEFAULT: '#FF3B30',  // iOS system red
          light: '#fee2e2',
          dark: '#991b1b',
        },
        debt: {
          DEFAULT: '#FF9500',  // iOS system orange
          light: '#fef3c7',
          dark: '#92400e',
        },
        asset: {
          DEFAULT: '#AF52DE',  // iOS system purple
          light: '#f3e8ff',
          dark: '#6b21a8',
        },
      },
    },
  },
  plugins: [],
};
```

**Success Criteria:**
- [ ] `tailwind.config.js` contains all financial semantic colors
- [ ] Colors use iOS system color values for native feel
- [ ] All screens reference these semantic tokens instead of hardcoded hex values

---

### 4.2 Remove StyleSheet Color Declarations

After converting all screens to NativeWind, audit for any remaining hardcoded colors:

**Files requiring full conversion:**
1. `app/(tabs)/transactions/index.tsx` — ~30 color declarations
2. `app/(tabs)/transactions/expenses.tsx` — ~28 color declarations
3. `app/(tabs)/debts/index.tsx` — ~25 color declarations
4. `app/(tabs)/debts/[id].tsx` — ~18 color declarations
5. `app/(tabs)/debts/payment.tsx` — ~12 color declarations
6. `app/(tabs)/debts/add-debt.tsx` — ~15 color declarations
7. `app/(tabs)/assets/index.tsx` — ~16 color declarations
8. `app/(tabs)/transactions/add-income.tsx` — ~14 color declarations
9. `app/(tabs)/transactions/add-expense.tsx` — ~14 color declarations (assumed similar)
10. `app/(tabs)/assets/add-asset.tsx` — ~14 color declarations (assumed similar)

**Total: ~166 hardcoded color declarations that need NativeWind conversion**

**Success Criteria:**
- [ ] `grep -r "color: '#" BalanceTracker/app/` returns ZERO results (no hardcoded text colors)
- [ ] `grep -r "backgroundColor: '#" BalanceTracker/app/` returns ZERO results (no hardcoded backgrounds)
- [ ] `grep -r "borderColor: '#" BalanceTracker/app/` returns ZERO results (no hardcoded borders)
- [ ] The only remaining inline `style` properties are for layout (position, dimensions, transforms)

---

## 5. Success Criteria & Acceptance Checklist

### 5.1 Global Acceptance Tests

- [ ] **Dark Mode Full Pass**: Set device to dark mode → navigate to every screen in the app (Dashboard, Transactions, Expenses, Debts, Debt Detail, Assets, Settings, Add Income, Add Expense, Add Debt, Add Asset, Make Payment, Sign In, Sign Up, Forgot Password) → ALL surfaces, text, inputs, badges, buttons, and separators render correctly with no white/light leaks
- [ ] **Light Mode Full Pass**: Same as above in light mode → everything renders correctly
- [ ] **Android Compatibility**: All tab bar icons visible, all cards have elevation, all Pickers functional
- [ ] **iOS Compatibility**: Safe areas respected, no content hidden behind Dynamic Island or home indicator
- [ ] **RTL Support**: Switch to Arabic → all layouts, text alignment, and navigation direction flip correctly
- [ ] **No Regressions**: All existing functionality (CRUD operations, auth, navigation, data persistence) still works after the visual overhaul

### 5.2 Per-Screen Sign-Off

| # | Screen | Dark Mode | Styled Cards | No Hardcoded Colors | Apple HIG Compliant |
|---|--------|-----------|-------------|--------------------|--------------------|
| 1 | Dashboard | [ ] | [ ] | [ ] | [ ] |
| 2 | Transactions (Income) | [ ] | [ ] | [ ] | [ ] |
| 3 | Transactions (Expenses) | [ ] | [ ] | [ ] | [ ] |
| 4 | Debts List | [ ] | [ ] | [ ] | [ ] |
| 5 | Debt Detail | [ ] | [ ] | [ ] | [ ] |
| 6 | Make Payment | [ ] | [ ] | [ ] | [ ] |
| 7 | Assets List | [ ] | [ ] | [ ] | [ ] |
| 8 | Settings | [ ] | [ ] | [ ] | [ ] |
| 9 | Add Income | [ ] | [ ] | [ ] | [ ] |
| 10 | Add Expense | [ ] | [ ] | [ ] | [ ] |
| 11 | Add Debt | [ ] | [ ] | [ ] | [ ] |
| 12 | Add Asset | [ ] | [ ] | [ ] | [ ] |
| 13 | Sign In | [ ] | [ ] | [ ] | [ ] |
| 14 | Sign Up | [ ] | [ ] | [ ] | [ ] |
| 15 | Forgot Password | [ ] | [ ] | [ ] | [ ] |

### 5.3 Component Sign-Off

| # | Component | Themed | Cross-Platform | Touch Targets |
|---|-----------|--------|---------------|---------------|
| 1 | SafeScreen | [x] | [x] | N/A |
| 2 | Tab Bar | [ ] | [ ] | [ ] |
| 3 | NetWorthCard | [ ] | [ ] | N/A |
| 4 | IncomeExpenseChart | [ ] | [ ] | [ ] |
| 5 | FinancialSummaryCard | [ ] | [ ] | [ ] |
| 6 | EmptyState | [ ] | [ ] | [ ] |
| 7 | FormScreen | [x] | [x] | N/A |

### 5.4 Settings Feature Sign-Off

| # | Setting | UI Present | Wired to Context | Persists |
|---|---------|-----------|-----------------|----------|
| 1 | Theme (Light/Dark/System) | [ ] | [ ] | [ ] |
| 2 | Language (English/Arabic) | [ ] | [ ] | [ ] |
| 3 | Mode (Simple/Advanced) | [ ] | [ ] | [ ] |
| 4 | Currency (USD/TRY) | [ ] | [ ] | [ ] |
| 5 | Auto-Convert Toggle | [ ] | [ ] | [ ] |
| 6 | Data Export (CSV) | [x] | [x] | N/A |
| 7 | Sign Out | [x] | [x] | N/A |

### 5.5 Priority Order for Implementation

Given dependencies and impact, implement in this order:

1. **Tailwind config enhancement** (2.5) — needed by everything else
2. **Tab bar icon fix** (3.2) — high-impact, low-effort, unblocks Android testing
3. **Settings screen rebuild** (3.12) — unblocks theme/language/mode testing
4. **Dashboard visual overhaul** (3.3, 3.4, 3.5, 3.6) — highest-visibility screen
5. **Transaction screens conversion** (3.7, 3.8) — most-used data screens
6. **Debts screens conversion** (3.9, 3.10) — including detail and payment
7. **Assets screen conversion** (3.11)
8. **Form screens conversion** (3.13) — all 5 forms
9. **Auth screen polish** (3.14) — minor improvements to already-decent screens
10. **EmptyState enhancement** (3.15) — nice-to-have polish

---

## Appendix A: Files That Require Changes

| File | Change Type | Estimated Scope |
|------|------------|----------------|
| `tailwind.config.js` | Enhance | Small — add color tokens |
| `app/(tabs)/_layout.tsx` | Modify | Small — replace icons |
| `app/(tabs)/settings.tsx` | **Rewrite** | **Large** — add 5 new sections |
| `app/(tabs)/index.tsx` | Modify | Medium — layout + hierarchy |
| `src/components/dashboard/NetWorthCard.tsx` | Modify | Small — add tint + accent |
| `src/components/dashboard/IncomeExpenseChart.tsx` | Modify | Small — legend + labels |
| `src/components/dashboard/FinancialSummaryCard.tsx` | Modify | Medium — color variants + icon |
| `app/(tabs)/transactions/index.tsx` | **Convert** | **Large** — full NativeWind |
| `app/(tabs)/transactions/expenses.tsx` | **Convert** | **Large** — full NativeWind |
| `app/(tabs)/debts/index.tsx` | **Convert** | **Large** — full NativeWind |
| `app/(tabs)/debts/[id].tsx` | **Convert** | **Medium** — full NativeWind |
| `app/(tabs)/debts/payment.tsx` | Convert | Medium — full NativeWind |
| `app/(tabs)/debts/add-debt.tsx` | Convert | Medium — full NativeWind |
| `app/(tabs)/assets/index.tsx` | **Convert** | **Large** — full NativeWind |
| `app/(tabs)/assets/add-asset.tsx` | Convert | Medium — full NativeWind |
| `app/(tabs)/transactions/add-income.tsx` | Convert | Medium — full NativeWind |
| `app/(tabs)/transactions/add-expense.tsx` | Convert | Medium — full NativeWind |
| `src/components/ui/EmptyState.tsx` | Modify | Small — add icon prop |
| `app/(auth)/sign-in.tsx` | Polish | Small — error card + logo |
| `app/(auth)/sign-up.tsx` | Polish | Small — error card + logo |
| `app/(auth)/forgot-password.tsx` | Polish | Small — error card + logo |

**Total: 21 files** (3 rewrites, 10 full conversions, 8 modifications/polish)

---

## Appendix B: Apple HIG Reference Patterns

**Grouped List (Settings pattern):**
- Section header: Small uppercase text above the group
- Group container: Rounded rectangle with system background
- Row: Leading icon (optional) + label + trailing control/value/chevron
- Separator: Inset from leading edge, 1px, `separatorColor`
- Min row height: 44pt

**Tab Bar:**
- 5 tabs maximum (current app has 5 — perfect)
- Icons: Filled for selected, outline for deselected
- Tint: System blue for selected, system gray for deselected
- Background: Blurred translucent on iOS

**Cards:**
- Corner radius: 16pt (`rounded-2xl`)
- Shadow: Subtle, same-color family (not black)
- Internal padding: 16pt
- No border by default (shadow provides separation) — border optional for emphasis

**Buttons:**
- Primary: Filled, corner radius 12pt, min height 44pt, system blue or accent
- Secondary: Outline or tinted, same corner radius
- Destructive: Red tint or filled red
- Ghost: No background, just text + optional icon

**Status Badges:**
- Small rounded pill: `px-2.5 py-0.5 rounded-full`
- Semantic colors: green (success/paid), yellow/amber (pending), red (overdue/destructive)
- Font: 12pt semibold

---

*End of Report*
