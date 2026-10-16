import { test, expect } from '@playwright/test';
import { loginAsPlayer, loginAsAdmin } from './helpers/auth';

test.describe('Autentizace a správa sezení', () => {
  test('Hráč se může úspěšně přihlásit a zobrazí se mu nástěnka', async ({ page }) => {
    await loginAsPlayer(page);

    // Ověření, že jsme na dashboardu a vidíme obsah
    await expect(page.locator('text=Příští zápasy')).toBeVisible();
    await expect(page.locator('table').getByText('HC Aces')).toBeVisible();
  });

  test('Při zadání chybných údajů se zobrazí chybová hláška', async ({ page }) => {
    await page.goto('/');

    await page.locator('input[name="email"]').fill('neexistujici@aces.cz');
    await page.locator('input[name="password"]').fill('spatneheslo');
    await page.getByRole('button', { name: 'Přihlásit se' }).click();

    // Očekáváme toast nebo chybovou zprávu
    await expect(page.getByText('Nesprávné údaje.').first()).toBeVisible();
    // Nemělo by dojít k přesměrování
    expect(page.url()).not.toContain('/dashboard');
  });

  test('Uživatel se může z dashboardu úspěšně odhlásit', async ({ page }) => {
    await loginAsPlayer(page);

    // Otevření uživatelského menu v hlavičce
    const userMenuButton = page.locator('header button').filter({ has: page.locator('span.relative, [data-ai-hint="player portrait"]') }).first();
    await userMenuButton.click();

    // Kliknutí na "Odhlásit se"
    await page.getByRole('menuitem', { name: /Odhlásit se/i }).click();

    // Přesměrování zpět na přihlašovací obrazovku
    await page.waitForURL('**/', { timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Přihlásit se' })).toBeVisible();
  });
});
