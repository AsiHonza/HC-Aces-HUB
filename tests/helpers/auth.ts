import { Page, expect } from '@playwright/test';

export async function loginAs(page: Page, email: string, password = 'heslo123') {
  await page.goto('/');

  await expect(page.locator('input[name="email"]')).toBeVisible();
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole('button', { name: 'Přihlásit se' }).click();

  // Aplikace po přihlášení přesměruje na /welcome a následně na /dashboard
  await page.waitForURL('**/dashboard**', { timeout: 35000, waitUntil: 'commit' });
  await expect(page).toHaveURL(/.*dashboard/);
}

export async function loginAsAdmin(page: Page) {
  const email = process.env.ADMIN_EMAIL || 'qa-visual-tester@aces.test';
  const password = process.env.ADMIN_PASSWORD || 'QaTest123456!';
  await loginAs(page, email, password);
}

export async function loginAsPlayer(page: Page) {
  await loginAs(page, 'petr.dvorak@aces.cz');
}
