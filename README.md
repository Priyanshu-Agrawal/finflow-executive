# FinFlow Executive 🏛️
*Personal Sovereign Wealth Management & Financial Operating System*  
*Author: Priyanshu Agrawal (`Spiderfan.No1@gmail.com`) • Codename: `scriptingBear • Executive OS`*

[![Next.js](https://img.shields.io/badge/Next.js-16.4.6-black?style=flat&logo=next.js)](https://nextjs.org/)
[![Turbopack](https://img.shields.io/badge/Turbopack-Enabled-blueviolet?style=flat)](https://turbo.build/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.1-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Google Sheets API](https://img.shields.io/badge/Google_Sheets_API-v4-34A853?style=flat&logo=google-sheets)](https://developers.google.com/sheets/api)
[![Integrity Suite](https://img.shields.io/badge/Integrity_Audit-6%2F6_PASS_✅-success?style=flat)]()

---

## 🌟 Overview

**FinFlow Executive** is an institutional-grade financial operating system designed to forecast cash flow, pace monthly recurring budgets, and model multi-year debt amortizations. FinFlow pairs an immutable **Google Sheets Backend (`19MdOX_A-Nqw8a6rk77l4sNRQMAFcxudCp0ZmrHuqA_A`)** with an ultra-responsive Next.js 16 web application.

For the full architectural breakdown, mathematical formulations, and engineering invariants, refer to the [Complete Product Documentation](docs/PRODUCT_DOCUMENTATION.md).

---

## ⚡ Core Features

- 📊 **Executive Dashboard**: Live tracking of Liquid Operating Balance (**₹1,14,021** on 11 Nov 2026), 5-Day Immediate Obligations (**₹79,865**), Post-Rent Cushion (**₹38,156**), and late-2027 terminal sovereign wealth (**₹2,70,760**).
- ⚡ **4-Pillar Budget Burn & Runway Engine**:
  - **General Expenses**: ₹15,000 monthly target anchored to the 7th salary cycle; computes dynamic daily spend: $\frac{\text{Remaining Expenses Budget}}{\text{Remaining Days}}$ (**₹423/day**).
  - **Electricity Recharge Budget**: ₹3,200 total pool (₹3,000 base + ₹200 surplus carryover), tracking ₹800 recharged and ₹2,400 remaining.
  - **Room Rent Commitment**: 15th recurring milestone (₹15,000) with guaranteed post-rent liquidity buffer.
  - **Safe Total Daily Runway**: Calculates safe daily burn across total liquid cushion (**₹1,468/day**).
- 📑 **Excel Grid Engine**:
  - Dynamic Date Anchor automatically highlights today's active baseline (Row 240).
  - **Multi-Level Global Undo (`Control+Z`)** for all cell edits, drag-and-drop row movements, and table sorts.
  - In-cell formula preservation (`=C240`, `=15000-(C247)`) and Column E balance lineage defense.
- 🎯 **Unified Debt Hub**: Tracks 7 liabilities across active amortizations (Royal Enfield Meteor Loan, BCA Education Loan) and 5 retired debts toward a guaranteed debt-free milestone in August 2027 (+₹14,771/month unlocked cash flow).
- 🤝 **Peer Split Ledger**: Manages shared expense splits and settlements with friends and roommates.

---

## 🛠️ Quick Start

### 1. Prerequisites
- Node.js `20.x` or higher
- Google Cloud Service Account with access to the FinFlow spreadsheet

### 2. Environment Configuration
Create a `.env.local` file:
```env
SPREADSHEET_ID=19MdOX_A-Nqw8a6rk77l4sNRQMAFcxudCp0ZmrHuqA_A
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@...iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
JWT_SECRET=your_jwt_secret
ADMIN_USERNAME=scriptingBear
ADMIN_PASSWORD_HASH=...
```

### 3. Build & Run
```bash
# Install dependencies
npm install

# Run automated integrity test suite
npx tsx --env-file=.env.local src/scripts/integrity-check.ts

# Production Build
npm run build

# Start Production Server
npm run start -- -p 3000
```

---

## 🧪 Verification & Audit

FinFlow includes an automated 6-point audit suite:
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

---

## 📦 Dual Git Remote Deployment

```bash
git commit --author="Priyanshu Agrawal <Spiderfan.No1@gmail.com>" -m "feat: ..."
git push origin main
git push app main
```

---

© 2026 Priyanshu Agrawal (`scriptingBear`). All Rights Reserved.
