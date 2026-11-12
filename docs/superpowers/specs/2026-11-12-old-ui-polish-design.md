# Polishing the existing FinFlow UI: design

Status: draft for owner approval (12 Nov 2026). Replaces the "complete remake" direction: the owner prefers the existing dark and amber design and wants it polished, made consistent, finished, and turned into a proper PWA. The remake branches (`v2-remake` merged as a hidden `/v2` shell, `v2-phase-1` unmerged) stay for reference; their tested logic (date order, balance line, drag impact, undo/redo, sync queue, quota rules) is reused in step C.

## What is protected (owner)
Dark theme with the amber accent; the dashboard cards and charts; the Excel Mode feel. No component gets rewritten from scratch; the work restyles and restructures what exists.

## Audit of the current UI (12 Nov, 6 routes x phone 390 px and laptop 1440 px, measured)

| Finding | Evidence |
|---|---|
| Sideways scroll on phone | Peer Split 407 px, Home 393 px (filter pills and a nowrap row overflow) |
| Three typefaces mixed, monospace dominant | Excel 1,593 mono vs 25 sans text items; Home 149 mono / 46 serif / 142 sans; amounts in serif on Home, mono in Excel, sans in Ledger |
| Text too small | 327 text items under 11 px on Excel, 70 on Home, 53 on Ledger |
| All-caps wide-tracked labels everywhere | "SOVEREIGN WEALTH PORTFOLIO", "CURRENT LIQUID OPERATING BALANCE", "LEDGER MASTER", table heads |
| Marketing and developer wording | "High-Performance Expenses Ledger", "Transactions & Formula Lineage Ledger", "Matrix View", "Google Sheets Tab 'Expenses' (A1:E314+)" |
| One screen, several names | Nav "Expenses", page title "High-Performance Expenses Ledger", card "Transactions & Formula Lineage Ledger", tab "Ledger (314+)", bottom bar "Ledger"; "Log Tx" vs "Log Expense" vs "Log Transaction" |
| Duplicate navigation | Home has its own tab strip that renders the Ledger, Excel, Loans and Splits views; the same screens exist as routes with the top menu; the two copies differ |
| Sticky headers inconsistent | Only the Excel grid and top bar are sticky; Ledger, Splits and Loans headers scroll away |
| "Today" control inconsistent | Excel has a floating Today button; Ledger has only an inline "Focus Today / Nearest"; nothing elsewhere |
| Page titles inconsistent | Home and Excel have no `h1`; others have a long marketing `h1` and a second card title below it |
| Table data below the fold on phone | Ledger: about 1.5 screens of title, description, buttons, filters and a "213 earlier" banner before the first row |
| Excel Mode on phone | Only Date and Description fit; dates wrap to two lines; header overlaps the first row |
| Splits table on phone | Header cut off ("SPLIT (BENEF"), filter pills run off the screen |
| Date formats | `12 Oct 2026` (Ledger), `2026-11-11` (Excel), `12 Nov` (cards) |
| Hard-coded dashboard text | "By 15 Nov", "Phone (₹58k) + Electricity (₹2.4k) + Rent (₹15k)", "+100.7% growth", "Debt-Free by August 2027 (+₹14,771/mo)", "Anchor: 12 Nov" while the anchor row is 11 Nov |
| Small tap targets and unlabelled icons | Nav buttons 28 px, Today pill 30 px, sync button 32 px; 1 to 3 icon-only buttons without a label per page |
| Credit colour | Green credits in tables, but the owner already ruled red/green out and chose blue/orange for savings |

## Rules (what "consistent" means)

1. **One navigation, from one list.** Names, in this order: **Home, Ledger, Excel, Loans, Splits** (Budget gets its own page, **Budget**, replacing Home's "Budget Burn" tab). The top menu (laptop), the bottom bar (phone), the page title and any link use the same label. Home loses its inner tab strip. Routes stay as they are (`/expenses` keeps its URL, label "Ledger"; `/ledger` keeps its URL, label "Splits").
2. **One page frame** for every screen: short `h1` (the nav label), at most one plain sentence under it (hidden on phone), the primary actions on the right, then a sticky control bar for search, filters and view switches. No second title in a card.
3. **One sticky rule:** the top bar, the page control bar and every table's header row are sticky. A table's header never scrolls away.
4. **One Today button** (floating, bottom right, above the phone bar) on every screen with a dated list: Ledger and Excel. It scrolls the anchor row to 30% from the top.
5. **One type system.** Sans (Geist) for all text, labels, buttons and amounts, with tabular figures. Serif (Newsreader) only for the FinFlow wordmark and the one hero balance. Monospace (JetBrains Mono) only inside the Excel grid, the formula bar and row numbers. No wide-tracked all-caps labels; sentence case. Minimum text size 12 px (11 only for dense table heads on laptop).
6. **One date and money format:** display `12 Nov 2026` (lists add the weekday: `Thu 12 Nov`); ISO only in the formula bar and CSV. Money `₹1,14,021`, negatives with a real minus.
7. **Colour means money direction.** Credits and "saved" are blue, debits neutral, "over" orange, as in the savings meter the owner already approved. Amber stays the brand and action colour. Status uses an icon and words, not colour alone.
8. **Phone first density:** on phone the first data row of Ledger and Excel is visible without scrolling past a screen of chrome (all chrome above the first row at most 300 px); long descriptions and banners move into a collapsible "Details" row.
9. **Tap targets at least 44 px on phone, every icon-only button has a label, text 12 px or larger, no page wider than the screen, visible keyboard focus.**
10. **No hard-coded money text.** Every figure and sentence in the hero and cards is built from the API data.

## Steps (each is tested, shown to the owner on phone and laptop, then merged)

- **A. Consistency pass** (this document and its plan): rules 1 to 10.
- **B. PWA native feel:** install opens the real app, splash and themed status bar for the dark theme, service worker with a read-only offline copy, sync status, pull to refresh, safe-area padding, no browser-style overscroll on app chrome.
- **C. Excel and Ledger power:** reuse the tested logic: out-of-order markers by date, the balance line, drag with live balance impact, add row by date, row actions, undo and redo history, "Sync now".
- **D. Laptop layout:** two-column dashboard, denser tables, keyboard shortcuts.

## Owner decisions needed before building A
1. The names in rule 1, and Budget as its own page.
2. Rule 7: credits blue (matching the savings meter) instead of today's green.
