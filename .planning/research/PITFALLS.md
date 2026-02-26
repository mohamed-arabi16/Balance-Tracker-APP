# Pitfalls Research

**Domain:** React Native (Expo) iOS port of a React + Supabase web finance app
**Researched:** 2026-02-26
**Confidence:** MEDIUM-HIGH — Critical pitfalls verified via official docs and multiple community sources. App Store guideline quotes from apple.com directly.

---

## Overview

This document catalogues the specific pitfalls most likely to cause rewrites, App Store rejections, or broken features when porting Balance Tracker (React 18 + Supabase + TanStack React Query + Shadcn/ui) to React Native (Expo) for iOS. Six primary risk zones: Supabase integration, RTL / i18n, PDF generation, App Store compliance, React-to-RN porting, and Expo EAS deployment.

Each pitfall includes warning signs, prevention strategy, and the roadmap phase where it must be addressed.

---

## Critical Pitfalls

### Pitfall 1: Missing URL Polyfill Crashes Supabase at Runtime

**What goes wrong:**
Supabase JS v2.x uses standard `URL` and `URLSearchParams` APIs that do not exist in React Native's Hermes JS engine. Without the polyfill, any Supabase call — auth, database query, storage — throws `URL.hostname is not implemented` at runtime. The crash happens silently in Expo Go but is a hard crash in a production build.

**Why it happens:**
Developers copy the Supabase client initialization from the web project without checking React Native environment requirements. The web project does not need this polyfill because browsers implement URL natively. The Supabase JS docs explicitly require this import for React Native but it is easy to miss.

**How to avoid:**
Add `import 'react-native-url-polyfill/auto'` as the **first line** of the Expo entry point (`app/_layout.tsx` or `App.tsx`), before any other import. Install via `npx expo install react-native-url-polyfill`. Do not apply conditionally — it is safe to load on all platforms.

**Warning signs:**
- Supabase auth sign-in throws `TypeError: URL.hostname is not implemented`
- App works in web build but crashes in Expo Go or device build when hitting any Supabase endpoint
- Error appears on first real network call, not on import

**Phase to address:** Phase 1 (Supabase + Auth setup) — must be the first line committed before any Supabase usage.

---

### Pitfall 2: Session Lost on App Restart — No AsyncStorage Adapter Configured

**What goes wrong:**
Supabase Auth on the web automatically uses `localStorage` to persist sessions. React Native has no `localStorage`. Without an explicit `storage: AsyncStorage` adapter in the Supabase client config, the session is in-memory only. Every app restart logs the user out. This looks like an auth bug but is a configuration omission.

A secondary failure mode: the app starts offline. `startAutoRefresh()` fires, fails to reach Supabase, and clears the stored session, logging the user out even though a valid session exists in AsyncStorage.

**Why it happens:**
The web Supabase client is copied directly to the RN project. The `storage` key in `createClient(url, key, { auth: { storage: AsyncStorage } })` is web-optional and therefore omitted. The offline session-clearing behavior is an undocumented edge case in the Supabase JS client.

**How to avoid:**
Initialize the Supabase client with:
```ts
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabase = createClient(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,  // Must be false for React Native
  },
})
```
Add AppState listeners to call `supabase.auth.startAutoRefresh()` when foreground and `supabase.auth.stopAutoRefresh()` when background. This prevents the offline session-clearing bug.

**Warning signs:**
- User is logged out every time they close and reopen the app
- `supabase.auth.getSession()` returns `null` after app restart despite successful login
- App works fine during one session but requires re-login on next launch

**Phase to address:** Phase 1 (Auth) — required before any protected screen can work.

---

### Pitfall 3: Supabase Realtime Crashes the App — ws Module Import

**What goes wrong:**
`@supabase/supabase-js` v2.x imports the `ws` module for WebSocket support. In React Native (Expo SDK 53+), this import fails because `ws` attempts to import Node.js's `stream` module, which does not exist in the React Native runtime. The app crashes on startup even if realtime subscriptions are never used.

**Why it happens:**
The `ws` package is a Node.js WebSocket library. It is imported unconditionally by supabase-js, even when realtime is disabled. Expo SDK 53 tightened its polyfill handling, exposing this previously-hidden crash.

**How to avoid:**
Add metro bundle resolver aliases in `metro.config.js` to mock the problematic modules:
```js
config.resolver.extraNodeModules = {
  stream: require.resolve('stream-browserify'),
  ws: require.resolve('@supabase/supabase-js/dist/module/lib/WebSocketNode'),
}
```
Alternatively, use the `@supabase/supabase-js` package with a dedicated React Native shim if one ships before the roadmap begins. Verify the current Expo SDK version's known issues at project start.

**Warning signs:**
- App crashes immediately on launch with `Error: The package at "node_modules/ws/lib/stream.js" attempted to import the Node standard library module "stream"`
- Crash occurs even when realtime channel subscriptions are never called
- Works in Expo Go (SDK <53) but crashes in custom dev client or production build

**Phase to address:** Phase 1 (project scaffold) — metro config must be set before any Supabase usage.

---

### Pitfall 4: RTL Direction Change Requires Full App Restart — No In-Session Switching

**What goes wrong:**
The web app supports switching language (EN/AR) at runtime with immediate RTL layout flip. React Native's `I18nManager.forceRTL()` requires an app restart before the layout engine applies the new direction. On iOS specifically, calling `forceRTL(true)` and then reloading the JS bundle with `Updates.reloadAsync()` does not apply RTL — a full native restart is required. This breaks the "switch language, see Arabic layout" UX that the web app currently provides.

React Native 0.79+ addresses this for Android but iOS behavior remains dependent on native layer restarts as of early 2026.

**Why it happens:**
Yoga layout engine computes RTL/LTR direction at native component initialization time. JS-level RTL flag changes do not propagate to already-mounted native views. This is a fundamental React Native architecture constraint, not a bug.

**How to avoid:**
Design the app to treat language/direction as a setting that takes effect on the next app launch, not immediately. In the language switch UI: show a message "Restart the app to apply Arabic layout" and persist the selection to Supabase `user_settings` so it loads correctly next launch. Use `expo-localization` config plugin with `supportsRTL: true` in `app.config.ts` so the native layer initializes correctly based on device locale on first run.

For the RTL layout itself: build all components with RTL support from the start using `I18nManager.isRTL` for conditional logic rather than adding RTL as a retrofit.

**Warning signs:**
- Switching to Arabic in the running app changes text content but layout stays LTR
- `I18nManager.isRTL` returns `false` in Expo Go regardless of language selected
- Arabic text renders correctly but icons, padding, and flex direction remain unflipped

**Phase to address:** Phase 2 (i18n + RTL) — architecture decision must be made before any RTL-dependent layout is built.

---

### Pitfall 5: @react-pdf/renderer Does Not Run on React Native

**What goes wrong:**
The web app generates invoices using `@react-pdf/renderer` which produces PDFs in the browser using a canvas renderer. This library requires DOM APIs (`document`, `canvas`, `Blob`) that do not exist in React Native. Importing it in an RN project causes an immediate crash. There is no workaround — it is a browser-only library.

**Why it happens:**
Developers assume the library works in React Native because it uses React primitives (`<Document>`, `<Page>`, `<Text>`). These are custom primitives that compile to PDF instructions via a web rendering pipeline, not native views. The library explicitly does not support React Native.

**How to avoid:**
Replace `@react-pdf/renderer` with `expo-print` for iOS PDF generation. The pattern:
1. Build the invoice as an HTML string (with inline CSS, base64 images — no external URLs)
2. Call `Print.printToFileAsync({ html })` from `expo-print`
3. Use `Sharing.shareAsync(fileUri)` to let the user save/share the PDF via iOS share sheet

This approach renders via `WKWebView` on iOS, which supports RTL HTML and Arabic text natively.

**Warning signs:**
- Import of `@react-pdf/renderer` causes Metro bundler errors about missing DOM modules
- `document is not defined` error at runtime if the import somehow resolves
- Web app's PDF utility file crashes the RN build

**Phase to address:** Phase 1 (PDF strategy decision) — the replacement library must be chosen before the invoice feature is ported. Do not start building invoice UI without a working PDF path.

---

### Pitfall 6: expo-print Cannot Load Local Asset Images — Must Use Base64

**What goes wrong:**
Invoice PDFs typically include a logo or header image. In expo-print on iOS, local file URIs (e.g., `file:///...` or `require('./assets/logo.png')`) cannot be loaded inside the HTML string passed to `Print.printToFileAsync()`. The WKWebView restriction blocks local file access for security reasons. The image renders in a React Native `<Image>` component fine but is blank in the generated PDF.

**Why it happens:**
WKWebView (which expo-print uses under the hood) restricts file:// URL access when rendering HTML for PDF. This is an iOS security model constraint, not an expo-print bug.

**How to avoid:**
Convert all images to base64 before embedding in the PDF HTML. Use `expo-file-system` to read the asset and convert:
```ts
const logoBase64 = await FileSystem.readAsStringAsync(logoUri, {
  encoding: FileSystem.EncodingType.Base64,
})
// Then embed: `<img src="data:image/png;base64,${logoBase64}" />`
```
For the Balance Tracker logo or any static branding, pre-convert to a base64 string constant stored in the codebase (avoids async reads for known assets).

**Warning signs:**
- Invoice PDF shows blank white space where the logo should be
- HTML template with `<img src="${require('./logo.png')}">` compiles but produces blank image in PDF
- Image works in simulator but not in production build (production asset paths differ)

**Phase to address:** Phase 4 (Invoice PDF generation) — embed base64 images as a required pattern when building the PDF template.

---

### Pitfall 7: App Store Rejection for Missing Privacy Manifest (PrivacyInfo.xcprivacy)

**What goes wrong:**
Starting May 2024, Apple requires all apps that use "required reason APIs" (including `UserDefaults`, file timestamp APIs, and disk space APIs — all used internally by Expo and AsyncStorage) to declare a `PrivacyInfo.xcprivacy` manifest. Apps submitted without this manifest are rejected with `ITMS-91053`. Expo SDK 51+ includes this automatically in EAS builds, but projects on older SDKs or with custom native code need manual attention.

**Why it happens:**
Developers focus on app functionality and skip the privacy manifest step, assuming Expo handles everything. Expo handles its own internal API declarations but does not automatically include declarations for custom native modules or third-party libraries.

**How to avoid:**
Use Expo SDK 51+ (which ships with a default `PrivacyInfo.xcprivacy`). Audit all third-party native libraries (react-native-async-storage, etc.) and verify they include their own privacy manifests. Run `eas build --platform ios` and inspect the build log for privacy manifest warnings before submitting to App Store Connect. Include a `PrivacyInfo.xcprivacy` in the project if any custom native modules are added.

**Warning signs:**
- EAS build log contains `PrivacyInfo.xcprivacy` warnings
- App Store Connect shows `ITMS-91053: Missing required reason API` email after upload
- Build submitted to TestFlight processes successfully but App Store submission fails

**Phase to address:** Phase 6 (App Store submission) — verify manifest before first submission, but configure at project setup to avoid late surprises.

---

### Pitfall 8: All Text Must Be Inside a `<Text>` Component — Crashes Are Silent in Dev

**What goes wrong:**
React Native enforces that all rendered text must be inside a `<Text>` component. In React (web), text can appear as children of any element (`<div>Hello</div>` is valid). Porting React components that use string interpolation or conditional text rendering without wrapping in `<Text>` causes crashes in production builds on iOS. In Expo Go with the debugger, these sometimes render incorrectly rather than crashing, masking the problem until a device or production build.

**Why it happens:**
Web developers instinctively write patterns like:
```tsx
<View>{isLoading && 'Loading...'}</View>
```
This renders `0` or `false` as text nodes in React Native, which is invalid and crashes.

Additionally, logical `&&` with numbers crashes React Native:
```tsx
<View>{count && <Text>{count}</Text>}</View>  // crashes when count=0
```

**How to avoid:**
- Always wrap string literals in `<Text>` — never place strings directly in `<View>`
- Replace all `condition && <Component />` patterns with ternaries: `condition ? <Component /> : null`
- Use TypeScript strict mode to catch string/number rendering issues at compile time
- Run the iOS build on a physical device in release mode once per phase to catch native-only crashes

**Warning signs:**
- Component renders correctly in web but crashes on iOS device
- App works in Expo Go but crashes in EAS development build
- Error message: `Text strings must be rendered within a <Text> component`

**Phase to address:** Phase 1 (project scaffold and component patterns) — establish this as a linting rule before porting any web components.

---

### Pitfall 9: ScrollView for Long Lists Causes Memory and Performance Problems

**What goes wrong:**
In the web app, income/expense lists are rendered with `array.map()` inside a scrollable container. Porting this directly to React Native using `<ScrollView>` renders all list items simultaneously — including all transaction history. For users with 500+ transactions, this causes slow initial render, high memory usage, and dropped frames while scrolling. The app feels sluggish compared to the web version.

**Why it happens:**
`ScrollView` in React Native has no virtualization. All children are rendered and held in memory. Web browsers handle long lists via DOM recycling automatically; React Native does not.

**How to avoid:**
Replace all transaction list `map()` + `ScrollView` with `FlatList` or `FlashList` (from `@shopify/flash-list`, which is more performant than FlatList for variable-height items). Use `FlatList` for lists with more than 20 items. Keep `ScrollView` only for short, bounded lists (settings screens, invoice line items where there are typically <10 items).

**Warning signs:**
- Transaction list takes >300ms to render on first mount
- Scrolling through 100+ transactions causes dropped frames (visible jank)
- Memory usage climbs without ceiling as the user scrolls

**Phase to address:** Phase 2 (Simple Mode feature port — income/expense lists).

---

### Pitfall 10: Keyboard Overlaps Input Fields — KeyboardAvoidingView Configuration Is iOS-Specific

**What goes wrong:**
Forms in the app (add income, add expense, create invoice) have inputs that sit at the bottom half of the screen. When the iOS keyboard appears, it covers these inputs. React Native's `KeyboardAvoidingView` with `behavior="padding"` works in basic cases but breaks when used inside a navigation stack with a header — the `keyboardVerticalOffset` must account for the header height. Without this, the keyboard covers inputs by exactly the header height.

**Why it happens:**
The `keyboardVerticalOffset` prop defaults to `0`, which is correct for screens with no navigation header. Adding a navigation header changes the visual offset but the component does not detect this automatically. This is an iOS-specific issue; Android uses a different keyboard resize model.

**How to avoid:**
On all form screens, use:
```tsx
<KeyboardAvoidingView
  behavior="padding"
  keyboardVerticalOffset={headerHeight}
>
```
Where `headerHeight` is obtained from `useHeaderHeight()` from `@react-navigation/elements`. Alternatively, use the `react-native-keyboard-controller` library which handles this automatically. Test every form screen on a physical iPhone (not just simulator) because simulator keyboard behavior differs.

**Warning signs:**
- "Add Income" form: amount input is hidden behind keyboard on iPhone SE (smaller screen)
- Form scrolls up but not enough — bottom input still partially covered
- Issue does not appear in iOS Simulator but appears on device

**Phase to address:** Phase 2 (Simple Mode forms — income, expense, debt, asset entry).

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Copying web React hooks directly without auditing for DOM dependencies | Faster port start | Hooks that use `window`, `document`, or browser APIs crash on iOS silently | Never — audit every hook before copying |
| Using `ScrollView` everywhere instead of `FlatList` | Simpler code, no `keyExtractor` needed | Memory leak and jank on large datasets | Only for lists bounded to <20 items |
| Skipping RTL testing until full feature is built | Faster development | RTL layout bugs require rework across all built screens | Never — test RTL as each screen is built |
| Using `expo-constants` for Supabase keys without `EXPO_PUBLIC_` prefix | Looks like it works in dev | Keys undefined in OTA updates; silent auth failures in production | Never — always use `EXPO_PUBLIC_` env var prefix |
| Building PDF with HTML that references remote image URLs | Easier template authoring | Images are blank in generated PDFs on iOS; requires template rewrite | Never — always base64-embed images |
| Using React Navigation `any` for route params | Avoids typing navigation props | Type errors only visible at runtime; navigation crashes undetectable | Never in production — type all route params |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase Auth | Copy web `createClient()` call without `storage: AsyncStorage` and `detectSessionInUrl: false` | Add full React Native auth config; add AppState listeners for token refresh |
| Supabase Auth | Use `supabase.auth.getUser()` for auth checks on every request | Use `supabase.auth.getSession()` and cache session in context; `getUser()` is a network call |
| Supabase Realtime | Leave realtime subscriptions active when component unmounts | Always return `() => supabase.removeChannel(channel)` in useEffect cleanup |
| Expo env vars | Use `process.env.SUPABASE_URL` (no prefix) | Must use `process.env.EXPO_PUBLIC_SUPABASE_URL` — non-prefixed vars are stripped at build time |
| expo-print | Pass `<img src="./logo.png">` in HTML template | Base64-encode all images; use `data:image/png;base64,...` format |
| expo-print | Use `useMarkupFormatter: true` for custom fonts | This option disables image rendering on iOS — do not use with image-containing invoices |
| React Navigation | Nest Stack inside Tab inside Stack without accounting for header offset in `KeyboardAvoidingView` | Use `useHeaderHeight()` to compute `keyboardVerticalOffset` dynamically |
| Expo EAS Build | Submit without filling App Store Connect metadata (screenshots, description, privacy policy URL) | Complete all metadata in App Store Connect before triggering `eas submit` |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| `ScrollView` for transaction history | Jank scrolling, high memory, >300ms render | Use `FlatList` or `FlashList` for all unbounded lists | At 50+ list items |
| Inline object/function props on `FlatList` `renderItem` | `FlatList` re-renders all visible items on parent state change | Memoize `renderItem` with `useCallback`; wrap item component with `React.memo` | Noticeable from first render if list has >20 items |
| Unsubscribed Supabase realtime channels | Memory leak; duplicate events fire; battery drain | Return cleanup function from `useEffect` that calls `removeChannel` | Immediately — accumulates per navigation cycle |
| PDF generation on the JS thread | UI freeze for 1-3 seconds when generating invoice PDF | `expo-print`'s `printToFileAsync` is async — do not await in a synchronous event handler; show loading state immediately | On every PDF export; worse on older iPhones |
| `AsyncStorage` reads on app start without loading state | Flash of unauthenticated UI before session loads | Check `supabase.auth.getSession()` and show splash screen until session is determined | On every cold start |
| re-rendering all invoice line items on each keystroke | Invoice form lags as user types | Use controlled inputs per line item with local state; debounce Supabase saves | When invoice has >5 line items |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Hardcoded Supabase URL or anon key in source code | Key exposed in decompiled IPA; unauthorized API access | Use `EXPO_PUBLIC_` env vars; anon key is public-safe but URL exposure can enable abuse |
| Using Supabase service role key in mobile app | Full admin access to database bypassing RLS; catastrophic if extracted | Never use service role key in any client app — use anon key + RLS only |
| Storing sensitive financial data in AsyncStorage unencrypted | Data readable on jailbroken devices | Use `expo-secure-store` for session tokens (Supabase handles this with AsyncStorage adapter, which is adequate for non-financial secrets); raw financial data lives in Supabase behind RLS, not in local storage |
| Disabling RLS on Supabase tables for debugging | All user data exposed to any authenticated user | Never disable RLS in production; use Supabase Studio with service role for local debugging only |
| Logging Supabase auth tokens or user PII in `console.log` | Tokens appear in Expo dev tools and crash reports | Strip all auth-related console.log calls before production build; use Sentry with PII scrubbing |
| Trusting client-side `user_id` in Supabase queries | RLS bypass if client sends wrong `user_id` | Never pass `user_id` as a query parameter — let RLS compute it from `auth.uid()` server-side |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Directly porting web navigation (tab + sidebar) to React Native | Native iOS users find web-style navigation unfamiliar; gestures do not work | Use React Navigation with bottom tabs (iOS pattern) + stack navigation; remove sidebar entirely |
| Using web HTML `<select>` patterns for currency/category pickers | No native picker on iOS; input feels like a web app | Use `@react-native-picker/picker` or a bottom sheet modal for selection inputs |
| No haptic feedback on key actions (add transaction, mark invoice paid) | App feels unresponsive compared to native iOS apps | Add `expo-haptics` calls on confirmation actions (`impactAsync(ImpactFeedbackStyle.Light)`) |
| Flash of incorrect RTL/LTR layout on Arabic app start | Arabic users see LTR flash before layout corrects | Initialize I18nManager before first render; use `expo-localization` config plugin with `supportsRTL: true` |
| Same loading spinner style as web app (CSS animation) | Web-style spinner looks out of place on iOS | Use `ActivityIndicator` from React Native; matches iOS native loading UX |
| Invoice PDF export opens in a new in-app WebView | User cannot share or save the PDF easily | Use `Sharing.shareAsync()` which opens iOS native share sheet — allows saving to Files, AirDrop, email |
| Form validation errors shown only on submit | Frustrating on mobile where keyboard hides context | Show inline validation errors per field as the user types or on field blur |

---

## App Store Compliance Pitfalls

### Pitfall AS-1: Finance App "Financial Institution" Requirement Does NOT Apply to Balance Tracker

**Assessment:** This is a known source of confusion. Apple Guideline 3.1.3(h) and 5.1.1(ix) state that apps offering "financial trading, investing, or money management" as a **service** must be submitted by a licensed financial institution. Balance Tracker is a **personal record-keeping tool** — users enter their own data manually, no external financial integrations, no bank connections, no trading. This category of app is submitted by individual developers routinely (see: Expense Tracker & Planner 2025, Income and Expense Tracker by Alexey Sakharov, Invoice Maker by Vijay Gangoni — all App Store-approved individual developer apps).

**Risk:** Low. **Action required:** App Store description must clearly frame the app as a "personal finance tracker" and "invoice organizer" — avoid terms like "money management service" or "financial platform."

---

### Pitfall AS-2: Missing or Incomplete Privacy Policy Causes Rejection

**What goes wrong:**
Apple requires every app that collects any user data to have a privacy policy URL entered in App Store Connect. The review team verifies the policy is accessible, covers what data is collected, why, how it is stored, and how users can request deletion. Missing the URL, providing a broken link, or submitting a boilerplate policy that doesn't cover the app's specific data collection causes rejection under Guideline 5.1.1(i).

Balance Tracker collects: email (via Supabase Auth), financial transaction data (income, expenses, debts, assets), client names and contact details, invoice data. All of this must be disclosed.

**How to avoid:**
Write a privacy policy before first submission that explicitly covers:
- Authentication data (email address) collected via Supabase Auth
- Financial data (transactions, invoices, client information) stored in Supabase
- No data sold to third parties
- How users can request account and data deletion
- Data retention period

Host the policy at a stable URL (a simple web page or GitHub Pages). Enter the URL in App Store Connect before submitting for review.

**Warning signs:**
- Privacy policy URL field in App Store Connect is blank at submission time
- Policy is a generic template not mentioning financial data or Supabase
- Policy does not include a data deletion / account deletion mechanism

**Phase to address:** Phase 6 (App Store submission) — but write the policy draft during Phase 5 so it can be reviewed before submission.

---

### Pitfall AS-3: No In-App Account Deletion Mechanism — Required Since June 2023

**What goes wrong:**
Apple has required since June 30, 2023 that all apps with account creation must also provide a way to delete the account from within the app. Apps submitted without this functionality are rejected under Guideline 5.1.1(v). The deletion must remove both the account and associated data (or clearly state what is retained and why).

**How to avoid:**
Add a "Delete Account" option in the app's Settings screen. The action should:
1. Confirm with the user (irreversible action)
2. Call Supabase to delete all user data (transactions, clients, invoices) — write a Supabase function or RPC for atomic deletion
3. Delete the Supabase Auth user account
4. Sign the user out and return to the login screen

This can reuse the existing Settings page structure from the web app but must be built as a native screen.

**Warning signs:**
- Settings screen has no "Delete Account" option at submission time
- App review notes ask for account deletion functionality

**Phase to address:** Phase 5 (Settings + account management port).

---

### Pitfall AS-4: App Crashes During Review — Causes Guideline 2.1 Rejection

**What goes wrong:**
Apple reviewers test on physical devices (typically recent iPhones running the latest iOS). If the app crashes or shows a blank screen during review, it is rejected under Guideline 2.1 (App Completeness). Common crash sources in Expo-built apps: missing URL polyfill (see Pitfall 1), unhandled Supabase realtime ws crash (see Pitfall 3), uncaught promise rejections in auth flows, and missing test account for reviewers.

**How to avoid:**
- Provide a test account (email + password) in the App Store Connect notes to reviewers
- Test the complete happy path on a real iPhone in release build before submission (not Expo Go, not simulator)
- Ensure all error boundaries are in place so uncaught errors show a user-facing message rather than a white screen
- Add `ErrorBoundary` wrappers around critical sections (dashboard, invoice list)

**Warning signs:**
- Reviewer notes mention "app crashes when attempting to [action]"
- Submission rejected with `Guideline 2.1 - Performance - App Completeness`
- App works in dev build but has an unresolved native crash in release mode

**Phase to address:** Phase 6 — pre-submission testing checklist must include release build on physical device.

---

### Pitfall AS-5: Incomplete or Misleading App Store Screenshots

**What goes wrong:**
App Store requires screenshots for each device class submitted (e.g., 6.7" iPhone, 5.5" iPhone). Screenshots must accurately represent the app's actual UI. Screenshots showing placeholder data, wrong language, or UI that does not match the current app version cause rejection. Finance apps are higher-scrutiny — reviewers compare screenshots to the actual app experience.

**How to avoid:**
Take screenshots on a real device or via the iOS Simulator using the "File > Export Screenshot" feature in Xcode. Use representative data (a realistic dashboard with multiple transaction types, an invoice with client details). Provide both English and Arabic screenshots if the app is marketed in Arabic-speaking regions.

**Warning signs:**
- Screenshots show "Loading..." states or empty data
- Screenshots do not include the iPhone 6.7" size class (required for App Store feature eligibility)

**Phase to address:** Phase 6 (App Store submission) — screenshots are taken after the app is feature-complete.

---

## "Looks Done But Isn't" Checklist

- [ ] **Supabase session persistence:** Verify `supabase.auth.getSession()` returns non-null after app cold restart — not just after sign-in in the current session
- [ ] **RTL layout:** Test every screen with Arabic locale selected on a physical device, not just toggling `isRTL` in code
- [ ] **PDF export:** Verify invoice PDF contains actual Arabic text (not blank/garbled) and logo image actually appears in the exported file
- [ ] **Offline behavior:** What happens when the user opens the app with no internet? Should show cached data or a graceful offline state — not a blank white screen or crash
- [ ] **Keyboard handling:** Test every form screen on an iPhone SE (smallest current screen) with the keyboard open — all inputs must be reachable
- [ ] **Account deletion:** Tap "Delete Account" and confirm — verify the user is signed out, data is gone from Supabase, and the auth account is deleted
- [ ] **Release build test:** Run `eas build --profile production --platform ios` and test the resulting `.ipa` on a physical device before submitting to App Store Connect — not just on Expo Go or dev build
- [ ] **Privacy policy URL:** Open the privacy policy URL in App Store Connect — verify it loads, is in English, and covers financial data collection
- [ ] **App Store screenshots:** Take fresh screenshots on a device with real data; verify they match the current app version
- [ ] **Test account for reviewers:** Include valid email/password in App Store Connect review notes — reviewers cannot test the app without an account

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Missing URL polyfill (Pitfall 1) | LOW | Add one import line; rebuild with EAS |
| Session not persisting (Pitfall 2) | LOW | Update Supabase client config; rebuild |
| ws module crash (Pitfall 3) | MEDIUM | Add metro.config.js aliases; test all Supabase features; rebuild |
| RTL requires restart (Pitfall 4) | MEDIUM | Redesign language-switch UX to show "restart required" message; no architectural change needed |
| @react-pdf/renderer used in RN (Pitfall 5) | HIGH | Rewrite entire PDF generation layer using expo-print; rebuild invoice HTML template |
| Local images in PDF (Pitfall 6) | LOW-MEDIUM | Convert images to base64 constants; update HTML template |
| Missing PrivacyInfo.xcprivacy (Pitfall 7) | LOW | Upgrade to Expo SDK 51+; rebuild and resubmit |
| Text not in `<Text>` component (Pitfall 8) | MEDIUM | Audit all ported components; systematic find-and-fix; requires full QA pass |
| ScrollView performance (Pitfall 9) | MEDIUM | Replace ScrollView with FlatList per screen; test after each replacement |
| Keyboard overlapping inputs (Pitfall 10) | LOW-MEDIUM | Wrap form screens with KeyboardAvoidingView + correct offset; test per screen |
| App Store rejected for missing account deletion | MEDIUM | Build deletion flow; resubmit; 2-3 day review cycle adds time |
| App Store rejected for crashes | HIGH | Diagnose crash, fix, rebuild with EAS, resubmit — each rejection adds 1-week review cycle |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| URL polyfill missing (P1) | Phase 1: Scaffold | `supabase.auth.signIn()` succeeds on device without error |
| No AsyncStorage session adapter (P2) | Phase 1: Auth | Kill app, reopen, confirm user still logged in |
| ws module crash (P3) | Phase 1: Scaffold | App starts without crash after Supabase import added |
| RTL direction requires restart (P4) | Phase 2: i18n | Language switch shows "restart required" message; Arabic layout correct after restart |
| @react-pdf/renderer unusable (P5) | Phase 1: PDF strategy | expo-print produces a PDF file on iOS device |
| Local images fail in expo-print (P6) | Phase 4: Invoice PDF | Invoice PDF contains visible logo image |
| Missing PrivacyInfo.xcprivacy (P7) | Phase 6: App Store prep | EAS build log contains no privacy manifest warnings |
| Text outside `<Text>` crashes (P8) | Phase 1: Scaffold | ESLint rule `react-native/no-raw-text` enabled; zero warnings on first screen |
| ScrollView performance (P9) | Phase 2: Simple mode | FlatList used for income, expense, debt, asset lists; scroll is smooth |
| Keyboard overlaps inputs (P10) | Phase 2: Simple mode forms | All form inputs reachable with keyboard open on iPhone SE |
| Missing privacy policy (AS-2) | Phase 6: App Store | Privacy policy URL loads and covers financial data |
| No account deletion (AS-3) | Phase 5: Settings | Delete Account flow removes user data and auth account |
| App crashes during review (AS-4) | Phase 6: Pre-submission | Release build runs complete happy path on physical iPhone without crash |

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Phase 1: Project scaffold | ws module crash on first Supabase import | Add metro.config.js aliases before any Supabase code runs |
| Phase 1: Auth | Session not persisting; offline session cleared | Full Supabase React Native config; AppState listeners |
| Phase 1: PDF strategy | Deciding to try @react-pdf/renderer first | Eliminate it immediately — it is browser-only; prototype expo-print on day 1 |
| Phase 2: Income/Expense lists | ScrollView performance with real data | FlatList from the start; no ScrollView for transaction lists |
| Phase 2: Forms | Keyboard overlap on iPhone SE | KeyboardAvoidingView with useHeaderHeight() on every form screen |
| Phase 2: i18n | RTL requires app restart — UX break vs web | Design language-switch UX to accommodate restart requirement upfront |
| Phase 3: Advanced mode navigation | Deep link to invoice screen doesn't work | Define all deep link paths in Expo Router config before testing |
| Phase 4: Invoice PDF | Arabic text garbled or blank in PDF | Test PDF with Arabic content on day 1 of PDF work; verify before building the full template |
| Phase 4: Invoice PDF | Invoice logo blank in PDF | Base64-encode all assets; no file:// or require() in HTML template |
| Phase 5: Settings | Missing account deletion | Build it in Settings phase — not a late addition; App Store requires it |
| Phase 6: Submission | App crashes during review | Run complete happy path in release build on physical device before submitting |
| Phase 6: Submission | App Store screenshots stale or misleading | Take fresh screenshots after all features complete |

---

## Sources

- Supabase React Native Auth Quickstart (official): https://supabase.com/docs/guides/auth/quickstarts/react-native
- Supabase Expo Quickstart (official): https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native
- Supabase JS ws module crash (GitHub issue #1400): https://github.com/supabase/supabase-js/issues/1400
- Supabase React Native gotchas (Prosperasoft): https://www.prosperasoft.com/blog/database/supabase/supabase-react-native-gotchas/
- Supabase session lost offline (GitHub discussion #36906): https://github.com/orgs/supabase/discussions/36906
- Expo from Web to Native (official Expo blog): https://expo.dev/blog/from-web-to-native-with-react
- Expo Print documentation (official): https://docs.expo.dev/versions/latest/sdk/print/
- Expo Localization guide (official): https://docs.expo.dev/guides/localization/
- Expo Keyboard Handling guide (official): https://docs.expo.dev/guides/keyboard-handling/
- React Native I18nManager docs (official): https://reactnative.dev/docs/i18nmanager
- RTL direction change requires restart (GitHub issue #48311): https://github.com/facebook/react-native/issues/48311
- RTL LTR issue in Expo (GitHub issue #35394): https://github.com/expo/expo/issues/35394
- Apple App Review Guidelines (official): https://developer.apple.com/app-store/review/guidelines/
- App Store Rejection Reasons 2025 (Mindster): https://mindster.com/mindster-blogs/app-store-rejection-reasons/
- Apple App Store Rejection Reasons 2025 (Twinr): https://twinr.dev/blogs/apple-app-store-rejection-reasons-2025/
- expo-print PDF pitfalls (APITemplate): https://apitemplate.io/blog/how-to-generate-pdfs-in-react-native-using-html-and-css/
- React Native FlatList vs ScrollView 2025 (Bilal Shafqat): https://bilalshafqat.com/react-native-flatlist-vs-scrollview/
- KeyboardAvoidingView iOS issues (GitHub #11244): https://github.com/react-navigation/react-navigation/issues/11244
- Supabase offline session loss (GitHub Discussion #36906 cross-reference): https://github.com/orgs/supabase/discussions/36906

---

*Pitfalls research for: React Native (Expo) iOS port — Balance Tracker v2.0*
*Researched: 2026-02-26*
