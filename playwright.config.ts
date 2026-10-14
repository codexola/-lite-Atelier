import { defineConfig } from '@playwright/test';
import path from 'node:path';
import { existsSync } from 'node:fs';
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: 'http://localhost:3000',
    browserName: 'chromium',
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
        (!process.env.GITHUB_ACTIONS && existsSync('/usr/bin/chromium')
          ? '/usr/bin/chromium'
          : undefined),
      args: ['--no-sandbox'],
    },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  reporter: [['list'], ['html', { open: 'never' }]],
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000/api/health',
    reuseExistingServer: false,
    timeout: 60000,
    env: {
      TURSO_DATABASE_URL:
        process.env.ATELIER_E2E_DB_URL ||
        'file:' + path.resolve('.data/e2e.db'),
      AUTH_SECRET:
        'test-only-secret-for-isolated-end-to-end-environment-123456789',
      COMMERCE_MODE: 'preview',
      LAUNCH_APPROVED: 'false',
      APP_URL: 'http://localhost:3000',
      RESEND_API_KEY: '',
      EMAIL_FROM: '',
      WOMPI_PUBLIC_KEY: '',
      WOMPI_EVENTS_SECRET: '',
      WOMPI_INTEGRITY_SECRET: '',
      STRIPE_SECRET_KEY: 'sk_test_fixture_not_real',
      STRIPE_WEBHOOK_SECRET: 'whsec_test_fixture_not_real',
      NEXT_TELEMETRY_DISABLED: '1',
    },
  },
});
