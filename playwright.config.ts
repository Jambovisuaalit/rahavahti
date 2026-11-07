import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 0,
  use: { baseURL: 'http://127.0.0.1:3100', browserName: 'chromium', headless: true, trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run start -- -p 3100',
    url: 'http://127.0.0.1:3100/luotonantajat',
    reuseExistingServer: false,
    timeout: 90000,
  },
});
