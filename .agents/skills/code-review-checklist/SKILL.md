---
name: code-review-checklist
description: >-
  Kompletní kontrolní seznam pro revizi kódu v projektu HC Aces HUB.
  Používá se před commitem do větví develop nebo main k ověření typů,
  modularity, výkonu, bezpečnosti a mobilní ergonomie.
---

# Code Review Checklist: HC Aces HUB

Použij tento kontrolní seznam pro prověření kódu před jeho začleněním do větví `develop` a `main`.

---

## 1. Architektura a modularita
- [ ] **Žádné obří komponenty:** Soubor nepřekračuje ~300–400 řádků. Složitá logika a dílčí části UI jsou rozděleny do subkomponent ve vyhrazené složce.
- [ ] **Jednoznačná zodpovědnost:** Komponenta řeší pouze jednu věc (např. prezentační karta vs. orchestrátor filtrů).
- [ ] **Znovupoužitelnost:** Sdílené utility, ikonové pomocníky a typy jsou umístěny ve společných modulech.

---

## 2. Next.js 15 & React 19
- [ ] **Klientské vs. Serverové komponenty:** `'use client'` je použito pouze tam, kde je potřeba stav, efekty nebo browser události.
- [ ] **Suspense hranice:** Pokud komponenta používá `useSearchParams()`, je obalena v `<Suspense>` pro prevenci chyb dehydratace při sestavení.
- [ ] **Server Actions:** Formulářové mutace využívají moderní React 19 hooky (`useActionState`, `useFormStatus`).

---

## 3. Typová bezpečnost (TypeScript)
- [ ] **0 typových chyb:** Příkaz `npm run typecheck` (`tsc --noEmit`) proběhne s kódem 0.
- [ ] **Žádné `any`:** Všechny objekty, parametry a props mají striktně definované typy nebo interfaces.
- [ ] **Ošetření null/undefined:** Přístupy k vnořeným vlastnostem využívají optional chaining (`?.`) a defaultní hodnoty.

---

## 4. Mobilní ergonomie (Kabinový pohled)
- [ ] **Responzivita bez přetékání:** Žádný prvek nezpůsobuje nechtěný vodorovný scroll na šířkách od 360 px.
- [ ] **Tap targets:** Klikací prvky (tlačítka, čipy, karty) mají minimální rozměr 44×44 px pro snadné ovládání prstem.
- [ ] **Čitelnost:** Texty v aplikaci mají minimální velikost 11–12 px i na malých displejích.

---

## 5. Bezpečnost a Cloud Firestore
- [ ] **Bezpečnostní pravidla:** Každé nové pole či kolekce je pokryto odpovídajícími podmínkami ve `firestore.rules`.
- [ ] **Atomické operace:** Složené zápisy (např. výsledek utkání + statistiky hráčů + milníky) používají `writeBatch` nebo `runTransaction`.
- [ ] **Žádné unáhlené mazání:** Destruktivní operace vyžadují potvrzovací dialog.
