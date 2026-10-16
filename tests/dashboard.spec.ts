import { test, expect } from '@playwright/test';
import { loginAsPlayer } from './helpers/auth';

test.describe('Nástěnka (Dashboard) a docházka', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsPlayer(page);
  });

  test('Zobrazí se karta nejbližšího zápasu, vzájemná bilance (H2H) a karta MVP', async ({ page }) => {
    // Ověření nadcházejícího zápasu (ze seed dat nebo po synchronizaci z ligy)
    await expect(page.getByRole('heading', { name: /Sjetý Gumy|HC Medvědi|Predators|Embedit|ALL IN|Divočáci|Raci|HH Oldies|HH Machines/i }).first()).toBeVisible();
    await expect(page.locator('text=Moutnice').or(page.locator('text=Aces Aréna')).or(page.locator('text=Zimní stadion')).or(page.locator('text=Hala')).first()).toBeVisible();

    // Vzájemná bilance se soupeřem (Head-to-Head)
    await expect(page.getByText(/Vzájemná bilance:/i).first()).toBeVisible();

    // Karta MVP zápasu
    await expect(page.getByRole('heading', { name: /MVP zápasu/i })).toBeVisible();

    // Tlačítka docházky
    await expect(page.getByRole('button', { name: 'Jdu', exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nejdu', exact: true }).first()).toBeVisible();
  });

  test('Hráč může potvrdit účast (Jdu) a přidat poznámku', async ({ page }) => {
    // 1-Click RSVP: Kliknutí na tlačítko "Jdu"
    const jduButton = page.getByRole('button', { name: 'Jdu', exact: true }).first();
    await jduButton.click();

    // Tlačítko "Jdu" má aktivní zelené zvýraznění
    await expect(jduButton).toHaveClass(/bg-emerald-500|border-green-500/);

    // Otevření dialogu poznámky přes tlačítko poznámky
    const noteBtn = page.getByRole('button', { name: /poznámk/i }).first();
    await noteBtn.click();

    // Otevře se dialog "Potvrdit účast"
    await expect(page.getByRole('heading', { name: 'Potvrdit účast' })).toBeVisible();

    // Zadání poznámky
    const noteTextarea = page.locator('textarea');
    await noteTextarea.fill('Test docházky z Playwrightu: dorazím včas');

    // Potvrzení formuláře
    await page.getByRole('button', { name: 'Potvrdit' }).click();

    // Dialog by se měl zavřít
    await expect(page.getByRole('heading', { name: 'Potvrdit účast' })).not.toBeVisible();
  });

  test('Zobrazí se ligová tabulka s týmem HC Aces na předních místech', async ({ page }) => {
    // Sekce Soutěž
    await expect(page.getByRole('heading', { name: 'Soutěž' })).toBeVisible();

    // Ověření týmu HC Aces v tabulce
    const acesRow = page.locator('tr').filter({ hasText: 'HC Aces' });
    await expect(acesRow).toBeVisible();
    await expect(acesRow).toContainText(/\d+/);
  });

  test('Zobrazí se kanadské bodování týmu', async ({ page }) => {
    // V kartě kanadského bodování
    await expect(page.getByRole('tab', { name: /Kanadské bodování/i })).toBeVisible();

    // Ověření tabulky střelců
    await expect(page.locator('table').getByText(/Dvořák/).first()).toBeVisible();
  });

  test('Zobrazí se karta zápasu čekajícího na oficiální výsledek a záložka Hvězdy zápasů', async ({ page }) => {
    // 1. Zápas čekající na zápis
    await expect(page.getByText(/Odehráno • Čeká na oficiální zápis/i)).toBeVisible();

    // 2. Záložka Hvězdy zápasů u hráčů
    const skaterStarsTab = page.getByRole('tab', { name: /Hvězdy zápasů/i }).first();
    await expect(skaterStarsTab).toBeVisible();
    await skaterStarsTab.click();

    // V tabulce hvězd zápasů se zobrazí bodovací klíč
    await expect(page.getByText(/Bodování: 1\. hvězda = 3 b\./i).first()).toBeVisible();

    // 3. Záložka Hvězdy zápasů u brankářů
    const goalieStarsTab = page.getByRole('tab', { name: /Hvězdy zápasů/i }).nth(1);
    await expect(goalieStarsTab).toBeVisible();
    await goalieStarsTab.click();
  });
});
