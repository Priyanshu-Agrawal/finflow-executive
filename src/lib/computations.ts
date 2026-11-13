import { SavingsCycle,
  BcaCycle,
  BudgetPacing,
  DuplicateGroup,
  ExpenseEntry,
  KPIs,
  LoanStatus,
  RawLoanRow,
  SpendingCategorySummary,
} from './types';
import { isBeforeOrEqual, isBetweenDates } from './date-utils';

/**
 * What counts as a general (discretionary) expense, matched against the lower-cased
 * description. Shared with the sheet's cycle-total formula (buildCycleGeneralTotalFormula)
 * so the app and the sheet always agree. Keep both as plain regex sources.
 */
export const GENERAL_EXPENSE_PATTERN = 'general|food|petrol|tea|chai|adhoc|grocery';
/** Cycle summary rows that must never count as spending. */
export const GENERAL_EXCLUDE_PATTERN = 'remaining|total general';

export function isGeneralExpense(description: string): boolean {
  const desc = description.toLowerCase();
  return new RegExp(GENERAL_EXPENSE_PATTERN).test(desc) && !new RegExp(GENERAL_EXCLUDE_PATTERN).test(desc);
}

/** Adds `days` to a YYYY-MM-DD date (local calendar). */
function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(y, m - 1, d + days);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

/**
 * Next rent date on or after referenceDate (rent falls on rentRecurringDay each month;
 * on the rent day itself it is still that day). Returns 'YYYY-MM-DD'.
 */
export function nextRentDateFor(referenceDate: string, rentRecurringDay: number = 15): string {
  const [year, month, day] = referenceDate.split('-').map(Number);
  let rentYear = year;
  let rentMonth = month;
  if (day > rentRecurringDay) {
    if (month === 12) {
      rentYear = year + 1;
      rentMonth = 1;
    } else {
      rentMonth = month + 1;
    }
  }
  return `${rentYear}-${String(rentMonth).padStart(2, '0')}-${String(rentRecurringDay).padStart(2, '0')}`;
}

/** Next salary / budget-cycle start strictly after referenceDate ('YYYY-MM-DD'). */
export function nextCycleStartFor(referenceDate: string, budgetRecurringDay: number = 7): string {
  const [year, month, day] = referenceDate.split('-').map(Number);
  let y = year;
  let m = month;
  if (day >= budgetRecurringDay) {
    m += 1;
    if (m === 13) {
      m = 1;
      y += 1;
    }
  }
  return `${y}-${String(m).padStart(2, '0')}-${String(budgetRecurringDay).padStart(2, '0')}`;
}

/**
 * Saving per salary cycle (budgetRecurringDay → budgetRecurringDay): the change in the
 * running balance from the day before one salary to the day before the next. Returns up
 * to `past` completed cycles, the current one and `future` projected ones. Cycles that
 * contain a Time Lapse row (the balance reset in Mar 2026) are skipped: not real saving.
 */
export function computeSavingsTrend(
  expenses: ExpenseEntry[],
  referenceDate: string,
  budgetRecurringDay: number = 7,
  past: number = 6,
  future: number = 3
): SavingsCycle[] {
  const asOf = (date: string): number | null => {
    let bal: number | null = null;
    for (const e of expenses) {
      if (e.date <= date) bal = e.balance;
      else break;
    }
    return bal;
  };
  const resets = expenses.filter((e) => /time lapse/i.test(e.description)).map((e) => e.date);
  const nextStart = nextCycleStartFor(referenceDate, budgetRecurringDay);
  const [ny, nm] = nextStart.split('-').map(Number);
  const cycleStart = (offset: number) => {
    const t = new Date(ny, nm - 2 + offset, budgetRecurringDay); // offset 0 = current cycle
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  };
  const cycleAt = (offset: number): SavingsCycle | null => {
    const start = cycleStart(offset);
    const end = cycleStart(offset + 1);
    const from = asOf(addDays(start, -1));
    const to = asOf(addDays(end, -1));
    if (from === null || to === null) return null;
    if (resets.some((d) => d >= addDays(start, -1) && d < end)) return null;
    return { start, end, saving: Math.round(to - from), kind: offset < 0 ? 'past' : offset === 0 ? 'current' : 'projected' };
  };

  const pastCycles: SavingsCycle[] = [];
  for (let k = -1; k >= -24 && pastCycles.length < past; k--) {
    const c = cycleAt(k);
    if (c) pastCycles.unshift(c);
  }
  const rest: SavingsCycle[] = [];
  for (let k = 0; k <= future; k++) {
    const c = cycleAt(k);
    if (c) rest.push(c);
  }
  return [...pastCycles, ...rest];
}

export function computeKPIs(
  expenses: ExpenseEntry[],
  referenceDate: string = '2026-11-10',
  budgetRecurringDay: number = 7
): KPIs {
  if (expenses.length === 0) {
    return {
      currentBalance: 0,
      upcomingBills: 0,
      postNovBalance: 0,
      cushionUntil: nextCycleStartFor(referenceDate, budgetRecurringDay),
      projectedEndBalance: 0,
      totalCredit: 0,
      totalDebit: 0,
      burnRateMonthly: 0,
      surplusMonthly: 0,
    };
  }

  // 1. Current Available Balance: Authoritative balance as of referenceDate
  // Find the last expense entry whose date <= referenceDate
  let currentBalance = 0;
  for (let i = 0; i < expenses.length; i++) {
    const entry = expenses[i];
    if (isBeforeOrEqual(entry.date, referenceDate)) {
      currentBalance = entry.balance;
    } else {
      break;
    }
  }

  // Fallback if reference date is before all records
  if (currentBalance === 0 && expenses.length > 0 && !isBeforeOrEqual(expenses[0].date, referenceDate)) {
    currentBalance = expenses[0].balance;
  }

  // 2. Upcoming Immediate Bills: DEBITs dated in the next 5 days (tomorrow through
  // refDate+5). Entries dated today are already paid and already inside currentBalance.
  const windowStart = addDays(referenceDate, 1);
  const windowEnd = addDays(referenceDate, 5);

  let upcomingBills = 0;
  for (const entry of expenses) {
    if (isBetweenDates(entry.date, windowStart, windowEnd)) {
      if (entry.type === 'DEBIT') {
        upcomingBills += entry.amount;
      }
    }
  }

  // 3. Cycle cushion (owner rule, 12 Nov 2026): the lowest the running balance gets from
  // today until the day before the next salary, after every bill dated in between.
  // (Was the balance right after rent, which ignored bills dated after the 15th.)
  const cushionUntil = nextCycleStartFor(referenceDate, budgetRecurringDay);
  let postNovBalance = currentBalance;
  for (const entry of expenses) {
    if (entry.date > referenceDate && entry.date < cushionUntil && entry.balance < postNovBalance) {
      postNovBalance = entry.balance;
    }
  }

  // 4. Projected End Balance: Balance at conclusion of late-2027 projections (₹2,58,454)
  const lastEntry = expenses[expenses.length - 1];
  const projectedEndBalance = lastEntry ? Math.round(lastEntry.balance) : 258454;

  // 5. Total Credit and Debit calculations
  let totalCredit = 0;
  let totalDebit = 0;
  for (const entry of expenses) {
    if (entry.type === 'CREDIT') totalCredit += entry.amount;
    if (entry.type === 'DEBIT') totalDebit += entry.amount;
  }

  return {
    currentBalance: Math.round(currentBalance),
    upcomingBills: Math.round(upcomingBills),
    postNovBalance: Math.round(postNovBalance),
    cushionUntil,
    projectedEndBalance: Math.round(projectedEndBalance),
    totalCredit: Math.round(totalCredit),
    totalDebit: Math.round(totalDebit),
    burnRateMonthly: 45000,
    surplusMonthly: 38000,
  };
}

export function computeBcaCycle(b2RawValue: number, expenses: ExpenseEntry[], referenceDate: string = '2026-11-10'): BcaCycle {
  // Baseline total for active cycle (Oct 2026 - Mar 2027) is fixed at ₹18,000 (6 installments of ₹3,000)
  const baselineTotal = 18000;
  const needsReset = Math.round(b2RawValue) !== baselineTotal;

  // Track the 6 monthly installments
  const schedule = [
    { month: 'Oct 2026', date: '2026-10-03', amount: 3000, isPaid: true },
    { month: 'Nov 2026', date: '2026-11-05', amount: 3000, isPaid: true },
    { month: 'Dec 2026', date: '2026-12-05', amount: 3000, isPaid: false },
    { month: 'Jan 2027', date: '2027-01-05', amount: 3000, isPaid: false },
    { month: 'Feb 2027', date: '2027-02-05', amount: 3000, isPaid: false },
    { month: 'Mar 2027', date: '2027-03-05', amount: 3000, isPaid: false },
  ];

  // Adjust paid status if reference date changes
  for (const item of schedule) {
    item.isPaid = isBeforeOrEqual(item.date, referenceDate);
  }

  const emisPaid = schedule.filter(s => s.isPaid).length;
  const emisRemaining = schedule.length - emisPaid;
  const paidToDate = emisPaid * 3000;
  const remainingDue = emisRemaining * 3000;

  return {
    baselineTotal,
    b2Value: b2RawValue,
    needsReset,
    totalCycleDue: baselineTotal,
    emisTotal: 6,
    emisPaid,
    emisRemaining,
    paidToDate,
    remainingDue,
    monthlyEmi: 3000,
    payoffDate: '2027-03-05',
    schedule,
  };
}

/** Bike loan principal: the Loans tab sets column C to this on the "Bike DP" row. */
export const BIKE_LOAN_PRINCIPAL = 153022;
/** Active BCA cycle: 6 × ₹3,000 from Oct 2026 (Loans!B2 baseline). */
export const BCA_CYCLE_TOTAL = 18000;
export const BCA_CYCLE_START = '2026-10-01';
/** Previous SBI card balance reached 0 on 6 Nov 2026 (Loans!D235); payments count from here. */
export const SBI_CYCLE_START = '2026-11-07';

export interface EmiTrack {
  principal: number;
  paid: number;            // cash actually paid (DEBIT rows) up to refDate
  due: number;             // principal - paid, never below 0
  emi: number;             // latest EMI amount in the sheet
  paidCount: number;
  remainingCount: number;  // scheduled DEBIT rows after refDate
  payoffDate?: string;     // date the scheduled DEBITs reach the principal
  lastScheduledDate?: string;
  unscheduled: number;     // principal not covered by any scheduled DEBIT row
}

/**
 * Tracks a loan from its EMI rows in Expenses (description exactly `label`, as the
 * Loans tab formulas match it), whatever the row order. Only DEBIT rows count as paid:
 * a SETTLEMENT row (e.g. an EMI prepaid earlier) moves no money.
 */
export function trackEmiLoan(
  expenses: ExpenseEntry[],
  label: string,
  principal: number,
  refDate: string,
  fromDate: string = '0000-00-00'
): EmiTrack {
  const want = label.trim().toLowerCase();
  const rows = expenses
    .filter(e => e.description.trim().toLowerCase() === want && e.type === 'DEBIT' && e.amount > 0 && e.date >= fromDate)
    .sort((a, b) => a.date.localeCompare(b.date));

  let paid = 0;
  let paidCount = 0;
  let cumulative = 0;
  let payoffDate: string | undefined;
  for (const r of rows) {
    cumulative += r.amount;
    if (isBeforeOrEqual(r.date, refDate)) {
      paid += r.amount;
      paidCount++;
    }
    if (!payoffDate && cumulative >= principal - 1) payoffDate = r.date;
  }

  const due = Math.max(0, principal - paid);
  return {
    principal,
    paid,
    due: due < 1 ? 0 : due,
    emi: rows.length ? rows[rows.length - 1].amount : 0,
    paidCount,
    remainingCount: rows.length - paidCount,
    payoffDate,
    lastScheduledDate: rows.length ? rows[rows.length - 1].date : undefined,
    unscheduled: Math.max(0, Math.round(principal - cumulative)),
  };
}

export function computeLoanPortfolio(
  loanRows: RawLoanRow[],
  b2RawValue: number,
  refDate: string = '2026-11-10',
  expenses: ExpenseEntry[] = [],
  sbiDue: number = 0
): LoanStatus[] {
  // 1. BCA Loan (active cycle from Oct 2026), from the "BCA EMI" rows in Expenses
  const bca = trackEmiLoan(expenses, 'BCA EMI', BCA_CYCLE_TOTAL, refDate, BCA_CYCLE_START);
  const bcaBaseline = BCA_CYCLE_TOTAL;
  const bcaCurrent = Math.round(bca.due);
  const bcaPaid = bcaBaseline - bcaCurrent;

  // 2. Bike loan (Royal Enfield Meteor), from the "Bike EMI" rows in Expenses
  const bike = trackEmiLoan(expenses, 'Bike EMI', BIKE_LOAN_PRINCIPAL, refDate);
  const bikeInitial = BIKE_LOAN_PRINCIPAL;
  const bikeCurrent = Math.round(bike.due);
  const bikePaid = bikeInitial - bikeCurrent;
  const bikeEmi = Math.round(bike.emi * 100) / 100;
  const bikePayoff = bike.payoffDate ?? bike.lastScheduledDate;
  // 3. Credit Card SBI: due set by the owner in Loans!D2, paid by "SBI Card Payment" rows
  // dated after the previous SBI balance reached 0 (6 Nov 2026). Empty D2 = settled.
  const sbi = sbiDue > 0 ? trackEmiLoan(expenses, 'SBI Card Payment', sbiDue, refDate, SBI_CYCLE_START) : null;
  const sbiCurrent = sbi ? Math.round(sbi.due) : 0;
  const sbiCard: LoanStatus = sbi
    ? {
        id: 'sbi-cc',
        name: 'Credit Card SBI',
        columnLetter: 'D',
        category: 'credit_card',
        initialPrincipal: Math.round(sbiDue),
        currentDue: sbiCurrent,
        paidToDate: Math.round(sbiDue) - sbiCurrent,
        progressPercent: Math.round(((sbiDue - sbiCurrent) / sbiDue) * 100),
        isPaidOff: sbiCurrent === 0,
        targetPayoffDate: sbi.payoffDate ?? sbi.lastScheduledDate,
        notes:
          sbiCurrent === 0
            ? `₹${Math.round(sbiDue).toLocaleString('en-IN')} due (Loans!D2) paid in full${sbi.payoffDate ? ` on ${sbi.payoffDate}` : ''}.`
            : sbi.payoffDate
              ? `₹${Math.round(sbiDue).toLocaleString('en-IN')} due (Loans!D2); the SBI Card Payment on ${sbi.payoffDate} clears it.`
              : `₹${Math.round(sbiDue).toLocaleString('en-IN')} due (Loans!D2); ₹${sbi.unscheduled.toLocaleString('en-IN')} not yet covered by any "SBI Card Payment" row.`,
      }
    : {
        id: 'sbi-cc',
        name: 'Credit Card SBI',
        columnLetter: 'D',
        category: 'credit_card',
        initialPrincipal: 25000,
        currentDue: 0,
        paidToDate: 25000,
        progressPercent: 100,
        isPaidOff: true,
        notes: 'Settled in full in 2026.',
      };

  const bikeNotes =
    `Amortizes at ₹${bikeEmi.toLocaleString('en-IN')}/mo. ${bike.paidCount} EMIs paid, ${bike.remainingCount} scheduled in the sheet.` +
    (bike.unscheduled > 0
      ? ` ₹${bike.unscheduled.toLocaleString('en-IN')} is not covered by any scheduled EMI row after ${bike.lastScheduledDate}.`
      : '');

  return [
    {
      id: 'bike',
      name: 'Royal Enfield Meteor Bike Loan',
      columnLetter: 'C',
      category: 'bike',
      initialPrincipal: bikeInitial,
      currentDue: bikeCurrent,
      paidToDate: bikePaid,
      progressPercent: Math.round((bikePaid / bikeInitial) * 100),
      isPaidOff: bikeCurrent === 0,
      monthlyEmi: bikeEmi,
      targetPayoffDate: bikePayoff,
      notes: bikeNotes,
    },
    {
      id: 'bca',
      name: 'BCA Education Loan (Active Cycle)',
      columnLetter: 'B',
      category: 'bank',
      initialPrincipal: bcaBaseline,
      currentDue: bcaCurrent,
      paidToDate: bcaPaid,
      progressPercent: Math.round((bcaPaid / bcaBaseline) * 100),
      isPaidOff: bcaCurrent === 0,
      monthlyEmi: Math.round(bca.emi),
      targetPayoffDate: bca.payoffDate ?? bca.lastScheduledDate,
      notes: `${bca.paidCount + bca.remainingCount} monthly EMIs of ₹${Math.round(bca.emi).toLocaleString('en-IN')}. ${bca.paidCount} paid, ${bca.remainingCount} remaining.`,
    },
    sbiCard,
    {
      id: 'bhaiya-udhar',
      name: 'Bhaiya Udhar (Family Ledger)',
      columnLetter: 'E',
      category: 'personal',
      initialPrincipal: 18200,
      currentDue: 0,
      paidToDate: 18200,
      progressPercent: 100,
      isPaidOff: true,
      notes: 'Settled in full.',
    },
    {
      id: 'diploma',
      name: 'Diploma Due',
      columnLetter: 'F',
      category: 'bank',
      initialPrincipal: 172025,
      currentDue: 0,
      paidToDate: 172025,
      progressPercent: 100,
      isPaidOff: true,
      notes: 'Settled in full in 2025.',
    },
    {
      id: 'idfc-cc',
      name: 'IDFC Credit Card',
      columnLetter: 'G',
      category: 'credit_card',
      initialPrincipal: 26248,
      currentDue: 0,
      paidToDate: 26248,
      progressPercent: 100,
      isPaidOff: true,
      notes: 'Settled in full in 2025.',
    },
    {
      id: 'sikarwar',
      name: 'Sikarwar Due',
      columnLetter: 'H',
      category: 'personal',
      initialPrincipal: 34670,
      currentDue: 0,
      paidToDate: 34670,
      progressPercent: 100,
      isPaidOff: true,
      notes: 'Settled in full in 2025.',
    },
  ];
}

export function detectDuplicates(expenses: ExpenseEntry[]): DuplicateGroup[] {
  const groups: Record<string, ExpenseEntry[]> = {};

  for (let i = 0; i < expenses.length; i++) {
    const a = expenses[i];
    if (a.type !== 'DEBIT') continue; // only check outgoing spending duplicates

    for (let j = i + 1; j < expenses.length; j++) {
      const b = expenses[j];
      if (b.type !== 'DEBIT') continue;

      // Matching amount and same description
      if (
        Math.abs(a.amount - b.amount) < 0.01 &&
        a.description.trim().toLowerCase() === b.description.trim().toLowerCase()
      ) {
        // Check if dates are within 3 days
        const d1 = new Date(a.date).getTime();
        const d2 = new Date(b.date).getTime();
        const diffDays = Math.abs(d1 - d2) / (1000 * 3600 * 24);

        if (diffDays <= 3) {
          const key = `${a.description.trim()}_${a.amount}`;
          if (!groups[key]) groups[key] = [];
          if (!groups[key].some(e => e.rowIndex === a.rowIndex)) groups[key].push(a);
          if (!groups[key].some(e => e.rowIndex === b.rowIndex)) groups[key].push(b);
        }
      }
    }
  }

  return Object.entries(groups).map(([key, rows]) => ({
    id: key,
    description: rows[0].description,
    amount: rows[0].amount,
    rows,
  }));
}

// Transactions that move money with Bhaiya are a personal IOU (tracked on the Loans page as
// "Bhaiya Udhar"), not spending: owner decision 13 Nov 2026. Any row whose own description names
// him is linked directly; the other leg of a same-day, same-amount, opposite-type pair is linked
// too (e.g. he once used a card, paid back the same day: one leg says "bhaiya", the other is just
// "SBI Card Payment"). Matched by date+amount, not row number, since rows get sorted and reordered.
function findBhaiyaLinkedRows(expenses: ExpenseEntry[]): Set<number> {
  const linked = new Set<number>();
  const bhaiyaRows = expenses.filter((e) => e.description.toLowerCase().includes('bhaiya'));
  for (const b of bhaiyaRows) {
    linked.add(b.rowIndex);
    for (const e of expenses) {
      if (e.rowIndex === b.rowIndex) continue;
      if (e.date === b.date && e.amount === b.amount && e.type !== b.type) linked.add(e.rowIndex);
    }
  }
  return linked;
}

export function computeSpendingCategories(expenses: ExpenseEntry[]): SpendingCategorySummary[] {
  const totals: Record<string, { amount: number; count: number; color: string }> = {
    'Housing & Utilities': { amount: 0, count: 0, color: '#F59E0B' }, // Warm Amber Gold
    'Loan EMIs': { amount: 0, count: 0, color: '#D97706' },           // Deep Amber
    'General & Ad-Hoc': { amount: 0, count: 0, color: '#FCD34D' },    // Light Gold
    'Family & Gifts': { amount: 0, count: 0, color: '#E4E4E7' },      // Crisp Zinc-200
    'Tech & Subscriptions': { amount: 0, count: 0, color: '#A1A1AA' },// Medium Zinc-400
    'Bhaiya Udhar': { amount: 0, count: 0, color: '#3B82F6' },        // Credit blue: not spending
    'Other Expenses': { amount: 0, count: 0, color: '#71717A' },      // Muted Zinc-500
  };

  const bhaiyaLinkedRows = findBhaiyaLinkedRows(expenses);
  let grandTotal = 0;

  for (const e of expenses) {
    if (e.type !== 'DEBIT') continue;
    const desc = e.description.toLowerCase();

    let cat = 'Other Expenses';
    if (bhaiyaLinkedRows.has(e.rowIndex)) {
      cat = 'Bhaiya Udhar';
    } else if (desc.includes('rent') || desc.includes('electricity') || desc.includes('recharge')) {
      cat = 'Housing & Utilities';
    } else if (desc.includes('emi') || desc.includes('loan') || desc.includes('settlement') || desc.includes('card payment')) {
      cat = 'Loan EMIs';
    } else if (desc.includes('subscription') || desc.includes('cursor') || desc.includes('chatgpt') || desc.includes('claude')) {
      cat = 'Tech & Subscriptions';
    } else if (desc.includes('mummy') || desc.includes('gift') || desc.includes('ring') || desc.includes('suit')) {
      cat = 'Family & Gifts';
    } else if (desc.includes('general') || desc.includes('food') || desc.includes('petrol') || desc.includes('tea')) {
      cat = 'General & Ad-Hoc';
    }

    totals[cat].amount += e.amount;
    totals[cat].count += 1;
    grandTotal += e.amount;
  }

  return Object.entries(totals).map(([category, item]) => ({
    category,
    amount: Math.round(item.amount),
    percentage: grandTotal > 0 ? Math.round((item.amount / grandTotal) * 100) : 0,
    count: item.count,
    color: item.color,
  }));
}

export function computeBudgetPacing(
  expenses: ExpenseEntry[],
  referenceDate: string = '2026-11-10',
  customGeneralBudget: number = 15000,
  customElectricityBudget: number = 3200,
  availableBalance: number = 128792,
  postNovBuffer: number = 53392,
  budgetRecurringDay: number = 7, // recurring salary cycle day (7th)
  rentRecurringDay: number = 15,   // 15
  customRentAmount?: number,      // configurable rent amount (e.g. 15000)
  customElectricityRemaining?: number // configurable live meter balance
): BudgetPacing {
  const parts = referenceDate.split('-').map(Number);
  const year = parts[0] || 2026;
  const month = parts[1] || 11;
  const day = parts[2] || 10;

  const monthKey = `${year}-${String(month).padStart(2, '0')}`;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthName = `${monthNames[month - 1]} ${year}`;

  const totalDaysInMonth = new Date(year, month, 0).getDate();
  const remainingDays = Math.max(1, totalDaysInMonth - day);

  // 1. Budget Cycle Start & End Calculation (Recurring on 6th or 7th)
  let cycleStartYear = year;
  let cycleStartMonth = month;
  let cycleEndYear = year;
  let cycleEndMonth = month;

  if (day >= budgetRecurringDay) {
    // Current cycle started on budgetRecurringDay of this month
    cycleStartYear = year;
    cycleStartMonth = month;
    if (month === 12) {
      cycleEndYear = year + 1;
      cycleEndMonth = 1;
    } else {
      cycleEndYear = year;
      cycleEndMonth = month + 1;
    }
  } else {
    // Current cycle started on budgetRecurringDay of previous month
    if (month === 1) {
      cycleStartYear = year - 1;
      cycleStartMonth = 12;
    } else {
      cycleStartYear = year;
      cycleStartMonth = month - 1;
    }
    cycleEndYear = year;
    cycleEndMonth = month;
  }

  const cycleStartDate = `${cycleStartYear}-${String(cycleStartMonth).padStart(2, '0')}-${String(budgetRecurringDay).padStart(2, '0')}`;
  const cycleEndDate = `${cycleEndYear}-${String(cycleEndMonth).padStart(2, '0')}-${String(budgetRecurringDay).padStart(2, '0')}`;

  const startMs = new Date(cycleStartYear, cycleStartMonth - 1, budgetRecurringDay).getTime();
  const endMs = new Date(cycleEndYear, cycleEndMonth - 1, budgetRecurringDay).getTime();
  const refMs = new Date(year, month - 1, day).getTime();

  const totalDaysInCycle = Math.max(1, Math.round((endMs - startMs) / (86400 * 1000)));
  const daysElapsedInCycle = Math.max(0, Math.round((refMs - startMs) / (86400 * 1000)));
  const daysRemainingInCycle = Math.max(1, Math.round((endMs - refMs) / (86400 * 1000)));

  const startMonthShort = monthNames[cycleStartMonth - 1]?.slice(0, 3);
  const endMonthShort = monthNames[cycleEndMonth - 1]?.slice(0, 3);
  const cycleLabel = `${budgetRecurringDay} ${startMonthShort} – ${budgetRecurringDay} ${endMonthShort}`;

  // 2. Rent Recurring Milestone (rentRecurringDay of every month)
  const nextRentDate = nextRentDateFor(referenceDate, rentRecurringDay);
  const [rentYear, rentMonth] = nextRentDate.split('-').map(Number);
  const rentMs = new Date(rentYear, rentMonth - 1, rentRecurringDay).getTime();
  const daysUntilRent = Math.max(0, Math.round((rentMs - refMs) / (86400 * 1000)));

  const rentRow = expenses.find(
    (e) => e.date === nextRentDate && e.description.toLowerCase().includes('rent')
  );
  const rentAmount = customRentAmount !== undefined && customRentAmount > 0
    ? customRentAmount
    : rentRow ? rentRow.amount : 15000;
  const postRentBuffer = postNovBuffer; // Cycle cushion from computeKPIs: lowest balance before the next salary

  // 3. General Expenses Tracking for this Recurring Cycle

  const generalExpensesList = expenses.filter((e) => {
    // Only transactions in the active budget cycle up to reference date
    if (e.date < cycleStartDate || e.date > referenceDate) return false;
    if (e.type !== 'DEBIT') return false;
    // Each general spend is logged as its own row; summary rows are excluded
    return isGeneralExpense(e.description);
  });

  const generalSpentSoFar = generalExpensesList.reduce((sum, e) => sum + e.amount, 0);
  // Budget minus every general spend logged this cycle. (The sheet's "Remaining Expenses
  // Budget" row is a projection that mirrors this; it is not read here.)
  const generalRemaining = Math.max(0, customGeneralBudget - generalSpentSoFar);
  // Safe per-day spend across the remaining days of this active cycle: Remaining Expenses Budget / remaining days
  const generalPerDayLimit = Math.round(generalRemaining / daysRemainingInCycle);
  const generalSpentPercent =
    customGeneralBudget > 0 ? Math.round((generalSpentSoFar / customGeneralBudget) * 100) : 0;

  // 4. Electricity Architecture: Recharge Budget vs Live Meter Balance
  // Base allocation is ₹3,000, surplus carryover from previous month is ₹200 (Total Budget = ₹3,200)
  const electricityBaseBudget = 3000;
  const electricitySurplus = Math.max(0, customElectricityBudget - electricityBaseBudget);
  const electricityTotalBudget = electricityBaseBudget + electricitySurplus;

  // Scans electricity transactions in the active window
  const electricityList = expenses.filter((e) => {
    if (e.date < cycleStartDate || e.date > referenceDate) return false;
    const desc = e.description.toLowerCase();
    return desc.includes('electricity') || desc.includes('recharge') || desc.includes('meter') || desc.includes('bijli');
  });

  // Check if explicit cycle rows exist (Row 242 Total Electricity Recharge & Row 243 Remaining Electricity Budget)
  const explicitElecRechargeRow = expenses.find((e) => {
    const desc = e.description.toLowerCase();
    return desc.includes('total electricity recharge') && e.date >= cycleStartDate && e.date <= cycleEndDate;
  });

  const explicitElecRemainingBudgetRow = expenses.find((e) => {
    const desc = e.description.toLowerCase();
    return desc.includes('remaining electricity budget') && e.date >= cycleStartDate && e.date <= cycleEndDate;
  });

  // Check for historical live meter reading (e.g. Row 221 Remaining Electricity Balance)
  const explicitMeterRow = expenses.find((e) => {
    const desc = e.description.toLowerCase();
    return (desc.includes('remaining electricity balance') || desc.includes('meter balance')) && e.date <= referenceDate;
  });

  // Recharges done so far: from explicit row (Row 242 SETTLEMENT = ₹800) or sum of debit recharges
  let electricityRechargedSoFar = 0;
  if (explicitElecRechargeRow) {
    electricityRechargedSoFar = explicitElecRechargeRow.amount;
  } else {
    const adHocRecharges = electricityList.filter((e) => e.type === 'DEBIT');
    electricityRechargedSoFar = adHocRecharges.reduce((sum, e) => sum + e.amount, 0);
  }

  // Remaining budget to do recharges: from explicit row (Row 243 DEBIT = ₹2,400) or total - recharged
  const electricityRemainingBudget = explicitElecRemainingBudgetRow
    ? explicitElecRemainingBudgetRow.amount
    : Math.max(0, electricityTotalBudget - electricityRechargedSoFar);

  // Live electricity meter balance currently in physical/online electric meter (₹300)
  const electricityMeterBalance = customElectricityRemaining !== undefined && !isNaN(customElectricityRemaining)
    ? customElectricityRemaining
    : (explicitMeterRow ? explicitMeterRow.amount : 300);

  // Daily power burn rate on physical meter (~₹75-80/day) & power runway days
  const electricityDailyBurnRate = 75;
  const electricityMeterRunwayDays = Math.max(0, Math.round(electricityMeterBalance / electricityDailyBurnRate));

  // Budget burn allowances
  const electricityPerDayLimit = Math.round(electricityRemainingBudget / daysRemainingInCycle);
  const electricityPerDayUntilRent = Math.round(electricityRemainingBudget / Math.max(1, daysUntilRent));
  const electricitySpentPercent =
    electricityTotalBudget > 0 ? Math.round((electricityRechargedSoFar / electricityTotalBudget) * 100) : 0;

  // 5. Safe daily spend (owner rule, 12 Nov 2026): it comes from the expenses budget,
  // never from savings. Worst case it may also use this cycle's projected saving
  // (balance the day before the next salary minus the balance the day before this
  // cycle's salary), but only when that saving is positive.
  const balanceAsOf = (date: string): number => {
    let bal = 0;
    for (const e of expenses) {
      if (isBeforeOrEqual(e.date, date)) bal = e.balance;
      else break;
    }
    return bal;
  };
  const projectedCycleSavings = Math.round(
    balanceAsOf(addDays(cycleEndDate, -1)) - balanceAsOf(addDays(cycleStartDate, -1))
  );
  const safeTotalDailyBurn = generalPerDayLimit;
  const worstCaseDailyBurn = Math.round(
    (generalRemaining + Math.max(0, projectedCycleSavings)) / daysRemainingInCycle
  );

  return {
    monthKey,
    monthName,
    totalDaysInMonth,
    currentDay: day,
    remainingDays,

    budgetRecurringDay,
    rentRecurringDay,
    cycleStartDate,
    cycleEndDate,
    cycleLabel,
    daysElapsedInCycle,
    daysRemainingInCycle,

    nextRentDate,
    daysUntilRent,
    rentAmount,
    postRentBuffer,

    generalBudget: customGeneralBudget,
    generalSpentSoFar: Math.round(generalSpentSoFar),
    generalRemaining: Math.round(generalRemaining),
    generalPerDayLimit,
    generalSpentPercent,
    generalExpensesList,

    // Dual Distinction Electricity Architecture
    electricityBaseBudget,
    electricitySurplus,
    electricityTotalBudget,
    electricityRechargedSoFar: Math.round(electricityRechargedSoFar),
    electricityRemainingBudget: Math.round(electricityRemainingBudget),
    electricityMeterBalance: Math.round(electricityMeterBalance),
    electricityDailyBurnRate,
    electricityMeterRunwayDays,

    // Backward-compatible mappings
    electricityBudget: electricityTotalBudget,
    electricitySpentSoFar: Math.round(electricityRechargedSoFar),
    electricityRemaining: Math.round(electricityRemainingBudget),
    electricityPerDayLimit,
    electricityPerDayUntilRent,
    electricitySpentPercent,
    electricityList,

    availableBalance,
    postFixedObligationsBuffer: postRentBuffer,
    safeTotalDailyBurn,
    projectedCycleSavings,
    worstCaseDailyBurn,
  };
}
