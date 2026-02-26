# Phase 10: Dashboard + CSV Export — Research

**Researched:** 2026-02-26
**Domain:** React Native native charts (Victory Native XL / Skia), CSV file generation, iOS share sheet
**Confidence:** HIGH (core stack), MEDIUM (Skia version pin + Reanimated 4 compatibility)

---

## Summary

Phase 10 adds two capabilities: a Dashboard screen with Victory Native XL charts and navigable summary cards, and a CSV export trigger from the Settings tab. Both features build on existing hooks (`useIncomes`, `useExpenses`, `useDebts`, `useAssets`, `useUserSettings`) and the existing `netWorth.ts` / `finance.ts` lib — no new Supabase queries are needed beyond what Phase 9 established.

**Victory Native XL** (the "XL" rewrite, published as the `victory-native` package v40+) uses `@shopify/react-native-skia` for GPU-accelerated rendering and `react-native-reanimated` for gesture-driven tooltip state. The project already has Reanimated `~4.1.1` and Gesture Handler `~2.28.0` installed. The missing piece is `@shopify/react-native-skia` — Expo SDK 54's `bundledNativeModules.json` pins it at `2.2.12`. Victory Native's peer dependency is `@shopify/react-native-skia >= 1.2.3`, so `2.2.12` satisfies it.

**CSV export** re-uses the exact column schema already implemented in the web `Settings.tsx` (`handleExportData`) — just swap `Blob + <a>` for `expo-file-system` (write to cache) + `expo-sharing` (share sheet). Both packages are pinned for SDK 54: `expo-file-system ~19.0.21`, `expo-sharing ~14.0.8`. i18n keys (`settings.exportTitle`, `settings.exportButton`, `settings.exportSuccess`, `settings.exportError`) already exist in `src/i18n/resources.ts`.

**Primary recommendation:** Install `@shopify/react-native-skia@2.2.12`, `victory-native` (latest), `expo-file-system`, and `expo-sharing` in one `npm install` step. Use `CartesianChart` + `Line` + `useChartPressState` for the income-vs-expenses chart, and a Skia `Circle` as the tap callout. Require a TTF font asset for axis labels.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DASH-01 | Dashboard shows net worth and financial overview with charts (Victory Native) | `CartesianChart` + `Line` from `victory-native`; data from existing hooks + `netWorth.ts` / `finance.ts` lib |
| DASH-02 | Dashboard financial cards are clickable and navigate to their respective sections | Standard `TouchableOpacity` + `router.push()` from expo-router; no new library needed |
| DASH-03 | Charts respond to taps with callout (replacing web hover tooltips) | `useChartPressState` hook from `victory-native`; render Skia `Circle` at `state.x.position` / `state.y.*.position` when `isActive` |
| EXPRT-01 | User can export financial data as CSV via iOS share sheet | `expo-file-system` (write CSV to cache directory) + `expo-sharing` (`shareAsync()` triggers iOS share sheet); CSV column schema already exists in web `Settings.tsx` |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `victory-native` | `41.20.2` (latest) | CartesianChart, Line, Bar charts with press gesture support | The official XL rewrite; uses Skia for 60-120 FPS GPU rendering; peer-satisfies project's existing Reanimated + Gesture Handler |
| `@shopify/react-native-skia` | `2.2.12` | GPU canvas renderer (Victory Native's rendering engine) | Expo SDK 54 pinned version (`bundledNativeModules.json`); peer dep of Victory Native XL |
| `expo-file-system` | `~19.0.21` | Write CSV string to device cache directory | Expo SDK 54 pinned; required before `expo-sharing` can share the file |
| `expo-sharing` | `~14.0.8` | Trigger iOS native share sheet for the CSV file | Expo SDK 54 pinned; `shareAsync(uri)` handles all share destinations |

### Supporting (already installed — no new install)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-native-reanimated` | `~4.1.1` | Shared values for tooltip position animation | Already installed; Victory Native XL requires `>=3.0.0` — satisfied |
| `react-native-gesture-handler` | `~2.28.0` | Touch gesture recognition for chart press | Already installed; Victory Native XL requires `>=2.0.0` — satisfied |
| `react-native-worklets` | `0.5.1` | Worklets runtime (Reanimated 4 decoupled worklets) | Already installed; Reanimated 4 requires `>=0.5.0` — satisfied |
| `expo-router` | `~6.0.23` | Navigation from summary cards to list screens | Already installed; `router.push('/transactions')` pattern |
| `@tanstack/react-query` | `^5.90.21` | Data fetching (hooks already written) | Already installed; no new queries needed |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Victory Native XL | `react-native-gifted-charts` | Gifted Charts is simpler but lacks Skia GPU acceleration; tap-callout requires custom gesture work. Victory Native XL is the locked decision. |
| Victory Native XL | `echarts-for-react-native` | WebView-based; crashes or performs poorly on low-RAM iPhones |
| `expo-file-system` + `expo-sharing` | `react-native-fs` + `react-native-share` | Expo SDK 54 already ships both expo packages; no need for non-Expo alternatives |

**Installation (new packages only):**
```bash
npx expo install @shopify/react-native-skia victory-native expo-file-system expo-sharing
```

> This will resolve to the Expo SDK 54-compatible versions from `bundledNativeModules.json`.

---

## Architecture Patterns

### Recommended Project Structure

```
BalanceTracker/
├── app/
│   └── (tabs)/
│       ├── dashboard.tsx        # Phase 10: Dashboard screen (DASH-01, DASH-02, DASH-03)
│       └── settings.tsx         # Phase 10: CSV export button added here (EXPRT-01)
├── src/
│   ├── components/
│   │   └── dashboard/
│   │       ├── NetWorthCard.tsx         # Summary card with net worth value
│   │       ├── FinancialSummaryCard.tsx # Tappable card → navigation (DASH-02)
│   │       ├── IncomeExpenseChart.tsx   # Victory Native XL line chart (DASH-01, DASH-03)
│   │       └── ChartTooltip.tsx        # Skia Circle callout component
│   └── lib/
│       └── exportCsv.ts         # Pure function: data → CSV string; write + share (EXPRT-01)
```

### Pattern 1: Victory Native XL Line Chart with Tap Callout

**What:** `CartesianChart` with `Line` and `useChartPressState` for tap-activated callout
**When to use:** DASH-01 (income vs expenses over time) and DASH-03 (tap callout)
**Example:**
```typescript
// Source: https://github.com/formidablelabs/victory-native-xl/blob/main/website/docs/getting-started.mdx
import * as React from "react";
import { View } from "react-native";
import { CartesianChart, Line, useChartPressState } from "victory-native";
import { Circle, useFont } from "@shopify/react-native-skia";
import type { SharedValue } from "react-native-reanimated";
import interFont from "../../assets/fonts/Inter-Medium.ttf"; // must be a static asset

const DATA = [
  { month: 0, income: 2000, expenses: 1200 },
  { month: 1, income: 2500, expenses: 1800 },
  // … derive from grouped income/expense hooks
];

function IncomeExpenseChart() {
  const font = useFont(interFont, 12);
  const { state, isActive } = useChartPressState({ x: 0, y: { income: 0, expenses: 0 } });

  return (
    <View style={{ height: 220 }}>
      <CartesianChart
        data={DATA}
        xKey="month"
        yKeys={["income", "expenses"]}
        axisOptions={{ font }}
        chartPressState={state}
      >
        {({ points }) => (
          <>
            <Line points={points.income} color="#34C759" strokeWidth={2} />
            <Line points={points.expenses} color="#FF3B30" strokeWidth={2} />
            {isActive && (
              <ChartTooltip
                x={state.x.position}
                y={state.y.income.position}
              />
            )}
          </>
        )}
      </CartesianChart>
    </View>
  );
}

function ChartTooltip({ x, y }: { x: SharedValue<number>; y: SharedValue<number> }) {
  return <Circle cx={x} cy={y} r={8} color="#007AFF" />;
}
```

### Pattern 2: Tappable Summary Card → Navigation (DASH-02)

**What:** `TouchableOpacity` wrapping a styled card; `router.push()` on press
**When to use:** Net worth card, income card, expense card, debt card, asset card
**Example:**
```typescript
// Source: expo-router official docs — Link/router.push pattern
import { router } from 'expo-router';
import { TouchableOpacity, Text, View } from 'react-native';

function FinancialSummaryCard({ title, value, route }: { title: string; value: string; route: string }) {
  return (
    <TouchableOpacity
      onPress={() => router.push(route)}
      activeOpacity={0.7}
      accessibilityRole="button"
    >
      <View className="rounded-2xl bg-white dark:bg-gray-900 p-4 shadow-sm">
        <Text className="text-sm text-gray-500 dark:text-gray-400">{title}</Text>
        <Text className="text-2xl font-bold text-gray-900 dark:text-white">{value}</Text>
      </View>
    </TouchableOpacity>
  );
}
```

### Pattern 3: CSV Export via expo-file-system + expo-sharing (EXPRT-01)

**What:** Write CSV string to `FileSystem.cacheDirectory`, then `shareAsync()` triggers iOS share sheet
**When to use:** Settings screen "Export CSV" button
**Example:**
```typescript
// Source: expo-file-system docs (v54) + expo-sharing docs
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export async function exportCsv(
  incomes: Income[],
  expenses: Expense[],
  debts: Debt[],
  assets: Asset[]
): Promise<void> {
  const headers = ['Date', 'Record Type', 'Title/Name', 'Amount', 'Currency', 'Category/Details', 'Status'];
  const rows: string[][] = [headers];

  const escapeCsv = (str: string): string => {
    if (!str) return '';
    const escaped = str.toString().replace(/"/g, '""');
    return escaped.search(/("|,|\n)/g) >= 0 ? `"${escaped}"` : escaped;
  };

  incomes.forEach(i => rows.push([
    i.date ?? 'N/A', 'Income', escapeCsv(i.title),
    i.amount.toString(), i.currency, escapeCsv(i.category), i.status ?? 'N/A'
  ]));

  expenses.forEach(e => rows.push([
    e.date ?? 'N/A', 'Expense', escapeCsv(e.title),
    e.amount.toString(), e.currency, escapeCsv(`${e.category} (${e.type})`), e.status ?? 'N/A'
  ]));

  debts.forEach(d => rows.push([
    d.due_date ?? 'N/A',
    d.is_receivable ? 'Debt (Expected Income)' : 'Debt (Payment Owed)',
    escapeCsv(d.title), d.amount.toString(), d.currency,
    escapeCsv(`Creditor: ${d.creditor}`), d.status ?? 'N/A'
  ]));

  assets.forEach(a => rows.push([
    a.created_at ?? 'N/A', 'Asset', escapeCsv(a.type),
    (a.quantity * a.price_per_unit).toString(), a.currency,
    escapeCsv(`Qty: ${a.quantity} ${a.unit} @ ${a.price_per_unit}`),
    a.auto_update ? 'Auto-updating' : 'Manual'
  ]));

  const csvContent = rows.map(r => r.join(",")).join("\n");
  const fileName = `financial-data-${new Date().toISOString().split('T')[0]}.csv`;
  const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(fileUri, csvContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  await Sharing.shareAsync(fileUri, {
    mimeType: 'text/csv',
    dialogTitle: 'Export Financial Data',
    UTI: 'public.comma-separated-values-text', // iOS UTI
  });
}
```

### Pattern 4: Monthly Data Aggregation for Chart

**What:** Group income/expense records by month to produce `{ month, income, expenses }[]` for the chart
**When to use:** DASH-01 — income vs expenses over time chart
**Example:**
```typescript
// Derived from existing useFilteredData + useIncomes/useExpenses patterns in project
function groupByMonth<T extends { date: string; amount: number }>(
  items: T[]
): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    const key = item.date.slice(0, 7); // "YYYY-MM"
    acc[key] = (acc[key] ?? 0) + item.amount;
    return acc;
  }, {});
}

// Usage: produce last N months of data
function buildChartData(incomes: Income[], expenses: Expense[], months = 6) {
  const incomeByMonth = groupByMonth(incomes);
  const expenseByMonth = groupByMonth(expenses);

  const result = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    result.push({ month: key, income: incomeByMonth[key] ?? 0, expenses: expenseByMonth[key] ?? 0 });
  }
  return result;
}
```

### Anti-Patterns to Avoid

- **Recharts / D3 directly in RN:** Web-only. Crashes Metro. Do not import.
- **Inline `require()` for font assets in Victory Native:** `useFont` must receive a static `require()` call — the path cannot be a dynamic variable. Babel transforms static `require()` at build time.
- **`window.URL.createObjectURL` for CSV:** Web API, does not exist in Hermes/React Native. Use `expo-file-system` write + `expo-sharing` instead.
- **`Blob` for CSV:** Not available in Hermes. Same fix: write with `FileSystem.writeAsStringAsync`.
- **Calling `Sharing.shareAsync` without writing the file first:** `shareAsync` needs a `file://` URI on disk — passing a data URI or in-memory string does not work.
- **Using `useChartPressState` with hover semantics:** No hover on iOS. Only `onPress` — `isActive` becomes true on finger down, false on lift. Design callout for tap, not hover.
- **Importing `victory-native` without `@shopify/react-native-skia` installed:** Metro will fail to bundle because Victory Native XL internally imports Skia. Install both together.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| GPU-accelerated chart rendering | Custom SVG/Canvas chart | `CartesianChart` + `Line` from `victory-native` | Skia rendering at 60-120 FPS; gesture handling via Reanimated shared values is complex to replicate |
| Tap tooltip/callout on chart | Custom gesture responder on chart overlay | `useChartPressState` hook + Skia `Circle` | Hook integrates with Skia canvas coordinate system; hand-rolled overlays have misaligned coordinates |
| iOS share sheet | Native module bridge | `expo-sharing` `shareAsync()` | Handles permissions, share destination picker, and file cleanup automatically |
| File I/O for CSV | Custom native module | `expo-file-system` `writeAsStringAsync` | Sandbox-safe path resolution; proper permissions for iOS app sandbox |
| CSV escaping | Naive `str.replace(',', '')` | The `escapeCsv` function pattern from web Settings.tsx | Must handle commas, quotes, and newlines inside field values; the web version already handles this correctly |

**Key insight:** The chart rendering stack (Skia + Reanimated + Gesture Handler) has significant complexity in coordinate mapping between gesture events and canvas positions. Victory Native XL's `useChartPressState` encapsulates this entirely — the returned shared values are already in canvas coordinates, ready to pass directly to a Skia primitive.

---

## Common Pitfalls

### Pitfall 1: Missing TTF Font Asset for Axis Labels
**What goes wrong:** `CartesianChart` with `axisOptions={{ font }}` where `font` is null — axis labels silently disappear or chart crashes.
**Why it happens:** `useFont(require('./path/to/font.ttf'), 12)` returns `null` until the font loads. If `axisOptions.font` receives `null`, Victory Native XL skips axis rendering or throws.
**How to avoid:** Bundle an Inter or SF-style TTF in `assets/fonts/`. The project does not currently have a `fonts/` directory — create it in Wave 0 (plan setup step). Pass `font` to `axisOptions` only when non-null: `axisOptions={font ? { font } : undefined}`.
**Warning signs:** Chart renders without any axis tick labels.

### Pitfall 2: Reanimated Plugin Order in babel.config.js
**What goes wrong:** `victory-native` crashes at runtime with "Reanimated worklet is not defined" or similar.
**Why it happens:** `react-native-reanimated/plugin` must be the LAST plugin in `babel.config.js`. The project already has it listed as the only plugin — safe for now, but any new Babel plugin added must go BEFORE it.
**How to avoid:** Keep `'react-native-reanimated/plugin'` last in the `plugins` array. The project's current `babel.config.js` already satisfies this.
**Warning signs:** Runtime crash mentioning worklets immediately on chart mount.

### Pitfall 3: Skia Version Mismatch with Expo SDK 54
**What goes wrong:** Metro bundler errors or native crash on launch after installing `@shopify/react-native-skia`.
**Why it happens:** Expo SDK 54 expects `@shopify/react-native-skia@2.2.12` exactly (from `bundledNativeModules.json`). Installing a newer version risks native module version mismatch with the Expo Go runtime.
**How to avoid:** Use `npx expo install @shopify/react-native-skia` (not `npm install`) — Expo's install resolver pins to `2.2.12` automatically. If building a dev build (not Expo Go), any `>=1.2.3` version works.
**Warning signs:** Yellow "native module not found" warning in Expo Go, or Skia canvas renders blank.

### Pitfall 4: `FileSystem.cacheDirectory` is Null
**What goes wrong:** `${FileSystem.cacheDirectory}filename.csv` produces `nullfilename.csv` — `shareAsync` throws or opens share sheet with invalid URI.
**Why it happens:** `expo-file-system` is not imported or not installed. `cacheDirectory` is a string (never null) when `expo-file-system` is properly installed.
**How to avoid:** Verify `expo-file-system` is in `package.json` dependencies before building the export flow. Add null guard: `if (!FileSystem.cacheDirectory) throw new Error('File system unavailable')`.
**Warning signs:** Share sheet opens but shows "File not found" error in the receiving app.

### Pitfall 5: RTL Layout Breaking Chart
**What goes wrong:** In Arabic mode (RTL), the chart's X-axis direction or axis label alignment looks mirrored.
**Why it happens:** Victory Native XL renders in a Skia canvas which is not RTL-aware. The chart data order (left = oldest, right = newest) is fixed regardless of RTL.
**How to avoid:** Do not apply RTL styles to the `CartesianChart` container `View`. Use `I18nManager.isRTL` to conditionally flip axis label positioning only if needed. For Phase 10, keep it simple — chart reads left-to-right regardless of language. Document this as acceptable behavior.
**Warning signs:** Chart appears mirrored in Arabic mode.

### Pitfall 6: Large Data Sets Causing Slow Chart Rendering
**What goes wrong:** Chart with 100+ data points causes janky first render.
**Why it happens:** `buildChartData` called on every render without memoization; Skia redraws all points.
**How to avoid:** Wrap `buildChartData` call in `useMemo` with `[incomes, expenses]` as dependencies. Limit to last 6 months (6 data points) for the initial implementation.
**Warning signs:** Dashboard screen takes >500ms to appear after data loads.

---

## Code Examples

Verified patterns from official sources:

### CartesianChart with Line and Callout (from Context7 / Victory Native XL docs)
```typescript
// Source: https://github.com/formidablelabs/victory-native-xl/blob/main/website/docs/getting-started.mdx
import { CartesianChart, Line, useChartPressState } from "victory-native";
import { Circle, useFont } from "@shopify/react-native-skia";
import type { SharedValue } from "react-native-reanimated";

function MyChart({ data }: { data: Array<{ month: number; income: number; expenses: number }> }) {
  const font = useFont(require("../../assets/fonts/Inter-Medium.ttf"), 12);
  const { state, isActive } = useChartPressState({ x: 0, y: { income: 0, expenses: 0 } });

  return (
    <View style={{ height: 220 }}>
      <CartesianChart
        data={data}
        xKey="month"
        yKeys={["income", "expenses"]}
        axisOptions={font ? { font } : undefined}
        chartPressState={state}
      >
        {({ points }) => (
          <>
            <Line points={points.income} color="#34C759" strokeWidth={2} />
            <Line points={points.expenses} color="#FF3B30" strokeWidth={2} />
            {isActive && <Circle cx={state.x.position} cy={state.y.income.position} r={8} color="#007AFF" />}
          </>
        )}
      </CartesianChart>
    </View>
  );
}
```

### expo-file-system + expo-sharing CSV Flow (from Context7 / Expo SDK 54 docs)
```typescript
// Source: https://github.com/expo/expo/blob/main/docs/pages/versions/v54.0.0/sdk/filesystem.mdx
// Source: https://github.com/expo/expo/blob/main/docs/pages/versions/v54.0.0/sdk/sharing.mdx
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

async function shareCSV(csvContent: string): Promise<void> {
  const fileName = `financial-data-${new Date().toISOString().split('T')[0]}.csv`;
  const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(fileUri, csvContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  await Sharing.shareAsync(fileUri, {
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
    dialogTitle: 'Export Financial Data',
  });
}
```

### Net Worth Calculation (existing lib — no changes needed)
```typescript
// Source: BalanceTracker/src/lib/netWorth.ts (already in project)
import { parseNetWorthConfig } from '@/lib/netWorth';
import { sumInDisplayCurrency } from '@/lib/finance';

// settings.net_worth_calculation → nwConfig (already in web Dashboard.tsx)
const nwConfig = parseNetWorthConfig(settings?.net_worth_calculation);
let netWorth = 0;
if (nwConfig.balance) netWorth += (totalReceivedIncome - totalExpenses);
if (nwConfig.expectedIncome) netWorth += totalExpectedIncome;
if (nwConfig.assets) netWorth += (totalAssets + expectedLoans);
if (nwConfig.debts) netWorth -= totalDebt;
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Victory Native v4 (SVG-based) | Victory Native XL (v40+, Skia-based) | 2023 | 10x faster rendering; completely different API — `CartesianChart` replaces `VictoryChart`; old docs are irrelevant |
| `window.Blob` + `<a download>` for CSV | `expo-file-system` write + `expo-sharing` | React Native from day 1 | Web DOM APIs do not exist in Hermes; file I/O must go through native modules |
| `expo-secure-store` for sessions | `expo-sqlite` localStorage polyfill | Phase 7 decision | Already resolved — irrelevant to Phase 10 |

**Deprecated/outdated:**
- **Victory Native v4 API** (`VictoryLine`, `VictoryChart`, `VictoryAxis`): The package `victory-native` is now the XL rewrite. The old API no longer exists in v40+. Any old blog posts / tutorials using `VictoryChart` are wrong.
- **`react-native-fs` for file I/O**: Works but not Expo-managed. Prefer `expo-file-system` for Managed Workflow compatibility.
- **`react-native-share` for share sheet**: Works but not Expo-managed. Prefer `expo-sharing`.

---

## Open Questions

1. **Font asset for Victory Native axis labels**
   - What we know: `useFont()` requires a static TTF asset path. The project has an `assets/` directory but no `fonts/` subdirectory yet.
   - What's unclear: Whether Inter or SF fonts are preferred, and whether there's already a font bundled via Expo's font system from Phase 7.
   - Recommendation: In Wave 0 of the plan, create `assets/fonts/` and add `Inter-Medium.ttf` (or any system-like sans-serif). If `expo-font` was used in Phase 7 for font loading, check if the font URI is reusable. If not, bundle a fresh TTF.

2. **Dev build vs Expo Go for Skia**
   - What we know: `@shopify/react-native-skia` is a native module. Expo Go for SDK 54 ships with the `2.2.12` version pre-bundled. Victory Native XL should work in Expo Go at SDK 54.
   - What's unclear: Whether Expo Go SDK 54 actually includes Skia 2.2.12 in the pre-built binary. If not, a dev build is required.
   - Recommendation: Test `CartesianChart` render in Expo Go immediately after installing. If Skia shows "native module not found", switch to a dev build (which Phase 8 may have already set up).

3. **Bar chart vs Line chart for income/expenses**
   - What we know: The success criterion says "at least one chart (income vs. expenses over time)". A line chart is simpler; a bar chart is more visually intuitive for monthly totals.
   - What's unclear: Which chart type better fits the data (6 months of monthly totals vs. individual transactions over time).
   - Recommendation: Use a `Line` chart for "over time" since the success criterion uses that phrasing. A bar chart could be added as a second chart if time allows, but is not required.

4. **`useChartPressState` value display in callout**
   - What we know: `state.y.income.value` (a Reanimated `SharedValue<number>`) holds the Y data value at the pressed point. `state.x.value` holds the X value.
   - What's unclear: How to display the formatted currency value in the callout (a Skia `Text` primitive vs. an Animated React Native `Text` component overlay).
   - Recommendation: For Phase 10, use a simple Skia `Circle` as the visual indicator (as shown in official examples). Display the value in an Animated `Text` component outside the canvas, driven by `state.y.income.value` via `useDerivedValue`. This avoids complexity of Skia `Text` font loading.

---

## Sources

### Primary (HIGH confidence)
- `/formidablelabs/victory-native-xl` (Context7) — CartesianChart, Line, useChartPressState, ToolTip, installation
- `/expo/expo` (Context7, branch: sdk-54) — expo-file-system writeAsStringAsync, expo-sharing shareAsync
- `BalanceTracker/node_modules/expo/bundledNativeModules.json` — Expo SDK 54 pinned versions: `@shopify/react-native-skia: 2.2.12`, `expo-file-system: ~19.0.21`, `expo-sharing: ~14.0.8`
- `npm info victory-native` — Latest version `41.20.2`; peerDeps confirmed: `@shopify/react-native-skia >= 1.2.3`, `react-native-reanimated >= 3.0.0`, `react-native-gesture-handler >= 2.0.0`
- `npm info @shopify/react-native-skia@2.2.12` — peerDeps: `react >= 19.0`, `react-native >= 0.78`, `react-native-reanimated >= 3.19.1`
- `BalanceTracker/package.json` — Confirmed: reanimated `~4.1.1`, gesture-handler `~2.28.0`, worklets `0.5.1`; missing: skia, victory-native, expo-file-system, expo-sharing

### Secondary (MEDIUM confidence)
- `src/pages/Settings.tsx` (web app) — CSV column schema (`escapeCsv`, headers, row builder for incomes/expenses/debts/assets) — directly portable to RN with no logic changes
- `src/i18n/resources.ts` (RN project) — Confirmed i18n keys `settings.exportTitle`, `settings.exportButton`, `settings.exportSuccess`, `settings.exportError` already exist

### Tertiary (LOW confidence)
- Expo Go SDK 54 Skia inclusion: assumed from `bundledNativeModules.json` presence, but not verified against actual Expo Go binary. Flag for early validation.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions confirmed from `bundledNativeModules.json` and `npm info`; peer deps cross-checked
- Architecture: HIGH — CartesianChart patterns verified from Context7 official docs; CSV pattern mirrors existing web implementation
- Pitfalls: MEDIUM — font asset and Expo Go/Skia compatibility are project-specific risks not fully testable without running the app
- Open questions: MEDIUM — font strategy and Expo Go Skia inclusion need early smoke-test validation in Wave 0

**Research date:** 2026-02-26
**Valid until:** 2026-03-28 (30 days; Victory Native XL and Expo SDK are stable at these versions)
