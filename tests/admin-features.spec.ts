import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsPlayer } from './helpers/auth';

test.describe('Administrátorské funkce a role-based access', () => {
  test('Administrátor má přístup ke Správě týmu a vidí seznam hráčů', async ({ page }) => {
    await loginAsAdmin(page);

    // Otevření uživatelského menu v hlavičce
    const userMenuButton = page.locator('header button').filter({ has: page.locator('span.relative, [data-ai-hint="player portrait"]') }).first();
    await userMenuButton.click();

    // Administrátor vidí položku "Správa týmu"
    const teamManagementItem = page.getByRole('menuitem', { name: /Správa týmu/i });
    await expect(teamManagementItem).toBeVisible();
    await teamManagementItem.click();

    // Přesměrování na /dashboard/team-management
    await page.waitForURL('**/dashboard/team-management**');
    await expect(page.locator('text=Správa týmu')).toBeVisible();

    // Ověření komponenty automatické synchronizace ligy
    await expect(page.locator('text=Automatická synchronizace ligy')).toBeVisible();
    await expect(page.getByRole('button', { name: /Synchronizovat nyní/i })).toBeVisible();

    // Ověření, že v tabulce jsou hráči ze seed dat
    await expect(page.locator('text=Jan Mlčák')).toBeVisible();
    await expect(page.locator('text=Petr Dvořák')).toBeVisible();
    await expect(page.locator('text=Pavel Sedláček')).toBeVisible();
  });

  test('Administrátor může z rozhraní spustit synchronizaci dat ligy', async ({ page }) => {
    await loginAsAdmin(page);

    // Mock API volání pro izolaci E2E testu od latence a limitů externího webu
    await page.route('**/api/sync/league', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          timestamp: new Date().toISOString(),
          summary: {
            teamsCount: 9,
            matchesCount: 8,
            skaterStatsCount: 20,
            goalieStatsCount: 2
          }
        })
      });
    });

    // Přejít do správy týmu
    const userMenuButton = page.locator('header button').filter({ has: page.locator('span.relative, [data-ai-hint="player portrait"]') }).first();
    await userMenuButton.click();
    await page.getByRole('menuitem', { name: /Správa týmu/i }).click();
    await page.waitForURL('**/dashboard/team-management**');

    // Kliknutí na tlačítko "Synchronizovat nyní"
    const syncButton = page.getByRole('button', { name: /Synchronizovat nyní/i });
    await expect(syncButton).toBeVisible();
    await syncButton.click();

    // Očekáváme toast o úspěšném dokončení synchronizace
    await expect(page.getByText(/Synchronizace dokončena/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('Administrátor vidí tlačítko pro přidání zápasu na dashboardu', async ({ page }) => {
    await loginAsAdmin(page);

    // Na dashboardu je tlačítko "Přidat zápas"
    await expect(page.getByRole('button', { name: /Přidat zápas/i })).toBeVisible();
  });

  test('Běžný hráč nemá přístup ke Správě týmu ani tlačítku Přidat zápas', async ({ page }) => {
    await loginAsPlayer(page);

    // Otevření uživatelského menu běžného hráče
    const userMenuButton = page.locator('header button').filter({ has: page.locator('span.relative, [data-ai-hint="player portrait"]') }).first();
    await userMenuButton.click();

    // Položka "Správa týmu" nesmí být přítomna
    await expect(page.getByRole('menuitem', { name: /Správa týmu/i })).not.toBeVisible();

    // Zavření menu
    await page.keyboard.press('Escape');

    // Tlačítko "Přidat zápas" nesmí být na nástěnce
    await expect(page.getByRole('button', { name: /Přidat zápas/i })).not.toBeVisible();
  });
});
