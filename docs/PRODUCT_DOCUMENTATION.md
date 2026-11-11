# FinFlow Executive — Product Writeup & Comprehensive Documentation
*Version 2.4.0 — Production Release (November 2026)*  
*Platform Author: Priyanshu Agrawal (`Spiderfan.No1@gmail.com`)*  
*System Codename: `scriptingBear • Executive OS`*

---

## 1. Executive Summary & Vision

**FinFlow Executive** is an institutional-grade personal sovereign wealth management operating system built to manage and forecast personal finances, multi-year debt amortizations, and daily budget pacing. Unlike commercial personal finance applications that store financial records in proprietary black-box databases, FinFlow Executive employs a **Google Sheets Backend as an Immutable Data Warehouse** (`19MdOX_A-Nqw8a6rk77l4sNRQMAFcxudCp0ZmrHuqA_A`). 

By bridging Google Sheets v4 API with a high-performance **Next.js 16 App Router** frontend, FinFlow provides:
- **Bi-directional Live Synchronization**: Instant updates with sub-second optimistic mutations.
- **Formula Lineage Defense**: Preserves dynamic Google Sheets formula chains (`=IF(...)`, `=C240`, `=15000-(C247)`) across drag-and-drop row reorders and chronological date sorts.
- **4-Pillar Budget Pacing Engine**: Real-time pacing for General Expenses (anchored to salary cycle), Electricity Recharge Budget (with prior-month surplus carryover), Room Rent commitments, and Safe Total Daily Liquid Burn.
- **Multi-Level Global Undo (`Control+Z`)**: Instantly reverts cell edits, drag-and-drop movements, and date sorts across both the UI and Google Sheets.
- **Unified Debt Amortization Hub**: Real-time deleveraging tracking across active and retired loans toward a guaranteed debt-free milestone in August 2027 (+₹14,771/month unlocked cash flow).

```mermaid
flowchart TD
    User([Executive User]) <-->|HTTPS / Session Auth| NextApp[FinFlow Executive OS\nNext.js 16 App Router]
    
    subgraph UI_Layer [Frontend Layer]
        NextApp --> Dash[Dashboard & Executive Hero]
        NextApp --> Timeline[Cash Flow & Balance Timeline]
        NextApp --> Engine[4-Pillar Budget Burn Engine]
        NextApp --> Grid[Excel Mode Grid Engine]
        NextApp --> Hub[Unified Debt Hub]
        NextApp --> Ledger[Peer Split Ledger]
    end

    subgraph Service_Layer [Backend & Engine Layer]
        Grid <--> Undo[Multi-Level Undo Engine]
        Engine <--> Calc[Computations & Pacing Core]
        Calc <--> FormulaDef[Formula Lineage Defense]
        FormulaDef <--> SheetsClient[Google Sheets API v4 Service Client]
    end

    subgraph Data_Layer [Google Sheets Data Warehouse]
        SheetsClient <--> SheetExp[(Expenses Tab\n314+ Rows)]
        SheetsClient <--> SheetLoan[(Loans Tab\nAmortization Matrix)]
        SheetsClient <--> SheetPeer[(Peer Ledger Tab)]
        SheetsClient <--> SheetAcc[(Meteor Accessories Tab)]
    end
```

---

## 2. System Architecture & Technical Stack

### 2.1 Core Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Framework** | Next.js App Router | `16.4.6` (Turbopack) | Server-side rendering, streaming route handlers, static optimization |
| **Runtime** | Node.js | `20.20.0` (LTS) | Local engine runtime and API routing |
| **Language** | TypeScript | `5.x` | Strict type safety, interface contracts, zero unsafe casting |
| **Styling** | Tailwind CSS | `3.4.1` | Sleek monochromatic amber-accented executive theme (`#0B0B0C`, `#121214`) |
| **Icons** | Lucide React | `0.460.0` | High-fidelity micro-interactions and status glyphs |
| **State & Cache** | TanStack React Query | `5.62.7` | Optimistic mutations, background revalidation, query key caching |
| **Backend Store** | Google Sheets API | `v4` (googleapis `144.0.0`) | Primary authoritative transactional database |
| **Auth** | Custom JWT + HTTP-Only Cookies | `jose` / `cookies` | Access token + refresh token rotation with LAN IP support |
| **Testing** | Playwright Chromium | `1.49.1` | Headless visual verification and cross-device responsive testing |

### 2.2 Security & Authentication Architecture

1. **Authentication Mechanism**: Session-based JSON Web Tokens (JWT) issued upon successful verification of `scriptingBear` credentials.
2. **Dual-Cookie Token Rotation**:
   - `finflow_access_token`: Short-lived token for authorized API operations.
   - `finflow_refresh_token`: Long-lived token ensuring seamless executive session continuity.
3. **LAN HTTP Compatibility**: Cookies adapt their `secure` attribute based on network origin to permit seamless access across local IP addresses (e.g. `10.95.71.75:3000`) on iPhones and local devices without SSL errors.

---

## 3. Core Product Modules

```mermaid
graph LR
    A[FinFlow Executive OS] --> B[1. Executive Dashboard]
    A --> C[2. Budget Burn Engine]
    A --> D[3. Excel Grid Engine]
    A --> E[4. Debt Amortization Hub]
    A --> F[5. Peer Split Ledger]
    A --> G[6. Timeline & Projections]
```

### 3.1 Module 1: Executive Dashboard & Hero KPIs
Provides immediate situational awareness over liquid capital, short-term debt obligations, and structural cash runway:

- **Current Liquid Operating Balance**: The authoritative settled bank balance as of the dynamic anchor date (e.g., **₹1,14,021** on 11 Nov 2026).
- **Upcoming Immediate Bills (5-Day Horizon)**: Automatic lookahead scanning all obligations maturing within 5 days (e.g., Phone EMI ₹58,465 + Remaining Electricity ₹2,400 + Rent ₹15,000 = ₹79,865).
- **Post-Obligation Real Cushion**: Net liquidity remaining after all current cycle obligations settle (e.g., **₹38,156** post-Nov 15).
- **Sovereign Wealth Projection (Late 2027)**: Terminal compound capital projection (**₹2,70,760**, representing **+100.7% net capital expansion**).

---

### 3.2 Module 2: 4-Pillar Budget Burn & Runway Engine

The budget pacing engine manages discretionary spending across distinct financial pillars to prevent capital erosion:

```mermaid
flowchart TD
    subgraph Pacing_Engine [4-Pillar Budget Burn Engine]
        P1[Pillar 1: General Expenses\nCycle: 7th - 7th\nBudget: ₹15,000\nDaily Burn: Remaining / Days]
        P2[Pillar 2: Electricity Budget\nBase: ₹3,000 + Surplus: ₹200 = ₹3,200\nRecharged: ₹800 | Remaining: ₹2,400]
        P3[Pillar 3: Room Rent\nDue: 15th of Every Month\nAmount: ₹15,000 | Cushion: ₹38,156]
        P4[Pillar 4: Liquid Operating Buffer\nAvailable Balance: ₹1,14,021\nTotal Safe Runway: ₹1,468/day]
    end
```

#### Pillar 1: General Expenses Budget (15k Monthly Target)
- **Recurring Anchor**: Anchored to salary recurrence day (**7th of every month**).
- **Formula Formulation**:
  $$\text{Safe Daily Spend} = \frac{\text{Remaining Expenses Budget}}{\text{Days Remaining in Cycle}}$$
  - *Active Example*: $\frac{₹11,000}{26\text{ days}} = ₹423\text{/day}$.
- **Cycle Summary Rows**: Automatically separates transactional ad-hocs (food, tea, grocery, fuel) from cycle summaries (`Total General Expenses` SETTLEMENT and `Remaining Expenses Budget` DEBIT).

#### Pillar 2: Electricity Recharge Budget
- **Budget Formulation**:
  $$\text{Total Electricity Budget} = \text{Base Monthly Budget (₹3,000)} + \text{Previous Surplus (₹200)} = ₹3,200$$
- **Recharge Lineage**:
  - Recharges Done: **₹800** (from Row 242 `SETTLEMENT`).
  - Remaining Recharge Budget: **₹2,400** (from Row 243 `DEBIT`).
  - Daily Allowance: **₹92/day** across the remaining cycle.
- **Architectural Distinction**: Completely isolates the bank budget from the non-expiring physical meter balance, eliminating misleading countdowns.

#### Pillar 3: Room Rent Recurring Commitment
- **Anchor Day**: 15th of every month (**₹15,000** fixed obligation).
- **Post-Rent Buffer**: Tracks guaranteed post-rent net liquidity (**₹38,156**) to ensure fixed housing costs are 100% funded before discretionary spending.

#### Pillar 4: Available Liquid Buffer & Total Daily Runway
- Calculates total permissible daily burn across the entire liquid cushion:
  $$\text{Total Safe Daily Runway} = \frac{\text{Post-Rent Liquid Cushion}}{\text{Days Remaining in Cycle}} = \frac{₹38,156}{26} = ₹1,468\text{/day}$$

---

### 3.3 Module 3: Excel Grid Engine (`ExcelSpreadsheet.tsx`)

A desktop-grade financial grid editor embedded directly into the browser:

```mermaid
sequenceDiagram
    autonumber
    actor User as Executive User
    participant Grid as Excel Grid Engine
    participant Undo as Global Undo Stack
    participant Sheets as Google Sheets API v4
    
    User->>Grid: Edit Cell / Drag Row / Sort by Date
    Grid->>Undo: Push Inverse Mutation Action
    Grid->>Sheets: Execute Update & Regenerate Formulas
    Sheets-->>Grid: Confirm Sheet Updated
    Note over User,Grid: User presses Control+Z or clicks Toast
    User->>Grid: Trigger Undo (Control+Z)
    Grid->>Undo: Pop Last Undo Action
    Undo->>Sheets: Restore Previous Cell / Row Array / Lineage
    Sheets-->>Grid: Live Lineage Restored
```

#### Features:
1. **Dynamic Date Anchor**: Automatically locates and anchors the cursor to the latest actual transaction on or before today's date (Row 240 on 11 Nov 2026: `General Expenses ₹4,000 DEBIT`).
2. **Multi-Level Global Undo (`Control+Z`)**:
   - Full keyboard shortcut support (`Ctrl+Z` / `Cmd+Z`).
   - Visual floating toast with countdown and manual "Undo" trigger.
   - Reverts single cell edits, drag-and-drop row movements, and table sorts back to Google Sheets.
3. **Drag-and-Drop Row Reordering**: Reorder rows visually while dynamically reconstructing Column E formula references.
4. **Formula Preservation Engine**:
   - Column C formulas (e.g., Row 247 `=C240` and Row 248 `=15000-(C247)`) are preserved across sorts and reorders.
   - Column E balance formulas are guarded against hardcoded value corruption.
5. **Interactive Controls**:
   - Row jump input (`Jump to Row #`).
   - Column search across descriptions, categories, and dates.
   - Transaction type toggle (`DEBIT`, `CREDIT`, `SETTLEMENT`, `ADJUSTMENT`).

---

### 3.4 Module 4: Unified Debt & Liabilities Hub (`LoanPortfolio.tsx`)

Tracks all 7 historical and active liabilities with automated payoff schedules:

```mermaid
pie title Total Historical Liabilities (₹4,47,165)
    "Royal Enfield Meteor Bike Loan (Active)" : 94167
    "BCA Education Loan (Active Cycle)" : 12000
    "Diploma Due (Settled)" : 172025
    "Credit Card SBI (Settled)" : 25000
    "IDFC Credit Card (Settled)" : 26248
    "Sikarwar Due (Settled)" : 34670
    "Bhaiya Udhar (Settled)" : 18200
```

#### Active Amortizing Liabilities:
1. **Royal Enfield Meteor 350 Bike Loan**:
   - Monthly EMI: **₹11,771** (clears on 2nd of each month).
   - Principal Remaining: **₹94,167** (38% amortized, initial ₹1,53,022).
   - Payoff Milestone: **2 August 2027** (+₹11,771/month cash flow unlocked).
   - Prepayment Support: Automatically accounts for prepaid EMIs (such as Dec 2026 prepaid on 6 Nov).
2. **BCA Education Loan (Active Cycle)**:
   - Monthly EMI: **₹3,000** (clears on 5th of each month).
   - Principal Remaining: **₹12,000** (2 paid, 4 remaining out of 6).
   - Authoritative Anchor: Governed by `Loans!B2 === 18000`.
   - Payoff Milestone: **5 March 2027** (+₹3,000/month cash flow unlocked).

#### Settled Liabilities (100% Retired):
- Credit Card SBI: ₹25,000 ➔ **₹0**
- Bhaiya Udhar (Family Ledger): ₹18,200 ➔ **₹0**
- Diploma Due: ₹1,72,025 ➔ **₹0**
- IDFC Credit Card: ₹26,248 ➔ **₹0**
- Sikarwar Due: ₹34,670 ➔ **₹0**

**Terminal Milestone**: By **August 2027**, all 7 liabilities reach ₹0, liberating **+₹14,771/month** to compound into wealth accumulation.

---

### 3.5 Module 5: Peer Split Ledger (`PeerLedgerTable.tsx`)
Manages multi-party shared expenses (roommate utilities, shared meals, bulk orders):
- Calculates per-person net share.
- Distinguishes settled reimbursements from active receivables.
- Bi-directional sync with the `PeerLedger` tab.

---

## 4. Mathematical Formulations & Formula Lineage Defense

### 4.1 Column E Running Balance Formula Lineage

FinFlow enforces a universal dynamic formula rule across all rows in the `Expenses` sheet:

```excel
=IF(OR(D{row}="", D{row}="ADJUSTMENT", D{row}="SETTLEMENT", D{row}="OTHER", D{row}="DIRECT"), E{prev}, IF(D{row}="DEBIT", E{prev}-C{row}, IF(D{row}="CREDIT", E{prev}+C{row}, "")))
```

#### Special Gap Row Protections:
- **Row 38 (Gap Baseline Reset)**: Guarded as `=0`.
- **Row 39 (2026 Inception Anchor)**: Guarded as `=C39` (Essence Salary credit).
- **Sorting Safety**: The `sortExpensesSheet()` algorithm protects Rows 38 and 39 while generating relative formulas for all other rows from Row 2 to Row 314+.

---

## 5. API Reference & Route Handlers

| Route | Method | Purpose | Key Parameters / Payload |
|---|---|---|---|
| `/api/financials` | `GET` | Fetches consolidated financial state | `refDate`, `generalBudget`, `electricityBudget`, `budgetRecurringDay` |
| `/api/expenses/log` | `POST` | Appends new transaction with formula | `{ date, description, amount, type, perDayBurn }` |
| `/api/expenses/[row]` | `PATCH` | Updates specific cell in Google Sheets | `{ date, description, amount, type }` |
| `/api/expenses/[row]/type` | `PATCH` | Toggles transaction type (`DEBIT` ↔ `CREDIT`) | `{}` |
| `/api/expenses/reorder` | `POST` | Reorders row via drag-and-drop | `{ sourceIndex, targetIndex }` |
| `/api/expenses/restore` | `POST` | Reverts row order from undo stack | `{ orderedRowIndices: number[] }` |
| `/api/expenses/sort` | `POST` | Sorts expenses by date with formula repair | `{}` |
| `/api/loans/action` | `POST` | Records EMI payment or settlement | `{ loanKey, amount, date, actionType }` |
| `/api/loans/reset-bca` | `POST` | Restores `Loans!B2` to ₹18,000 | `{}` |
| `/api/auth/login` | `POST` | Authenticates executive user | `{ username, password }` |
| `/api/auth/logout` | `POST` | Clears authentication cookies | `{}` |

---

## 6. Verification Suite & Quality Assurance

FinFlow Executive employs an automated 6-point integrity audit suite located in [`src/scripts/integrity-check.ts`](file:///Users/essence/finflow-executive/src/scripts/integrity-check.ts):

```bash
npx tsx --env-file=.env.local src/scripts/integrity-check.ts
```

### The 6 Integrity Invariants:
1. **CHECK 1**: `Expenses!C15 === 30375` (historical audit anchor).
2. **CHECK 2**: `Expenses!D235 === 'SETTLEMENT'` (budget summary boundary).
3. **CHECK 3**: `Loans!B2 === 18000` (BCA loan principal baseline).
4. **CHECK 4**: Column E formula lineage integrity across active cycle rows.
5. **CHECK 5**: Liquid balance on dynamic anchor date matches authoritative calculation (**₹1,14,021** on Row 240).
6. **CHECK 6**: December 6 cycle budget settlement (Row 247 SETTLEMENT ₹4,000) & projection (Row 248 DEBIT ₹11,000 ➔ ₹21,156).

---

## 7. Operational & Deployment Guide

### 7.1 Environment Configuration (`.env.local`)

```env
# Google Sheets Backend
SPREADSHEET_ID=19MdOX_A-Nqw8a6rk77l4sNRQMAFcxudCp0ZmrHuqA_A
GOOGLE_SERVICE_ACCOUNT_EMAIL=finflow-service@...iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Security & Authentication
JWT_SECRET=super_secret_jwt_key_here
ADMIN_USERNAME=scriptingBear
ADMIN_PASSWORD_HASH=...
```

### 7.2 Running Local Production Server

```bash
# Production Build
npm run build

# Start High-Performance Production Server
npm run start -- -p 3000
```

### 7.3 Dual Git Remotes Deployment Protocol

Every change must be committed as `Priyanshu Agrawal <Spiderfan.No1@gmail.com>` and synchronized across both dual remotes:

```bash
git add src/ docs/
git commit --author="Priyanshu Agrawal <Spiderfan.No1@gmail.com>" -m "feat: ..."
git push origin main
git push app main
```

---

## 8. Summary of Recent Milestones (November 2026)

1. **Electricity Budget Streamlining**: Separated the ₹2,400 remaining recharge budget from the physical meter balance, removing artificial expiry runways.
2. **Dynamic Date Anchor**: Bound baseline calculation dynamically to today's date (`2026-11-11`), anchoring Row 240 with ₹1,14,021 liquid balance.
3. **Multi-Level Global Undo (`Control+Z`)**: Added non-destructive undo across all cell edits, drag-and-drop operations, and auto-sorting.
4. **Prepaid December EMI Accounting**: Updated amortization tracking to account for prepaid December bike EMI logged on November 6.
5. **Formula Lineage Preservation**: Secured Column C and Column E formulas across all table mutations.
