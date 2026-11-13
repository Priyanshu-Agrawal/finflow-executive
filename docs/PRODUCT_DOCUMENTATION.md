# FinFlow Executive — Product Documentation

*Version 2.4.0 — Production Release (November 2026)*
*Platform Author: Priyanshu Agrawal (`Spiderfan.No1@gmail.com`)*
*System Codename: `scriptingBear • Executive OS`*

---

## Table of Contents

1. [Executive Summary & Vision](#1-executive-summary--vision)
2. [System Architecture & Technical Stack](#2-system-architecture--technical-stack)
3. [Core Product Modules](#3-core-product-modules)
4. [Mathematical Formulations & Formula Lineage Defense](#4-mathematical-formulations--formula-lineage-defense)
5. [API Reference & Route Handlers](#5-api-reference--route-handlers)
6. [Verification Suite & Quality Assurance](#6-verification-suite--quality-assurance)
7. [Operational & Deployment Guide](#7-operational--deployment-guide)
8. [Summary of Recent Milestones](#8-summary-of-recent-milestones-november-2026)

---

## 1. Executive Summary & Vision

**FinFlow Executive** is a personal sovereign wealth management system for forecasting personal cash flow, tracking multi-year debt amortization, and pacing daily budgets.

Most consumer finance apps keep your records in a proprietary database. FinFlow instead uses a **Google Sheets spreadsheet as its authoritative system of record** (`19MdOX_A-Nqw8a6rk77l4sNRQMAFcxudCp0ZmrHuqA_A`). Every figure the app shows can be traced back to a cell, and the sheet stays fully usable on its own.

A **Next.js 16 App Router** frontend talks to the sheet through the Google Sheets API v4 and adds:

- **Two-way live sync** — edits made in the app are written straight to the sheet; TanStack Query keeps the UI responsive with optimistic updates and background revalidation.
- **Formula Lineage Defense** — dynamic sheet formulas (the `=IF(...)` running balance, the cycle budget formulas on Rows 247–248) and every cross-tab reference survive logging, deletes, drag-and-drop reorders and date sorts.
- **4-Pillar Budget Pacing Engine** — real-time pacing for General Expenses (anchored to the salary cycle), the Electricity Recharge Budget (with prior-month surplus carryover), Room Rent, and the Safe Daily Spend (budget only, with an opt-in Hard month ceiling).
- **Multi-level global undo** (`Ctrl+Z` / `Cmd+Z`) — reverts cell edits, drag-and-drop moves and date sorts in both the UI and the sheet.
- **Unified Debt Amortization Hub** — deleveraging tracking across active and retired loans toward a debt-free milestone in August 2027 (+₹14,771/month unlocked cash flow).

```mermaid
flowchart TD
    User(["Executive User"]) <-->|"HTTPS / session cookies"| NextApp["FinFlow Executive OS<br/>Next.js 16 App Router"]

    subgraph UI_Layer ["Frontend Layer"]
        NextApp --> Dash["Home: Executive Hero"]
        NextApp --> Timeline["Cash Flow & Balance Timeline"]
        NextApp --> Engine["Budget: 4-Pillar Burn Engine"]
        NextApp --> Grid["Excel: Grid Engine"]
        NextApp --> Hub["Loans: Unified Debt Hub"]
        NextApp --> Ledger["Splits: Peer Ledger"]
    end

    subgraph Service_Layer ["Backend & Engine Layer"]
        Grid <--> Undo["Multi-Level Undo Engine"]
        Engine <--> Calc["Computations & Pacing Core"]
        Calc <--> FormulaDef["Formula Lineage Defense"]
        FormulaDef <--> SheetsClient["Google Sheets API v4 Client"]
    end

    subgraph Data_Layer ["Google Sheets Data Store"]
        SheetsClient <--> SheetExp[("Expenses tab<br/>314+ rows")]
        SheetsClient <--> SheetLoan[("Loans tab<br/>amortization matrix")]
        SheetsClient <--> SheetPeer[("Ledger tab<br/>peer splits")]
        SheetsClient <--> SheetAcc[("Meteor tab<br/>accessories & capital costs")]
    end
```

---

## 2. System Architecture & Technical Stack

### 2.1 Core technology stack

Versions below match `package.json`.

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Framework** | Next.js App Router | `16.4.6` (Turbopack) | Server rendering, route handlers, static optimization |
| **UI library** | React / React DOM | `19.3.0` | Component model |
| **Runtime** | Node.js | `20.20.0` (LTS) | Server runtime and API routing |
| **Language** | TypeScript | `5.x` | Strict typing and interface contracts |
| **Styling** | Tailwind CSS | `4.3.3` (via `@tailwindcss/turbopack`) | CSS-first config in `globals.css`; monochrome amber-accented theme (`#0B0B0C`, `#121214`) |
| **Icons** | Lucide React | `^1.71.0` | Status glyphs and micro-interactions |
| **Charts** | Recharts | `^3.10.1` | Balance timeline and spending breakdown |
| **Dates** | date-fns | `^4.4.0` | Cycle and anchor-date arithmetic |
| **State & cache** | TanStack React Query | `^5.107.1` | Optimistic mutations, background revalidation, query-key caching |
| **Backend store** | Google Sheets API v4 | `googleapis ^178.0.0` | Authoritative transactional store |
| **Auth** | JWT (`jose ^6.2.17`) + HTTP-only cookies | — | Access token + refresh token, LAN-IP aware |
| **Testing** | Playwright (Chromium) | `^1.65.0` | Headless visual and responsive end-to-end scripts |

### 2.2 Security & authentication

The login exists for privacy: when the app is reachable over the internet, nobody else can open your finances.

1. **Login** — `POST /api/auth/login` checks the submitted username and password against the `AUTH_USERNAME` / `AUTH_PASSWORD` environment variables (for the `scriptingBear` account) and issues signed HS256 JWTs (secret: `AUTH_SECRET`).
2. **Two-cookie token model** (both `httpOnly`, `sameSite=lax`):
   - `finflow_access_token` — short-lived (15 minutes), used to authorize pages and API calls.
   - `finflow_refresh_token` — long-lived (30 days); `POST /api/auth/refresh` exchanges it for a new access token.
3. **Route guard** (`src/middleware.ts`) — every route except `/login`, `/api/auth/*` and static assets needs a valid token. Unauthenticated API calls get `401`; page requests are redirected to `/login?from=<path>`.
4. **LAN HTTP compatibility** — the cookie `secure` flag is set only when the request is HTTPS *and* the host is not localhost or a private IP. This lets iPhones and other devices on the local network (e.g. `10.95.71.75:3000`) sign in over plain HTTP. `COOKIE_SECURE=true|false` overrides the detection, and `COOKIE_DOMAIN` scopes cookies to a custom domain.

> ⚠️ Keep `AUTH_PASSWORD` and `AUTH_SECRET` set in `.env.local`. Without them, `src/lib/auth.ts` falls back to defaults that are visible in the source code, which would defeat the privacy gate.

### 2.3 Application pages

As of the 13 Nov 2026 UI polish, every page shares one `AppFrame` (one `useFinancials` query, one reference date, one Log/EMI dialog state — `src/components/layout/AppFrame.tsx`) instead of each page repeating its own frame. Nav labels and URLs:

| Path | Nav label | Page |
|---|---|---|
| `/` | Home | Executive hero (data-driven copy), compact budget + debt summaries, balance timeline, spending breakdown (links into Ledger, filterable by category) |
| `/budget` | Budget | Full 4-Pillar Budget Burn & Runway Engine (moved off Home into its own page) |
| `/excel` | Excel | Excel Grid Engine |
| `/expenses` | Ledger | Expense table with edit modal, duplicate-entry alerts, and an optional `?category=` filter |
| `/log` | — | Quick transaction logger and EMI scheduler (dialog, not a nav destination) |
| `/loans` | Loans | Unified Debt Hub (portfolio, simulator, BCA cycle panel, milestone timeline) |
| `/ledger` | Splits | Peer Split Ledger |
| `/login` | — | Sign-in |

The app is also an installable PWA (service worker at `/sw.js`, registered from the root layout): see §8 for what it caches and the mobile-only install prompt.

---

## 3. Core Product Modules

```mermaid
graph LR
    A["FinFlow Executive OS"] --> B["1. Home: Executive Hero"]
    A --> C["2. Budget Burn Engine"]
    A --> D["3. Excel Grid Engine"]
    A --> E["4. Debt Amortization Hub"]
    A --> F["5. Splits: Peer Ledger"]
    A --> G["6. Timeline & Projections"]
```

### 3.1 Module 1: Home / Executive Hero

Gives an at-a-glance view of liquid capital, short-term obligations and cash runway. As of 13 Nov 2026 every sentence in this module is built from the live API response in `ExecutiveHero.tsx` (`src/lib/home-text.ts`) — there is no hardcoded money text or fixed growth percentage:

- **Current Liquid Operating Balance** — the settled bank balance as of the dynamic anchor date (e.g. **₹1,14,021** on 11 Nov 2026), computed by `anchorRowFor()` (last row dated ≤ the reference date), the same rule the integrity check uses.
- **Upcoming Immediate Bills (5-day horizon)** — every `DEBIT` dated tomorrow through 5 days ahead. Entries dated today are already paid and already inside the balance, so they are not counted again.
- **Post-Obligation Real Cushion / Cycle Cushion** — the lowest projected balance before the next salary.
- **Sovereign Wealth Projection** — the running balance on the last projected row, with a growth caption computed from the actual starting and projected balances.
- **Spending breakdown** — categorized by `computeSpendingCategories()` (server) / `categorizeExpenses()` (client, kept in parity by test); each category links into the Ledger (`/expenses?category=...`). The `Bhaiya Udhar` category (a personal loan between the owner and his brother, not spending — see §3.5) is excluded from this view only, via `homeSpendingCategories()`.

---

### 3.2 Module 2: 4-Pillar Budget Burn & Runway Engine

The pacing engine splits discretionary spending into separate pillars so one budget can't quietly drain another.

```mermaid
flowchart TD
    subgraph Pacing_Engine ["4-Pillar Budget Burn Engine"]
        P1["Pillar 1: General Expenses<br/>Cycle: 7th to 7th<br/>Budget: ₹15,000<br/>Daily burn: Remaining / Days"]
        P2["Pillar 2: Electricity Budget<br/>Base ₹3,000 + Surplus ₹200 = ₹3,200<br/>Recharged ₹800 · Remaining ₹2,400"]
        P3["Pillar 3: Room Rent<br/>Due: 15th of every month<br/>Amount ₹15,000 · Cushion ₹38,156"]
        P4["Pillar 4: Liquid Operating Buffer<br/>Available balance ₹1,14,021<br/>Safe daily spend ₹423/day (budget only)"]
    end
```

The defaults (₹15,000 general budget, ₹3,200 electricity budget, 7th budget day, 15th rent day) can be overridden per request through `GET /api/financials` query parameters (see [§5](#5-api-reference--route-handlers)).

#### Pillar 1: General Expenses Budget (₹15,000 monthly target)

- **Recurring anchor**: the salary day, **7th of every month**.
- **Formula**:
  $$\text{Safe Daily Spend} = \frac{\text{Remaining Expenses Budget}}{\text{Days Remaining in Cycle}}$$
  - *Worked example*: $\frac{₹11,000}{26\text{ days}} = ₹423\text{/day}$.
- **Each general spend is its own row** (e.g. `General Expenses`, `Food & Dining`, `Chai & Snacks`, `Bike Petrol`). A description counts as general when it matches `general|food|petrol|tea|chai|adhoc|grocery` and not `remaining|total general` — one shared rule (`GENERAL_EXPENSE_PATTERN` in `src/lib/computations.ts`) used by both the app and the sheet.
- **Remaining budget (app)** = ₹15,000 − every general spend logged in the current cycle up to today.
- **Cycle summary rows (sheet)**: `Total General Expenses` (`SETTLEMENT`, Row 247) adds up every general `DEBIT` dated in the cycle above it (see [§4.2](#42-cycle-total-formula-row-247)); `Remaining Expenses Budget` (`DEBIT`, Row 248) = `15000 - (C247)` reserves what is left, so the projection never counts a logged spend twice.

#### Pillar 2: Electricity Recharge Budget

- **Budget**:
  $$\text{Total Electricity Budget} = \text{Base Monthly Budget (₹3,000)} + \text{Previous Surplus (₹200)} = ₹3,200$$
- **Recharge lineage**:
  - Recharges done: **₹800** (Row 242, `SETTLEMENT`).
  - Remaining recharge budget: **₹2,400** (Row 243, `DEBIT`).
  - Daily allowance: **₹92/day** over the remaining cycle.
- **Design note**: the bank-side recharge budget is tracked separately from the physical meter balance. Meter credit doesn't expire, so mixing the two produced misleading countdowns.

#### Pillar 3: Room Rent Recurring Commitment

- **Anchor day**: 15th of every month (**₹15,000** fixed obligation).
- **Post-rent buffer**: tracks net liquidity after rent (**₹38,156**) so housing is fully funded before any discretionary spend.

#### Pillar 4: Safe Daily Spend & Hard Month Ceiling

- Owner rule (12 Nov 2026): daily spending comes from the expenses budget, never from savings.
  $$\text{Safe Daily Spend} = \frac{\text{Remaining Expenses Budget}}{\text{Days Remaining in Cycle}} = \frac{₹11,000}{26} = ₹423\text{/day}$$
- **Hard month** (toggle on the card, off by default) shows the worst case: the most you can spend without touching savings.
  $$\text{Hard Month Ceiling} = \frac{\text{Remaining Expenses Budget} + \max(0, \text{Projected Cycle Saving})}{\text{Days Remaining in Cycle}}$$
  Projected Cycle Saving = balance the day before the next salary − balance the day before this cycle's salary. For 7 Nov–6 Dec (12 Nov 2026): ₹18,156 − ₹56,021 = −₹37,865 (Phone EMI settlement and gifts), so the ceiling equals the safe spend.
- The post-rent cushion (Pillar 3) is still shown, but no daily figure is derived from it.

---

### 3.3 Module 3: Excel Grid Engine (`ExcelSpreadsheet.tsx`)

A desktop-style spreadsheet editor for the `Expenses` tab, running in the browser.

```mermaid
sequenceDiagram
    autonumber
    actor User as Executive User
    participant Grid as Excel Grid Engine
    participant Undo as Global Undo Stack
    participant Sheets as Google Sheets API v4

    User->>Grid: Edit cell / drag row / sort by date
    Grid->>Undo: Push inverse action
    Grid->>Sheets: Apply update and regenerate formulas
    Sheets-->>Grid: Confirm sheet updated
    Note over User,Grid: User presses Ctrl+Z / Cmd+Z or clicks the toast
    User->>Grid: Trigger undo
    Grid->>Undo: Pop last action
    Undo->>Sheets: Restore previous cell / row order / lineage
    Sheets-->>Grid: Lineage restored
```

#### Features

1. **Dynamic Date Anchor** — locates the latest actual transaction on or before today and anchors the view to it (Row 240 on 11 Nov 2026: `General Expenses ₹4,000 DEBIT`).
2. **Multi-level global undo**:
   - Keyboard shortcut `Ctrl+Z` (Windows/Linux) or `Cmd+Z` (macOS).
   - Floating toast with a countdown bar and a manual **Undo** button.
   - Reverts single-cell edits, drag-and-drop row moves and table sorts, writing the reversal back to Google Sheets.
3. **Drag-and-drop row reordering** — moves the whole row (Google Sheets `moveDimension`), so references in the Loans tab, column F notes and other formulas follow the transaction; Column E is then re-linked.
4. **Date-ordered logging** — a new transaction is inserted just before the first later-dated row (and above that day's cycle summary rows), or appended if it is the latest, so today's balance includes it immediately. Other references shift with the inserted row.
5. **Delete = clear** — deleting a transaction clears its values but keeps the row, so nothing that refers to Expenses rows by position (Loans tab, column F, `Dashboard_Data`) can break. A cleared row carries the balance forward and is hidden in the app; undo refills it. Rows 1–2 (header, opening balance) cannot be deleted.
6. **Formula preservation**:
   - Column C formulas (Row 247 cycle total, Row 248 `=15000-(C247)`) are kept intact across sorts, reorders and edits; an edit only replaces the formula when the amount itself is changed.
   - Column E balance formulas are never overwritten by edits (including the opening-balance and Time Lapse rows).
7. **Interactive controls**:
   - Row jump input (`Jump to Row #`).
   - Search across descriptions, dates and row numbers.
   - Transaction type selector: `DEBIT`, `CREDIT`, `SETTLEMENT`, `ADJUSTMENT`, `OTHER`, `DIRECT`.

---

### 3.4 Module 4: Unified Debt & Liabilities Hub (`LoanPortfolio.tsx`)

Tracks all 7 historical and active liabilities with their payoff schedules.

```mermaid
pie title Total Historical Liabilities (₹4,47,165)
    "Royal Enfield Meteor Bike Loan (Active, remaining)" : 94167
    "BCA Education Loan (Active, remaining)" : 12000
    "Diploma Due (Settled)" : 172025
    "Credit Card SBI (Settled)" : 25000
    "IDFC Credit Card (Settled)" : 26248
    "Sikarwar Due (Settled)" : 34670
    "Bhaiya Udhar (Settled)" : 18200
```

> **Reading the chart:** the title total uses each loan's original principal. The two active slices show *remaining* principal (Meteor ₹94,167 of ₹1,53,022; BCA ₹12,000 of ₹18,000), so the slices add up to less than the title.

#### Active amortizing liabilities

1. **Royal Enfield Meteor 350 Bike Loan**
   - Monthly EMI: **₹11,771** (debited on the 6th of each month from December 2026; earlier EMIs went out on the 2nd).
   - Principal remaining: **₹94,167** (38% amortized from an initial ₹1,53,022).
   - Final EMI: **6 July 2027** (Row 298) — EMI-free from **August 2027** (+₹11,771/month cash flow unlocked).
   - Prepayments: prepaid EMIs are accounted for. The Dec 2026 EMI was paid on 6 Nov (Row 236, `DEBIT`), so its 6 Dec row (Row 252) is logged as `SETTLEMENT` and doesn't reduce the balance twice.
2. **BCA Education Loan (active cycle)**
   - Monthly EMI: **₹3,000** (debited on the 5th of each month).
   - Principal remaining: **₹12,000** (2 of 6 instalments paid, 4 remaining).
   - Source of truth: `Loans!B2 === 18000` (restorable via `POST /api/loans/reset-bca`).
   - Payoff milestone: **5 March 2027** (+₹3,000/month cash flow unlocked).

#### Settled liabilities (100% retired)

| Liability | Original | Now |
|---|---|---|
| Credit Card SBI | ₹25,000 | **₹0** |
| Bhaiya Udhar (family ledger) | ₹18,200 | **₹0** |
| Diploma Due | ₹1,72,025 | **₹0** |
| IDFC Credit Card | ₹26,248 | **₹0** |
| Sikarwar Due | ₹34,670 | **₹0** |

**Terminal milestone**: by **August 2027** all 7 liabilities reach ₹0, freeing **+₹14,771/month** (₹11,771 + ₹3,000) for wealth accumulation.

#### Payment recording

`POST /api/loans/action` supports three actions:

| `action` | Effect |
|---|---|
| `log_payment` | You paid → appends a `DEBIT` row to `Expenses` (reduces bank balance). |
| `external_payment` | Someone else paid on your behalf → appends a `SETTLEMENT` row, so the bank balance is left untouched. |
| `settle_loan` | Sets the loan's balance cell in `Loans` (row 2 of `columnLetter`) to 0 and appends a `[Settled]` `SETTLEMENT` audit row. |

---

### 3.5 Module 5: Splits — Peer Ledger (`PeerLedgerTable.tsx`, route `/ledger`)

Handles shared expenses (roommate utilities, shared meals, bulk orders):

- Calculates each person's net share.
- Separates settled reimbursements from open receivables.
- Reads from and writes to the `Ledger` tab (reads arrive via `GET /api/financials`; new entries go through `POST /api/ledger`).

Not to be confused with the **`Bhaiya Udhar` expense category** (in the `Ledger` nav label at `/expenses`, i.e. the expense table, not this Splits tab): a personal loan between the owner and his brother, found by pairing same-date/same-amount/opposite-type rows around any transaction mentioning "bhaiya" (`findBhaiyaLinkedRows()` in `src/lib/computations.ts`). It is never counted as a gift or a spending leak, is excluded from Home's spending breakdown, but stays filterable from the Ledger expense table.

---

## 4. Mathematical Formulations & Formula Lineage Defense

### 4.1 Column E running-balance formula

Every regular row in the `Expenses` tab carries the same dynamic formula in Column E (generated by `buildBalanceFormula()` in `src/lib/sheets.ts`):

```excel
=IF(OR(D{row}="", D{row}="ADJUSTMENT", D{row}="SETTLEMENT", D{row}="OTHER", D{row}="DIRECT"), E{prev}, IF(D{row}="DEBIT", E{prev}-C{row}, IF(D{row}="CREDIT", E{prev}+C{row}, "")))
```

| Column D type | Effect on running balance (Column E) |
|---|---|
| `DEBIT` | Previous balance − amount |
| `CREDIT` | Previous balance + amount |
| `SETTLEMENT`, `ADJUSTMENT`, `OTHER`, `DIRECT`, blank | Carries previous balance forward unchanged |

This is why budget summary rows and third-party payments are logged as `SETTLEMENT`: they are recorded for audit without moving the bank balance.

#### Special gap-row protections

- **Row 38 (gap baseline reset)** — `=0`, applied to the row described as "Time Lapse Clear Balance".
- **Row 39 (2026 inception anchor)** — `=C{row}`, applied to the row described as "Time Lapse Start Balance" (currently `=C39`).
- The rule is matched by **description, not row number**, so it moves with these rows and can never be applied to an unrelated transaction that lands on Row 38 or 39.
- **Sorting safety** — `sortExpensesSheet()` leaves Row 2 (the opening row) in place and sorts Rows 3 onward by date (ties keep their order) by **moving whole rows**, the same as dragging them in Sheets. Every reference to a moved row — Loans tab, column F notes, Row 247/248 formulas — follows it; then every Column E formula is regenerated. Undo replays the inverse moves.

### 4.2 Cycle total formula (Row 247)

```excel
=SUMPRODUCT((OFFSET(A$1,2,0,ROW()-3)>=EDATE(INDEX(A:A,ROW())+1,-1))*(OFFSET(A$1,2,0,ROW()-3)<=INDEX(A:A,ROW()))*(OFFSET(D$1,2,0,ROW()-3)="DEBIT")*REGEXMATCH(LOWER(OFFSET(B$1,2,0,ROW()-3)),"general|food|petrol|tea|chai|adhoc|grocery")*(REGEXMATCH(LOWER(OFFSET(B$1,2,0,ROW()-3)),"remaining|total general")=FALSE),OFFSET(C$1,2,0,ROW()-3))
```

Sums the general-expense `DEBIT`s in the rows above it dated from the cycle start (one month before the day after the row's own date: 7 Nov for the 6 Dec row) to the row's own date. It finds its position with `ROW()`, so it keeps working after inserts, sorts and moves, and it never references its own cell. Generated by `buildCycleGeneralTotalFormula()` in `src/lib/sheets.ts`.

---

## 5. API Reference & Route Handlers

All routes except `/api/auth/*` require a valid session cookie.

### 5.1 Financial data

| Route | Method | Purpose | Parameters / payload |
|---|---|---|---|
| `/api/financials` | `GET` | Consolidated financial state: expenses, loans, peer ledger, Meteor data and computed KPIs | Query (all optional): `refDate`, `generalBudget`, `electricityBudget`, `budgetRecurringDay`, `rentRecurringDay`, `rentAmount`, `electricityRemaining` |

### 5.2 Expenses

| Route | Method | Purpose | Payload |
|---|---|---|---|
| `/api/expenses/log` | `POST` | Insert a transaction in date order (with its Column E formula); `date` defaults to today | `{ date, description, amount, type }` |
| `/api/expenses/schedule-emi` | `POST` | Append a series of monthly EMI rows | `{ title, monthlyAmount, months, startDate, type? }` (`type` defaults to `DEBIT`) |
| `/api/expenses/[row]` | `PATCH` | Update a row | `{ date, description, amount, type }` |
| `/api/expenses/[row]` | `DELETE` | Clear a transaction (Row 3 or later); the row stays so references elsewhere never break | — |
| `/api/expenses/[row]/type` | `PATCH` | Change a row's transaction type | `{ newType }` — one of `DEBIT`, `CREDIT`, `SETTLEMENT`, `ADJUSTMENT`, `OTHER`, `DIRECT` |
| `/api/expenses/reorder` | `POST` | Move a whole row (drag-and-drop); returns the inverse move for undo | `{ sourceIndex, targetIndex }` |
| `/api/expenses/sort` | `POST` | Sort by date with whole-row moves and re-link Column E; returns the inverse moves for undo | `{}` |
| `/api/expenses/restore` | `POST` | Undo support: replay row moves, or refill a cleared row | `{ actionType: "restore_order", previousOrder: { moves } }` or `{ actionType: "restore_row", rowIndex, data }` |

### 5.3 Loans and ledger

| Route | Method | Purpose | Payload |
|---|---|---|---|
| `/api/loans/action` | `POST` | Record a loan payment or settlement (see [§3.4](#payment-recording)) | `{ action, loanName, amount, date, notes?, payer?, columnLetter? }` |
| `/api/loans/reset-bca` | `POST` | Restore `Loans!B2` to ₹18,000 | `{}` |
| `/api/ledger` | `POST` | Add a peer-split entry | `{ date, amount, description, splitWith, perPersonShare }` |

### 5.4 Authentication

| Route | Method | Purpose | Payload |
|---|---|---|---|
| `/api/auth/login` | `POST` | Sign in and set both cookies | `{ username, password }` |
| `/api/auth/refresh` | `POST` | Issue a new access token from the refresh cookie | — |
| `/api/auth/me` | `GET` | Return the current session user | — |
| `/api/auth/logout` | `POST` | Clear both auth cookies | `{}` |

---

## 6. Verification Suite & Quality Assurance

### 6.1 Integrity audit

A 6-point integrity audit lives in [`src/scripts/integrity-check.ts`](../src/scripts/integrity-check.ts). It reads the live spreadsheet (no writes) and checks known anchors:

```bash
npm run integrity   # or: npx tsx --env-file=.env.local src/scripts/integrity-check.ts
```

| # | Invariant | What it protects |
|---|---|---|
| 1 | `Expenses!C15 === 30375` | Historical audit anchor |
| 2 | `Expenses!D235 === 'SETTLEMENT'` | Budget summary boundary |
| 3 | `Loans!B2 === 18000` | BCA loan principal baseline |
| 4 | `Expenses!E235` starts with the dynamic `=IF(OR(D235=…` formula | Column E formula lineage |
| 5 | Liquid balance on the anchor date is **₹1,14,021** (Row 240) | Authoritative balance calculation |
| 6 | Row 247 = `Total General Expenses` / ₹4,000 / `SETTLEMENT`; Row 248 = `Remaining Expenses Budget` / ₹11,000 / `DEBIT` ➔ ₹21,156 | December 6 cycle budget settlement & projection |

The script prints `FINAL AUDIT VERDICT: VERDICT: PASS ✅` only when all six checks pass.

### 6.2 Write-path simulation

```bash
npm run test:sim
```

[`src/scripts/simulate-write-paths.ts`](../src/scripts/simulate-write-paths.ts) takes a **read-only** snapshot of the live `Expenses` tab (columns A–F) and every Loans-tab reference into it, then runs the real write functions (log, delete, restore, edit, sort, reorder) against an in-memory copy that mimics Google Sheets' formula evaluation and reference shifting on row insert, delete and move. It first confirms the copy reproduces every live Column E balance and column F note, then checks that each operation keeps the balance chain intact, keeps every Loans reference and F note on the same transaction, and that undo restores the sheet exactly. The live sheet is never written.

### 6.3 End-to-end scripts

Playwright scripts in `src/scripts/` (`test-playwright.ts`, `test-executive-experience.ts`, `test-cycles-e2e.ts`, `test-lan-mobile-login.ts`) drive a running server for desktop/mobile visual checks and LAN login. Most target `http://localhost:3000`; `test-lan-mobile-login.ts` targets `http://10.95.71.75:3000`. Start the app first, then run one with `npx tsx <script>`.

---

## 7. Operational & Deployment Guide

### 7.1 Environment configuration (`.env.local`)

```env
# Google Sheets backend
SPREADSHEET_ID=19MdOX_A-Nqw8a6rk77l4sNRQMAFcxudCp0ZmrHuqA_A
GOOGLE_SERVICE_ACCOUNT_EMAIL=finflow-service@...iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Security & authentication
AUTH_USERNAME=scriptingBear
AUTH_PASSWORD=your_strong_password
AUTH_SECRET=a_random_string_of_at_least_32_characters

# Optional cookie settings
COOKIE_DOMAIN=.example.com   # only when serving from a custom domain
# COOKIE_SECURE=true         # force Secure flag on/off; auto-detected when unset
```

| Variable | Required | Description |
|---|---|---|
| `SPREADSHEET_ID` | Yes | ID of the backing Google Sheet |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Yes | Service account with edit access to the sheet |
| `GOOGLE_PRIVATE_KEY` | Yes | Service account private key (keep the quotes and `\n` escapes) |
| `AUTH_USERNAME` | Yes | Login username (`AUTH_USER` is accepted as an alias) |
| `AUTH_PASSWORD` | Yes | Login password |
| `AUTH_SECRET` | Yes | HS256 signing secret for JWTs |
| `COOKIE_DOMAIN` | No | Cookie domain for custom-domain hosting |
| `COOKIE_SECURE` | No | `true` / `false` to override automatic Secure-flag detection |

### 7.2 Running the app

```bash
# Development
npm run dev

# Production build
npm run build

# Production server
npm run start -- -p 3000
```

Before committing, run `npm run type-check`, `npm run integrity` and `npm run test:sim`.

### 7.3 Dual Git remotes

Every change is committed as `Priyanshu Agrawal <Spiderfan.No1@gmail.com>` and pushed to both remotes — `origin` (`finflow-executive`) and `app` (`finflow-app`):

```bash
git add src/ docs/
git commit --author="Priyanshu Agrawal <Spiderfan.No1@gmail.com>" -m "feat: ..."
git push origin main
git push app main
```

---

## 8. Summary of Recent Milestones (November 2026)

1. **Electricity budget streamlining** — separated the ₹2,400 remaining recharge budget from the physical meter balance, removing an artificial expiry runway.
2. **Dynamic Date Anchor** — the baseline now follows today's date (`2026-11-11`), anchoring Row 240 at a ₹1,14,021 liquid balance.
3. **Multi-level global undo** (`Ctrl+Z` / `Cmd+Z`) — non-destructive undo for cell edits, drag-and-drop moves and auto-sorting.
4. **Prepaid December EMI accounting** — amortization tracking now handles the December bike EMI prepaid on 6 November.
5. **Formula lineage preservation** — Column C and Column E formulas are protected across all table mutations.
6. **Sheet-safe write paths (11 Nov)** — logging inserts by date, delete clears instead of removing rows, sort and drag-reorder move whole rows; the Loans tab, column F notes and `Dashboard_Data` stay on the same transactions. The sheet was sorted by date on 11 Nov (a backup tab `Expenses backup 2026-11-11` was kept).
7. **Per-spend general budget (11 Nov)** — each general spend is logged separately; Row 247 sums them for the cycle and the app's remaining budget follows every logged spend.
8. **Upcoming bills exclude today (11 Nov)** — the 5-day horizon starts tomorrow, since today's entries are already paid (₹75,865).
9. **Old-UI consistency pass (13 Nov)** — one navigation (Home/Ledger/Excel/Loans/Splits/Budget) via a shared `AppFrame`, one page frame, one sticky Today control, one type system, blue credits, 44px tap targets, every page fits on phone without sideways scroll, and every piece of dashboard copy is now computed from live data instead of hardcoded. New `Bhaiya Udhar` expense category (a personal loan, not spending). Spending-breakdown categories link into the Ledger, filterable.
10. **Installable PWA (13 Nov)** — the service worker now covers the whole app (not just the parked `/v2` shell): caches the app shell and the last successful `/api/financials` response only, serves that read-only copy with a visible "Showing saved copy from HH:MM" banner and a "Synced N min ago" chip when a request genuinely fails, clears the cache on sign-out, and disables all writes while offline (`networkMode: 'always'` fails fast rather than queueing against row numbers that may have shifted). Install prompt is mobile-only by owner decision — laptop/desktop stays a website. Full detail, including the Critical bug this surfaced and fixed (the banner was initially dead code because of TanStack Query's default `networkMode`), is in `docs/HANDOVER_2026-11-13.md`.
11. **Integrity check no longer pinned to fixed row numbers (13 Nov)** — `src/scripts/integrity-check.ts` locates rows by date + description instead of hardcoded cell refs, so a back-dated log entry that shifts rows no longer produces false failures.
