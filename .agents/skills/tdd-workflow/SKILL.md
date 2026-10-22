---
name: tdd-workflow
description: >-
  Metodika Test-Driven Development (TDD) pro HC Aces HUB.
  Vede vývoj v cyklu Red-Green-Refactor s využitím cílených Playwright E2E
  a TypeScript integračních testů bez spouštění celé zdlouhavé sady.
---

# TDD Workflow: Red - Green - Refactor pro HC Aces HUB

Tento skill definuje postup vývoje nových funkcí a oprav chyb podle metodiky **Test-Driven Development (TDD)** upravené pro Next.js 15 a Playwright.

---

## 1. Pravidlo efektivního TDD: Cílené testy (Targeted Testing)
* **Zlaté pravidlo:** Během cyklu TDD **NIKDY nespouštěj celou testovací sadu** (`npm run test:e2e`).
* Spouštěj výhradně testovací soubor nebo konkrétní scénář, na kterém právě pracuješ:
  ```bash
  # Spuštění pouze dotčeného testu:
  npx playwright test tests/dashboard.spec.ts -g "docházka" --project="Desktop Chrome"
  ```

---

## 2. Třífázový cyklus TDD

### Fáze 1: ČERVENÁ (Red) – Napsání testu selhávajícího na chybějící funkci
1. Prostuduj akceptační kritéria od **Product Ownera**.
2. Napiš nebo rozšiř testovací specifikaci v adresáři `tests/` (např. ověření, že po kliknutí na tlačítko se zobrazí gratulační modal nebo se změní stav).
3. Spusť cílený test:
   * **Očekávaný výsledek:** Test **musí selhat** přesně z důvodu, že funkce ještě není implementována.
   * Pokud test projde, test netestuje novou funkcionalitu!

### Fáze 2: ZELENÁ (Green) – Minimální implementace k projití testu
1. Napiš kód komponenty nebo Server Action tak, aby test prošel co nejjednodušším a nejčistším způsobem.
2. Přidej stabilní `data-testid` selektory do JSX prvků.
3. Spusť znovu cílený test:
   * **Očekávaný výsledek:** Test **musí projít zeleně**.

### Fáze 3: REFAKTORING (Refactor) – Úklid, typy a modularita
1. Zkontroluj délku a strukturu souboru:
   * Pokud má komponenta přes 300 řádků, rozděl ji na menší subkomponenty.
2. Zkontroluj přísnost TypeScriptu (`npm run typecheck`).
3. Znovu spusť cílený test a ověř, že refaktoring nerozbil funkčnost.
