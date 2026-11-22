import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './ui', workers: 1,
  use: { baseURL: 'http://127.0.0.1:8093', viewport: { width: 390, height: 844 } },
  webServer: { command: 'npx expo start --web --port 8093', url: 'http://127.0.0.1:8093', timeout: 120000, reuseExistingServer: false },
});
