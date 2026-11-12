# FinFlow UI remake, Phase 0 (foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the tested foundation of the remake under `/v2`: pure date-order and balance-line logic, an undo/redo history, a sync write queue, the themed responsive shell with five placeholder tabs on live data, and an installable PWA skeleton, without touching the current UI at `/`.

**Architecture:** New code lives in `src/v2/` (pure logic, stores, shell, PWA helpers) and `src/app/v2/` (routes). Pure logic is plain TypeScript with `node:test` unit tests; stores are framework-free and exposed to React through `useSyncExternalStore`. The existing data layer (`useFinancials`, `/api/*`, `src/lib/*`) is reused unchanged; the old components are not imported.

**Tech Stack:** Next 16.4.6 App Router, React 19, Tailwind 4 (only for layout utilities; colours come from CSS variables), TanStack Query 5, `node:test` via `npx tsx --test`, Playwright (installed) with system Chrome.

**Spec:** `docs/superpowers/specs/2026-11-12-ui-remake-design.md` (sections 2, 3, 4.2, 4.3, 5, 6, 8, 9, 10 phase 0).

## Global Constraints

- **Read the Next 16 docs before Next code** (AGENTS.md): under `node_modules/next/dist/docs/01-app/` read the manifest file convention, `viewport`/`themeColor`, `headers` in config, `distDir`, and `next/font`. They differ from older Next.
- **Today's balance must not change.** Before the first task and after the last, `npm run integrity` must pass and the live dashboard balance be ₹1,14,021 (CHECK 5). Never write to the live sheet; only reads.
- **The current UI at `/` and every existing API route behave exactly as before.** Only `middleware.ts` (add `html` to the static-extension list), `next.config.ts` (headers, `distDir`), `package.json` (scripts), `.gitignore` change outside `src/v2`, `src/app/v2`, `public/`.
- **Do not import** anything from `src/components/**` or `src/context/**`. Allowed: `src/hooks/useFinancials.ts` (`useFinancials`), `src/lib/types.ts`, `src/lib/row-move.ts`, `src/lib/computations.ts`, `src/lib/date-utils.ts`. Never import `src/lib/sheets.ts` or `googleapis` from client code (a unit test may import `findChronologicalInsertRow` from `sheets.ts` for parity).
- Colour means money direction only: blue saved/received, orange over/negative. Tokens defined once as CSS variables; no hard-coded hex in components.
- Touch targets ≥ 44 px, visible focus, reduced motion respected, no horizontal page scroll at 360 px.
- Sentence-case copy, no all-caps labels, no emoji.
- Git: work on branch `v2-remake` (create from `main`). Commit with `--author="Priyanshu Agrawal <Spiderfan.No1@gmail.com>"` and end each message with the attribution trailer the session specifies. Do not push `main` or the `app` remote until the owner approves (pushing `app/main` deploys to production).
- Production build for tests uses `NEXT_DIST_DIR=.next-v2`; never run `npm run build` into `.next` (the live server on :3000 uses it).

## Review Focus

1. Rows with an empty date (cleared rows) must be ignored by the order check, not flagged and not break it. (Task 2)
2. Equal dates are in order; a tie between "flag this row" and "flag that row" resolves to flagging the later-dated row, deterministically. (Task 2)
3. Position beats date for today's balance: a future-dated row sitting early stops the balance reading. Dragging across that line must report the right "counted/no longer counted" rows. (Tasks 3, 4)
4. An undo whose inverse fails must leave the history unchanged and say why; a new change clears redo; the 50-entry limit drops the oldest. (Task 5)
5. A failed or conflicting write must roll back its own optimistic change and cancel the writes queued behind it; offline must refuse writes with the reason, not queue them. (Task 6)
6. The service worker must never cache `/api/*` or `/login`, and the offline page must be reachable without a session while `/api/expenses/240.x` still returns 401. (Task 8)

---

### Task 1: Test runner, branch and fixtures

**Files:**
- Modify: `package.json` (scripts), `.gitignore`
- Create: `src/v2/lib/testing.ts`, `src/v2/lib/testing.test.ts`

**Interfaces:**
- Produces: `makeRows(specs: Array<[date: string, description: string, amount: number, type: TransactionType]>, opening?: number): ExpenseEntry[]` — first spec is the opening row (row 2, `amount 0`, balance = `opening`, default 75000); later rows get `rowIndex = 2 + i`, `rawDate = date`, `isFormulaBacked = true`, and `balance` from `nextBalance` in `src/lib/row-move.ts`.
- Produces: `FX_ORDERED`: `makeRows([['2026-11-01','Opening',0,'DEBIT'],['2026-11-05','Salary',1000,'CREDIT'],['2026-11-06','Milk',100,'DEBIT'],['2026-11-12','Groceries',200,'DEBIT'],['2026-11-13','Rent',500,'DEBIT']])` → balances 75000, 76000, 75900, 75700, 75200.
- Produces: npm script `test:unit`.

- [ ] **Step 1:** `git switch -c v2-remake`. Add to `package.json` scripts: `"test:unit": "npx tsx --env-file=.env.local --test $(find src/v2 -name '*.test.ts')"`. Add `.next-v2` to `.gitignore`.
- [ ] **Step 2: Write the failing test** `testing.test.ts`: `makeRows` for `FX_ORDERED` yields balances `[75000, 76000, 75900, 75700, 75200]` and `rowIndex` `[2,3,4,5,6]`.
- [ ] **Step 3: Run** `npm run test:unit` → FAIL (module not found).
- [ ] **Step 4: Implement** `testing.ts` per the Interfaces block (import `nextBalance` from `../../lib/row-move`; relative imports only in `src/v2/lib`).
- [ ] **Step 5: Run** `npm run test:unit` → PASS (1 test).
- [ ] **Step 6: Commit** `chore(v2): unit test runner and row fixtures`.

### Task 2: Out-of-order detection

**Files:**
- Create: `src/v2/lib/order.ts`, `src/v2/lib/order.test.ts`

**Interfaces:**
- Consumes: `makeRows` (Task 1).
- Produces: `interface OutOfPlace { rowIndex: number; date: string; sitsAmong: string }` and `findOutOfOrder(rows: ExpenseEntry[]): OutOfPlace[]`. Rows are in sheet order. Rows with `date === ''` are ignored. The kept rows are a longest non-decreasing-by-date subsequence; every other dated row is out of place, and `sitsAmong` is the date of the nearest kept row above it (or the nearest kept below if none above). Tie-break: when several longest subsequences exist, keep the earlier-dated rows (flag the later-dated one).

- [ ] **Step 1: Write failing tests** (dates in 2026-11, specs `[d,'x',10,'DEBIT']` after an opening row dated `2026-11-01`):
  - ordered `[05,06,12,13]` → `[]`
  - future row early `[05,20,06,07]` → `[{rowIndex:4,date:'2026-11-20',sitsAmong:'2026-11-05'}]`
  - past row late `[05,06,02,07]` → `[{rowIndex:5,date:'2026-11-02',sitsAmong:'2026-11-06'}]`
  - equal dates `[05,05,05]` → `[]`
  - a row with `date:''` between ordered rows → `[]`
  - tie `[09,03]` after the opening row → flags the `09` row only.
- [ ] **Step 2: Run** `npm run test:unit` → FAIL.
- [ ] **Step 3: Implement** `findOutOfOrder` (O(n²) DP is fine for ~315 rows).
- [ ] **Step 4: Run** → PASS. **Step 5: Commit** `feat(v2): date-based out-of-order detection`.

### Task 3: Balance line and date slot

**Files:**
- Modify: `src/v2/lib/order.ts`, `src/v2/lib/order.test.ts`

**Interfaces:**
- Produces: `balanceBoundary(rows: ExpenseEntry[], today: string): { lastCountedIndex: number; firstLaterIndex: number | null; currentBalance: number }` — same rule as `computeKPIs` in `src/lib/computations.ts`: read down while `date <= today`, stop at the first row dated after today; `lastCountedIndex = -1` and `currentBalance = rows[0].balance` if even the first row is later.
- Produces: `dateSlot(rows: ExpenseEntry[], date: string): { position: number; rowNumber: number }` — mirrors `findChronologicalInsertRow` in `src/lib/sheets.ts`: ignore rows with `rowIndex < 3`; first row dated later than `date` wins; a same-day row whose description matches `/total general expenses|remaining expenses budget/i` wins; else after the last row (`position = rows.length`, `rowNumber = last.rowIndex + 1`).

- [ ] **Step 1: Write failing tests** on `FX_ORDERED`:
  - `balanceBoundary(rows,'2026-11-12')` → `{lastCountedIndex:3, firstLaterIndex:4, currentBalance:75700}`
  - `'2026-10-31'` → `{lastCountedIndex:-1, firstLaterIndex:0, currentBalance:75000}`
  - `'2026-12-31'` → `{lastCountedIndex:4, firstLaterIndex:null, currentBalance:75200}`
  - position beats date: rows dated `[01,05,20,06]`, today `2026-11-10` → boundary stops at the `20` row, `currentBalance` = balance of the `05` row.
  - `dateSlot(FX_ORDERED,'2026-11-06')` → `{position:3,rowNumber:5}`; `'2026-11-14'` → `{position:5,rowNumber:7}`; with an extra row `Total General Expenses` dated `2026-11-13` after Rent, `dateSlot(...,'2026-11-13')` → that row's position/row number.
  - parity: for each date in `['2026-10-01','2026-11-05','2026-11-06','2026-11-13','2026-12-01']`, `dateSlot(rows,d).rowNumber === findChronologicalInsertRow(colAB, d)` where `colAB` is `[['Date','Description'], ...]` built from `rows` at index `rowIndex-1`. Also `balanceBoundary(rows,t).currentBalance === computeKPIs(rows,t,7).currentBalance`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** both. **Step 4: Run** → PASS (the parity test needs `--env-file`, already in the script).
- [ ] **Step 5: Commit** `feat(v2): balance line and by-date insert slot`.

### Task 4: Drag impact

**Files:**
- Create: `src/v2/lib/impact.ts`, `src/v2/lib/impact.test.ts`

**Interfaces:**
- Consumes: `previewRowMove`, `movedRowNumber` (`src/lib/row-move.ts`), `balanceBoundary`, `findOutOfOrder`.
- Produces: `interface MoveImpact { rows: ExpenseEntry[]; balanceBefore: number; balanceAfter: number; lowestBefore: number; lowestAfter: number; crossed: Array<{ rowIndex: number; becomes: 'counted' | 'uncounted' }>; outOfOrderAfter: OutOfPlace[] }` and `moveImpact(rows: ExpenseEntry[], from: number, to: number, today: string, cushionUntil: string): MoveImpact`. `from`/`to` are sheet row numbers. `lowest*` = the `postNovBalance` rule: start at the current balance, take the minimum balance over rows dated after `today` and before `cushionUntil`. `crossed.rowIndex` uses **original** row numbers; a row "counts" when its position is at or above the boundary.

- [ ] **Step 1: Write failing tests** on `FX_ORDERED`, today `2026-11-12`, cushionUntil `2026-12-07`:
  - move Milk (row 4) to row 6 → `balanceBefore 75700`, `balanceAfter 75800`, `lowestBefore 75200`, `lowestAfter 75300`, `crossed [{rowIndex:4,becomes:'uncounted'}]`, `outOfOrderAfter` = one entry for the Milk row (`date '2026-11-06'`).
  - move Rent (row 6) to row 3 → `balanceAfter 75000`, `crossed` = rows 3, 4, 5 all `'uncounted'`.
  - move Groceries (row 5) to row 3 → `balanceAfter 75700`, `crossed []`.
  - `from === to` → no change, `crossed []`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(v2): drag impact on today's balance`.

### Task 5: History store

**Files:**
- Create: `src/v2/state/history.ts`, `src/v2/state/history.test.ts`, `src/v2/state/useHistory.ts`

**Interfaces:**
- Produces: `interface HistoryEntry { id: string; label: string; at: number; forward: () => Promise<void>; inverse: () => Promise<void> }`; `interface HistoryState { entries: HistoryEntry[]; cursor: number; busy: boolean; error: string | null }`; `createHistory(opts?: { limit?: number }): { getState(): HistoryState; subscribe(fn: () => void): () => void; push(e: { label: string; forward: () => Promise<void>; inverse: () => Promise<void> }): void; undo(): Promise<boolean>; redo(): Promise<boolean>; jumpTo(cursor: number): Promise<boolean>; clear(): void }`. Default limit 50. `push` records an already-applied change and truncates redo. `undo` runs `inverse` of `entries[cursor-1]`; `redo` runs `forward` of `entries[cursor]`. A call while `busy` returns `false`. On rejection: cursor unchanged, `error` = message, returns `false`. `jumpTo` repeats undo/redo and stops at the first failure.
- Produces: `useHistory(h: ReturnType<typeof createHistory>): HistoryState` via `useSyncExternalStore`.

- [ ] **Step 1: Write failing tests:** push A,B then undo → inverse(B) ran, cursor 1; redo → forward(B) ran, cursor 2; push C after an undo drops the redone entry; limit 2 with 3 pushes keeps the last two; an `inverse` that rejects leaves `cursor` unchanged and sets `error`; `jumpTo(0)` after 3 pushes runs inverses 3,2,1 in that order; `undo()` called twice at once → second returns `false`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS. **Step 5: Commit** `feat(v2): undo/redo history store`.

### Task 6: Sync write queue

**Files:**
- Create: `src/v2/state/sync.ts`, `src/v2/state/sync.test.ts`, `src/v2/state/useSync.ts`

**Interfaces:**
- Produces: `class ConflictError extends Error {}`; `type SyncStatus = { kind: 'synced'; at: number } | { kind: 'saving'; pending: number } | { kind: 'offline'; reason: string } | { kind: 'conflict'; message: string } | { kind: 'error'; message: string }`; `createSync(opts: { isOnline: () => boolean; now: () => number }): { getState(): SyncStatus; subscribe(fn: () => void): () => void; enqueue(job: { label: string; run: () => Promise<void>; rollback: () => void }): Promise<boolean>; refreshed(): void }`. Jobs run one at a time in order. Offline: `enqueue` returns `false` without running, state `offline` with reason "You're offline. Changes can't be saved until you're back online." A failing job: call its `rollback`, then roll back every still-queued job (newest first) without running them, state `conflict` if the error is a `ConflictError` else `error`; returns `false`. When the queue empties after success: `synced` at `now()`. `refreshed()` sets `synced` (after a successful refetch).
- Produces: `useSync(s): SyncStatus`.

- [ ] **Step 1: Write failing tests:** two jobs run in order and `pending` goes 2→1→0 then `synced` with the injected `now`; offline returns `false`, `run` not called, state `offline`; a job throwing `ConflictError('Row 241 changed')` → `rollback` called, queued third job's rollback called and its `run` not called, state `conflict` with the message; a generic throw → `error`.
- [ ] **Step 2–4:** run → FAIL, implement, run → PASS. **Step 5: Commit** `feat(v2): serial write queue with rollback and status`.

### Task 7: Tokens, shell and placeholder tabs on live data

**Files:**
- Create: `src/v2/styles/tokens.css`, `src/v2/shell/AppShell.tsx`, `src/v2/shell/Nav.tsx`, `src/v2/shell/SyncChip.tsx`, `src/v2/V2Providers.tsx`, `src/app/v2/layout.tsx`, `src/app/v2/page.tsx` (Today), `src/app/v2/passbook/page.tsx`, `src/app/v2/plan/page.tsx`, `src/app/v2/owe/page.tsx`, `src/app/v2/log/page.tsx`
- Test: `src/scripts/test-v2-shell.ts` (Playwright)

**Interfaces:**
- Consumes: `createHistory`, `createSync`, `useHistory`, `useSync` (Tasks 5, 6); `useFinancials` (`src/hooks/useFinancials.ts`).
- Produces: `V2Providers` (QueryClient with the same defaults as `src/app/providers.tsx`, a history store and a sync store in React context) and hooks `useV2History()`, `useV2Sync()`; `tokens.css` defining the palette from the design (`--bg #EDF0F4`, `--surface #FFFFFF`, `--sunk #E3E7ED`, `--ink #0E1522`, `--ink2 #4A5466`, `--line #D6DCE5`, `--blue #1E4FD8`, `--orange #B0500C`, plus dark values for `prefers-color-scheme: dark` from the preview `scratchpad/preview/index.html`), scoped to a `.v2` wrapper.

- [ ] **Step 1: Write the failing Playwright script** `test-v2-shell.ts` (signs in through `/api/auth/login` using the env credentials, then at 390×844, light and dark): `/v2` shows "You can spend" placeholder text and the balance text equals `₹1,14,021`; the bottom bar has Today, Passbook, Log (aria-label "Log a spend"), Plan, Owe and each navigates; `document.documentElement.scrollWidth <= 390`; at 1280 px the nav is a left rail; no console errors.
- [ ] **Step 2: Run** `npx tsx --env-file=.env.local src/scripts/test-v2-shell.ts` against `npx next dev -p 3007` → FAIL (404).
- [ ] **Step 3: Implement** the files above. Today placeholder calls `useFinancials(today, 15000, 3200, 7, 15)` (same arguments as `src/app/page.tsx`) and shows `kpis.currentBalance` formatted with `formatINR`. Font: try `Mona_Sans` from `next/font/google` (check it is exported by Next 16.4.6); if not, download the variable woff2 into `src/v2/fonts/` and use `next/font/local`. `layout.tsx` exports `viewport` with `themeColor` for light and dark, `viewportFit: 'cover'`, and metadata `appleWebApp`. `SyncChip` shows the current `SyncStatus` text ("Synced 2 min ago", "Saving 2…", "Offline", "Sheet changed, refresh"). Wide layout (≥ 900 px): left rail instead of bottom bar. `/v2/log` is a placeholder (replaced by the Log sheet in Phase 1).
- [ ] **Step 4: Run** the script → PASS; also run `npm run type-check`.
- [ ] **Step 5: Commit** `feat(v2): themed responsive shell and five placeholder tabs`.

### Task 8: PWA skeleton

**Files:**
- Create: `src/app/manifest.ts`, `public/sw.js`, `public/offline.html`, `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`, `src/v2/pwa/RegisterSW.tsx`, `src/scripts/make-icons.cjs`, `src/scripts/test-v2-pwa.ts`
- Modify: `next.config.ts` (add `headers()` for `/sw.js`: `Cache-Control: no-cache, no-store, must-revalidate`, `Service-Worker-Allowed: /`; and `distDir: process.env.NEXT_DIST_DIR || '.next'`), `src/middleware.ts` (add `html` to the static extension list), `src/app/v2/layout.tsx` (mount `RegisterSW`, apple icon link)

**Interfaces:**
- Produces: manifest `{ name: 'FinFlow', short_name: 'FinFlow', start_url: '/v2', scope: '/', display: 'standalone', background_color: '#EDF0F4', theme_color: '#EDF0F4', icons: [192, 512, maskable 512] }` (`start_url` becomes `/` at cutover). `sw.js`: versioned cache name; on install cache `/offline.html`; on activate delete other caches and `clients.claim()`; `fetch` handles only `GET` navigations under `/v2` (network first, `/offline.html` on failure) and ignores everything else, never touching `/api/*` or `/login`. `RegisterSW` registers `/sw.js` only when `process.env.NODE_ENV === 'production'`.

- [ ] **Step 1: Write the failing Playwright script** `test-v2-pwa.ts` against a production build on :3007: `/manifest.webmanifest` is 200 with the fields above; `/sw.js` 200 with the no-cache header; unauthenticated `GET /offline.html`, `/icons/icon-192.png` are 200 while `PATCH /api/expenses/240.x` is 401 and `/v2` redirects to `/login`; after signing in and visiting `/v2`, the service worker becomes active and `caches.keys()` contains one cache whose requests are exactly `['/offline.html']`; with the context set offline, navigating to `/v2/plan` shows the offline page text.
- [ ] **Step 2: Run** (build first: `NEXT_DIST_DIR=.next-v2 npm run build && NEXT_DIST_DIR=.next-v2 npx next start -p 3007`) → FAIL.
- [ ] **Step 3: Implement.** `make-icons.cjs` renders an inline SVG (ink "F" on the `--bg` colour, maskable version with the glyph inside the central 80%) to PNGs with Playwright and system Chrome; run it once and commit the PNGs. `offline.html` is a standalone page (own inline styles, light/dark) saying "You're offline. FinFlow shows saved data when it can. Reconnect to make changes."
- [ ] **Step 4: Run** the script → PASS. Run the standard auth probe against :3007: `curl -X PATCH -H 'content-type: application/json' -d '{}' localhost:3007/api/expenses/240.x` → 401.
- [ ] **Step 5: Commit** `feat(v2): installable PWA skeleton`.

### Task 9: Latency measurement for Vercel limits

**Files:**
- Create: `src/scripts/measure-sheet-latency.ts`
- Modify: `docs/superpowers/specs/2026-11-12-ui-remake-design.md` (section 5 note)

**Interfaces:**
- Consumes: `getExpensesFromSheet` (`src/lib/sheets.ts`), read only.

- [ ] **Step 1:** Implement the script: run `getExpensesFromSheet()` 5 times, print min, median, max in ms. It must make no write calls.
- [ ] **Step 2:** Run `npx tsx --env-file=.env.local src/scripts/measure-sheet-latency.ts`; record the numbers.
- [ ] **Step 3 (owner action):** ask the owner to read the function time limit shown in Vercel ➔ `finflow-app` ➔ Settings ➔ Functions, and to confirm before any branch is pushed to the `app` remote for a preview deployment.
- [ ] **Step 4:** Append to design section 5: measured read latency, the Vercel limit, and the rule "a bulk write (sort, bulk move, bulk delete) that could exceed half the limit is split into steps with progress in the sync chip".
- [ ] **Step 5: Commit** `docs(v2): sheet latency and function limit`.

### Task 10: Verification and board

**Files:**
- Modify: `~/Documents/Obsidian Vault/FinFlow/Cards/Complete UI and UX remake.md`, `Now.md` (via `python3 refresh_now.py`)

- [ ] **Step 1:** `npm run type-check` → no errors. `npm run lint` → no new errors in `src/v2` or `src/app/v2`.
- [ ] **Step 2:** `npm run test:unit` → all pass. `npm run test:sim` → 58/58. `npm run integrity` → 6/6, CHECK 5 balance ₹1,14,021.
- [ ] **Step 3:** Run `test-v2-shell.ts` and `test-v2-pwa.ts` → PASS. Open `/v2` on the owner's phone (LAN) at 390 px in light and dark; confirm no sideways scroll.
- [ ] **Step 4:** Confirm the old UI is unchanged: `/` still shows balance ₹1,14,021 and the auth probe on :3000 is unchanged.
- [ ] **Step 5:** Update the card (status Doing, Phase 0 done, next Phase 1) and the `Now.md` session log; run `python3 refresh_now.py`. Push branch `v2-remake` to `origin` only. Report to the owner and ask before merging to `main`.

---

## Self-review notes

- Spec coverage for Phase 0: order check (T2), balance line and by-date slot (T3), drag impact (T4), history (T5), sync queue and offline refusal (T6), tokens/shell/nav/wide layout/themes (T7), PWA manifest, service worker, install, offline page (T8), Vercel limits (T9). Phases 1 to 6 (Log, Passbook, drag UI, Sheet mode, Plan, Owe, conflict preconditions, cutover) are separate plans on top of this one.
- Types used across tasks: `OutOfPlace`, `MoveImpact`, `HistoryEntry`, `SyncStatus`, `ConflictError`, `makeRows`, `FX_ORDERED` are defined once in the tasks that produce them.
- Spec follow-up: design section 4.2 should say the out-of-place rows are those outside a longest in-date-order run (one early row is flagged, not everything below it); fixed in the same commit as Task 2.
