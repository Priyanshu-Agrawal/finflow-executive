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
  postNovBalance: number;
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
  
  // General Expenses Budget
  generalBudget: number;      // e.g. 15000
  generalSpentSoFar: number;  // e.g. 4500
  generalRemaining: number;   // e.g. 10500
  generalPerDayLimit: number; // e.g. 525/day
  generalSpentPercent: number;// 30%
  generalExpensesList: ExpenseEntry[];

  // Electricity Budget
  electricityBudget: number;      // e.g. 3200
  electricitySpentSoFar: number;  // e.g. 500
  electricityRemaining: number;   // e.g. 2700
  electricityPerDayLimit: number; // e.g. 135/day
  electricitySpentPercent: number;
  electricityList: ExpenseEntry[];

  // Third Factor: Available Balance & Safe Buffer Rate
  availableBalance: number;       // ₹1,28,792
  postFixedObligationsBuffer: number; // ₹53,392
  safeTotalDailyBurn: number;     // Post-Nov buffer / remaining days
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
