import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Audits run against a production build: dev-only markup and unminified
    // CSS are not what users get.
    command: `npm run build && npx next start --port ${PORT}`,
    /*
     * Run against sample data, deliberately, even when .env.local points at a
     * local database. These tests are about layout, contrast and keyboard
     * behaviour on known content — pointing them at a live database would make
     * them depend on whatever rows happen to exist and on a container being up.
     *
     * Empty rather than absent: Next does not override variables already
     * present in the environment, and the app treats blank as unconfigured.
     * Authenticated flows get their own suite when there is data worth signing
     * in for.
     */
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
    },
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
