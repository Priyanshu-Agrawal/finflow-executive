export type TransactionType =
  | 'DEBIT'
  | 'CREDIT'
  | 'SETTLEMENT'
  | 'ADJUSTMENT'
  | 'OTHER'
  | 'DIRECT';

export interface ExpenseEntry {
  rowIndex: number; // 1-based spreadsheet row
  date: string;     // YYYY-MM-DD
  rawDate: string;  // original date string as stored in sheet
  description: string;
  amount: number;
  type: TransactionType;
  balance: number;
  isFormulaBacked: boolean;
  formula?: string;
}

export interface SavingsCycle {
  start: string;  // salary / cycle start (YYYY-MM-DD)
  end: string;    // next cycle start
  saving: number; // balance the day before `end` minus the day before `start`
  kind: 'past' | 'current' | 'projected';
}

export interface RawLoanRow {
  date: string;
  bcaDue?: number;
  bikeLoan?: number;
  creditCardSbi?: number;
  bhaiyaUdhar?: number;
  diplomaDue?: number;
  idfcCreditCard?: number;
  sikarwarDue?: number;
}

export interface LoanStatus {
  id: string;
  name: string;
  columnLetter: string;
  category: 'bank' | 'bike' | 'personal' | 'credit_card';
  initialPrincipal: number;
  currentDue: number;
  paidToDate: number;
  progressPercent: number;
  isPaidOff: boolean;
  monthlyEmi?: number;
  targetPayoffDate?: string;
  notes?: string;
}

export interface BcaCycle {
  baselineTotal: number; // 18000
  b2Value: number;       // Current cell value in Loans!B2
  needsReset: boolean;   // true if b2Value !== 18000
  totalCycleDue: number; // 18000
  emisTotal: number;     // 6 (Oct 2026 - Mar 2027)
  emisPaid: number;      // 2 (Oct 3, Nov 5 = ₹6,000)
  emisRemaining: number; // 4 (Dec 2026 to Mar 2027 = ₹12,000)
  paidToDate: number;    // 6000
  remainingDue: number;  // 12000
  monthlyEmi: number;    // 3000
  payoffDate: string;    // '2027-03-05'
  schedule: Array<{
    month: string;
    date: string;
    amount: number;
    isPaid: boolean;
  }>;
}

export interface KPIs {
  currentBalance: number;
  upcomingBills: number;
  postNovBalance: number;  // cycle cushion: lowest balance from today until the day before the next salary
  cushionUntil: string;    // next salary date (YYYY-MM-DD); the cushion covers the days before it
  projectedEndBalance: number;
  totalCredit: number;
  totalDebit: number;
  burnRateMonthly: number;
  surplusMonthly: number;
}

export interface DuplicateGroup {
  id: string;
  description: string;
  amount: number;
  rows: ExpenseEntry[];
}

export interface SpendingCategorySummary {
  category: string;
  amount: number;
  percentage: number;
  count: number;
  color: string;
}

export interface BudgetPacing {
  monthKey: string;           // e.g. "2026-11"
  monthName: string;          // e.g. "November 2026"
  totalDaysInMonth: number;   // 30
  currentDay: number;         // 10
  remainingDays: number;      // 20
  
  // Recurring Cycle Anchors
  budgetRecurringDay: number; // 6 or 7 (default 6)
  rentRecurringDay: number;   // 15
  cycleStartDate: string;     // e.g. "2026-11-06"
  cycleEndDate: string;       // e.g. "2026-12-06"
  cycleLabel: string;         // e.g. "6 Nov – 6 Dec Cycle"
  daysElapsedInCycle: number; // e.g. 4
  daysRemainingInCycle: number; // e.g. 26
  
  // Rent Recurring Milestone (15th)
  nextRentDate: string;       // e.g. "2026-11-15"
  daysUntilRent: number;      // e.g. 5
  rentAmount: number;         // e.g. 15000
  postRentBuffer: number;     // cycle cushion (same as kpis.postNovBalance): lowest balance before the next salary

  // General Expenses Budget (15k)
  generalBudget: number;      // e.g. 15000
  generalSpentSoFar: number;  // e.g. 3500
  generalRemaining: number;   // e.g. 11500
  generalPerDayLimit: number; // e.g. 442/day (divided by daysRemainingInCycle)
  generalSpentPercent: number;// e.g. 23%
  generalExpensesList: ExpenseEntry[];

  // Electricity Architecture: Dual Distinction (Recharge Budget vs Live Meter Balance)
  electricityBaseBudget: number;         // e.g. 3000 (monthly base allocation)
  electricitySurplus: number;            // e.g. 200 (previous month surplus carryover)
  electricityTotalBudget: number;        // e.g. 3200 (base + surplus)
  electricityRechargedSoFar: number;     // e.g. 800 (total recharges done from Row 242 SETTLEMENT)
  electricityRemainingBudget: number;    // e.g. 2400 (remaining budget in bank/allocation to recharge from Row 243 DEBIT)
  electricityMeterBalance: number;       // e.g. 300 (live balance currently in electric meter / wallet)
  electricityDailyBurnRate: number;      // e.g. ~75 / day
  electricityMeterRunwayDays: number;    // e.g. ~4 days of power left on meter

  // Backward compatibility fields
  electricityBudget: number;      // e.g. 3200 (electricityTotalBudget)
  electricitySpentSoFar: number;  // e.g. 800 (electricityRechargedSoFar)
  electricityRemaining: number;   // e.g. 2400 (electricityRemainingBudget)
  electricityPerDayLimit: number; // e.g. 92/day (across cycle)
  electricityPerDayUntilRent: number; // e.g. 480/day (until 15th rent date)
  electricitySpentPercent: number;
  electricityList: ExpenseEntry[];

  // Liquid Reserves / Available Balance Factor
  availableBalance: number;       // ₹1,28,792
  postFixedObligationsBuffer: number; // ₹53,392
  safeTotalDailyBurn: number;     // generalRemaining / daysRemainingInCycle (never from savings)
  projectedCycleSavings: number;  // projected balance at cycle end - balance before the cycle's salary
  worstCaseDailyBurn: number;     // (generalRemaining + max(0, projectedCycleSavings)) / daysRemainingInCycle
}

export interface PeerLedgerEntry {
  rowIndex: number;
  date: string;
  amount: number;
  description: string;
  splitWith: string;
  perPersonShare: number;
}

export interface MeteorAccessory {
  name: string;
  variant: string;
  rePrice: string;
  afterMarketPrice: string;
}

export interface MeteorCapitalCost {
  label: string;
  amount: number;
}

export interface FinancialsResponse {
  kpis: KPIs;
  expenses: ExpenseEntry[];
  savingsTrend: SavingsCycle[];
  loans: LoanStatus[];
  bcaCycle: BcaCycle;
  spendingCategories: SpendingCategorySummary[];
  duplicates: DuplicateGroup[];
  budgetPacing: BudgetPacing;
  peerLedger: PeerLedgerEntry[];
  meteorAccessories: MeteorAccessory[];
  meteorCosts: MeteorCapitalCost[];
  referenceDate: string;
  lastUpdated: string;
}

export interface LogExpenseInput {
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
}

export interface ScheduleEmiInput {
  title: string;
  monthlyAmount: number;
  months: number;
  startDate: string;
  type?: TransactionType;
}

/** One whole-row move in the Expenses tab: the row at `from` ends up at `to` (1-based). */
export interface RowMove {
  from: number;
  to: number;
}

/** Undo payload for sort / reorder: the row moves that restore the previous order. */
export interface RowOrderUndo {
  moves: RowMove[];
}
