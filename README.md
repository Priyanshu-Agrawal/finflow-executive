# FinFlow Executive 🏛️

*Personal Sovereign Wealth Management & Financial Operating System*
*Author: Priyanshu Agrawal (`Spiderfan.No1@gmail.com`) • Codename: `scriptingBear • Executive OS`*

[![Next.js](https://img.shields.io/badge/Next.js-16.4.6-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.3.0-61DAFB?style=flat&logo=react)](https://react.dev/)
[![Turbopack](https://img.shields.io/badge/Turbopack-Enabled-blueviolet?style=flat)](https://turbo.build/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.3.3-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Google Sheets API](https://img.shields.io/badge/Google_Sheets_API-v4-34A853?style=flat&logo=google-sheets)](https://developers.google.com/sheets/api)
[![Integrity Suite](https://img.shields.io/badge/Integrity_Audit-6%2F6_PASS_✅-success?style=flat)](#-verification--audit)

---

## 🌟 Overview

**FinFlow Executive** is a personal financial operating system for forecasting cash flow, pacing monthly recurring budgets, and tracking multi-year debt amortization. It pairs a **Google Sheets backend** (spreadsheet `19MdOX_A-Nqw8a6rk77l4sNRQMAFcxudCp0ZmrHuqA_A`) acting as the authoritative system of record with a Next.js 16 App Router web application.

> 📘 For the full architecture, formulas, API reference and engineering invariants, see the **[Product Documentation](docs/PRODUCT_DOCUMENTATION.md)**.

---

## ⚡ Core Features

- 📊 **Executive Dashboard** — live tracking of:
  - Liquid Operating Balance: **₹1,14,021** (11 Nov 2026)
  - 5-Day Immediate Obligations: **₹75,865** (Phone EMI ₹58,465 + Electricity ₹2,400 + Rent ₹15,000; today's entries are already paid)
  - Post-Rent Cushion: **₹38,156**
  - Late-2027 terminal sovereign wealth projection: **₹2,70,760**
- ⚡ **4-Pillar Budget Burn & Runway Engine**
  - **General Expenses** — ₹15,000 monthly target anchored to the 7th (salary cycle). Daily allowance = $\frac{\text{Remaining Expenses Budget}}{\text{Remaining Days}}$ (**₹423/day**).
  - **Electricity Recharge Budget** — ₹3,200 total pool (₹3,000 base + ₹200 surplus carryover); ₹800 recharged, ₹2,400 remaining.
  - **Room Rent Commitment** — ₹15,000 due on the 15th, with a tracked post-rent liquidity buffer.
  - **Safe Total Daily Runway** — safe daily burn across the total liquid cushion (**₹1,468/day**).
- 📑 **Excel Grid Engine**
  - Dynamic Date Anchor highlights today's active baseline (Row 240).
  - **Multi-level global undo** (`Ctrl+Z` / `Cmd+Z`) for cell edits, drag-and-drop row moves and date sorts.
  - Cycle budget formulas (Row 247 sums every general spend logged this cycle; Row 248 `=15000-(C247)`) and Column E running-balance lineage defense.
  - Sort and drag-reorder move whole rows, so the Loans tab, column F notes and `Dashboard_Data` keep pointing at the same transactions.
- 🎯 **Unified Debt Hub** — tracks 7 liabilities: 2 active amortizations (Royal Enfield Meteor Loan, BCA Education Loan) and 5 retired debts, toward a debt-free milestone in August 2027 (**+₹14,771/month** unlocked cash flow).
- 🤝 **Peer Split Ledger** — shared expense splits and settlements with friends and roommates.

---

## 🛠️ Quick Start

### 1. Prerequisites

- Node.js `20.x` or higher
- A Google Cloud service account with edit access to the FinFlow spreadsheet

### 2. Environment configuration

Create `.env.local` in the project root (it is git-ignored):

```env
# Google Sheets backend
SPREADSHEET_ID=19MdOX_A-Nqw8a6rk77l4sNRQMAFcxudCp0ZmrHuqA_A
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@...iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Authentication
AUTH_USERNAME=scriptingBear
AUTH_PASSWORD=your_strong_password
AUTH_SECRET=a_random_string_of_at_least_32_characters

# Optional cookie settings
COOKIE_DOMAIN=.example.com   # set only when serving from a custom domain
# COOKIE_SECURE=true         # force the Secure flag on/off; auto-detected when unset
```

> 🔒 The login keeps your finances private when the URL is reachable from the internet. Keep `AUTH_PASSWORD` and `AUTH_SECRET` set; without them the app falls back to defaults that are visible in the source code.

### 3. Install, verify, run

```bash
npm install                 # install dependencies
npm run dev                 # development server (http://localhost:3000)

npx tsx --env-file=.env.local src/scripts/integrity-check.ts   # 6-point integrity audit

npm run build               # production build
npm run start -- -p 3000    # production server
```

### 4. Available scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Run the TypeScript compiler with `--noEmit` |
| `npm run integrity` | 6-point integrity audit against the live sheet (read-only) |
| `npm run test:sim` | Simulate every write path on an in-memory copy of the sheet (read-only) |

---

## 🗂️ Project Structure

```text
src/
├── app/                 # App Router pages (/, /excel, /expenses, /log, /loans, /ledger, /login)
│   └── api/             # Route handlers (financials, expenses, loans, ledger, auth)
├── components/          # dashboard, excel, expenses, loans, ledger, logger, layout, common
├── context/             # UndoContext (global multi-level undo stack)
├── hooks/               # useFinancials (TanStack Query data hook)
├── lib/                 # sheets.ts (Sheets client), computations.ts, auth.ts, date-utils.ts, types.ts
├── scripts/             # integrity-check.ts + Playwright end-to-end scripts
└── middleware.ts        # JWT session guard for pages and APIs
docs/
└── PRODUCT_DOCUMENTATION.md
```

---

## 🧪 Verification & Audit

FinFlow ships with a 6-point integrity audit that reads the live spreadsheet and checks known anchors:

```bash
npx tsx --env-file=.env.local src/scripts/integrity-check.ts
```

Expected output:

```text
--- STARTING FINFLOW INTEGRITY AUDIT ---
[CHECK 1] Expenses!C15: expected 30375, got 30375 -> PASS ✅
[CHECK 2] Expenses!D235: expected 'SETTLEMENT', got 'SETTLEMENT' -> PASS ✅
[CHECK 3] Loans!B2: expected 18000, got 18000 -> PASS ✅
[CHECK 4] Column E dynamic formula lineage: PASS ✅
[CHECK 5] Liquid balance on 2026-11-11 (Row 240): expected 114021, got 114021 -> PASS ✅
[CHECK 6] December 6 Cycle Budget & Projection (Rows 247-248): PASS ✅
-------------------------------------------
FINAL AUDIT VERDICT: VERDICT: PASS ✅
```

See [§6 of the Product Documentation](docs/PRODUCT_DOCUMENTATION.md#6-verification-suite--quality-assurance) for what each check asserts.

---

## 📦 Dual Git Remote Deployment

The project is pushed to two remotes: `origin` (`finflow-executive`) and `app` (`finflow-app`).

```bash
git commit --author="Priyanshu Agrawal <Spiderfan.No1@gmail.com>" -m "feat: ..."
git push origin main
git push app main
```

---

© 2026 Priyanshu Agrawal (`scriptingBear`). All Rights Reserved.
