# Phase 9: Simple Mode Screens - Research

**Researched:** 2026-02-26
**Domain:** React Native / Expo SDK 54 — CRUD screens with FlatList, swipe-to-delete, pull-to-refresh, formSheet modals, inline status toggle
**Confidence:** HIGH (core RN patterns) / MEDIUM (library compatibility on Expo SDK 54 + Reanimated v4)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TXN-01 | User can add income entry with amount, description, category, date, currency | formSheet modal pattern via Expo Router; existing `useAddIncome` hook ready |
| TXN-02 | User can add expense entry with same fields | Same pattern as TXN-01; existing `useAddExpense` hook ready |
| TXN-03 | User can edit income and expense entries | Reuse add-form sheet with pre-filled values; `useUpdateIncome` / `useUpdateExpense` ready |
| TXN-04 | User can delete income/expense via swipe-to-delete | `ReanimatedSwipeable` from `react-native-gesture-handler/ReanimatedSwipeable`; `useDeleteIncome` / `useDeleteExpense` ready |
| TXN-05 | User can pull-to-refresh transaction lists | Native `RefreshControl` prop on `FlatList`; invalidate TanStack Query key on refresh |
| TXN-06 | User can change income status inline via toggle | `Pressable` toggle chip calling `useUpdateIncome` with only `status` changed |
| TXN-07 | User can change expense status inline via toggle | Same pattern as TXN-06; `useUpdateExpense` ready |
| TXN-08 | Income categories include "debt" as an option | Add "debt" to `income.form.category.*` i18n keys and Picker options |
| DEBT-01 | User can add, edit, delete debts with payment tracking | formSheet add/edit; payment action sheet; `useAddDebt` / `useUpdateDebt` (handles history) / `useDeleteDebt` ready |
| DEBT-02 | User can view debt payment history | Expand row or push detail screen; `debt_amount_history` already fetched via `select('*, debt_amount_history(*)')` |
| DEBT-03 | User can swipe-to-delete debts | `ReanimatedSwipeable` + `useDeleteDebt` |
| DEBT-04 | User can pull-to-refresh debt list | Native `RefreshControl` + query invalidation |
| ASST-01 | User can add, edit, delete assets | formSheet add/edit; `useAddAsset` / `useUpdateAsset` / `useDeleteAsset` ready |
| ASST-02 | Asset prices auto-update via exchange rates / metal prices | `useAssetPrices` hook already implemented (CoinGecko + Supabase Edge Function) |
| ASST-03 | User can swipe-to-delete assets | `ReanimatedSwipeable` + `useDeleteAsset` |
| ASST-04 | User can pull-to-refresh asset list | Native `RefreshControl` + query invalidation |
</phase_requirements>

---

## Summary

Phase 9 builds four full-CRUD list screens (Income, Expense, Debt, Asset) as the core financial tracking value proposition of the iOS app. All data hooks are already ported from the web app in Phase 7 (`useIncomes`, `useExpenses`, `useDebts`, `useAssets`, `useAddIncome`, `useUpdateIncome`, `useDeleteIncome`, and equivalents for all entities). Phase 9 is purely a UI-composition phase — each screen wires an existing hook into a FlatList with standard iOS interaction patterns.

The three native interaction patterns to implement are: (1) swipe-to-delete via `ReanimatedSwipeable` from `react-native-gesture-handler`, (2) pull-to-refresh via `RefreshControl` built into React Native core, and (3) add/edit forms as `formSheet` modals via Expo Router's native stack presenter. These three patterns share a single implementation template that repeats across all four screens.

There is one confirmed compatibility concern: `@gorhom/bottom-sheet` v5 has known issues with Expo SDK 54 + Reanimated v4 (crash on open/close). The preferred approach is to use **Expo Router's native `formSheet` presentation** instead, which is a zero-dependency solution using the native iOS sheet API and avoids the compatibility landmine entirely. The `ReanimatedSwipeable` crash issue (#3720) was marked CLOSED/COMPLETED on 2025-10-29, meaning it should be resolved in the current gesture-handler version (2.28.0 / 2.30.0).

**Primary recommendation:** Wire all four screens using the `FlatList + ReanimatedSwipeable + RefreshControl + formSheet (Expo Router)` pattern. Do not introduce `@gorhom/bottom-sheet`. All data hooks already exist — this phase is 90% layout work.

---

## Standard Stack

### Core (already installed — no new installs needed for main patterns)

| Library | Version in Project | Purpose | Why Standard |
|---------|-------------------|---------|--------------|
| `react-native-gesture-handler` | ~2.28.0 (installed) | `ReanimatedSwipeable` for swipe-to-delete | Ships with Expo SDK 54; required for gesture-driven interactions |
| `react-native-reanimated` | ~4.1.1 (installed) | Animation engine for swipeable; also used in transitions | Ships with Expo SDK 54 |
| `expo-router` | ~6.0.23 (installed) | `formSheet` modal presentation for add/edit forms | Zero extra deps; uses native iOS sheet API |
| `expo-haptics` | ~15.0.8 (installed) | Haptic feedback on save, delete, toggle actions | Already abstracted in `src/lib/haptics.ts` |
| `@tanstack/react-query` | ^5.90.21 (installed) | Data fetching, mutation, cache invalidation | Already in place; pull-to-refresh triggers `refetch()` |
| `react-native` (core) | 0.81.4 (installed) | `FlatList`, `RefreshControl`, `Pressable`, `TextInput` | Built-in; no install required |

### Supporting (new installs required)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@react-native-community/datetimepicker` | latest compatible (SDK 54) | Native iOS date picker for date fields on income/expense/debt forms | Date input fields in add/edit forms |
| `@react-native-picker/picker` | latest compatible (SDK 54) | Native iOS wheel picker for category and currency dropdowns | Category/currency select in forms |
| `react-native-modal-datetime-picker` | latest compatible | Wraps datetimepicker in a modal for cleaner UX | Optional: if inline datepicker UX is insufficient |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Expo Router `formSheet` | `@gorhom/bottom-sheet` v5 | gorhom/bottom-sheet has confirmed crash bugs with Expo SDK 54 + Reanimated v4 (#2471, #2528); formSheet is native, dependency-free, and stable |
| `ReanimatedSwipeable` | `react-native-swipeable-item` | Third-party extra dep; ReanimatedSwipeable is built into installed gesture-handler |
| `@react-native-picker/picker` | `react-native-dropdown-picker` | dropdown-picker is third-party; @react-native-picker/picker is Expo-supported and native |
| `RefreshControl` (built-in) | Any custom pull-to-refresh library | Built-in covers 100% of the use case; zero reasons to use a third-party |

**Installation (new deps only):**
```bash
npx expo install @react-native-community/datetimepicker @react-native-picker/picker
```

---

## Architecture Patterns

### Recommended Screen Structure

```
BalanceTracker/
└── app/
    └── (tabs)/
        ├── transactions/
        │   ├── _layout.tsx          # Stack layout with formSheet screen defined
        │   ├── index.tsx            # Income list (FlatList + swipe + pull-to-refresh + status toggle)
        │   ├── expenses.tsx         # Expense list (same pattern)
        │   ├── add-income.tsx       # Add/edit income form (formSheet)
        │   └── add-expense.tsx      # Add/edit expense form (formSheet)
        ├── debts/
        │   ├── _layout.tsx          # Stack layout with formSheet + detail screen
        │   ├── index.tsx            # Debt list (FlatList + swipe + pull-to-refresh)
        │   ├── add-debt.tsx         # Add/edit debt form (formSheet)
        │   ├── payment.tsx          # Make payment form (formSheet)
        │   └── [id].tsx             # Debt detail / payment history
        └── assets/
            ├── _layout.tsx          # Stack layout with formSheet screen
            ├── index.tsx            # Asset list with auto-price update
            └── add-asset.tsx        # Add/edit asset form (formSheet)
```

### Pattern 1: FlatList with Swipe-to-Delete Row

**What:** Each list row is wrapped in `ReanimatedSwipeable`. Swiping left reveals a red Delete button. On press, `haptics.onDelete()` fires, then the mutation is called.

**When to use:** All four list screens (income, expenses, debts, assets).

```typescript
// Source: https://docs.swmansion.com/react-native-gesture-handler/docs/components/reanimated_swipeable/
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, { useAnimatedStyle } from 'react-native-reanimated';
import { haptics } from '@/lib/haptics';

function DeleteAction(prog: SharedValue<number>, drag: SharedValue<number>, onDelete: () => void) {
  const styleAnimation = useAnimatedStyle(() => ({
    transform: [{ translateX: drag.value + 80 }],
  }));

  return (
    <Reanimated.View style={styleAnimation}>
      <Pressable
        onPress={() => {
          haptics.onDelete();
          onDelete();
        }}
        className="bg-red-500 w-20 h-full items-center justify-center"
      >
        <Text className="text-white font-semibold">Delete</Text>
      </Pressable>
    </Reanimated.View>
  );
}

function IncomeRow({ item, onDelete }: { item: Income; onDelete: () => void }) {
  return (
    <Swipeable
      friction={2}
      rightThreshold={40}
      renderRightActions={(prog, drag) => DeleteAction(prog, drag, onDelete)}
    >
      {/* Row content */}
    </Swipeable>
  );
}
```

### Pattern 2: FlatList with Pull-to-Refresh

**What:** `RefreshControl` component passed as `refreshControl` prop to `FlatList`. On pull, call `refetch()` from the React Query hook.

**When to use:** All four list screens.

```typescript
// Source: https://reactnative.dev/docs/refreshcontrol
import { FlatList, RefreshControl } from 'react-native';

function IncomeList() {
  const { data, isLoading, refetch, isRefetching } = useIncomes();

  return (
    <FlatList
      data={data}
      renderItem={({ item }) => <IncomeRow item={item} />}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
        />
      }
      ListEmptyComponent={
        !isLoading ? (
          <EmptyState
            title="No Income Yet"
            message="Start tracking your income to see it here."
            ctaLabel="Add Income"
            onCta={() => router.push('/(tabs)/transactions/add-income')}
          />
        ) : null
      }
    />
  );
}
```

### Pattern 3: formSheet Modal for Add/Edit Forms

**What:** Add/edit forms live as separate Expo Router screens presented via `formSheet`. The parent layout defines the sheet options. The form screen calls `router.back()` after success.

**When to use:** Add income, add expense, add debt, add asset, edit any entity, make payment on debt.

```typescript
// Source: https://docs.expo.dev/router/advanced/modals/

// In _layout.tsx (parent Stack)
<Stack>
  <Stack.Screen name="index" options={{ headerShown: false }} />
  <Stack.Screen
    name="add-income"
    options={{
      presentation: 'formSheet',
      sheetAllowedDetents: [0.75, 1],
      sheetInitialDetentIndex: 0,
      sheetGrabberVisible: true,
      sheetCornerRadius: 16,
      title: 'Add Income',
    }}
  />
</Stack>

// In add-income.tsx
import { router, useLocalSearchParams } from 'expo-router';
import { useAddIncome, useUpdateIncome } from '@/hooks/useIncomes';

export default function AddIncomeScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;
  const addIncome = useAddIncome();
  const updateIncome = useUpdateIncome();

  async function handleSubmit(values: IncomeFormValues) {
    if (isEditing) {
      await updateIncome.mutateAsync({ id, ...values });
    } else {
      await addIncome.mutateAsync(values);
    }
    haptics.onSave();
    router.back();
  }

  return (
    <FormScreen>
      {/* Form fields */}
    </FormScreen>
  );
}
```

### Pattern 4: Inline Status Toggle

**What:** A `Pressable` chip on each list row shows the current status (e.g., "Expected" / "Received"). Tapping it calls the update mutation with only the flipped status. No form opened.

**When to use:** Income status (expected/received), Expense status (pending/paid).

```typescript
// Inline in the row component
function StatusBadge({ item }: { item: Income }) {
  const updateIncome = useUpdateIncome();

  function handleToggle() {
    haptics.onToggle();
    updateIncome.mutate({
      id: item.id,
      title: item.title,
      date: item.date,
      status: item.status === 'expected' ? 'received' : 'expected',
      currency: item.currency,
      category: item.category,
      amount: item.amount,
    });
  }

  const isReceived = item.status === 'received';
  return (
    <Pressable
      onPress={handleToggle}
      className={`px-3 py-1 rounded-full ${isReceived ? 'bg-green-100 dark:bg-green-900' : 'bg-yellow-100 dark:bg-yellow-900'}`}
    >
      <Text className={`text-xs font-medium ${isReceived ? 'text-green-700 dark:text-green-200' : 'text-yellow-700 dark:text-yellow-200'}`}>
        {isReceived ? 'Received' : 'Expected'}
      </Text>
    </Pressable>
  );
}
```

### Pattern 5: Debt Payment History View

**What:** Debt rows can be expanded or navigated to a detail screen. The `debt_amount_history` array is already fetched in the `useDebts` hook via `select('*, debt_amount_history(*)')`. Render it as a flat list of payment entries sorted by `logged_at`.

**When to use:** DEBT-02 requirement.

**Options:**
- **Expandable row:** Tap row to expand inline history (simpler, no navigation)
- **Push detail screen:** Tap row pushes `debts/[id].tsx` showing history (cleaner separation)

Recommendation: Use the **push detail screen** approach (`debts/[id].tsx`) — it follows iOS navigation conventions and reuses the `SafeScreen` wrapper.

### Anti-Patterns to Avoid

- **Using `@gorhom/bottom-sheet`:** Confirmed crash bugs on Expo SDK 54 + Reanimated v4. Use Expo Router `formSheet` instead.
- **Wrapping FlatList in ScrollView:** Causes "VirtualizedLists should never be nested" warning and defeats virtualization.
- **Calling `refetch()` inside `onSwipeableOpen`:** Race condition — call mutation, let `onSuccess` invalidate the query, which auto-triggers re-render.
- **Using `Alert.alert` for delete confirmation:** Acceptable but adds an extra tap. Swipe-to-reveal-then-tap-delete (without alert) matches iOS Mail and Reminders patterns; prefer this UX.
- **Using `useEffect` to sync form values from props:** Use `useLocalSearchParams` to pass the entity ID, then fetch directly in the form screen with `useQuery`. Avoids stale closure bugs.
- **Hand-rolling date formatting:** Use `date-fns` (already a transitive dep via `src/lib/debt.ts`) for all date formatting.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Swipeable delete gesture | Custom `PanResponder` + animated delete button | `ReanimatedSwipeable` from `react-native-gesture-handler` | Edge cases: velocity thresholds, simultaneous gestures, scroll conflict, RTL |
| Pull-to-refresh indicator | Custom animated header component | `RefreshControl` (React Native core) | Native iOS spinner behavior; respects system themes |
| Bottom sheet for forms | Custom `Modal` + `Animated.Value` sliding panel | Expo Router `formSheet` presentation | Native iOS sheet physics, drag-to-dismiss, keyboard handling |
| Date picker | Custom calendar/date wheel component | `@react-native-community/datetimepicker` | Native iOS date picker UI; follows HIG, no custom styling needed |
| Category/currency dropdown | Custom dropdown overlay | `@react-native-picker/picker` | Native iOS wheel picker; included in Expo Go |
| Currency amount formatting | Manual `toFixed(2)` + string concat | `useCurrency().formatCurrency()` from existing `CurrencyContext` | Already handles locale, exchange rate, USD/TRY |

**Key insight:** The entire data layer (hooks, types, mutation logic, history tracking) is already implemented in Phase 7. Phase 9 is purely UI composition — do not re-implement data logic.

---

## Common Pitfalls

### Pitfall 1: ReanimatedSwipeable + FlatList Scroll Conflict
**What goes wrong:** Swipeable intercepts vertical scroll events, making the FlatList hard to scroll.
**Why it happens:** `GestureHandlerRootView` and FlatList compete for touch events when `Swipeable` doesn't know to pass vertical scroll through.
**How to avoid:** Set `friction={2}` on `Swipeable`. Do NOT nest `FlatList` inside `ScrollView`. Ensure `GestureHandlerRootView` wraps the entire root layout (done in Phase 8).
**Warning signs:** Scrolling feels "sticky" or swipe triggers unintentionally on vertical scroll.

### Pitfall 2: formSheet Not Resizing with Keyboard
**What goes wrong:** Keyboard covers form fields in formSheet modal.
**Why it happens:** On Android, `sheetAllowedDetents: 'fitToContents'` doesn't resize when keyboard opens (open bug in react-native-screens #3181). On iOS it works correctly.
**How to avoid:** For iOS (this app is iOS-only), use `sheetAllowedDetents: [0.75, 1]` with `sheetInitialDetentIndex: 0`. Wrap form content in `FormScreen` (already built — `KeyboardAvoidingView + ScrollView`).
**Warning signs:** Bottom fields hidden behind keyboard on form open.

### Pitfall 3: `useUpdateIncome` Mutation Requires All Fields
**What goes wrong:** Calling `useUpdateIncome` for inline status toggle but forgetting to pass all required fields (title, date, currency, category, amount) causes a partial update with undefined values.
**Why it happens:** The Supabase `update` call overwrites only the passed fields, but TypeScript `UpdateIncomePayload` requires all fields.
**How to avoid:** In the status toggle handler, spread the full `item` object: `updateIncome.mutate({ id: item.id, title: item.title, date: item.date, currency: item.currency, category: item.category, amount: item.amount, status: newStatus })`.
**Warning signs:** TypeScript error on `mutate` call, or fields becoming `undefined` in the database.

### Pitfall 4: Debt Payment Creates History Entry on Every Edit
**What goes wrong:** Every call to `useUpdateDebt` inserts a new `debt_amount_history` row. If the user edits only the title without changing the amount, a spurious history entry is created.
**Why it happens:** The `updateDebt` function in `useDebts.ts` always calls `supabase.from('debt_amount_history').insert(...)` after the update.
**How to avoid:** In the debt edit form, only call `useUpdateDebt` with `note: 'Updated'` for non-payment edits. For payment actions, use a separate payment form that sets `note: 'Payment'` and `payment_date`. This matches the existing web app pattern.
**Warning signs:** Debt history shows duplicate entries with the same amount after editing without changing the amount.

### Pitfall 5: `@gorhom/bottom-sheet` TypeError on SDK 54
**What goes wrong:** App crashes with `"Cannot read property 'level' of undefined"` when bottom sheet is opened.
**Why it happens:** `@gorhom/bottom-sheet` v5 has dependency conflict with Reanimated v4 on Expo SDK 54.
**How to avoid:** Do not install `@gorhom/bottom-sheet`. Use Expo Router `formSheet` presentation instead.
**Warning signs:** The error appears immediately on first bottom sheet open attempt.

### Pitfall 6: TXN-08 — Income "debt" Category Not in i18n Resources
**What goes wrong:** `income.form.category.debt` key is missing from `src/i18n/resources.ts`. Picker renders untranslated key string.
**Why it happens:** Web app may not have included "debt" as an income category in the translation files.
**How to avoid:** Add `"income.form.category.debt": "Debt"` (and Arabic equivalent) to `resources.ts` as part of this phase.
**Warning signs:** Category dropdown shows raw key string `income.form.category.debt` in UI.

### Pitfall 7: Asset Price Auto-Update Displays Stale Warning
**What goes wrong:** `useAssetPrices` shows stale warning banner on first render before prices load.
**Why it happens:** `isStale: true` is the initial value in `useAssetPrices` because `dataUpdatedAt` is 0 on mount.
**How to avoid:** Only show stale/warning UI after `loading === false && snapshot !== null`. Hide the warning if `loading === true`.
**Warning signs:** Warning banner flashes on every app open before prices load.

---

## Code Examples

### FlatList List Screen Shell (Income example)

```typescript
// Source: React Native core docs + project patterns
import { FlatList, RefreshControl, View } from 'react-native';
import { SafeScreen } from '@/components/layout/SafeScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { useIncomes } from '@/hooks/useIncomes';
import { useRouter } from 'expo-router';
import IncomeRow from './IncomeRow';

export default function IncomeScreen() {
  const { data, isLoading, isRefetching, refetch } = useIncomes();
  const router = useRouter();

  return (
    <SafeScreen edges={['bottom']}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <IncomeRow item={item} />}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        contentContainerStyle={data?.length === 0 ? { flex: 1 } : undefined}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              title="No Income Yet"
              message="Start tracking your income to see it here."
              ctaLabel="Add Income"
              onCta={() => router.push('/(tabs)/transactions/add-income')}
            />
          ) : null
        }
      />
    </SafeScreen>
  );
}
```

### Date Picker Field

```typescript
// Source: https://docs.expo.dev/versions/latest/sdk/date-time-picker/
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';

function DateField({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const [show, setShow] = useState(false);

  return (
    <>
      <Pressable onPress={() => setShow(true)} className="border border-gray-300 rounded-xl px-4 py-3">
        <Text>{value.toLocaleDateString()}</Text>
      </Pressable>
      {show && (
        <DateTimePicker
          mode="date"
          value={value}
          onChange={(_, selectedDate) => {
            setShow(false);
            if (selectedDate) onChange(selectedDate);
          }}
          display="spinner"
        />
      )}
    </>
  );
}
```

### Picker Field (Category / Currency)

```typescript
// Source: https://docs.expo.dev/versions/latest/sdk/picker/
import { Picker } from '@react-native-picker/picker';

function CategoryField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Picker selectedValue={value} onValueChange={onChange} style={{ height: 200 }}>
      <Picker.Item label="Freelance" value="freelance" />
      <Picker.Item label="Commission" value="commission" />
      <Picker.Item label="Rent" value="rent" />
      <Picker.Item label="Debt" value="debt" />   {/* TXN-08 */}
      <Picker.Item label="Other" value="other" />
    </Picker>
  );
}
```

### Asset Price Display with Auto-Update

```typescript
// Source: project src/hooks/useAssetPrices.ts
import { useAssetPrices } from '@/hooks/useAssetPrices';

function AssetRow({ asset }: { asset: Asset }) {
  const { prices, loading, snapshot } = useAssetPrices();
  const livePrice = prices[asset.type.toLowerCase() as keyof typeof prices];
  const totalValue = livePrice ? asset.quantity * livePrice : asset.quantity * asset.price_per_unit;

  return (
    <View>
      <Text>{asset.type} — {asset.quantity} {asset.unit}</Text>
      <Text>{loading ? '...' : formatCurrency(totalValue, asset.currency)}</Text>
      {snapshot?.warning && !loading && (
        <Text className="text-xs text-yellow-600">{snapshot.warning}</Text>
      )}
    </View>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@gorhom/bottom-sheet` for all modals | Expo Router `formSheet` presentation | Expo Router v3+ (SDK 50+) | No extra deps; native iOS sheet physics out of the box |
| `Swipeable` (old gesture handler) | `ReanimatedSwipeable` (Reanimated-powered) | gesture-handler v2 | Runs on UI thread; no JS bridge stutter |
| `TouchableOpacity` for all tappables | `Pressable` (modern, supports `android_ripple`) | RN 0.64+ | More flexible; ripple on Android; opacity on iOS |
| Manual `Alert.alert` delete confirmation | Swipe → reveal Delete button → tap | iOS HIG standard | Matches iOS Mail, Calendar — one fewer step |
| Web: `@react-pdf/renderer` for forms | Expo Router `formSheet` + `KeyboardAvoidingView` | v2.0 iOS port | Native form UX, avoids web-only PDF library |

**Deprecated/outdated:**
- `Swipeable` (non-Reanimated): Deprecated in favor of `ReanimatedSwipeable` — runs on JS thread, causes jank on heavy lists
- `DatePickerIOS`: Removed from React Native core — use `@react-native-community/datetimepicker`
- `TouchableNativeFeedback` / `TouchableHighlight`: Use `Pressable` instead

---

## Open Questions

1. **Expo SDK version: project shows SDK 54 in package.json but summary shows SDK 55**
   - What we know: `package.json` has `"expo": "~54.0.0"`, but `07-01-SUMMARY.md` says "SDK 55". STATE.md says "downgraded to SDK 54 for Expo Go compatibility."
   - What's unclear: The actual running SDK version affects which gesture-handler/reanimated versions are correct.
   - Recommendation: Check `expo --version` or `eas build` config. Assume SDK 54 (package.json) and proceed. The ReanimatedSwipeable crash was fixed (issue #3720 closed Oct 2025).

2. **Does `formSheet` work with the currently installed `expo-router ~6.0.23`?**
   - What we know: `formSheet` was introduced in Expo Router around SDK 52/53. The `sheetAllowedDetents` prop is well-documented.
   - What's unclear: Whether `expo-router ~6.0.23` is SDK 54's version or SDK 55's version.
   - Recommendation: Test `formSheet` in a stub screen in Phase 9 Wave 0 task before building all four screens. If unavailable, fall back to `presentation: 'modal'` with `KeyboardAvoidingView`.

3. **Debt payment history — expand inline vs push detail screen?**
   - What we know: `debt_amount_history` is already in the query response.
   - What's unclear: Whether the user experience should be tapping a row to push a detail screen or an expandable section.
   - Recommendation: Use push detail (`debts/[id].tsx`) — cleaner, follows iOS conventions. Can be implemented in Plan 09-03.

---

## Validation Architecture

> `workflow.nyquist_validation` is not present in `.planning/config.json` — this section is skipped per spec.

---

## Sources

### Primary (HIGH confidence)
- React Native core docs — `FlatList`, `RefreshControl`, `Pressable`, `TextInput`: https://reactnative.dev/docs/flatlist
- Expo Router modals / formSheet official docs: https://docs.expo.dev/router/advanced/modals/
- ReanimatedSwipeable API — official Software Mansion docs: https://docs.swmansion.com/react-native-gesture-handler/docs/components/reanimated_swipeable/
- Project codebase: `src/hooks/useIncomes.ts`, `useDebts.ts`, `useAssets.ts`, `useAssetPrices.ts` — all hooks verified working

### Secondary (MEDIUM confidence)
- `@gorhom/bottom-sheet` issue #2471 (SDK 54 crash) and #2507 (RN 0.81.4 + Reanimated v4 fix in v4.1.4): https://github.com/gorhom/react-native-bottom-sheet/issues/2471
- ReanimatedSwipeable iOS crash issue #3720 marked CLOSED (fix implemented): https://github.com/software-mansion/react-native-gesture-handler/issues/3720
- `@react-native-community/datetimepicker` — Expo official docs: https://docs.expo.dev/versions/latest/sdk/date-time-picker/
- `@react-native-picker/picker` — Expo official docs: https://docs.expo.dev/versions/latest/sdk/picker/

### Tertiary (LOW confidence)
- Community reports on `formSheet` + `sheetAllowedDetents` edge cases with `fitToContents` (expo issue #42066) — avoid `fitToContents` for form sheets with keyboard input

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all core libs are already installed and battle-tested; no new risk libraries
- Architecture patterns: HIGH — FlatList + RefreshControl + formSheet are all standard RN/Expo patterns; data hooks are already proven
- Library compatibility: MEDIUM — ReanimatedSwipeable crash was closed/fixed Oct 2025; gorhom/bottom-sheet issues confirmed; formSheet version compatibility needs quick validation in Wave 0
- Pitfalls: HIGH — identified from project's own codebase (debt history, mutation fields) + confirmed GitHub issues

**Research date:** 2026-02-26
**Valid until:** 2026-03-28 (30 days — these are stable native libraries)
