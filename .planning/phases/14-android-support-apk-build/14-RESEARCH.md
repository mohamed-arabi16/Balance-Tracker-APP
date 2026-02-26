# Phase 14: Android Support + APK Build — Research

**Researched:** 2026-02-26
**Domain:** React Native cross-platform Android port, Expo EAS Build, icon compatibility
**Confidence:** HIGH (primary findings verified via Context7 + official Expo docs)

---

## Summary

This app is built on **Expo SDK 54** with **React Native 0.81** — an important baseline. SDK 54 targets Android 16 / API 36 and enforces **edge-to-edge display unconditionally** (cannot be opted out). This is the single biggest Android environment change from the iOS-only development that was done to date. The New Architecture is also the default (and effectively required) in SDK 54, but the project already runs on it since Reanimated v4 and react-native-worklets require it.

The **#1 blocker** is `expo-symbols` (used in 7 places in `(tabs)/_layout.tsx` and `EmptyState.tsx`): it is iOS/tvOS only. `SymbolView` renders nothing on Android without a `fallback` prop — meaning all tab bar icons and all empty-state icons are blank on Android out of the box. The correct solution is a lightweight `<TabIcon>` wrapper component that renders `SymbolView` on iOS and `Ionicons` from `@expo/vector-icons` on Android, using the `fallback` prop. This avoids any Platform.select spaghetti at the callsite.

The **remaining Android work** is largely configuration + polish rather than deep rewrites. `FormScreen` already has `Platform.OS === 'ios' ? 'padding' : 'height'` in `KeyboardAvoidingView`. `SHADOWS` tokens already include `elevation` fallbacks. `expo-blur` works on Android. `expo-print`, `expo-sharing`, `expo-file-system` v19, and Victory Native / Skia all work cross-platform. `I18nManager.forceRTL()` works on Android but requires the `expo-localization` plugin `supportsRTL` flag in `app.json`. The `app.json` is missing an `android.package` (required for EAS Build) and the `expo-system-ui` package is not installed (required for `userInterfaceStyle: automatic` to work on Android).

**Primary recommendation:** Use the `fallback` prop strategy for icon cross-compatibility, add `expo-system-ui`, set `android.package` + `androidStatusBar` in `app.json`, and configure a two-profile `eas.json` (APK preview + AAB production).

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DROID-01 | App compiles and runs on Android without crashes — all existing screens function on Android device/emulator | SDK 54 + RN 0.81 targets Android 16; New Architecture is default; all core deps work on Android; edge-to-edge requires safe-area-context insets (already used); `expo-symbols` crashes without fallback handler |
| DROID-02 | Tab bar icons render correctly on Android — cross-platform icon solution replaces or wraps iOS-only expo-symbols | `SymbolView` is iOS/tvOS only; `fallback` prop accepts `React.ReactNode`; `@expo/vector-icons` (Ionicons) is bundled with Expo, works cross-platform, needs no extra install |
| DROID-03 | Android-specific UX is correct — system back button handled, KeyboardAvoidingView behavior correct, safe areas respected on Android cutout devices, status bar styled correctly | `FormScreen` already handles KAV behavior; `predictiveBackGestureEnabled: false` already set in `app.json`; edge-to-edge + safe-area-context handles notch/cutout; `expo-status-bar` with `androidStatusBar` config needed |
| DROID-04 | Visual brand consistency maintained across platforms — same colors, card styling, typography tokens from Phase 13; no visual regression on iOS | `SHADOWS` tokens already include `elevation`; NativeWind dark mode works with `expo-system-ui`; `BlurView` works on Android; no Material Design overrides needed |
| DROID-05 | Production APK/AAB built via EAS Build and installs successfully on a physical Android device | `android.package` must be set in `app.json`; `eas.json` needs `preview` (APK) and `production` (AAB) profiles; `eas build --platform android --profile preview` generates installable APK |
</phase_requirements>

---

## Standard Stack

### Core (already installed — no new installs needed)

| Library | Version | Purpose | Android Status |
|---------|---------|---------|----------------|
| `expo` | ~54.0.0 | SDK + New Architecture | Android 16 target; edge-to-edge enforced |
| `@expo/vector-icons` | bundled with expo | Cross-platform icon fallback for Ionicons | Works on Android — pre-bundled with Expo |
| `react-native-safe-area-context` | ~5.6.0 | Safe area insets for edge-to-edge Android | Works on Android; required for edge-to-edge |
| `expo-blur` | ~15.0.8 | BlurView for privacy overlay | Works on Android (uses `blurReductionFactor` prop to match iOS) |
| `expo-print` | ~15.0.8 | PDF generation | Works on Android — `printToFileAsync` saves to cache on both platforms |
| `expo-sharing` | ~14.0.8 | Share sheet trigger | Works on Android — uses Android Intent; `UTI` prop is iOS-only, `mimeType` is cross-platform |
| `expo-file-system` | ~19.0.21 | CSV file write | New API (`File` + `Paths`) works on Android |
| `@shopify/react-native-skia` | 2.2.12 | Skia canvas for Victory Native | Works on Android (Android API 21+) |
| `victory-native` | ^41.20.2 | Charts | Works on Android; minor known issue: tap on filled area may not trigger on Android |
| `react-native-reanimated` | ~4.1.1 | Animations + Swipeable | Android supported; requires New Architecture (already active) |
| `react-native-gesture-handler` | ~2.28.0 | ReanimatedSwipeable | Works on Android; `predictiveBackGestureEnabled: false` already in app.json |

### New Install Required

| Library | Install Command | Purpose |
|---------|----------------|---------|
| `expo-system-ui` | `npx expo install expo-system-ui` | Enables `userInterfaceStyle: automatic` (dark mode) on Android dev builds + EAS builds |

### EAS CLI (one-time setup)

| Tool | Install | Purpose |
|------|---------|---------|
| `eas-cli` | `npm install -g eas-cli` | Create `eas.json`, configure build profiles, trigger Android build |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@expo/vector-icons` Ionicons fallback | `react-native-vector-icons` | No reason to add a dependency when `@expo/vector-icons` is already bundled |
| `fallback` prop on `SymbolView` | Full Platform.select() + separate component per callsite | `fallback` is cleaner; single wrapper component, zero callsite changes |
| `fallback` prop wrapper | Full icon library swap (replace all `SymbolView`) | Preserves iOS SF Symbol quality; only Android path uses Ionicons |

---

## Architecture Patterns

### Recommended File Structure for Phase 14 Changes

```
BalanceTracker/
├── src/
│   └── components/
│       └── ui/
│           └── TabIcon.tsx          # NEW: cross-platform icon wrapper
├── app/
│   └── (tabs)/
│       └── _layout.tsx              # MODIFY: replace SymbolView with TabIcon
├── src/components/ui/EmptyState.tsx # MODIFY: replace SymbolView with fallback
├── app.json                         # MODIFY: add android.package, androidStatusBar, expo-system-ui plugin
└── eas.json                         # NEW: build profiles (preview APK + production AAB)
```

### Pattern 1: TabIcon Wrapper Component (cross-platform icons)

**What:** A single `<TabIcon>` component that uses `SymbolView` on iOS and `Ionicons` from `@expo/vector-icons` on Android. Uses `SymbolView`'s built-in `fallback` prop.

**When to use:** Every `tabBarIcon` in `(tabs)/_layout.tsx` and in any `SymbolView` usage that has an Android equivalent.

**Source:** https://docs.expo.dev/versions/v54.0.0/sdk/symbols/ (fallback prop) + https://docs.expo.dev/guides/icons/

```typescript
// src/components/ui/TabIcon.tsx
import { Ionicons } from '@expo/vector-icons';
import { SymbolView } from 'expo-symbols';
import React from 'react';

interface TabIconProps {
  sfSymbol: string;       // SF Symbol name for iOS (e.g. 'house.fill')
  iosName?: string;       // override if sfSymbol isn't a valid SFSymbol string
  androidName: keyof typeof Ionicons.glyphMap;  // Ionicons name for Android
  color: string;
  size?: number;
}

export function TabIcon({ sfSymbol, androidName, color, size = 24 }: TabIconProps) {
  return (
    <SymbolView
      name={sfSymbol as any}
      tintColor={color}
      size={size}
      type="monochrome"
      fallback={<Ionicons name={androidName} size={size} color={color} />}
    />
  );
}
```

**SF Symbol → Ionicons mapping for this project:**

| Tab | SF Symbol | Ionicons (Android) |
|-----|-----------|-------------------|
| Dashboard | `house.fill` | `home` |
| Transactions | `list.bullet` | `list` |
| Debts | `creditcard.fill` | `card` |
| Assets | `chart.bar.fill` | `bar-chart` |
| Settings | `ellipsis.circle.fill` | `ellipsis-horizontal-circle` |
| Clients | `person.2.fill` | `people` |
| Invoices | `doc.text.fill` | `document-text` |

**Usage in `_layout.tsx`:**
```typescript
// Replace this:
tabBarIcon: ({ color }) => (
  <SymbolView name="house.fill" tintColor={color} size={24} type="monochrome" />
)

// With this:
tabBarIcon: ({ color }) => (
  <TabIcon sfSymbol="house.fill" androidName="home" color={color} />
)
```

### Pattern 2: EmptyState Fallback

**What:** `EmptyState.tsx` uses `SymbolView` for icons. Use the same `fallback` prop pattern to render an `Ionicons` icon when `symbolName` is provided but the platform is Android.

```typescript
// Modify EmptyState.tsx — replace bare SymbolView with fallback version
{symbolName ? (
  <SymbolView
    name={symbolName as any}
    tintColor="#9ca3af"
    size={56}
    type="hierarchical"
    style={{ marginBottom: 20 }}
    fallback={
      <Ionicons
        name={getIoniconsName(symbolName)}
        size={56}
        color="#9ca3af"
        style={{ marginBottom: 20 }}
      />
    }
  />
) : null}
```

A mapping helper `getIoniconsName(sfSymbolName: string)` can live in `TabIcon.tsx` or a shared `iconMap.ts`.

### Pattern 3: app.json Android Configuration

**What:** Required fields for Android builds via EAS.

```json
{
  "expo": {
    "android": {
      "package": "com.balancetracker.app",
      "adaptiveIcon": {
        "backgroundColor": "#E6F4FE",
        "foregroundImage": "./assets/android-icon-foreground.png",
        "backgroundImage": "./assets/android-icon-background.png",
        "monochromeImage": "./assets/android-icon-monochrome.png"
      },
      "predictiveBackGestureEnabled": false
    },
    "androidStatusBar": {
      "barStyle": "auto",
      "translucent": true
    },
    "plugins": [
      "expo-router",
      "expo-localization",
      "expo-splash-screen",
      "expo-sqlite",
      "@react-native-community/datetimepicker",
      "expo-system-ui"
    ]
  }
}
```

**Note on `android.package`:** Required for EAS Build to generate a signed APK. Reverse-domain format: `com.balancetracker.app` or `com.mohamedkhair.balancetracker`. Without this, `eas build` will prompt interactively and fail in CI.

**Note on `androidStatusBar.translucent: true`:** Enables the status bar to float above content (same as iOS behavior). With edge-to-edge enforced in SDK 54 + Android 16, this is the correct setting. `react-native-safe-area-context` already handles the insets.

**Note on `expo-system-ui` in plugins:** Required for `userInterfaceStyle: automatic` to apply on Android. Without it, the app ignores the dark/light preference on Android and always renders in light mode on dev builds and EAS builds.

**Source:** https://docs.expo.dev/versions/v55.0.0/config/app (androidStatusBar) + https://docs.expo.dev/versions/latest/sdk/system-ui/

### Pattern 4: eas.json Build Profiles

**What:** Two Android profiles — `preview` for APK (direct install on device), `production` for AAB (Play Store ready).

```json
{
  "cli": {
    "version": ">= 16.0.0"
  },
  "build": {
    "preview": {
      "android": {
        "buildType": "apk",
        "distribution": "internal"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      },
      "ios": {
        "distribution": "store"
      }
    }
  }
}
```

**Build commands:**
```bash
# APK for direct device install (DROID-05)
eas build --platform android --profile preview

# AAB for Play Store (future DROID-v3-01)
eas build --platform android --profile production
```

**Source:** https://docs.expo.dev/build-reference/apk + https://docs.expo.dev/build/eas-json

### Anti-Patterns to Avoid

- **Replacing all `SymbolView` with `Ionicons` everywhere:** This breaks iOS visual quality. Keep `SymbolView` as primary, use `fallback` prop.
- **Setting `elevation: 0` on Android card shadows:** The SHADOWS tokens already set `elevation: 3` and `elevation: 5` — do not zero them out. They are correct.
- **Using `behavior="padding"` on `KeyboardAvoidingView` on Android:** Already handled in `FormScreen.tsx` with `Platform.OS === 'ios' ? 'padding' : 'height'`.
- **Omitting `android.package` from `app.json`:** EAS Build cannot sign or distribute the APK without a package name. Always set before first build.
- **Skipping `expo-system-ui`:** Dark mode will silently fail on Android without it.
- **Using `androidStatusBar.barStyle` hardcoded to `light-content` or `dark-content`:** With dark/light mode sync, use `"auto"` to let the system drive it.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-platform icons | Custom SVG icon component | `@expo/vector-icons` Ionicons via `fallback` prop | Ionicons already bundled; 5000+ icons; correct sizing/color API |
| Android shadow effect | Custom `View` with border hacks | `elevation` in SHADOWS tokens (already present) | Platform-native elevation shadows are correct on Android |
| Android back handler | `useEffect` + `BackHandler.addEventListener` | Expo Router handles stack back by default; `predictiveBackGestureEnabled: false` already set | Manual back handling causes double-navigation bugs |
| APK build configuration | Custom Gradle scripts | `eas.json` with `buildType: "apk"` | EAS handles signing, keystore management, Gradle setup |
| Dark mode on Android | Custom color scheme detection | `expo-system-ui` + existing `NativeWind` + `userInterfaceStyle: automatic` | Without `expo-system-ui`, system dark mode is completely ignored on Android |

**Key insight:** This phase is a cross-platform _compatibility_ pass, not a rewrite. The architecture was already set up correctly (Platform.OS checks in FormScreen, elevation in SHADOWS). The work is (1) icons, (2) one missing package, (3) one missing app.json field, (4) eas.json.

---

## Common Pitfalls

### Pitfall 1: expo-symbols Renders Blank on Android (Silent Failure)
**What goes wrong:** `SymbolView` renders an empty View on Android with no error. Tab bar shows empty icon slots. EmptyState has no icon. The app doesn't crash — it just looks broken.
**Why it happens:** `expo-symbols` is documented as "iOS, tvOS" platform support. Android is not in scope for the native module.
**How to avoid:** The `fallback` prop is the official solution. Add `fallback={<Ionicons ... />}` to every `SymbolView` usage. Use the `TabIcon` wrapper to keep callsites clean.
**Warning signs:** Test on Android emulator immediately after first successful compile — icons will be visually blank before fix.
**Source:** https://docs.expo.dev/versions/v54.0.0/sdk/symbols/ (fallback prop documented as "Fallback to render on Android and Web where SF Symbols are not available")

### Pitfall 2: Dark Mode Silently Disabled on Android
**What goes wrong:** The app launches in light mode on Android even when the device is in dark mode. `NativeWind` dark: classes don't activate. No error thrown.
**Why it happens:** `userInterfaceStyle: automatic` in `app.json` is ignored on Android without the `expo-system-ui` package installed and registered as a plugin.
**How to avoid:** `npx expo install expo-system-ui` and add `"expo-system-ui"` to the `plugins` array in `app.json`.
**Source:** https://docs.expo.dev/develop/user-interface/color-themes/ ("install expo-system-ui to support appearance styles for Android")

### Pitfall 3: Edge-to-Edge Status Bar Overlap
**What goes wrong:** On Android, content renders behind the status bar and navigation bar. Cards, headers, or form fields appear clipped at the top.
**Why it happens:** SDK 54 targets Android 16 where edge-to-edge is unconditionally enabled — the system status bar and navigation bar float over the app content. Apps that don't account for insets will overlap.
**How to avoid:** The app already uses `react-native-safe-area-context` (`SafeAreaProvider` in root, `SafeAreaView` in `SafeScreen` and `FormScreen`). This is the correct solution and handles Android edge-to-edge automatically. Verify on Android emulator with a notch/cutout.
**Warning signs:** Visual content overlap in status bar area. Check `SafeAreaView` edges props — ensure `['top', 'bottom']` on screens that need full coverage.

### Pitfall 4: Missing android.package Blocks EAS Build
**What goes wrong:** `eas build --platform android` hangs on interactive prompt or fails in CI with "applicationId not found."
**Why it happens:** EAS Build requires `android.package` in `app.json` to set the `applicationId` in the Gradle build. Without it, EAS prompts interactively.
**How to avoid:** Set `"android": { "package": "com.balancetracker.app" }` in `app.json` before running any EAS build command.
**Warning signs:** EAS CLI output says "Provide applicationId for your Android app."

### Pitfall 5: ReanimatedSwipeable Performance on Android (FPS Drop)
**What goes wrong:** FlatList scrolling performance degrades on Android when rows are wrapped in `ReanimatedSwipeable`. This is a known issue.
**Why it happens:** Gesture handler overhead per-row is heavier on Android's New Architecture bridge in some Reanimated 4 versions.
**How to avoid:** The component works correctly; swipe-to-delete behavior is preserved. Monitor FPS. If needed, close any open swipeable when scroll begins via `onScrollBeginDrag`.
**Warning signs:** Jank/stuttering in Transactions, Debts, Assets lists on Android physical device.

### Pitfall 6: expo-sharing UTI Property Is iOS-Only
**What goes wrong:** `Sharing.shareAsync(uri, { UTI: '...' })` — the `UTI` prop is silently ignored on Android. Android uses `mimeType` only.
**Why it happens:** UTI (Uniform Type Identifier) is an Apple-only concept.
**How to avoid:** Always provide `mimeType` alongside `UTI`. The current `exportCsv.ts` already includes both (`mimeType: 'text/csv'` and `UTI: 'public.comma-separated-values-text'`). PDF sharing should use `mimeType: 'application/pdf'`.
**Source:** https://docs.expo.dev/versions/latest/sdk/sharing/ (printToFile example shows both props)

### Pitfall 7: Victory Native Tap-on-Filled-Area on Android
**What goes wrong:** Tap callout on the IncomeExpenseChart may not fire when tapping directly on a filled/colored chart area on Android.
**Why it happens:** Known open issue in victory-native-xl repo (issue #642) — Android hit testing on filled areas behaves differently from iOS.
**How to avoid:** The callout still works via tap+drag interaction on Android. This is a known limitation, not a blocker. Document it as a known limitation in the phase summary.

### Pitfall 8: BlurView tint="systemChromeMaterial" Android Behavior
**What goes wrong:** `tint="systemChromeMaterial"` is iOS UIKit-specific. On Android, it maps to a generic blur approximation that looks slightly different.
**Why it happens:** Android doesn't have UIKit's material design tinting system. `expo-blur` approximates using `experimentalBlurMethod`.
**How to avoid:** The `PrivacyOverlay` uses `tint="systemChromeMaterial"` — this will work on Android but look slightly different. Acceptable for a privacy overlay. Optionally use `tint="default"` for consistency, or keep as-is. Not a crash risk.

---

## Code Examples

### Icon Wrapper — Verified Pattern

```typescript
// Source: https://docs.expo.dev/versions/v54.0.0/sdk/symbols/ (fallback prop)
// Source: https://docs.expo.dev/guides/icons/ (@expo/vector-icons)

import { Ionicons } from '@expo/vector-icons';
import { SymbolView } from 'expo-symbols';
import React from 'react';

export function TabIcon({
  sfSymbol,
  androidName,
  color,
  size = 24,
}: {
  sfSymbol: string;
  androidName: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  size?: number;
}) {
  return (
    <SymbolView
      name={sfSymbol as any}
      tintColor={color}
      size={size}
      type="monochrome"
      fallback={<Ionicons name={androidName} size={size} color={color} />}
    />
  );
}
```

### EAS Build — APK Profile

```json
// Source: https://docs.expo.dev/build-reference/apk
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {}
  }
}
```

### expo-system-ui Plugin Registration

```json
// Source: https://docs.expo.dev/versions/latest/sdk/system-ui/
// Add to app.json plugins array:
"plugins": [
  "expo-router",
  "expo-localization",
  "expo-splash-screen",
  "expo-sqlite",
  "@react-native-community/datetimepicker",
  "expo-system-ui"
]
```

### Android Status Bar Configuration

```json
// Source: https://docs.expo.dev/versions/v55.0.0/config/app
// With edge-to-edge enforced (SDK 54), translucent:true is correct
{
  "androidStatusBar": {
    "barStyle": "auto",
    "translucent": true
  }
}
```

### I18nManager RTL — Already Works Cross-Platform

```typescript
// Source: https://docs.expo.dev/guides/localization
// The existing initI18n() implementation is correct for Android.
// I18nManager.forceRTL() works on Android.
// Requires restart to apply (same as iOS) — already handled.
I18nManager.allowRTL(true);
I18nManager.forceRTL(language === 'ar');
```

### expo-print + expo-sharing — Android Compatibility

```typescript
// Source: https://docs.expo.dev/versions/latest/sdk/print
// printToFileAsync works on both iOS and Android
const { uri } = await Print.printToFileAsync({ html });
await shareAsync(uri, {
  mimeType: 'application/pdf',   // Required for Android
  UTI: '.pdf',                    // iOS-only; safe to include, ignored on Android
  dialogTitle: 'Export Invoice',  // Android only (shows above share sheet)
});
```

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| `SafeAreaView` from react-native | `SafeAreaView` from `react-native-safe-area-context` | RN's built-in deprecated in 0.81; project already uses correct library |
| `edgeToEdgeEnabled: false` to opt out | Not possible in SDK 54 (Android 16 enforces it) | Edge-to-edge is now unconditional on Android |
| Legacy Architecture | New Architecture only in RN 0.82+ | SDK 54 is last to support Legacy Arch; project uses New Arch (Reanimated v4 requires it) |
| Manual `BackHandler` for Android back button | Expo Router handles back navigation natively | `predictiveBackGestureEnabled: false` already set in app.json |
| `FileSystem.writeAsStringAsync` (legacy) | `new File(Paths.cache, name).write(content)` | Project already uses new API in `exportCsv.ts` |

**Deprecated/outdated:**
- `newArchEnabled` config key: Removed from `app.json` in SDK 55. SDK 54 uses New Arch by default; Legacy Arch opt-out still technically possible but not needed.
- `enableProguardInReleaseBuilds`: Deprecated in SDK 54 in favor of `enableMinifyInReleaseBuilds` in `expo-build-properties`. Relevant for production builds only.

---

## Specific Question Answers

### Q1: expo-symbols strategy for Android
**Answer:** Use the built-in `fallback` prop on `SymbolView`. The `fallback` accepts `React.ReactNode`. Create a `TabIcon` wrapper component that passes `<Ionicons name={androidName} ... />` as the fallback. `@expo/vector-icons` is pre-bundled with Expo — no install needed. This preserves iOS SF Symbol quality while providing equivalent Ionicons on Android. **Do NOT replace SymbolView everywhere** — that would regress iOS quality. **Confidence: HIGH** (verified via official docs).

### Q2: app.json Android changes needed
**Required:**
1. `android.package` — required for EAS Build (currently missing)
2. `"expo-system-ui"` in plugins — required for dark mode on Android (currently missing)
3. `androidStatusBar.translucent: true` — for edge-to-edge compatibility

**Already correct:**
- `android.adaptiveIcon` — all four image variants present
- `android.predictiveBackGestureEnabled: false` — already set
- `scheme: "balancetracker"` — required for deep links, already set

### Q3: SHADOWS tokens on Android
**Answer:** The `SHADOWS` tokens in `tokens.ts` already include `elevation: 3` and `elevation: 5` as Android fallbacks. No changes needed. **Confidence: HIGH** (read source directly).

### Q4: KeyboardAvoidingView on Android
**Answer:** `FormScreen.tsx` already uses `behavior={Platform.OS === 'ios' ? 'padding' : 'height'}`. This is correct. No changes needed. **Confidence: HIGH** (read source directly).

### Q5: expo-print + expo-sharing on Android
**Answer:** Both work on Android. `Print.printToFileAsync({ html })` saves PDF to Android cache directory. `Sharing.shareAsync(uri, { mimeType: 'application/pdf' })` opens the Android share sheet. The `UTI` prop is iOS-only and silently ignored on Android — safe to leave in. **Confidence: HIGH** (verified via Context7/official docs).

### Q6: expo-file-system v19 new API on Android
**Answer:** `new File(Paths.cache, fileName)` and `file.write(content)` work on Android. `Paths.cache` resolves to the Android cache directory. The project's `exportCsv.ts` uses this API and is already correct. **Confidence: HIGH** (verified via Context7 SDK 55 docs + official expo blog post).

### Q7: Victory Native XL / Skia on Android
**Answer:** Works on Android (requires API 21+, already the minimum). Minor known issue: tap-on-filled-area interaction (#642 in victory-native-xl repo) may not fire on Android. Tap+drag and callout via `useAnimatedReaction+runOnJS` (the pattern already used) should still work. **Confidence: MEDIUM** (WebSearch verified, GitHub issue open).

### Q8: ReanimatedSwipeable on Android
**Answer:** Works on Android. Known performance issue: FPS drops in FlatList when many rows have Swipeable wrappers. Swipe-to-delete functionality is preserved. No crash risk. **Confidence: MEDIUM** (WebSearch multiple sources; no official per-platform docs found).

### Q9: Status bar on Android
**Answer:** With SDK 54 + Android 16 edge-to-edge enforcement, use `androidStatusBar.translucent: true` and `expo-status-bar`'s `StatusBar style="auto"`. The `react-native-safe-area-context` insets handle the top gap. The current `SafeScreen` and `FormScreen` already use `SafeAreaView` which accounts for this. **Confidence: HIGH** (verified via official SDK 54 changelog + Expo system bars docs).

### Q10: EAS Build eas.json for Android
**Answer:**
- `preview` profile: `android.buildType: "apk"` → generates `.apk` for direct device install (DROID-05)
- `production` profile: default (generates `.aab` for Play Store)
- APK cannot be installed on Android Emulator from EAS (use local `expo run:android` for emulator testing)
- `eas build --platform android --profile preview` → download APK link → install on physical device

### Q11: I18nManager.forceRTL on Android
**Answer:** Works on Android. The existing `initI18n()` implementation is correct. The `expo-localization` plugin already in `app.json` plugins handles RTL detection at startup. App restart is required for direction change — same as iOS, already documented in `changeLanguage()`. **Confidence: HIGH** (verified via Context7 official docs).

### Q12: Privacy screen (AppState blur) on Android
**Answer:** `expo-blur`'s `BlurView` is supported on Android (documented platforms: Android, iOS, tvOS, Web). The `PrivacyOverlay` component uses `AppState.addEventListener('change')` — this works cross-platform. The `tint="systemChromeMaterial"` will render a generic approximation on Android (not UIKit material, but functional). **Confidence: HIGH** (verified via Context7 BlurView API docs).

### Q13: Expo SDK 54 Android gotchas
**Critical:** Edge-to-edge is unconditional. `expo-system-ui` required for dark mode. `android.package` required for EAS Build.
**Non-critical:** `enableProguardInReleaseBuilds` deprecated (only affects production release builds). Legacy Architecture still technically available in SDK 54 but not needed.

---

## Open Questions

1. **Ionicons name coverage for all SF Symbols used in EmptyState**
   - What we know: Ionicons has 1300+ icons; all major financial/UI icons have equivalents
   - What's unclear: The specific `symbolName` strings passed to `EmptyState` across all screens — need to audit all callsites
   - Recommendation: Do the audit during plan creation; create the `iconMap.ts` mapping as a task

2. **Android-specific keyboard behavior in form sheets**
   - What we know: `FormScreen` uses `behavior="height"` on Android; this is the standard recommendation
   - What's unclear: Whether `react-native-keyboard-controller` (already installed at 1.18.5) is now active for forms or still using the fallback `KeyboardAvoidingView`
   - Recommendation: Test on Android emulator; if keyboard covers inputs on any screen, add `KeyboardProvider` from `react-native-keyboard-controller` which is already installed

3. **Android APK signing keystore**
   - What we know: EAS Build manages keystores automatically for managed workflow
   - What's unclear: Whether a Google Play Developer account is needed now (it's not — DROID-05 is APK direct install, not Play Store)
   - Recommendation: Let EAS generate and store the keystore automatically; document the keystore ID for future Play Store submission

4. **Dark mode flicker on Android return from background**
   - What we know: A June 2025 bug report (#37721) shows `userInterfaceStyle: "dark"` reverts to light when app returns from background
   - What's unclear: Whether this affects `"automatic"` mode (vs. forced dark) in SDK 54
   - Recommendation: Test on Android device; if observed, `expo-system-ui` update or workaround may be needed. LOW priority for this phase.

---

## Sources

### Primary (HIGH confidence)
- `https://docs.expo.dev/versions/v54.0.0/sdk/symbols/` — SymbolView platform support, fallback prop type, iOS/tvOS only rendering
- `https://docs.expo.dev/guides/icons/` — @expo/vector-icons bundled with Expo, cross-platform
- `https://docs.expo.dev/build-reference/apk` — EAS Build APK profile configuration (`buildType: "apk"`)
- `https://docs.expo.dev/build/eas-json` — Full eas.json profile reference
- `https://docs.expo.dev/versions/latest/sdk/print` — expo-print Android/iOS support, `printToFileAsync` on both platforms
- `https://docs.expo.dev/versions/latest/sdk/blur-view` — BlurView platform support (Android, iOS, tvOS, Web), `blurReductionFactor` for Android
- `https://docs.expo.dev/develop/user-interface/color-themes/` — expo-system-ui required for Android dark mode
- `https://docs.expo.dev/versions/v55.0.0/config/app` — `androidStatusBar` configuration options
- `https://docs.expo.dev/versions/v55.0.0/sdk/filesystem/` — expo-file-system v19 File+Paths API on Android
- `https://docs.expo.dev/guides/localization` — I18nManager.forceRTL cross-platform, expo-localization RTL support

### Secondary (MEDIUM confidence)
- `https://expo.dev/changelog/sdk-54` — Edge-to-edge unconditional in SDK 54, React Native 0.81, Android 16 target
- `https://github.com/FormidableLabs/victory-native-xl/issues/642` — Tap on filled area doesn't trigger on Android (open issue)
- `https://docs.swmansion.com/react-native-gesture-handler/docs/components/reanimated_swipeable/` — ReanimatedSwipeable, Android works, performance note

### Tertiary (LOW confidence — flag for validation)
- WebSearch: ReanimatedSwipeable FPS drop in FlatList on Android — reported by community, not in official docs
- WebSearch: expo-system-ui background→foreground dark mode flicker (GitHub #37721, June 2025) — may not affect `automatic` mode

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all core libraries verified against official Expo SDK 54 docs
- Architecture patterns: HIGH — icon fallback pattern directly from official SymbolView docs; EAS eas.json from official build reference
- Pitfalls: HIGH for items 1-4 (official docs confirm); MEDIUM for items 5-8 (community + GitHub issues)

**Research date:** 2026-02-26
**Valid until:** 2026-05-26 (60 days — Expo SDK 55 scheduled; re-verify if SDK upgraded before planning)
