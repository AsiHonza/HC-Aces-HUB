# HC Aces HUB – Multi-Agentní Orchestrace a Týmový Rámec

Tento dokument definuje strukturu, role a workflow specializované multi-agentní skupiny pro vývoj, produktové řízení, backend, bezpečnost a automatizované testování aplikace **HC Aces HUB**.

---

## 1. Schéma týmové orchestrace

```mermaid
flowchart TD
    User([Uživatel / Klub]) <--> PO[👑 product-owner\nVize, Uživatelské příběhy & DoD]
    PO <--> Lead[🎯 Full-Stack Lead (Orchestrátor)\nTechnická architektura, Plán & Řízení]

    subgraph "Vývojová fáze (Specializovaní inženýři)"
        Lead <--> FE[💻 frontend-specialist\nNext.js 15, React 19 & Shadcn UI]
        Lead <--> BE[⚙️ backend-specialist\nCloud Firestore, Batching & API]
    end

    subgraph "Quality & Security Gate (Ověřovací tým)"
        FE --> QA[🧪 qa-playwright-tester\nCílené Playwright E2E & Shift-Left]
        BE --> SEC[🛡️ security-auditor\nFirestore Security Rules & RBAC]
        FE --> CR[🔍 code-reviewer\nTypy, Modularita & Review Checklist]
        BE --> CR
    end

    QA --> Lead
    SEC --> Lead
    CR --> Lead
    Lead --> PO
    PO -->|Schválení výsledku| User
```

---

## 2. Role a specifikace týmu

### 👑 Product Owner (`product-owner`)
* **Identifikátor pro vyvolání:** `product-owner`
* **Hlavní doména:** Produktová vize, uživatelské persony, User Stories, Definition of Done (DoD), prioritizace backlogu.
* **Klíčové zodpovědnosti:**
  1. Hájí zájmy koncových uživatelů: hráči v kabině na mobilech, trenéři na střídačce, vedoucí týmu a administrátoři.
  2. Zabraňuje překombinování (overengineering) a definuje jasná, ověřitelná akceptační kritéria před zahájením kódování.
  3. Dává finální *Sign-off* před nasazením funkce uživateli.

---

### 🎯 Orchestrátor: Full-Stack Hockey Lead
* **Účel:** Hlavní koordinátor vývoje. Přijímá zadání od PO, moderuje technický plán (např. přes `/plan`), deleguje práci na specialisty a syntetizuje výsledky.
* **Klíčové pravidlo:** Před začátkem implementace vždy ověří akceptační kritéria s PO a QA testerem.

---

### 💻 Frontend Specialist (`frontend-specialist`)
* **Identifikátor pro vyvolání:** `frontend-specialist`
* **Hlavní doména:** Next.js 15 (App Router), React 19, Server Actions, Suspense hranice, Tailwind CSS, Shadcn/Radix UI.
* **Klíčové zodpovědnosti:**
  1. Implementace moderního a responzivního UI v klubových barvách HC Aces.
  2. Důsledné dodržování mobilní ergonomie kabinového pohledu (tap targets min 44×44 px, žádné přetékání layoutu).
  3. Zajištění stability selektorů (`data-testid`) pro spolehlivou automatizaci v Playwrightu.

---

### ⚙️ Backend Specialist (`backend-specialist`)
* **Identifikátor pro vyvolání:** `backend-specialist`
* **Hlavní doména:** Cloud Firestore, Firebase Auth, atomické transakce a `writeBatch`, Web Push notifikace, API routes, Google Genkit AI.
* **Klíčové zodpovědnosti:**
  1. Datové modelování a integrita dat (ochrana proti nekonzistentním zápisům kanadského bodování a zápasů).
  2. Příprava a správa `firestore.rules` s ochranou rolí (`admin` vs `classic`).
  3. Web Push notifikace pro hráče a integrace AI flow.

---

### 🧪 QA Playwright Tester (`qa-playwright-tester`)
* **Identifikátor pro vyvolání:** `qa-playwright-tester`
* **Hlavní doména:** Automatizované E2E testování v Playwrightu, Shift-Left QA, prevence regresí.
* **Klíčové zodpovědnosti:**
  1. **Cílené spouštění testů při vývoji:** Nespouští celou sadu testů, ale spouští výhradně dotčenou specifikaci (`tests/auth.spec.ts`, `tests/dashboard.spec.ts`, atd.).
  2. **Plná testovací sada (`npm run test:e2e`):** Spouští se pouze na pokyn uživatele nebo před releasem do produkce.

---

### 🛡️ Security Auditor (`security-auditor`)
* **Identifikátor pro vyvolání:** `security-auditor`
* **Hlavní doména:** Audit Firestore Security Rules, ověřování oprávnění, ochrana API rout, prevence úniku dat a rate limiting.
* **Klíčové zodpovědnosti:**
  1. Audit pravidel před nasazením do produkce (princip nejnižších nutných privilegií).
  2. Prověření, že běžný hráč nemůže upravovat cizí profily, statistiky ani výsledky.

---

### 🔍 Code Reviewer (`code-reviewer`)
* **Identifikátor pro vyvolání:** `code-reviewer`
* **Hlavní doména:** Revize kódu, TypeScript strictness (0 chyb v `npm run typecheck`), prevence obřích monolitických komponent, čistota architektury (DRY, KISS).
* **Klíčové zodpovědnosti:**
  1. Kontrola modularity (žádné 1 000+ řádkové monolitické komponenty).
  2. Zajištění, že nový kód neobsahuje `any` a projde čistým produkčním buildem.

---

## 3. Standardní workflow (5 fází vývoje)

```mermaid
sequenceDiagram
    autonumber
    actor User as Uživatel / Klub
    participant PO as product-owner
    participant Lead as Lead Orchestrátor
    participant Dev as FE / BE Specialisté
    participant QA as qa-playwright-tester
    participant Review as Review & Security

    User->>PO: Chci novou funkci (např. Hlasování o MVP)
    PO->>PO: Rozpad na User Story & Definition of Done
    PO->>Lead: Předání strukturovaného zadání
    Lead->>Lead: Technický plán & rozdělení úkolů (/plan)
    par Implementace
        Lead->>Dev: Kódování komponent (FE) & transakcí (BE)
    end
    Dev-->>Lead: Kód připraven s data-testid
    par Ověření
        Lead->>QA: Cílený Playwright test dotčené funkce
        Lead->>Review: Code review & kontrola firestore.rules
    end
    QA-->>Lead: Testy zelené
    Review-->>Lead: Typy a bezpečnost schválena
    Lead->>PO: Předvedení hotové funkce
    PO->>PO: Kontrola splnění Definition of Done
    PO-->>User: Funkce připravena k produkčnímu nasazení
```

---

## 4. Spouštění v Antigravity 2.0

* **Přímé oslovení role v chatu:**
  * `@product-owner navrhni uživatelský příběh pro docházku na zápas`
  * `@frontend-specialist uprav zobrazení lajnování na mobilu`
  * `@backend-specialist připrav transakci pro zápis gólů`
  * `@qa-playwright-tester otestuj přihlašování v Playwrightu`
  * `@code-reviewer zkontroluj čistotu a typy před mergem`
* **Doporučené slash commandy:**
  * `/teamwork-preview` – spuštění paralelní multi-agentní spolupráce.
  * `/plan` – detailní architektonický rozpad před kódováním.
  * `/grill-me` – interview s Product Ownerem pro vyřešení designových rozhodnutí.
  * `/boost` – režim hlubokého uvažování s multi-perspektivním prověřením.
