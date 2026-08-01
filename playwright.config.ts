import { defineConfig } from 'playwright/test';

export default defineConfig({
  testDir: './tests',
  snapshotPathTemplate: '{testDir}/{testFilePath}-snapshots/{arg}{ext}',
  fullyParallel: false,
  use: {
    baseURL: 'http://127.0.0.1:8011',
    viewport: { width: 1240, height: 1500 },
    deviceScaleFactor: 1,
  },
  webServer: {
    command:
      'node_modules/.bin/web-dev-server --root-dir dist --app-index index.html --port 8011',
    url: 'http://127.0.0.1:8011/',
    reuseExistingServer: true,
  },
});
