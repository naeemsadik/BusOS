import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: [
    'demo-flows.spec.ts',
    'critical-flows.spec.ts',
    'hrm-flows.spec.ts',
    'admin-flows.spec.ts',
    'cms-visuals.spec.ts',
  ],
  outputDir: './test-results/demo',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,
  timeout: process.env.BUSOS_DEMO_HEADED === 'true' ? 120_000 : 60_000,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report-demo', open: 'never' }],
    ['./tests/e2e/no-skip-reporter.ts'],
  ],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: process.env.BUSOS_BASE_URL || 'http://127.0.0.1:3100',
    viewport: { width: 1440, height: 900 },
    colorScheme: 'light',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    launchOptions: {
      slowMo: process.env.BUSOS_DEMO_HEADED === 'true' ? 180 : 0,
    },
  },
  projects: [{ name: 'busos-demo-chromium', use: { browserName: 'chromium' } }],
})
