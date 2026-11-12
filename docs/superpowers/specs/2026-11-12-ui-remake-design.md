# FinFlow UI/UX remake: design

Status: draft for owner approval (12 Nov 2026). Nothing in `src/` has been changed. Board card: *Complete UI and UX remake*.
Reference prototype (throwaway, real data, read-only): `scratchpad/preview/index.html` on :4180.

## 1. What this product is

FinFlow is a private money cockpit on top of one Google Sheet. The sheet is the source of truth; the app is a fast, honest front end for it. It is used one-handed on a phone, many times a day, for four jobs:

1. **Glance**: what can I spend today, where do I stand, what is coming.
2. **Log**: add a spend in a few taps. Many small spends are batched into one General Expenses row.
3. **Verify and fix**: check rows, correct dates, reorder, delete, in a sheet-like view.
4. **Plan**: budgets per cycle, balance ahead, savings per salary cycle, loans, splits.

The product is trusted only if it never shows a number it cannot stand behind. Every design choice below follows from that.

## 2. Principles

- **Honest numbers.** Today's balance reads Column E of the last row dated on or before today, top-down until the first later date. So **row order is part of the money**. The UI treats out-of-order rows as a defect to show, not hide.
- **Always say what state the data is in.** Synced, saving, offline, or changed elsewhere. Never a silent stale screen.
- **Every change is undoable and redoable**, in one history that works on every screen.
- **Rows are placed by date** whenever the app adds them. Exact-position placement is a deliberate power action.
- **Phone first, then wider.** Same app on a tablet or desktop with a side rail and a wider sheet.
- **Colour means money direction only**: blue saved or received, orange over or negative. Status uses icons and words, not extra colours.

## 3. Information architecture

Bottom bar (phone) or left rail (wide): **Today · Passbook · [+ Log] · Plan · Owe**. A top-right menu holds Settings, Sheet health, Sync now, Sign out.

| Tab | Contents | Replaces |
|---|---|---|
| Today | Safe daily spend, today's spend, until-salary path with the lowest point, bills before salary, savings per cycle, logged today. Hard month limit only on tap. | Overview, Budget tab |
| Passbook | List, Grid, Sheet modes over the same rows. Filters, search, Today button, order check, undo/redo, sync status. | Ledger, Excel Mode |
| + Log | Bottom sheet from anywhere: keypad, usual-description chips, date, type, Repeat monthly (EMI), Split with friends. | `/log`, QuickLog, EMI scheduler |
| Plan | Budgets (general on the salary cycle, electricity on the rent cycle), balance ahead, savings history, where it went, cycle settings. | Budget pacing, charts |
| Owe | Loans and payoff (card, BCA, bike, paid-off), pay / paid by someone else / change due, EMI calculator; second view **Splits** (people such as Harsh, Bhavishya) tucked aside. | Debt Hub, Peer Split |

## 4. Passbook, the heart of it

One data set, three ways to look at it. A mode switch at the top, the last mode remembered.

- **List**: day groups, today's group framed and placed at 30% from the top, planned rows dashed. Tap a row for the row sheet.
- **Grid**: a touch-friendly table. Pinned row number and description, day separators with each day's closing balance, Budget column (General / Electricity / EMI / Rent / Income). Tap selects, tap again edits.
- **Sheet**: plain spreadsheet, columns A to E, the old Excel Mode brought back and improved (see 4.3).

### 4.1 Row actions (same in all modes)
Row sheet / context menu, in this order:
Edit · Duplicate · **Add row here by date** · **Add row at this position** · **Move to its date** · Move up / down · Change type · Delete.
Multi-select (long-press or checkbox column): bulk delete, bulk change type, bulk move to date.

### 4.2 Date order and the order check
- **New rows are always inserted by date** (the existing `insertExpenseRowAt` path). A new row dated 3 Dec lands among the 3 Dec rows, not at the bottom.
- **Out-of-place rows** are rows whose date is earlier than the latest date above them. They get a marker in every mode: a ▲ badge on the row, a left bar, and the text "dated 9 Nov, sits among 12 Nov". Not colour only.
- A banner on Passbook: "3 rows are out of date order. Fix order." *Fix order* runs the existing sort (undoable). Each row also has **Move to its date**.
- If an out-of-place row sits near today and could change today's balance, Today shows a small note: "A row out of order may be affecting this balance."
- Order check is pure and client-side, triggered by **dates** (the rows that form the longest run already in date order are "in place"; every other dated row is out of place, so one future-dated row sitting early is flagged by itself instead of flagging everything below it), unit-tested, and run on every render and on every drag preview. A second pure helper, `balanceBoundary(rows, today)`, returns the row where today's balance stops, so the line, the impact strip and the Today screen all use one definition (the same rule as `computeKPIs`).

#### The balance line
Today's balance is read down the sheet until the first row dated after today. The app draws that stop explicitly: a **"Today's balance reads down to here" line** in List, Grid and Sheet, sitting just above the first later-dated row. Rows above the line count towards today's balance; rows below do not, whatever their dates say. This makes order and balance visible instead of implied.

### 4.3 Drag mode
- A **Reorder** toggle (and long-press on the grip or row number) turns on drag handles.
- Drag with auto-scroll at the edges; a drop line shows where it will land; a small tag tells you if the spot matches the row's date.
- The drop uses the existing optimistic `previewRowMove`, so balances update instantly, then the server confirms; a failure rolls back and says so.
- Works on touch (pointer events, not HTML5 drag) and mouse.
- **Balances fix themselves while you drag.** Every row between the old and new position is recalculated live (the existing `previewRowMove`: running balance, formulas and row numbers), and the server result must match it. The simulator already checks this.
- **Live impact strip while dragging**, pinned at the top: `Today's balance ₹1,14,021 → ₹1,10,021`, plus the lowest-before-salary figure, which also moves. Dropping a row across the balance line is the case that changes the balance:
  - a row dated in the past dragged **below** a later-dated row falls under the line and stops counting;
  - a row dated in the future dragged **above** the line starts counting;
  - a row inside the line moved up or down only changes balances between the two positions, not today's total, unless it crosses the line.
- **The date check runs on the preview, not on the saved data.** After every drop (and during the drag) `findOutOfOrder` runs on the previewed list: the dragged row's marker clears if it now sits correctly by date, appears if it doesn't, and any row that flips across the balance line is highlighted for a moment with "now counted" or "no longer counted".
- On drop, if today's balance changed, the toast says so: "Moved Groceries. Today's balance is now ₹1,10,021 (was ₹1,14,021)" with Undo. No blocking confirmation (my call: the impact is visible before you let go, and undo is one tap).
- The same preview-and-impact logic applies to Move up / down, Move to its date, Add row at this position, and Delete.

### 4.4 Sheet mode (old Excel Mode, improved)
Keeps everything the old one had: formula bar with cell reference, sheet tabs (Expenses, Loans, Ledger), Go-to-row, Auto-sort by date, Export CSV, Insert row, drag from the row number, keyboard (arrows, Enter, Tab, F2, typing replaces, Delete clears), column E locked with "formula protected", the audit baseline row, a status bar, the floating Today button.
Adds: range selection with **Sum / Count / Average** in the status bar, copy of a range as text, frozen header and row numbers, and the same undo/redo and out-of-order markers as the other modes.

## 5. Sync model (the part that makes it feel real)

The sheet can also be edited directly in Google Sheets, and row numbers shift when rows move. So:

- **Status chip** in the Passbook header and the menu: *Synced 2 min ago*, *Saving 2…*, *Offline, showing saved copy*, *Sheet changed, refresh*.
- **Optimistic writes through a single queue**, one at a time, in order (the app already serialises row-order mutations; this extends it to all writes).
- **Sync now** (menu and pull-to-refresh) refetches and compares with what the app holds. If the sheet changed elsewhere, the app says what changed (rows added, edited, removed) instead of silently redrawing.
- **Precondition check on every edit, delete and move** (owner approved this backend addition): the request carries what the app believes is on that row (date, description, amount). If the sheet differs, the server refuses with a conflict, the app refreshes and shows "Row 241 changed in the sheet. Nothing was saved." This protects against writing to the wrong transaction. It needs coverage in `npm run test:sim` before it ships.
- **Offline (PWA), owner decision: read only.** The last snapshot is cached and readable with a clear "Offline, showing saved copy from 14:02" banner. Nothing can be changed offline (Log, edit, delete and move are disabled with the reason shown), because row numbers can't be trusted until the app has re-read the sheet.
- Data freshness: refetch on app foreground; 30 s stale time as today.

## 6. Undo and redo

- One **history store** for the whole app, session-only (row numbers don't survive a reload). 50 entries.
- Each entry has a label, a forward action and an inverse action built from existing endpoints: log ↔ delete, delete ↔ `restore_row`, move/sort ↔ `restore_order`, edit ↔ edit back.
- UI: Undo and Redo buttons in the Passbook header with the next action named on them; toast after every change with Undo; after an undo the toast offers Redo; a History sheet to jump to any point ("undo to here").
- Keyboard: Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, Ctrl+Y, never inside a text field (fixes the Ctrl+Z backlog card).
- A new change clears the redo stack.

## 7. Other behaviour that must survive (owner decisions from 12 Nov)

- Safe daily spend = expenses budget left ÷ days left. Hard month limit shown only on tap.
- Cushion = lowest balance before the next salary (`kpis.postNovBalance`, `cushionUntil`).
- Savings per salary cycle from `savingsTrend`; this cycle, projected next, past average.
- Anchor row at 30% from the top, no animation on first load; floating Today button; instant drag.
- Debt data from the sheet: bike and BCA from EMI rows, SBI from `Loans!D2`.
- General budget resets with the salary cycle (7th); electricity with the **rent** cycle (15th). The electricity reset is a backend fix tracked on its own card and is not part of this remake.
- "Remaining … Budget" and "Total General" rows are shown as **set aside**, not as bills.
- Small spends are batched into one General Expenses row, so the Log sheet defaults to General Expenses and can cover several days.

## 8. Visual and interaction design

- Type: Mona Sans. Amounts in its wide, heavy width; labels regular. Sentence case, no all-caps labels.
- Light and dark follow the phone. Tokens defined once in CSS variables (no hard-coded hex in components).
- One memorable element: the big "You can spend" number on Today. The rest stays quiet.
- Touch targets at least 44 px. Visible focus. Reduced-motion respected. Text meets contrast in both themes. No horizontal page scroll at 360 px.
- **Phone = installed PWA, laptop = the website in a browser (owner decision).** The phone app must feel native: standalone display, no browser chrome, safe-area padding, bottom bar, no rubber-band or text-selection glitches on UI, themed status bar, splash screen, sheets that slide like native ones. The laptop layout (≥ 900 px) is in release one: left rail, content column plus a side panel for editing a row, wider Sheet mode with full keyboard use.
- Empty, error and offline states always say what to do next.

## 9. Money, privacy and safety constraints

- Today's balance must not change because of this work: `npm run integrity` (CHECK 5) and the dashboard balance before and after every cutover.
- No writes to the live sheet to test. UI tests run against a read-only/dev copy; write paths are covered by `npm run test:sim`.
- Auth unchanged (cookie login). The service worker caches only the app shell and the last financials snapshot for this signed-in user, and clears it on sign-out.

## 10. Build plan

Parallel build in a new route group so the old UI keeps working until parity, then a single cutover.

0. **Foundation**: tokens, app shell and nav, history store, sync store and status chip, `findOutOfOrder` and date-slot helpers (with unit tests), PWA manifest and service worker skeleton.
1. **Today + Log sheet**: on real data; Repeat monthly replaces the EMI page.
2. **Passbook List** with row sheet, add-by-date, out-of-order markers, order banner, Fix order.
3. **Grid and Sheet modes**: pinned columns, range sum, formula bar, drag mode, multi-select, Export, Sort, tabs.
4. **Plan and Owe**: budgets, charts, loans and actions, splits aside.
5. **Sync hardening and PWA**: precondition conflicts, Sync now, read-only offline snapshot with banner, install prompt, icons, splash, standalone polish on a real phone.
6. **Cutover**: Playwright pass at 360/390/768/1280 in both themes, balance and integrity checks, delete the old components, update README and product docs.

Each phase ends with: type-check, `test:sim` if `sheets.ts` was touched, `integrity`, and a screenshot pass at 390 px.

## 11. Decisions

Settled by the owner on 12 Nov 2026:
- Offline is read only (section 5).
- Edits, deletes and moves carry a precondition and are refused on conflict (section 5).
- Phone is the installed PWA; the laptop uses the website in a browser. Both are in release one (section 8).

Settled by the hosting handover:
- Production is `https://expenses.scriptingbear.com` on Vercel (project `finflow-app`, deployed by `git push app main`), HTTPS and the `.scriptingbear.com` session cookie already in place. So the PWA can be installed from it as is; no tunnel needed. The phone installs from this address and the laptop uses the same address in a browser.

Facts the build must respect because of Vercel (serverless):
- Each API call is a short-lived function, so the app cannot rely on in-memory state between calls. The write queue and history live in the browser; the server stays stateless.
- Hobby-plan functions have a time limit, and the Sheets API is slow. Heavy actions (sort, bulk move, bulk delete) must stay within one request's time, or be split into steps with progress shown in the sync chip. To be measured in phase 0 on a preview deployment, not guessed.
- The service worker and manifest are served from the same origin; `start_url` and `scope` are `/`. The service worker never caches `/api/*` writes or the login endpoints, and clears its caches on sign-out.
- Pushing to `app/main` deploys to production at once. The remake is built under a separate route group and shipped behind a switch, and only the cutover phase changes what `/` shows. Vercel preview deployments (any other branch) are used for phone testing.

Still open: none blocking.

## 12. Not in this remake

Money-coming-back concepts (Mom's allowance, Khushboo's reimbursements), the card manager, and the electricity reset fix each have their own cards. The Owe tab and Plan leave room for them.
