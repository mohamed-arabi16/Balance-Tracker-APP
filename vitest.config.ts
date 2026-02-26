import path from "path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: [
        "src/lib/currency.ts",
        "src/lib/debt.ts",
        "src/lib/finance.ts",
        "src/lib/insights.ts",
        "src/components/ProtectedRoute.tsx",
        "src/hooks/useUserSettings.ts",
      ],
      thresholds: {
        lines: 45,
        functions: 45,
        branches: 40,
        statements: 45,
      },
    },
  },
});
