---
phase: 12-app-store-compliance-submission
plan: "01"
subsystem: app-store-compliance
tags: [account-deletion, privacy-policy, deep-link, password-reset, apple-guidelines]
dependency_graph:
  requires: []
  provides: [STORE-01, STORE-02, delete_user_data RPC, privacy-policy screen, reset-password deep link]
  affects: [settings.tsx, AuthContext.tsx]
tech_stack:
  added: []
  patterns: [Supabase RPC SECURITY DEFINER, Expo Router deep link, onAuthStateChange PASSWORD_RECOVERY]
key_files:
  created:
    - supabase/migrations/20260226_delete_user_data.sql
    - BalanceTracker/app/privacy-policy.tsx
    - BalanceTracker/app/(auth)/reset-password.tsx
  modified:
    - BalanceTracker/app/(tabs)/settings.tsx
    - BalanceTracker/src/contexts/AuthContext.tsx
    - BalanceTracker/src/i18n/resources.ts
    - BalanceTracker/src/integrations/supabase/types.ts
decisions:
  - "delete_user_data RPC uses SECURITY DEFINER + search_path = public, auth so it can DELETE from auth.users without granting users direct auth schema access"
  - "recent_activity deletion wrapped in DO $$ IF EXISTS $$ — table is optional across migrations and may not exist in all environments"
  - "reset-password screen uses 3-second timeout guard: if no PASSWORD_RECOVERY event fires the user is redirected to sign-in (prevents direct URL navigation exploiting the form)"
  - "delete_user_data added to Supabase types.ts Functions with Args: Record<string, never> so supabase.rpc() call is fully typed without requiring a DB re-introspection"
metrics:
  duration: "~5 minutes"
  completed: "2026-02-26"
  tasks: 3
  files: 7
---

# Phase 12 Plan 01: App Store Compliance (Account Deletion, Privacy Policy, Password Reset) Summary

Apple App Store compliance features: in-app account deletion (Guideline 5.1.1), privacy policy screen, and password-reset deep link with dedicated screen.

## What Was Built

### Task 1 — Supabase RPC + Delete Account in Settings (commit: f411a21)

**`supabase/migrations/20260226_delete_user_data.sql`**
- SECURITY DEFINER function `delete_user_data()` that atomically deletes all user data:
  invoice_items → invoices → clients → incomes → expenses → debts → assets → user_settings → recent_activity (optional) → auth.users
- search_path = public, auth enables the DELETE FROM auth.users call
- GRANT EXECUTE ON FUNCTION to authenticated role

**`BalanceTracker/app/(tabs)/settings.tsx`** (updated)
- Added `isDeleting` state and `handleDeleteAccount` handler
- Delete Account button in a new "Danger Zone" SettingsCard section (red icon, ActivityIndicator while deleting)
- Alert.alert confirmation dialog with i18n keys (Cancel + destructive Delete button)
- On confirm: haptics.onDelete() → supabase.rpc('delete_user_data') → supabase.auth.signOut() → router.replace('/(auth)/sign-in')
- Privacy Policy navigation row added to Account section

**`BalanceTracker/src/i18n/resources.ts`** (updated)
- EN + AR keys: settings.deleteAccount.{title, confirm, button, deleting}, settings.privacyPolicy, privacyPolicy.title, auth.{newPassword, confirmPassword, updatePassword, passwordMismatch, passwordUpdated}

**`BalanceTracker/src/integrations/supabase/types.ts`** (updated)
- Added `delete_user_data: { Args: Record<string, never>; Returns: undefined }` to Functions

### Task 2 — Privacy Policy Screen (commit: 8050d38)

**`BalanceTracker/app/privacy-policy.tsx`** (created)
- SafeScreen wrapper with custom back button header row (chevron.left + "Back" tap = router.back())
- ScrollView with 5 policy sections as PolicySection components:
  1. Information We Collect
  2. How We Use Your Information
  3. Data Storage and Security
  4. Data Deletion
  5. Contact (privacy@balancetracker.app)
- NativeWind dark mode aware (dark:text-white / dark:text-gray-300)
- Route auto-registered by Expo Router at /privacy-policy — no manual registration needed

### Task 3 — Password Reset Deep Link (commit: 649ed8d)

**`BalanceTracker/src/contexts/AuthContext.tsx`** (updated)
- resetPasswordForEmail now includes `redirectTo: 'balancetracker://reset-password'`
- Removed Phase 12 placeholder comment

**`BalanceTracker/app/(auth)/reset-password.tsx`** (created)
- Subscribes to supabase.auth.onAuthStateChange; sets isRecoverySession=true on PASSWORD_RECOVERY event
- 3-second guard timeout: if no PASSWORD_RECOVERY fires, redirects to sign-in (prevents direct navigation)
- Loading spinner while waiting for recovery event
- Form: New Password + Confirm Password (secureTextEntry) + Update Password button
- Validation: passwords must match, minimum 6 characters (inline error display)
- On success: supabase.auth.updateUser → supabase.auth.signOut → Alert → router.replace('/(auth)/sign-in')
- On error: Alert.alert with error message
- All labels use i18n keys (auth.newPassword, auth.confirmPassword, auth.updatePassword)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Type] Added delete_user_data to Supabase types.ts Functions**
- **Found during:** Task 1
- **Issue:** TypeScript rejected `supabase.rpc('delete_user_data')` with TS2345 because the function was not in the Database.Functions type definition
- **Fix:** Added `delete_user_data: { Args: Record<string, never>; Returns: undefined }` to the Functions block in types.ts
- **Files modified:** BalanceTracker/src/integrations/supabase/types.ts
- **Commit:** f411a21 (included in Task 1 commit)

## Self-Check: PASSED

All created files verified present on disk. All task commits verified in git log.

| Check | Result |
|-------|--------|
| supabase/migrations/20260226_delete_user_data.sql | FOUND |
| BalanceTracker/app/privacy-policy.tsx | FOUND |
| BalanceTracker/app/(auth)/reset-password.tsx | FOUND |
| .planning/phases/12-app-store-compliance-submission/12-01-SUMMARY.md | FOUND |
| commit f411a21 (Task 1) | FOUND |
| commit 8050d38 (Task 2) | FOUND |
| commit 649ed8d (Task 3) | FOUND |
