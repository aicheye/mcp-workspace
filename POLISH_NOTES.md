# Horizon App — Polish Notes (App Store Readiness Pass)

**Date:** 2026-03-10  
**Purpose:** Pre-app-store polish pass to fix TypeScript issues, dead code, UX issues, and store metadata.

---

## Changes Made

### 1. `src/services/auth.ts` — Added missing methods
Added `confirmSignUp(email, code)` and `resendConfirmationCode(email)` to the `AuthService` class. These are referenced by `VerifyEmailScreen.tsx` and were causing TypeScript compilation errors. Uses `supabase.auth.verifyOtp` and `supabase.auth.resend` respectively.

### 2. Deleted dead/stub screens
- `src/screens/D2LLoginScreen.tsx` — empty stub, not in navigator
- `src/screens/PiazzaLoginScreen.tsx` — empty stub, not in navigator
- `src/screens/ProfileScreen.tsx` — empty stub, not in navigator
- `src/screens/NotesUploadScreen.tsx` — old upload screen superseded by `UploadScreen.tsx`

### 3. Deleted unused navigation files
Confirmed `App.tsx` only imports `AppNavigator`. Deleted:
- `src/navigation/MainTabs.tsx` — old 6-tab nav
- `src/navigation/HomeStack.tsx` — referenced CoursesScreen, unused
- `src/navigation/DashboardStack.tsx` — double-wraps navigator, unused
- `src/navigation/AuthStack.tsx` — superseded by AppNavigator

### 4. `src/navigation/AppNavigator.tsx` — Header & tab label fixes
- Changed Dashboard tab label from `"Dashboard"` to `"Home"` (mobile convention)
- Set `headerShown: false` for Dashboard, Notes, Search, Settings (all have their own SafeAreaView + custom headers)
- Kept `headerShown: true` for Integrations (no custom header)
- This fixes the double header issue on Dashboard/Notes/Search/Settings

### 5. `app.json` — App store metadata
- `name`: `"study-mcp-app"` → `"Horizon"`
- `slug`: `"study-mcp-app"` → `"horizon"`
- `scheme`: `"study-mcp"` → `"horizon"`
- `ios.bundleIdentifier`: `"com.studymcp.app"` → `"ca.hamzaammar.horizon"`
- `android.package`: `"com.studymcp.app"` → `"ca.hamzaammar.horizon"`
- Added `ios.infoPlist` with required iOS privacy descriptions:
  - `NSPhotoLibraryUsageDescription`
  - `NSCameraUsageDescription`
  - `NSMicrophoneUsageDescription`

### 6. `src/screens/Auth/LoginScreen.tsx` — Branding + Forgot Password
- Changed title color from `#1e293b` (dark) to `#6366f1` (indigo) for brand identity
- Removed unused `authService` import
- Added `import { supabase } from '../../lib/supabase'`
- Added `handleForgotPassword` function using `supabase.auth.resetPasswordForEmail`
- Added "Forgot Password?" touchable link below Sign In button

### 7. `src/screens/Auth/SignUpScreen.tsx` — Branding
- Changed title color from `#1e293b` to `#6366f1` (matches Login screen)
- Removed unused `authService` import

### 8. `src/screens/SettingsScreen.tsx` — Icon fix
- Fixed invalid AntDesign icon name `"file-text"` → `"filetext1"`

### 9. `src/screens/DashboardScreen.tsx` — Remove prominent Logout button
- Removed the Logout button from the dashboard header (it's already in Settings)
- Removed `logout` from the `useAuth()` destructuring (no longer needed in this screen)
- Removed unused `logoutButton` and `logoutText` style definitions

---

## Files Changed
- `src/services/auth.ts`
- `src/navigation/AppNavigator.tsx`
- `src/screens/Auth/LoginScreen.tsx`
- `src/screens/Auth/SignUpScreen.tsx`
- `src/screens/SettingsScreen.tsx`
- `src/screens/DashboardScreen.tsx`
- `app.json`

## Files Deleted
- `src/screens/D2LLoginScreen.tsx`
- `src/screens/PiazzaLoginScreen.tsx`
- `src/screens/ProfileScreen.tsx`
- `src/screens/NotesUploadScreen.tsx`
- `src/navigation/MainTabs.tsx`
- `src/navigation/HomeStack.tsx`
- `src/navigation/DashboardStack.tsx`
- `src/navigation/AuthStack.tsx`

---

## Notes for Owner
- `VerifyEmailScreen.tsx` is kept — it's a valid email verification flow that now has proper backing methods
- `SearchScreen.tsx` is kept as a dedicated search tab — the tab order is Dashboard/Notes/Search/Sync/Settings
- The bundle identifiers (`ca.hamzaammar.horizon`) need to be registered in App Store Connect and Google Play Console before submission
- All asset paths in app.json are valid (icon.png, splash-icon.png, adaptive-icon.png, favicon.png all exist in `assets/`)
