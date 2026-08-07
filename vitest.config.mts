import path from "node:path";

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";

const dirname = import.meta.dirname;

// Dois projetos:
// - "unit": testes de unidade em jsdom (rápidos). É o que `npm run test` roda.
// - "storybook": roda as stories como testes no navegador (addon-vitest).
//   Executado por `npm run test:storybook`.
// Doc: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  test: {
    passWithNoTests: true,
    projects: [
      {
        plugins: [react()],
        test: {
          name: "unit",
          environment: "jsdom",
          globals: true,
          setupFiles: ["./vitest.setup.ts"],
          include: ["{app,components,lib,types}/**/*.{test,spec}.{ts,tsx}"],
          exclude: ["**/node_modules/**", "**/.next/**"],
        },
      },
      {
        extends: true,
        plugins: [
          // Roda os testes das stories definidas no Storybook.
          storybookTest({ configDir: path.join(dirname, ".storybook") }),
        ],
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
