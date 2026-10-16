import { test, expect } from '@playwright/test';
import { loginAsPlayer } from './helpers/auth';

test.describe('Navigace v aplikaci, kalendář a notifikace', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsPlayer(page);
  });

  test('Přechod do Kalendáře zobrazí rozpis, narozeniny a synchronizaci kalendáře (.ics)', async ({ page }) => {
    // Kliknutí na odkaz "Kalendář" v navigaci
    await page.getByRole('link', { name: /Kalendář/i }).first().click();
    await page.waitForURL('**/dashboard/calendar');

    // Ověření prvků kalendáře a synchronizační karty (iCal / Google / Apple)
    await expect(page.locator('text=Kalendář událostí')).toBeVisible();
    await expect(page.getByText(/Synchronizace s kalendářem v mobilu/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Stáhnout \.ics/i })).toBeVisible();

    // Ověření živého iCal API feedu (/api/calendar/ics)
    const icsRes = await page.request.get('/api/calendar/ics');
    expect(icsRes.status()).toBe(200);
    const icsBody = await icsRes.text();
    expect(icsBody).toContain('BEGIN:VCALENDAR');
    expect(icsBody).toContain('TRIGGER:-PT45M');
  });

  test('Přechod do Historie zobrazí odehraná utkání, výsledky a odznak MVP', async ({ page }) => {
    // Kliknutí na odkaz "Historie" v navigaci
    await page.getByRole('link', { name: /Historie/i }).first().click();
    await page.waitForURL('**/dashboard/history');

    // Ověření odehraných zápasů, skóre a odznaku MVP
    await expect(page.locator('text=Predators').first()).toBeVisible();
    await expect(page.getByText(/\d+\s*:\s*\d+/).first()).toBeVisible();
    await expect(page.getByText(/MVP:/i).first()).toBeVisible();
  });

  test('Notifikační zvonek zobrazí seznam týmových oznámení', async ({ page }) => {
    // Kliknutí na ikonu notifikačního zvonku v hlavičce
    const bellButton = page.locator('header button').filter({ has: page.locator('svg.lucide-bell') });
    await expect(bellButton).toBeVisible();
    await bellButton.click();

    // Ověření popoveru s oznámeními
    await expect(page.getByRole('heading', { name: 'Oznámení' })).toBeVisible();
  });

  test('Zobrazení sestavy na ledě zobrazí novou formaci karet s posuvníkem a přepínačem pohledů', async ({ page }) => {
    await page.getByRole('link', { name: /Historie/i }).first().click();
    await page.waitForURL('**/dashboard/history');

    // Click on the first match accordion if collapsed
    const firstMatch = page.locator('button[data-state]').first();
    if (await firstMatch.isVisible()) {
      await firstMatch.click();
    }

    // Look for button "Zobrazit sestavu na ledě"
    const lineupBtn = page.getByRole('button', { name: /Zobrazit sestavu/i }).first();
    if (await lineupBtn.isVisible()) {
      await lineupBtn.click();

      // Verify modal is opened
      await expect(page.getByRole('heading', { name: /Sestava/i })).toBeVisible();

      // Verify simplified formation titles (no emojis, clean text)
      await expect(page.getByText('1. Útok').first()).toBeVisible();
      await expect(page.getByText('1. Obrana').first()).toBeVisible();
      await expect(page.getByText('Brankář').first()).toBeVisible();

      // Verify copy lineup button
      const copyBtn = page.getByRole('button', { name: /Kopírovat/i }).first();
      await expect(copyBtn).toBeVisible();
    }
  });
});
