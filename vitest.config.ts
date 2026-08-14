import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/unit/setup.ts"],
    include: [
      "tests/unit/**/*.test.{ts,tsx}",
      "tests/integration/**/*.test.{ts,tsx}",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.d.ts",
        "src/types/**",
        "src/app/**/page.tsx",    // page stubs
        "src/app/**/layout.tsx",  // layout stubs
        "src/app/**/route.ts",    // API stubs
      ],
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      // `server-only` is an empty marker package for Next.js; alias it so
      // server-only modules can be imported in unit tests.
      "server-only": resolve(__dirname, "./tests/unit/mocks/server-only.ts"),
    },
  },
});
