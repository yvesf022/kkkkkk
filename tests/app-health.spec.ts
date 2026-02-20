import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('BROWSER CONSOLE ERROR:', msg.text());
    }
  });

  // Capture failed network requests
  page.on('requestfailed', request => {
    console.error('REQUEST FAILED:', request.url());
  });

  // Capture responses with 4xx or 5xx
  page.on('response', response => {
    if (response.status() >= 400) {
      console.error(
        `BAD RESPONSE: ${response.status()} - ${response.url()}`
      );
    }
  });
});

test('Homepage should not return 404', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status(), 'Homepage returned error').toBeLessThan(400);
});

test('Login page should load', async ({ page }) => {
  const response = await page.goto('/login');
  expect(response?.status(), 'Login page returned error').toBeLessThan(400);
  await expect(page.locator('form')).toBeVisible();
});

test('Register page should load', async ({ page }) => {
  const response = await page.goto('/register');
  expect(response?.status(), 'Register page returned error').toBeLessThan(400);
  await expect(page.locator('form')).toBeVisible();
});

test('All homepage links should not 404', async ({ page }) => {
  await page.goto('/');

  const links = await page.$$eval('a', as =>
    as.map(a => a.getAttribute('href')).filter(Boolean)
  );

  for (const link of links) {
    if (!link?.startsWith('http') && !link?.startsWith('#')) {
      const response = await page.goto(link);
      expect(response?.status(), `Link failed: ${link}`).toBeLessThan(400);
    }
  }
});