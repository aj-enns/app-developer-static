import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:8080',
    headless: true,
    ignoreHTTPSErrors: true,
    video: 'off'
  }
});
