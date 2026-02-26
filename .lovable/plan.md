

## Multi-Feature Update Plan

This plan covers 5 areas: RTL sidebar fix, RTL toggle fix, Google sign-in, password reset, and edit profile section.

---

### 1. Fix Sidebar in Arabic (RTL) Mode

**Problem**: The sidebar uses `-translate-x-full` for hiding on mobile, but in RTL mode it should slide from the right side. The collapse/expand chevrons are also inverted.

**Changes**:
- **`src/components/layout/Sidebar.tsx`**: Add RTL-aware classes using `rtl:` Tailwind variants. In RTL, the sidebar should be on the right (`rtl:right-0 rtl:left-auto`), and the mobile hide should use `rtl:translate-x-full` instead of `-translate-x-full`. Swap `ChevronLeft`/`ChevronRight` icons in RTL. Update the overlay dismiss direction.
- **`src/components/layout/AppLayout.tsx`**: No changes needed since sidebar positioning is self-contained.

### 2. Fix Toggle Switches in Arabic (RTL) Mode

**Problem**: The Switch component's thumb uses `translate-x-5` for checked state, which moves left-to-right. In RTL, this direction is visually correct because `transform` is not affected by `direction`, so the actual issue is likely the `space-x-2` gap between switch and label being wrong in RTL.

**Changes**:
- **`src/pages/Settings.tsx`**: Replace `space-x-2` with `gap-2` and use `flex-row` (or `rtl:space-x-reverse`) on all switch + label rows so spacing works in both LTR and RTL.
- Alternatively, use `gap-2` on flex containers instead of `space-x-2` throughout the settings page, which is direction-agnostic.

### 3. Add Google Sign-In / Sign-Up

**Changes**:
- Use the **Configure Social Login** tool to set up Google OAuth via Lovable Cloud (managed credentials, no user setup needed).
- **`src/pages/SignIn.tsx`**: Add a "Sign in with Google" button that calls `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })`. Add a divider ("or") between the Google button and the email/password form.
- **`src/pages/SignUp.tsx`**: Add the same "Sign up with Google" button with the same OAuth call.

### 4. Add Password Reset

Two flows: from the auth page (unauthenticated) and from Settings (authenticated).

**New files**:
- **`src/pages/ForgotPassword.tsx`**: A page with an email input. Calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' })`. Shows success message.
- **`src/pages/ResetPassword.tsx`**: Checks for `type=recovery` in URL hash. Shows a form to enter new password + confirmation. Calls `supabase.auth.updateUser({ password })`.

**Modified files**:
- **`src/pages/SignIn.tsx`**: Add a "Forgot password?" link below the password field, linking to `/forgot-password`.
- **`src/pages/Settings.tsx`**: Add a new "Security" card section with a "Change Password" button. On click, shows inline fields for new password + confirm, then calls `supabase.auth.updateUser({ password })`.
- **`src/App.tsx`**: Add routes for `/forgot-password` and `/reset-password` (public, not behind ProtectedRoute).
- **`src/i18n/index.ts`**: Add translation keys for both EN and AR for all new password reset UI text.

### 5. Add Edit Profile Section in Settings

**Changes**:
- **`src/pages/Settings.tsx`**: Add a new "Profile" card at the top of settings with:
  - Display name field (editable, pre-filled from `user.name`)
  - Email field (read-only, shown for reference)
  - "Save" button that updates the `profiles` table name via Supabase and also calls `supabase.auth.updateUser({ data: { name } })` to keep metadata in sync.
- **`src/i18n/index.ts`**: Add translation keys for profile section (EN + AR).
- **`src/contexts/AuthContext.tsx`**: After profile name update, refresh the user state so the navbar reflects the new name.

### 6. Fix Build Errors

- **`supabase/functions/metal-prices/index.ts`**: Cast `err` to `Error` type: `(err as Error).message`.
- **`src/components/ProtectedRoute.test.tsx`**: Fix the import -- either remove `screen` from the import or add `@testing-library/react` types.

---

### Technical Summary

| Area | Files Changed |
|------|--------------|
| RTL Sidebar | `Sidebar.tsx` |
| RTL Toggles | `Settings.tsx` (space-x to gap) |
| Google OAuth | `SignIn.tsx`, `SignUp.tsx` + configure social login tool |
| Password Reset | New: `ForgotPassword.tsx`, `ResetPassword.tsx`; Modified: `SignIn.tsx`, `Settings.tsx`, `App.tsx`, `i18n/index.ts` |
| Edit Profile | `Settings.tsx`, `i18n/index.ts`, `AuthContext.tsx` |
| Build fixes | `metal-prices/index.ts`, `ProtectedRoute.test.tsx` |

