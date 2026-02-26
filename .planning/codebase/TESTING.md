# Testing Patterns

**Analysis Date:** 2026-02-22

## Test Framework

**Runner:**
- Vitest 3.2.4
- Config: `vitest.config.ts`
- Environment: jsdom (browser DOM simulation)
- Globals enabled (no need to import describe/it/expect)

**Assertion Library:**
- Vitest built-in assertions via `expect()`
- Testing Library React for component testing

**Run Commands:**
```bash
npm run test              # Run all tests with coverage
npm run test:watch       # Watch mode with live reload
```

**Coverage:**
- Provider: v8
- Reporters: text (console), lcov (for CI/tools)
- Coverage target: 45% lines/functions/statements, 40% branches
- Included files (only these are tracked):
  - `src/lib/currency.ts`
  - `src/lib/debt.ts`
  - `src/lib/finance.ts`
  - `src/lib/insights.ts`
  - `src/components/ProtectedRoute.tsx`
  - `src/hooks/useUserSettings.ts`

## Test File Organization

**Location:**
- Co-located with implementation files (same directory)
- Test files are alongside source, not in separate test directory

**Naming:**
- Pattern: `FileName.test.ts` or `FileName.test.tsx`
- Examples:
  - `src/lib/currency.test.ts` (tests `currency.ts`)
  - `src/contexts/AuthContext.bootstrap.test.ts` (tests `AuthContext.tsx` bootstrap)
  - `src/components/ProtectedRoute.test.tsx` (tests component)

**File Structure:**
```
src/
├── lib/
│   ├── currency.ts
│   ├── currency.test.ts
│   ├── finance.ts
│   ├── finance.test.ts
├── contexts/
│   ├── AuthContext.tsx
│   ├── AuthContext.bootstrap.test.ts
├── components/
│   ├── ProtectedRoute.tsx
│   ├── ProtectedRoute.test.tsx
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, expect, it, vi, beforeEach } from "vitest";

describe("functionName or ComponentName", () => {
  beforeEach(() => {
    // Reset mocks
    vi.restoreAllMocks();
    mockFunction.mockReset();
  });

  it("does something specific", () => {
    // Arrange
    const input = { ... };

    // Act
    const result = functionUnderTest(input);

    // Assert
    expect(result).toBe(expectedValue);
  });

  it("handles error case", () => {
    // Setup error condition
    // Assert error handling
  });
});
```

**Patterns from codebase:**

Pure function test:
```typescript
describe("convertAmount", () => {
  it("converts USD to TRY when auto convert is enabled", () => {
    const result = convertAmount({
      amount: 100,
      fromCurrency: "USD",
      toCurrency: "TRY",
      usdToTryRate: 30,
      autoConvert: true,
    });
    expect(result).toBe(3000);
  });

  it("keeps source amount when auto convert is disabled", () => {
    const result = convertAmount({
      amount: 100,
      fromCurrency: "USD",
      toCurrency: "TRY",
      usdToTryRate: 30,
      autoConvert: false,
    });
    expect(result).toBe(100);
  });
});
```

Component test with routing:
```typescript
const renderWithRouter = () =>
  render(
    <MemoryRouter initialEntries={["/private"]}>
      <Routes>
        <Route path="/signin" element={<div>Sign In Page</div>} />
        <Route path="/private" element={<ProtectedRoute><div>Protected Content</div></ProtectedRoute>} />
      </Routes>
    </MemoryRouter>,
  );

describe("ProtectedRoute", () => {
  it("shows loading indicator while auth state is loading", () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
    renderWithRouter();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });
});
```

## Mocking

**Framework:** Vitest's `vi` module

**Mock patterns:**

**Module mocking:**
```typescript
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

const mockedFrom = vi.mocked(supabase.from);
```

**Function mocking:**
```typescript
vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

const mockedTrackEvent = vi.mocked(trackEvent);
```

**Reset strategy:**
```typescript
beforeEach(() => {
  mockedFrom.mockReset();
  mockedTrackEvent.mockReset();
});
```

**Chain mocking (for query builders):**
```typescript
const profileQuery = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockResolvedValue({
    data: { name: "Existing Name" },
    error: null,
  }),
};

mockedFrom.mockReturnValueOnce(profileQuery as never);
```

**Global stubs (fetch):**
```typescript
vi.stubGlobal(
  "fetch",
  vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ bitcoin: { usd: 60000 } }),
    } as Response)
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, rates: { USDXAU: 2400 } }),
    } as Response),
);
```

**What to Mock:**
- External service clients (Supabase, API calls)
- Analytics/tracking functions
- Global objects when simulating different environments
- Hook returns when testing components in isolation

**What NOT to Mock:**
- Pure utility functions (test with real calls)
- Standard library functions (date-fns, etc.)
- Helper functions being tested directly

## Component Testing

**Setup:**
```typescript
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
```

**Patterns:**
- Use `render()` with router for components needing navigation
- Use `screen.getByText()`, `screen.getByRole()` to query DOM
- Use `toBeInTheDocument()` assertion from testing-library

**Example - ProtectedRoute:**
```typescript
it("renders protected content for authenticated users", () => {
  mockedUseAuth.mockReturnValue({
    user: { id: "u1", email: "test@example.com", name: "Test User" },
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  });

  renderWithRouter();
  expect(screen.getByText("Protected Content")).toBeInTheDocument();
});
```

## Fixtures and Factories

**Test Data:**
```typescript
const baseUser = {
  id: "user-1",
  email: "demo@example.com",
  user_metadata: { name: "Demo User" },
} as never;

type SettingsRow = {
  user_id: string;
  default_currency: "USD" | "TRY";
  auto_convert: boolean;
  theme: string;
  include_long_term: boolean;
  auto_price_update: boolean;
  language: string;
};

const existing: SettingsRow = {
  user_id: "u1",
  ...DEFAULT_USER_SETTINGS,
};
```

**Location:**
- Fixtures defined at top of test file before describe block
- Constants like `baseUser`, `existing`, `inserted` used across test cases
- Reusable test data reduces duplication

## Test Types

**Unit Tests:**
- Scope: Single pure function or utility
- Approach: Direct function calls with inputs/outputs
- Examples: `currency.test.ts`, `debt.test.ts`, `finance.test.ts`, `insights.test.ts`
- Coverage: All paths including edge cases (null, invalid dates, conversion rates)

**Integration Tests:**
- Scope: Function + external dependencies (mocked Supabase)
- Approach: Mock service calls, verify query chain construction
- Examples: `useUserSettings.test.ts`, `AuthContext.bootstrap.test.ts`
- Pattern: Test fetch → create → update flows

**Component Tests:**
- Scope: React component with mocked hooks/context
- Approach: Render component, mock dependencies, assert UI behavior
- Examples: `ProtectedRoute.test.tsx`
- Pattern: Mock useAuth, test loading/auth/protected states

**E2E Tests:**
- Framework: Not used in current codebase
- Future consideration if needed

## Coverage Analysis

**Tracked files (from vitest.config.ts):**
- `src/lib/currency.ts` - 100% coverage (convertAmount only function)
- `src/lib/debt.ts` - 100% coverage (getDebtTypeFromDueDate, constants)
- `src/lib/finance.ts` - 100% coverage (sumInDisplayCurrency with generics)
- `src/lib/insights.ts` - 100% coverage (buildFinancialInsights all branches)
- `src/components/ProtectedRoute.tsx` - 100% coverage (loading, unauthenticated, authenticated)
- `src/hooks/useUserSettings.ts` - Helper functions fully tested

**Test gaps (not tracked/tested):**
- Context providers (AuthContext, CurrencyContext, DateContext, ThemeContext)
- Page components and layouts
- UI components from Radix/shadcn
- Integration with i18n
- Service worker registration
- CSV export functionality
- Multilingual RTL support

## Common Test Patterns

**Async Testing:**
- Pattern: Async test functions with `await` on async calls
```typescript
it("recovers missing profile and still ensures settings", async () => {
  const user = await ensureProfileAndSettings(baseUser);
  expect(user.name).toBe("Recovered Name");
  expect(mockedTrackEvent).toHaveBeenCalledWith("auth_profile_recovered");
});
```

**Error Testing:**
- Pattern: Return error objects from mocks, assert error handling
```typescript
const profileQuery = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockResolvedValue({
    data: null,
    error: { message: "Database error" },
  }),
};
// Assert function throws or returns error state
```

**Conditional Rendering Testing:**
- Pattern: Test each branch separately by mocking different return values
```typescript
it("shows loading indicator while auth state is loading", () => {
  mockedUseAuth.mockReturnValue({ isLoading: true, ... });
  renderWithRouter();
  expect(screen.getByText("Loading...")).toBeInTheDocument();
});

it("renders protected content for authenticated users", () => {
  mockedUseAuth.mockReturnValue({ user: {...}, isLoading: false, ... });
  renderWithRouter();
  expect(screen.getByText("Protected Content")).toBeInTheDocument();
});
```

**Date Testing:**
```typescript
const reference = new Date("2026-01-01T00:00:00.000Z");
const dueDate = addDays(reference, 365);
expect(getDebtTypeFromDueDate(dueDate, reference)).toBe("short");
```

---

*Testing analysis: 2026-02-22*
