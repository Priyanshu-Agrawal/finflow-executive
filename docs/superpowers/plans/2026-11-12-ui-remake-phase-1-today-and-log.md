# FinFlow UI remake, Phase 1 (Today and Log) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Phase 0 placeholders with the real Today screen and the Log sheet (quick log and Repeat monthly), wire the sync chip to real fetches and writes, and make logging optimistic, undoable and placed by date, all under `/v2`.

**Architecture:** Pure helpers in `src/v2/lib` (TDD, `node:test`) feed small client components in `src/v2/today` and `src/v2/log`. All server state comes from one shared `useFinancials` query; writes go through the Phase 0 sync queue and history store with an optimistic insert into the query cache. The existing API routes are unchanged.

**Tech Stack:** Next 16.4.6 App Router, React 19, TanStack Query 5, the Phase 0 stores (`createHistory`, `createSync`), Playwright with system Chrome, Node 22+ (`nvm use`).

**Spec:** `docs/superpowers/specs/2026-11-12-ui-remake-design.md` (sections 2, 3 Today and Log rows, 5, 6, 7, 8) and Phase 0 plan `docs/superpowers/plans/2026-11-12-ui-remake-phase-0-foundation.md`.

## Global Constraints

- All Phase 0 constraints still apply (read Next 16 docs first, no imports from `src/components/**` or `src/context/**`, no `googleapis` or `sheets.ts` in client code, tokens in CSS only, 44 px targets, sentence case, no emoji, branch work, commit author `Priyanshu Agrawal <Spiderfan.No1@gmail.com>` with the attribution trailer).
- **Never write to the live sheet to test.** Browser tests intercept `POST /api/expenses/log`, `POST /api/expenses/schedule-emi` and `DELETE /api/expenses/*` with `page.route` and assert the request bodies. Only reads reach the sheet.
- **Today's balance must not change:** `npm run integrity` before and after; the Today screen's balance must equal `kpis.currentBalance`.
- **Sheets read quota is 60 reads a minute:** one `useFinancials` query per screen, shared through React Query; no automatic retry on a quota error (429); refetch on window focus at most once per 30 s; browser tests reuse the page's own financials response instead of calling the API again.
- **Owner rules from 12 Nov that Today must keep:** safe daily spend = expenses budget left ÷ days left (`budgetPacing.safeTotalDailyBurn`); the Hard month limit shows only after a tap (`worstCaseDailyBurn`); cushion = lowest balance before the next salary (`kpis.postNovBalance`, `kpis.cushionUntil`); savings per cycle from `savingsTrend` (blue = saved/received, orange = over; never red/green); "Remaining … Budget" and "Total General" rows are **set aside**, not bills; bills exclude today.
- Phase 1 leaves out **Split with friends** (it needs the Owe data model, Phase 4). The Log sheet does not show a Split chip until then.
- `/v2/log` stops being a page: the centre button opens the sheet from any screen.

## Review Focus

1. A small spend logged today must appear instantly in "Logged today", move the safe-spend figures only through the server's next fetch (the client never recomputes budget numbers), and disappear again if the save fails or conflicts. (Tasks 5, 6)
2. Logging with a date earlier or later than today must land among that day's rows (by date), and the balance preview must follow position, not date. (Task 4)
3. An amount of 0, an empty keypad, 7+ digits, leading zeros and an empty description must never produce a request. (Tasks 3, 6)
4. A history **undo of a logged entry** must refuse to delete a row if the sheet no longer holds that entry at that row number, and say so. (Task 5)
5. A quota error (429) must show "Sheets is busy" and back off, not retry in a loop or show a blank Today. (Task 2)
6. Today with no general spending yet, a cycle with no future bills, and a first-run empty `savingsTrend` must render sensible text, not NaN or empty boxes. (Tasks 1, 7)

---

### Task 1: Today helpers

**Files:**
- Create: `src/v2/lib/today.ts`, `src/v2/lib/today.test.ts`
- Consumes: `makeRows` (`src/v2/lib/testing.ts`), `ExpenseEntry`, `isGeneralExpense` and `GENERAL_EXCLUDE_PATTERN` (`src/lib/computations.ts`).

**Interfaces (Produces):**
- `generalSpentOn(rows: ExpenseEntry[], date: string): number` — sum of general DEBIT amounts dated `date`.
- `billsBefore(rows: ExpenseEntry[], today: string, until: string): { bills: ExpenseEntry[]; setAside: ExpenseEntry[]; billsTotal: number }` — DEBIT rows dated after `today` and before `until`; rows whose description matches `/remaining .*budget|total general/i` go to `setAside`, the rest to `bills`; `billsTotal` sums `bills`.
- `lowestPointBefore(rows: ExpenseEntry[], today: string, until: string, currentBalance: number): { date: string | null; balance: number }` — same rule as `postNovBalance` (start at `currentBalance`, minimum over rows dated after today and before `until`), with the date of that row (null if none is lower).
- `loggedOn(rows: ExpenseEntry[], date: string): ExpenseEntry[]` — dated rows with a type (cleared rows excluded), in sheet order.
- `todayNote(spentToday: number, safePerDay: number): { kind: 'none' | 'within' | 'over'; text: string }` — texts: none "No general spending logged today yet."; within "₹X of general spending logged today."; over "₹X of general spending logged today, more than a day's share." (amounts with `formatINR`).

- [ ] **Step 1: Write failing tests** on a fixture of `makeRows` with: Opening 2026-11-01, Salary credit 2026-11-05, Groceries 200 on 2026-11-12, Auto 120 on 2026-11-12, Electricity recharge 3,000 on 2026-11-13, Rent 15,000 on 2026-11-15, "Remaining Expenses Budget" 11,000 on 2026-11-30, a DEBIT dated 2026-12-07. With today 2026-11-12, until 2026-12-07: `generalSpentOn(rows,'2026-11-12')` is 320; `billsBefore` returns bills [Electricity, Rent] with `billsTotal` 18000 and `setAside` [Remaining Expenses Budget] (the 12-07 row is excluded, today's rows excluded); `lowestPointBefore` returns the date and balance of the Remaining row's balance or the lowest earlier row, whichever is lower; `todayNote(0,440)` kind `none`, `todayNote(320,440)` `within`, `todayNote(760,440)` `over` with the exact texts above; a rows list with no future rows gives empty `bills`, `billsTotal 0`, `lowestPointBefore` `{date:null,balance:currentBalance}`.
- [ ] **Step 2: Run** `npm run test:unit` → FAIL (module not found).
- [ ] **Step 3: Implement** the five functions.
- [ ] **Step 4: Run** → PASS. **Step 5: Commit** `feat(v2): Today helpers`.

### Task 2: Query client rules, online state and real sync chip

**Files:**
- Modify: `src/v2/V2Providers.tsx`, `src/v2/shell/SyncChip.tsx`
- Create: `src/v2/lib/retry.ts`, `src/v2/lib/retry.test.ts`, `src/v2/state/useDataSync.ts`

**Interfaces (Produces):**
- `shouldRetry(failureCount: number, error: unknown): boolean` — false for errors whose message matches `/quota|429|too many requests|read requests/i`; otherwise true while `failureCount < 2`.
- `useDataSync(query: { isSuccess: boolean; dataUpdatedAt: number; isError: boolean; error: unknown })` — on each new `dataUpdatedAt` calls `sync.refreshed()`; subscribes to `window` `online`/`offline` events and tells the sync store; exposes nothing.
- `createSync` gains `setOnline(online: boolean): void` (sets `offline` with the standard reason when false; when true and no queue, `refreshed()`-style `synced` is **not** set until the next successful fetch) and a `busy` status `{ kind: 'busy'; message: string }` set by `markBusy(message)` for quota errors; the chip text is "Sheets is busy, retrying in a moment".
- `SyncChip` shows the last successful fetch time (`synced.at` set from `dataUpdatedAt`), "Offline, showing saved copy", "Sheets is busy, retrying in a moment", "Sheet changed, refresh", or "Couldn't save".
- `V2Providers` QueryClient: `retry: shouldRetry`, `retryDelay: (n) => Math.min(30000, 1000 * 2 ** n)`, `staleTime: 30000`, `refetchOnWindowFocus: true`.

- [ ] **Step 1: Write failing tests:** `shouldRetry(0, new Error('Quota exceeded for quota metric'))` false; `shouldRetry(1, new Error('boom'))` true; `shouldRetry(2, new Error('boom'))` false; in `sync.test.ts`: `setOnline(false)` gives `offline`; `markBusy('x')` gives `{kind:'busy',message:'x'}`; `refreshed(at)` accepts an optional timestamp and uses it.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** the changes above (keep every Phase 0 `sync` test passing). **Step 4: Run** `npm run test:unit` → PASS; `npm run type-check` clean. **Step 5: Commit** `feat(v2): honest sync chip and quota-aware retries`.

### Task 3: Log helpers

**Files:**
- Create: `src/v2/lib/log.ts`, `src/v2/lib/log.test.ts`

**Interfaces (Produces):**
- `pressKey(amount: string, key: string): string` — keys `'0'..'9'`, `'00'`, `'del'`; ignores a leading zero press on empty, caps at 7 digits, `'del'` removes the last digit.
- `usualDescriptions(rows: ExpenseEntry[], today: string, limit?: number): string[]` — the most frequent descriptions among DEBIT rows of the last 120 days with amount under 5,000, ties broken by most recent; "General Expenses" is always first; default limit 7; excludes descriptions matching the set-aside pattern.
- `type LogForm = { amount: string; description: string; dateChoice: 'today' | 'yesterday' | { custom: string }; type: 'Spent' | 'Received' | 'Settled'; repeatMonthly: boolean }`
- `buildLogRequest(form: LogForm, today: string): { ok: false; reason: string } | { ok: true; kind: 'single'; body: { date: string; description: string; amount: number; type: 'DEBIT' | 'CREDIT' | 'SETTLEMENT' } } | { ok: true; kind: 'emi'; body: { title: string; monthlyAmount: number; months: 6; startDate: string; type: 'DEBIT' | 'CREDIT' | 'SETTLEMENT' } }` — `description` empty becomes "General Expenses"; amount 0 or empty is `{ok:false, reason:'Enter an amount.'}`.

- [ ] **Step 1: Write failing tests:** `pressKey('', '0')` is `''`; `pressKey('25','0')` `'250'`; `pressKey('1234567','8')` `'1234567'`; `pressKey('250','del')` `'25'`; `pressKey('','del')` `''`; `pressKey('5','00')` `'500'`; `usualDescriptions` on a fixture returns "General Expenses" first then the two most frequent others and never a "Remaining Expenses Budget" row; `buildLogRequest` for amount `'250'`, description `''`, today `2026-11-12`, Yesterday, Spent returns `{ok:true,kind:'single',body:{date:'2026-11-11',description:'General Expenses',amount:250,type:'DEBIT'}}`; Received maps to `CREDIT`, Settled to `SETTLEMENT`; `repeatMonthly: true` returns `kind:'emi'` with `monthlyAmount 250`, `months 6`, `startDate` the chosen date; amount `''` and `'0'` return `ok:false`; a custom date is passed through.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS. **Step 5: Commit** `feat(v2): log form helpers`.

### Task 4: Optimistic insert by date

**Files:**
- Modify: `src/v2/lib/order.ts`, `src/v2/lib/order.test.ts`

**Interfaces (Produces):**
- `insertByDate(rows: ExpenseEntry[], entry: Pick<ExpenseEntry, 'date' | 'description' | 'amount' | 'type'>): { rows: ExpenseEntry[]; rowNumber: number }` — uses `dateSlot` for the position, gives the new row `rowIndex = rowNumber`, renumbers every later row by +1, sets `rawDate` (`YYYY-Mon-DD`, e.g. `2026-Nov-12`), recomputes balances and `formula` with `nextBalance` and `buildBalanceFormula` from `src/lib/row-move.ts` from the new row downward. Does not mutate the input.
- `removeRowNumber(rows: ExpenseEntry[], rowNumber: number): ExpenseEntry[]` — drops that row, renumbers later rows by -1, recomputes balances from there (used to roll the optimistic insert back).

- [ ] **Step 1: Write failing tests** on `FX_ORDERED`: inserting `{date:'2026-11-06',description:'Tea',amount:20,type:'DEBIT'}` returns `rowNumber 5`, rows now `[2,3,4,5,6,7]`, the new row's balance 75880 and every later row 20 lower (75680, 75180); the input array is unchanged; inserting dated `2026-11-14` appends at row 7 with balance 75180; `removeRowNumber(insert(...).rows, 5)` equals `FX_ORDERED` by `rowIndex` and `balance`; a CREDIT adds to the balance; the order check after inserting by date reports no out-of-order rows when the input had none.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS. **Step 5: Commit** `feat(v2): optimistic insert by date`.

### Task 5: Logging mutation with history and sync

**Files:**
- Create: `src/v2/state/useLogEntry.ts`, `src/v2/state/logEntry.ts`, `src/v2/state/logEntry.test.ts`

**Interfaces:**
- Consumes: `createSync`, `createHistory`, `ConflictError`, `insertByDate`, `removeRowNumber`, `buildLogRequest`.
- Produces: `performLog(deps: { rows: () => ExpenseEntry[]; setRows: (r: ExpenseEntry[]) => void; sync: Sync; history: History; post: (url: string, body: unknown) => Promise<{ newRow?: number; startRow?: number; count?: number }>; del: (row: number) => Promise<void>; refetch: () => Promise<void> }, req: ReturnType<typeof buildLogRequest> & { ok: true }, label: string): Promise<boolean>` — applies the optimistic insert(s) with `setRows`, enqueues a sync job that POSTs (`/api/expenses/log` or `/api/expenses/schedule-emi`) then `refetch()`es, and on success pushes a history entry: `inverse` deletes the logged row(s) after checking the cache still holds that description, amount and date at the returned row number (otherwise throws `ConflictError("The sheet changed since this was logged. Refresh, then delete it from the Passbook.")`), `forward` logs it again the same way. On failure the job's `rollback` restores the rows from before.
- Produces: `useLogEntry(): (req, label) => Promise<boolean>` — binds `performLog` to the shared query cache (`['financials', …]` entries get their `expenses` replaced), `useV2Sync`, `useV2History`, `fetch`.

- [ ] **Step 1: Write failing tests** with in-memory fakes (no network): success path records one history entry labelled `label`, calls `post` once with the request body, calls `refetch`; a `post` that throws `ConflictError` leaves `rows()` equal to the original and returns `false`; undo calls `del(newRow)` once when the row still matches and **throws** `ConflictError` (history `error` set, cursor unchanged) when the cached row at `newRow` differs; redo after undo posts again; an EMI request records one history entry whose inverse deletes `count` rows from `startRow` (last first); offline sync refuses and leaves rows unchanged.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** `logEntry.ts` (pure, injected deps) and the hook. **Step 4: Run** → PASS; type-check. **Step 5: Commit** `feat(v2): optimistic, undoable logging`.

### Task 6: Log sheet UI

**Files:**
- Create: `src/v2/log/LogSheet.tsx`, `src/v2/log/Keypad.tsx`, `src/v2/log/LogSheetContext.tsx`, `src/scripts/test-v2-log.ts`
- Modify: `src/v2/shell/Nav.tsx` (centre control becomes a button that opens the sheet, keeping `aria-label="Log a spend"`), `src/v2/V2Providers.tsx` (mount the sheet context), `src/v2/styles/tokens.css` (sheet, keypad, chips), remove `src/app/v2/log/page.tsx`
- Modify: `src/scripts/test-v2-shell.ts` (the centre control is now a button, not a link to `/v2/log`)

**Interfaces:** Consumes `buildLogRequest`, `pressKey`, `usualDescriptions`, `useLogEntry`, `useFinancials`. Produces `useLogSheet(): { open(): void; close(): void; isOpen: boolean }`.

- [ ] **Step 1: Write the failing Playwright script** `test-v2-log.ts` (390×844, light and dark, signed in, **all write endpoints intercepted** with `page.route`, financials reused from the page's own response): pressing the centre button opens a dialog named "Log" with focus inside and Escape closes it; keypad "2","5","0" shows `₹250`; the save button reads "Enter an amount" until an amount exists then "Log ₹250"; choosing the first usual description chip fills "What for"; Save posts `{date: today, description, amount: 250, type: 'DEBIT'}` to `/api/expenses/log` exactly once and the row appears in "Logged today" before the intercepted response resolves; making the intercepted response fail with 500 removes the row again and the chip reads "Couldn't save"; Yesterday posts yesterday's date; Received posts `CREDIT`; "Repeat monthly" with 250 posts to `/api/expenses/schedule-emi` with `months: 6` and `monthlyAmount: 250`; no horizontal scroll; tapping outside the sheet closes it.
- [ ] **Step 2: Run** against a production build on :3007 (`NEXT_DIST_DIR=.next-v2 npm run build`, then `NEXT_DIST_DIR=.next-v2 npx next start -p 3007`; revert `tsconfig.json` after builds) → FAIL.
- [ ] **Step 3: Implement** the sheet as a dialog (`role="dialog"`, `aria-modal`, focus moves in and returns, Escape and backdrop close, body scroll locked), keypad buttons 52 px high with `aria-label`s, chips for Today / Yesterday / Pick date (native date input) and Spent / Received / Settled, "Repeat monthly" chip with the note "Adds 6 monthly rows from this date, named "<what for> (EMI 1/6)" and so on.", save button disabled with reason text when `buildLogRequest` is not ok.
- [ ] **Step 4: Run** `test-v2-log.ts` and `test-v2-shell.ts` → PASS. **Step 5: Commit** `feat(v2): log sheet`.

### Task 7: Today screen

**Files:**
- Create: `src/v2/today/Today.tsx`, `src/v2/today/SafeSpend.tsx`, `src/v2/today/UntilSalary.tsx`, `src/v2/today/PathChart.tsx`, `src/v2/today/Bills.tsx`, `src/v2/today/SavingsBars.tsx`, `src/v2/today/LoggedToday.tsx`, `src/scripts/test-v2-today.ts`
- Modify: `src/app/v2/page.tsx` (renders `Today`), `src/v2/styles/tokens.css`

**Interfaces:** Consumes Task 1 helpers, `useFinancials(today, 15000, 3200, 7, 15)` (arguments as `src/app/page.tsx`), `useDataSync`, `formatINR`, `balanceBoundary`.

- [ ] **Step 1: Write the failing Playwright script** `test-v2-today.ts` (390×844, light and dark, signed in, financials captured once per context): heading "You can spend" and the figure equal `budgetPacing.safeTotalDailyBurn`; "Balance now" equals `kpis.currentBalance` (and `₹1,14,021` while today is 11 or 12 Nov 2026); "Lowest point" equals `kpis.postNovBalance` with its date; "Bills before salary" lists the same DEBIT rows the API implies, set-aside rows appear under "Set aside in the sheet" and are **not** in the bills total; "What if it is a hard month?" is collapsed until tapped and then shows `worstCaseDailyBurn`; the savings bars have a text alternative listing each cycle and use the blue and orange tokens only; "This cycle" and "Next cycle, projected" equal the `savingsTrend` current and projected entries; the page has an `h1`, no sideways scroll, no console errors; with the financials request intercepted to a 500 containing "Quota exceeded", the chip reads "Sheets is busy, retrying in a moment" and Today shows the retry message, not an empty page.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** the components. Layout follows the approved preview: big safe-spend figure (the one memorable element), spend bar, today note from `todayNote`, hard-month toggle, "Until salary" card with balance now, lowest point and the path chart (past part muted, future part ink, today ring, dashed lowest line, labels "today", "lowest", "salary"), bills list with day and weekday, set-aside list, savings bars (6 past, current ringed, projected at 40% opacity) with the two summary figures, "Logged today" with a "Nothing logged yet. Tap + to add." empty state. All numbers come from the API or Task 1 helpers; no budget arithmetic in components.
- [ ] **Step 4: Run** `test-v2-today.ts`, `test-v2-log.ts`, `test-v2-shell.ts`, `test-v2-pwa.ts` → PASS. **Step 5: Commit** `feat(v2): real Today screen`.

### Task 8: Verification, deploy to v2 only, board

- [ ] **Step 1:** `npm run type-check`, `npx eslint src/v2 src/app/v2` clean, `npm run test:unit` all pass.
- [ ] **Step 2:** `npm run test:sim` 58/58 and `npm run integrity` 6/6 (CHECK 5 ₹1,14,021), spaced 30 s apart for the read quota.
- [ ] **Step 3:** Run the four Playwright scripts on a fresh `.next-v2` build; screenshots at 390 px in light and dark for Today and the open Log sheet, reviewed by eye.
- [ ] **Step 4:** Merge to `main` only after the owner has looked at `/v2` on their phone against the live data; then push both remotes and confirm the Vercel deploy is Ready, the auth probe is 401 and the balance unchanged.
- [ ] **Step 5:** Update the board card and `Now.md`; delete `.next-v2`.

---

## Self-review notes

- Spec coverage: Today (spec 3, 7) in Tasks 1 and 7; Log sheet with Repeat monthly (spec 3) in Tasks 3, 5, 6; add-by-date placement (spec 4.2) in Tasks 4 and 6; honest sync status and quota rules (spec 5 and the measured limits) in Task 2; undo/redo of a logged entry (spec 6) in Task 5; PWA and shell regressions in Tasks 6 to 8. Split with friends, Passbook, Plan, Owe and conflict preconditions on edits are later phases.
- Types used across tasks (`LogForm`, `buildLogRequest`, `insertByDate`, `removeRowNumber`, `performLog`, `shouldRetry`, `setOnline`, `markBusy`) are each defined once in the task that produces them.
- Decision for the owner: whether the Log sheet should offer "Pick date" as a native date picker (default in this plan) or a small calendar. The native picker gives the phone's own keyboard and is the simpler choice.
