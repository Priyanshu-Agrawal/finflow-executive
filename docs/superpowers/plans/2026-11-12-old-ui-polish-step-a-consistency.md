# Old UI polish, Step A (consistency pass) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing dark and amber FinFlow UI consistent: one shared page frame, one navigation, one type system, one date and money format, sticky headers and a Today button wherever they belong, a fitting phone layout, and credits in blue, proven by a measured `npm run audit:ui`.

**Architecture:** A shared `AppFrame` (route group `(app)`) owns the navbar, bottom bar, Log and EMI modals and the reference date, so route pages shrink to a `PageHeader` plus their content. Small shared UI primitives (`PageHeader`, `DataState`, `TodayFab`, `StickyBar`) and format helpers replace per-page copies. An audit script encodes the ten rules and goes from red to green task by task. No money, sheet or API logic changes.

**Tech Stack:** Next 16.4.6 App Router, React 19, Tailwind 4, TanStack Query 5, lucide-react, Playwright (system Chrome), `node:test` via `npx tsx --test`, Node 22 (`nvm use`).

**Spec:** `docs/superpowers/specs/2026-11-12-old-ui-polish-design.md` (rules 1 to 10 and the audit table). Owner decisions made 12 Nov: names **Home, Ledger, Excel, Loans, Splits, Budget**; **credits blue**.

## Global Constraints

- Read the relevant Next 16 docs in `node_modules/next/dist/docs/` before Next-specific code (route groups, layouts) per AGENTS.md.
- **Today's balance and every figure must not change.** `npm run integrity` (CHECK 5 ₹1,14,021) and `npm run test:sim` 58/58 before the first task and after the last; each screen's numbers must equal the `/api/financials` response.
- **No feature loss:** edit, clone, delete, bulk delete, type toggle, drag reorder, sort, undo, loan actions, EMI scheduler, CSV export, Today anchor at 30%, floating Today, optimistic drag, hard month toggle, config drawer all keep working.
- **URLs do not change:** `/`, `/expenses`, `/excel`, `/loans`, `/ledger`, `/log`, `/login`, `/api/*`. New: `/budget`. `/v2` stays untouched (hidden).
- Keep: dark theme `#0B0B0C`, amber accent, existing card and chart look. Restyle, do not rewrite components.
- Type: sans (Geist) everywhere; serif (Newsreader) only for the FinFlow wordmark and the Home hero balance; mono (JetBrains Mono) only in the Excel grid, formula bar and row numbers. No wide-tracked all-caps labels. Text at least 12 px (11 px allowed only for table heads at laptop width).
- Dates `12 Nov 2026` (lists `Thu 12 Nov`), ISO only in the formula bar and CSV; money `₹1,14,021` with a real minus.
- Credit and saved amounts use the new `--credit` blue token (same blue as the savings meter, `#3b82f6`); debits neutral; over and negative orange; amber is the action and brand colour.
- Tap targets at least 44 px at phone width; every icon-only button has `aria-label`; no page wider than the viewport; visible focus.
- Git: branch `polish-a` (exists, from `main`); commit as `Priyanshu Agrawal <Spiderfan.No1@gmail.com>` with the session attribution trailer; do not push `main` or `app` until the owner has seen the result on a phone and a laptop. Test builds use `NEXT_DIST_DIR=.next-polish` and `git checkout tsconfig.json` afterwards; never overwrite `.next` while the :3000 server uses it.
- Sheets read quota is 60 reads a minute: tests reuse one captured financials response through `page.route`; never write to the live sheet (intercept every write).

## Review Focus

1. Renamed labels and moved pages must not break URLs, bookmarks, the login `from=` redirect, or the existing Playwright scripts that look for old text. (Tasks 3, 10)
2. The shared reference date must survive navigation, "Today" must reset it, and the hard-coded "10 Nov (Audit Anchor)" preset in the Navbar must be derived from data, not fixed. (Task 3)
3. Sticky page bar plus sticky table header plus the top bar must stack correctly on phone (with the bottom bar and safe areas) and on laptop, and horizontally scrolling tables must keep header and body columns aligned. (Task 5)
4. Dense phone layouts must still reach every existing action; hiding text must not hide a control. (Tasks 5, 7)
5. The floating Today button must not cover the bottom bar, the undo toast or the Excel formula bar. (Task 5)
6. Blue credits must stay distinguishable from amber actions and from the blue "lowest point" accents, and status must never rely on colour alone. (Task 8)

---

### Task 1: Audit script (the red baseline)

**Files:**
- Create: `scripts/` is not used; create `src/scripts/audit-ui.cjs`
- Modify: `package.json` (`"audit:ui": "node --env-file=.env.local src/scripts/audit-ui.cjs"`)

**Interfaces (Produces):** `npm run audit:ui [-- --base=http://localhost:3007] [-- --report]` signs in with `AUTH_USERNAME`/`AUTH_PASSWORD`, captures `/api/financials` once, re-serves it to every page via `page.route`, visits `/`, `/budget`, `/expenses`, `/excel`, `/loans`, `/ledger`, `/log` at 390x844 and 1440x900, prints `PASS`/`FAIL` per rule per route, exits 1 on any FAIL, and with `--report` writes `/tmp/audit.json` and screenshots.

Checks per route (each a named line): **R1** nav labels (top menu and bottom bar) equal `['Home','Ledger','Excel','Loans','Splits']` plus a Budget entry, `h1` text equals the route's label, and `/` contains no inner tab strip; **R2** exactly one `h1`, no second heading with the same text, and on phone at most 300 px between the top of the page and the first table row on `/expenses` and `/excel`; **R3** every table header (`thead` or the Excel header row) has `position: sticky`, and the page control bar is sticky; **R4** a floating Today button exists on `/expenses` and `/excel` only and scrolls the anchor row to 30% (±5%) from the top of its scroller; **R5** no text item under 12 px (11 px allowed for `th`/header cells at laptop width), no `text-transform: uppercase` with `letter-spacing` over 0.05em, mono text only inside the Excel grid, the formula bar and row-number cells, serif only in the wordmark and the Home hero balance; **R6** no visible ISO date (`\d{4}-\d{2}-\d{2}`) outside the Excel grid/formula bar; **R7** CREDIT amounts use the credit blue and no element uses an emerald/green text or border class for credits; **R8** `scrollWidth <= viewport width` on every route at phone width; **R9** at phone width every button/link in the top bar, bottom bar and page controls is at least 44 px tall, and every icon-only button has `aria-label`; **R10** none of the known hard-coded strings appear (`58k`, `100.7%`, `August 2027`, `10 Nov (Audit Anchor)`, `Anchor: 12 Nov 2026` when the anchor row's date differs) and the hero's upcoming-bills caption names the real bills from the response.

- [ ] **Step 1:** Write the script with all ten rules as functions returning `{ok, detail}`; no rule may pass vacuously (a missing element fails).
- [ ] **Step 2:** Run it against the current build (`:3000`) and save the output to `docs/superpowers/plans/step-a-baseline-audit.txt` (many FAIL lines are expected). Expected: exit code 1, R1, R2, R3, R4, R5, R6, R7, R8, R10 each fail on at least one route.
- [ ] **Step 3: Commit** `test(ui): audit script for the ten consistency rules (baseline red)`.

### Task 2: Format helpers and shared primitives

**Files:**
- Create: `src/lib/format.ts`, `src/lib/format.test.ts`, `src/components/ui/PageHeader.tsx`, `src/components/ui/DataState.tsx`, `src/components/ui/TodayFab.tsx`, `src/components/ui/StickyBar.tsx`
- Modify: `package.json` (`test:unit` also finds `src/lib` and `src/components` test files)

**Interfaces (Produces):**
- `formatDate(iso: string): string` → `12 Nov 2026`; `formatDateShort(iso: string): string` → `12 Nov`; `formatWeekdayDate(iso: string): string` → `Thu 12 Nov`; `formatMoney(v: number): string` → `₹1,14,021`, negatives `−₹5,000`, non-finite `₹0`; `formatMoneySigned(v: number): string` → `+₹9,200` / `−₹9,200`.
- `PageHeader({ title, description?, actions? })` renders the single `h1`, an optional one-line description hidden below `sm`, and the actions row.
- `DataState({ isLoading, error, onRetry, label, children })` renders a spinner with `label`, or an error card with a **Retry** button (same on every page), or `children`.
- `StickyBar({ children })` sticky below the top bar (offset equals the top bar height token), z-index below the top bar, above table headers.
- `TodayFab({ visible, onClick })` fixed bottom right, 44 px minimum, offset above the phone bottom bar and the undo toast (`bottom` token), label "Today".

- [ ] **Step 1: Write failing tests** for the five format functions: `formatDate('2026-11-12')` is `12 Nov 2026`; `formatDateShort` `12 Nov`; `formatWeekdayDate` `Thu 12 Nov`; `formatMoney(114021)` `₹1,14,021`; `formatMoney(-5000)` `−₹5,000`; `formatMoney(NaN)` `₹0`; `formatMoneySigned(9200)` `+₹9,200`, `formatMoneySigned(-9200)` `−₹9,200`.
- [ ] **Step 2: Run** `npm run test:unit` → FAIL.
- [ ] **Step 3: Implement** `format.ts` (local calendar, no time zones; `Intl.NumberFormat('en-IN')`) and the four components (no tests beyond type-check; they are exercised by the audit).
- [ ] **Step 4: Run** `npm run test:unit` and `npm run type-check` → PASS. **Step 5: Commit** `feat(ui): format helpers and shared page primitives`.

### Task 3: AppFrame, one navigation, shared reference date

**Files:**
- Create: `src/components/layout/nav-items.ts`, `src/components/layout/AppFrame.tsx`, `src/components/layout/FrameContext.tsx`, `src/app/(app)/layout.tsx`
- Move (git mv, URLs unchanged): `src/app/page.tsx`, `expenses/`, `excel/`, `loans/`, `ledger/`, `log/` into `src/app/(app)/`; `login/`, `api/`, `v2/`, `layout.tsx`, `providers.tsx`, `manifest.ts`, `globals.css` stay.
- Modify: `src/components/layout/Navbar.tsx`; every moved page (strip the copied frame)

**Interfaces:**
- Produces: `NAV_ITEMS: Array<{ label: 'Home'|'Ledger'|'Excel'|'Loans'|'Splits'|'Budget'; href: string; icon: LucideIcon; phone: boolean }>` with hrefs `/`, `/expenses`, `/excel`, `/loans`, `/ledger`, `/budget`; the phone bottom bar shows Home, Ledger, Excel, Loans (Budget and Splits in the "More" menu); the laptop top menu shows all six.
- Produces: `useFrame(): { referenceDate: string; setReferenceDate(d: string): void; resetToToday(): void; openLog(): void; openEmi(): void; refetch(): void; isFetching: boolean }` from `FrameContext`; `AppFrame` renders `Navbar`, the bottom bar, the Log and EMI modals, and `<main>` with one max width and one padding scale, and persists `referenceDate` in the context for the session.
- The audit-anchor preset in the Navbar date popover is derived from the data (`kpis`/anchor row date), never a literal.

- [ ] **Step 1:** Run `npm run audit:ui`; R1 fails (old names, inner tab strip).
- [ ] **Step 2:** Implement `nav-items.ts`, `FrameContext`, `AppFrame`, `(app)/layout.tsx`; make `Navbar` read `NAV_ITEMS` and the context; use `formatDateShort` for its date pill. Move the pages with `git mv` and delete their duplicated Navbar, modal and loading/error code, using `DataState`.
- [ ] **Step 3:** Verify by `npm run type-check`, `npm run build` into `.next-polish`, and `npm run audit:ui -- --base=…` R1 passes on all routes except the Home tab strip and `/budget` (Task 4). All six existing routes respond 200 signed in and redirect to `/login?from=…` signed out; the auth probe `PATCH /api/expenses/240.x` is 401.
- [ ] **Step 4: Commit** `refactor(ui): one AppFrame, one navigation list, shared reference date`.

### Task 4: Home loses its tab strip; Budget becomes a page; hero text from data

**Files:**
- Create: `src/app/(app)/budget/page.tsx`
- Modify: `src/app/(app)/page.tsx`, `src/components/dashboard/ExecutiveHero.tsx`, `src/components/dashboard/KPICards.tsx` (if still referenced), `src/components/dashboard/ModernBudgetPacing.tsx` (moved, unchanged logic)

**Interfaces:** Home renders `PageHeader title="Home"`, `ExecutiveHero`, `BalanceTimeline`, `SavingsMeter`, `SpendingBreakdown`, loan and milestone summaries, each section linking to its page; no tab strip. `/budget` renders `PageHeader title="Budget"` and `ModernBudgetPacing` plus the config drawer (state moved from Home into `/budget`). `ExecutiveHero` builds every caption from `kpis`/`loans`/`bcaCycle`: upcoming-bills caption lists the real bills in the next 5 days from `expenses` with `formatMoney`; the cushion caption uses `kpis.cushionUntil`; the growth percent is computed from `kpis.currentBalance` and `kpis.projectedEndBalance` or removed; the debt-free line uses the latest `targetPayoffDate` among active loans and the sum of their `monthlyEmi`; the anchor chip shows the date of the anchor row used for the balance.

- [ ] **Step 1:** Run `npm run audit:ui` → R1 (tab strip, `/budget` 404) and R10 fail.
- [ ] **Step 2:** Implement the Home and Budget pages and the data-driven hero text.
- [ ] **Step 3:** `npm run audit:ui` R1 and R10 pass; `type-check` clean; Home balance, cushion and projected end equal the API.
- [ ] **Step 4: Commit** `feat(ui): Budget page, Home without tab strip, hero text from data`.

### Task 5: Page frame, sticky headers, one Today button

**Files:**
- Modify: `src/components/expenses/ExpenseTable.tsx`, `src/components/excel/ExcelSpreadsheet.tsx`, `src/components/ledger/PeerLedgerTable.tsx`, `src/components/loans/LoanPortfolio.tsx`, each route page (use `PageHeader`)

**Interfaces:** every route page begins with `PageHeader` (title = its `NAV_ITEMS` label; descriptions are one plain sentence, e.g. Ledger "Every transaction, past and planned."; marketing and developer wording removed; no second card title repeating the page title). In `ExpenseTable`, `PeerLedgerTable` and the loan tables the header row is `position: sticky` below the `StickyBar` that holds search, filters and view switches. `TodayFab` is shown in `ExpenseTable` and `ExcelSpreadsheet` when the anchor row is out of view, and replaces both the inline "Focus Today / Nearest" button and the Excel floating button; it uses `placeRowInView` (`src/lib/scroll-anchor.ts`) so the anchor lands at 30%.

- [ ] **Step 1:** `npm run audit:ui` → R2, R3, R4 fail.
- [ ] **Step 2:** Implement per the interfaces; verify stacking at 390 px (top bar, page bar, table header, bottom bar, safe area) and 1440 px; check horizontal scroll keeps header columns aligned.
- [ ] **Step 3:** `npm run audit:ui` R2, R3, R4 pass; existing Excel anchor test behaviour (30%, no animation on first load) still holds.
- [ ] **Step 4: Commit** `feat(ui): one page frame, sticky headers and one Today button`.

### Task 6: Typography and copy sweep

**Files:** modify the components under `src/components/**` and `src/app/(app)/**` that use `font-mono`, `font-serif`, `uppercase`, `tracking-*`, or text below 12 px (the audit lists them); `src/app/globals.css` (type utilities).

**Interfaces:** utility classes `fin-label` (sans, 12 px, medium, secondary colour, sentence case), `fin-num` (sans, tabular figures), `fin-table-head` (sans, 12 px; 11 px at `lg`). Replace patterns: wide-tracked all-caps labels become `fin-label`; mono amounts and ids become `fin-num` except in the Excel grid, formula bar and row-number cells; serif remains only on the wordmark and the Home hero balance. Copy: remove "Sovereign Wealth Portfolio", "Formula Chain Verified", "Matrix View", "Formula Lineage", "Ledger Master", "High-Performance", "Initializing FinFlow Excel Grid Engine..." and similar; use plain names ("Home", "Balance now", "Ledger"). Button names: one name per action everywhere ("Log" for the primary log button, "Schedule EMI").

- [ ] **Step 1:** `npm run audit:ui` → R5 fails with the list of offending elements.
- [ ] **Step 2:** Sweep component by component, re-running the audit after each group (Home components, Ledger, Excel, Loans, Splits, Log, Navbar and modals).
- [ ] **Step 3:** `npm run audit:ui` R5 passes; screenshots of every route at both sizes look right by eye.
- [ ] **Step 4: Commit** `style(ui): one type system and plain copy`.

### Task 7: Phone fit (Ledger, Excel, Splits, Home overflow)

**Files:** `src/components/expenses/ExpenseTable.tsx`, `src/components/excel/ExcelSpreadsheet.tsx`, `src/components/ledger/PeerLedgerTable.tsx`, `src/app/(app)/page.tsx` and the components that overflow

**Interfaces:** on phone, Ledger collapses the description, the "213 earlier transactions" banner and secondary controls into a "Details" disclosure so that the first row is within 300 px of the page top; Excel on phone pins row number and Description, scrolls Amount, Type and Balance horizontally, shows dates as `12 Nov` on one line, and its toolbar fits in two rows; Splits' person filters scroll inside their own container and its table either scrolls inside a container with a sticky first column or becomes cards, with header labels fully visible; Home and Splits no longer exceed the viewport (find the overflowing elements with the audit's `wide` output).

- [ ] **Step 1:** `npm run audit:ui` → R2 (phone offset) and R8 fail.
- [ ] **Step 2:** Implement; keep every action reachable (edit, clone, delete, drag handle or reorder, type toggle, sort, CSV).
- [ ] **Step 3:** R2 and R8 pass; a manual pass at 390 px of each action on Ledger and Excel.
- [ ] **Step 4: Commit** `fix(ui): phone layouts for Ledger, Excel and Splits`.

### Task 8: Blue credits

**Files:** `src/app/globals.css` (token `--credit: #3b82f6`, `--credit-soft`), `ExpenseTable.tsx`, `ExcelSpreadsheet.tsx`, `PeerLedgerTable.tsx`, `ExecutiveHero.tsx`, `BalanceTimeline.tsx` tooltips, `EditExpenseModal.tsx`, any component using emerald for credits

**Interfaces:** credits, inflow, "saved" and CREDIT badges use `--credit`; debit badges stay neutral; settlement badges keep amber; over and negative use orange (same as the savings meter); every credit shows `+` and the word CREDIT, so colour is never the only signal.

- [ ] **Step 1:** `npm run audit:ui` → R7 fails. **Step 2:** replace emerald/green credit styling with the token. **Step 3:** R7 passes; contrast of `--credit` on `#0B0B0C` and `#121214` is at least 4.5:1 (checked in the audit).
- [ ] **Step 4: Commit** `style(ui): blue credits matching the savings meter`.

### Task 9: Tap targets and labels

**Files:** `Navbar.tsx`, bottom bar, page control components, modals

**Interfaces:** at phone width every top-bar, bottom-bar and page control is at least 44 px tall (padding, not larger text); icon-only buttons get `aria-label`; focus rings visible on all of them.

- [ ] **Step 1:** `npm run audit:ui` → R9 fails. **Step 2:** fix. **Step 3:** R9 passes. **Step 4: Commit** `fix(ui): 44 px targets and labelled icon buttons`.

### Task 10: Verification, existing tests, owner review

- [ ] **Step 1:** `npm run type-check`, `npx eslint` on changed files (no new errors vs. baseline 13 in the Sheets files and the repo's existing count), `npm run test:unit` all pass.
- [ ] **Step 2:** Update `src/scripts/test-executive-experience.ts`, `test-cycles-e2e.ts` and `test-lan-mobile-login.ts` for renamed labels (they look for "Loans & Payoff", "Ledger (314+)", "Configurable Budget & Cycle Pacing" and similar) and run them against the new build.
- [ ] **Step 3:** `npm run test:sim` 58/58 and `npm run integrity` 6/6 (CHECK 5 ₹1,14,021), spaced 30 s apart; the auth probe on the new build is 401.
- [ ] **Step 4:** `npm run audit:ui` all PASS at both sizes; before and after screenshots for every route at phone and laptop saved for the owner.
- [ ] **Step 5:** Rebuild the local :3000 server from the branch (Node 22, documented command) so the owner can view it on the phone (`http://10.95.71.75:3000`) and the laptop; wait for the owner's review; only then merge to `main`, push both remotes, verify the Vercel deploy and the live site (balance, auth probe, all routes), and update the board and `Now.md`.

---

## Self-review notes

- Spec coverage: rules 1 (Task 3, 4), 2 (Task 5), 3 (Task 5), 4 (Task 5), 5 (Task 6), 6 (Tasks 2, 6, 7), 7 (Task 8), 8 (Task 7), 9 (Task 9), 10 (Task 4); the audit (Task 1) proves each. Steps B (PWA), C (Excel power), D (laptop layout) are separate plans.
- Types and names defined once: `NAV_ITEMS`, `useFrame`, `PageHeader`, `DataState`, `StickyBar`, `TodayFab`, `formatDate*`, `formatMoney*`, `--credit`, `fin-label`/`fin-num`/`fin-table-head`.
- Risk: moving pages into a route group is the largest mechanical change; it is done in one commit with a build and a six-route smoke test before any visual work.
