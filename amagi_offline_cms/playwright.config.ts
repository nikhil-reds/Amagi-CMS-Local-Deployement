import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './scripts', testMatch: 'realtime-browser.spec.ts', workers: 1, timeout: 60000,
  use: { baseURL: process.env.REALTIME_TEST_ORIGIN || 'http://localhost:3001', channel: 'chrome', headless: true, viewport: { width: 1440, height: 1000 } },
})
