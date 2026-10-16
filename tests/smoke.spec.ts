import { test, expect } from '@playwright/test';

test.describe('HC Aces HUB - Smoke Testy', () => {
  test('Přihlašovací obrazovka se správně načte v barvách týmu', async ({ page }) => {
    await page.goto('/');

    // Ověření titulku a loga klubu
    await expect(page.locator('h1')).toContainText('HC Aces');

    // Ověření záložek Přihlásit a Registrovat
    await expect(page.getByRole('tab', { name: 'Přihlásit' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Registrovat' })).toBeVisible();

    // Ověření formulářových polí
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Přihlásit se' })).toBeVisible();
  });

  test('Přepnutí na registrační formulář zobrazí výběr pozice hráče', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('tab', { name: 'Registrovat' }).click();

    // Ověření polí pro registraci
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="phoneNumber"]')).toBeVisible();
    await expect(page.getByRole('combobox')).toBeVisible(); // Výběr pozice (Hráč / Brankář / Člen)
  });
});
