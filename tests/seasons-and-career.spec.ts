import { test, expect } from '@playwright/test';
import { loginAsPlayer, loginAsAdmin } from './helpers/auth';

test.describe('Přepínání ročníků a kariérní karta hráče (Historické statistiky A + D)', () => {
  test('Hráč může otevřít svou kariérní kartu a vidí statistiky po jednotlivých ročnících', async ({ page }) => {
    await loginAsPlayer(page);

    // Na dashboardu v kartě profilu klikneme na "Kariérní karta hráče"
    const careerCardBtn = page.getByRole('button', { name: /Kariérní karta hráče/i });
    await expect(careerCardBtn).toBeVisible();
    await careerCardBtn.click();

    // Dialog s kariérní kartou se otevře
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal.getByText('Petr Dvořák')).toBeVisible();
    await expect(modal.getByText(/Kariérní karta a statistiky po ročnících/i)).toBeVisible();

    // Karty celkových kariérních statistik
    await expect(modal.getByText('Body celkem')).toBeVisible();
    await expect(modal.getByText(/Hráč zápasu \(MVP\)/)).toBeVisible();
    await expect(modal.getByText('Statistiky v jednotlivých ročnících')).toBeVisible();

    // V tabulce po sezónách vidíme aktuální sezónu a archivní ročník
    await expect(page.getByText('Beginners Liga 2024/2025')).toBeVisible();
    await expect(page.getByText('Celkem v HC Aces')).toBeVisible();

    // Zavření modálu
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('Hráč může přepnout na archivní ročník a zobrazí se banner, archivní statistiky a tabulka', async ({ page }) => {
    await loginAsPlayer(page);

    // Výchozí stav: sekce Příští zápasy je viditelná
    await expect(page.getByRole('heading', { name: /Příští zápasy/i })).toBeVisible();

    // V kartě Soutěž otevřeme výběr sezóny
    const seasonSelect = page.locator('button').filter({ hasText: /(Krajská liga|Aktuální sezóna)/i });
    await expect(seasonSelect).toBeVisible();
    await seasonSelect.click();

    // Vybereme archivní ročník 2024/2025
    const archivedOption = page.getByRole('option', { name: /Beginners Liga 2024\/2025/i });
    await expect(archivedOption).toBeVisible();
    await archivedOption.click();

    // Zobrazí se horní banner archivního ročníku
    await expect(page.getByText(/Archivní ročník/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Zpět na aktuální sezónu/i })).toBeVisible();

    // Sekce Příští zápasy je nahrazena informativní zprávou o uzavřeném ročníku
    await expect(page.getByText(/Prohlížíte uzavřený ročník Beginners Liga 2024\/2025/i)).toBeVisible();

    // V kartách bodování a brankářů je odznak "Uzamčený archiv"
    await expect(page.getByText('Uzamčený archiv').first()).toBeVisible();

    // Kliknutí na "Zpět na aktuální sezónu" v banneru vrátí aplikaci do živého režimu
    const backBtn = page.getByRole('button', { name: /Zpět na aktuální sezónu/i });
    await backBtn.click();

    // Banner zmizí a vrátí se sekce "Příští zápasy"
    await expect(page.getByText(/Archivní ročník/i)).not.toBeVisible();
    await expect(page.getByRole('heading', { name: /Příští zápasy/i })).toBeVisible();
  });

  test('Kliknutím na jméno hráče v tabulce bodování se otevře jeho kariérní karta', async ({ page }) => {
    await loginAsAdmin(page);

    // V tabulce bodování najdeme buňku se jménem hráče
    const playerCell = page.locator('table').getByText(/J\. Mlčák|P\. Dvořák/).first();
    await expect(playerCell).toBeVisible();
    await playerCell.click();

    // Otevře se dialog s kariérní kartou kliknutého hráče
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/Kariérní karta a statistiky po ročnících/i)).toBeVisible();
    await expect(page.getByText(/Statistiky v jednotlivých ročnících/i)).toBeVisible();

    // Zavření modálu
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
});
