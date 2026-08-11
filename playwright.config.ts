import { defineConfig, devices } from '@playwright/test'

// The suite runs on its own port, in Vite's `e2e` mode, so it always exercises
// the demo backend (.env.e2e) and never the real Supabase project configured in
// .env.development.local for `npm run dev`.
const BASE_URL = 'http://localhost:5174'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'list' : [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npx vite --mode e2e --port 5174 --strictPort',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
