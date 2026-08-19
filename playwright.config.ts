import { defineConfig, devices } from "@playwright/test";

// Testes end-to-end. Sobe o servidor de dev automaticamente.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    // 5 min: o projeto vive num disco lento (o Next avisa `Slow filesystem`),
    // e a primeira compilação da rota entra nessa janela.
    timeout: 300_000,
  },
});
