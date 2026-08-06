import { defineConfig, devices } from "@playwright/test";

// Must match the `server.port` set in vite.config.ts.
const DEV_SERVER_URL = "http://localhost:5200";

export default defineConfig({
  testDir: "./src/tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: DEV_SERVER_URL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: DEV_SERVER_URL,
    reuseExistingServer: !process.env.CI,
  },
});
