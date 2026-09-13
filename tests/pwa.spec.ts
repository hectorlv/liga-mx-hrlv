import { expect, test } from 'playwright/test';

test('no registra el service worker en el servidor local', async ({ page }) => {
  await page.goto('/');

  const registrations = await page.evaluate(async () =>
    (await navigator.serviceWorker.getRegistrations()).length,
  );

  expect(registrations).toBe(0);
});
