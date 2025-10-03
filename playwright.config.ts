import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  
  // Run tests in serial to avoid port conflicts
  workers: 1,
  
  // Start servers before tests
  webServer: [
    {
      command: 'node node_modules/azurite/dist/src/azurite.js --silent --location azurite',
      port: 10000,
      timeout: 30_000,
      reuseExistingServer: true
    },
    {
      command: 'node test-server.js',
      port: 7071,
      timeout: 30_000,
      reuseExistingServer: true
    },
    {
      command: 'node web-server.js',
      port: 8080,
      timeout: 30_000,
      reuseExistingServer: true
    }
  ],
  
  use: {
    baseURL: 'http://localhost:8080',
    headless: true,
    ignoreHTTPSErrors: true,
    video: 'off',
    channel: 'chrome'
  }
});
