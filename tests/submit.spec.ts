import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // nothing; server started via npm start in test run
});

test('submitting the contact form sends correct payload and shows success', async ({ page }) => {
  // Intercept the API POST and validate payload
  let captured: any = null;
  await page.route('**/api/contact', async (route) => {
    const req = route.request();
    const post = await req.postDataJSON();
    captured = post;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, file: 'test.json' }) });
  });

  await page.goto('/');

  await page.fill('input[name="name"]', 'Playwright Test');
  await page.fill('input[name="email"]', 'pw@example.com');
  await page.fill('input[name="title"]', 'E2E Test');
  await page.selectOption('select[name="iosVersion"]', 'iOS 17');
  await page.check('input[name="devices"][value="iPhone"]');
  await page.fill('textarea[name="message"]', 'This is an automated test.');

  await Promise.all([
    page.waitForResponse('**/api/contact'),
    page.click('button[type="submit"]')
  ]);

  // Validate captured payload
  expect(captured).not.toBeNull();
  expect(captured.name).toBe('Playwright Test');
  expect(captured.email).toBe('pw@example.com');
  expect(captured.title).toBe('E2E Test');
  expect(captured.iosVersion).toBe('iOS 17');
  expect(captured.devices).toContain('iPhone');
  expect(captured.message).toContain('automated test');

  // Verify the toast shows success
  await expect(page.locator('#toast')).toHaveText(/Thanks — your message was saved.|Thanks/);
});
