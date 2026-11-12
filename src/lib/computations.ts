import {
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

export function computeKPIs(
  expenses: ExpenseEntry[],
  referenceDate: string = '2026-11-10',
  rentRecurringDay: number = 15
): KPIs {
  if (expenses.length === 0) {
    return {
      currentBalance: 0,
      upcomingBills: 0,
      postNovBalance: 0,
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

  // 3. Post-rent cushion: running balance right after the next rent payment clears.
  // Falls back to the balance as of the rent date when no rent row is logged that day.
  const rentDate = nextRentDateFor(referenceDate, rentRecurringDay);
  const rentRow = expenses.find(e => e.date === rentDate && e.description.toLowerCase().includes('rent'));
  let postNovBalance = 0;
  if (rentRow) {
    postNovBalance = rentRow.balance;
  } else {
    for (const entry of expenses) {
      if (isBeforeOrEqual(entry.date, rentDate)) postNovBalance = entry.balance;
      else break;
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

export function computeLoanPortfolio(loanRows: RawLoanRow[], b2RawValue: number, refDate: string = '2026-11-10'): LoanStatus[] {
  // 1. BCA Loan (Oct 2026 - Mar 2027)
  const bcaBaseline = 18000;
  const bcaPaid = 6000; // 2 of 6 paid as of Nov 10, 2026
  const bcaCurrent = bcaBaseline - bcaPaid;

  // 2. Bike loan (Royal Enfield Meteor Loan)
  // Initial: 153022. With Dec 2026 EMI (₹11,770.92) prepaid on Nov 06,
  // 5 of 13 installments completed (₹58,855 paid), 8 remaining (₹94,167 due).
  const bikeInitial = 153022;
  const bikeCurrent = 94167;
  const bikePaid = bikeInitial - bikeCurrent;

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
      isPaidOff: false,
      monthlyEmi: 11770.92,
      targetPayoffDate: '2027-07-02',
      notes: 'Amortizes at ₹11,770.92/mo. Dec 2026 EMI prepaid early. Debt-free milestone accelerated to Jul 2027.',
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
      isPaidOff: false,
      monthlyEmi: 3000,
      targetPayoffDate: '2027-03-05',
      notes: '6 monthly EMIs of ₹3,000. 2 paid, 4 remaining.',
    },
    {
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
    },
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

export function computeSpendingCategories(expenses: ExpenseEntry[]): SpendingCategorySummary[] {
  const totals: Record<string, { amount: number; count: number; color: string }> = {
    'Housing & Utilities': { amount: 0, count: 0, color: '#F59E0B' }, // Warm Amber Gold
    'Loan EMIs': { amount: 0, count: 0, color: '#D97706' },           // Deep Amber
    'General & Ad-Hoc': { amount: 0, count: 0, color: '#FCD34D' },    // Light Gold
    'Family & Gifts': { amount: 0, count: 0, color: '#E4E4E7' },      // Crisp Zinc-200
    'Tech & Subscriptions': { amount: 0, count: 0, color: '#A1A1AA' },// Medium Zinc-400
    'Other Expenses': { amount: 0, count: 0, color: '#71717A' },      // Muted Zinc-500
  };

  let grandTotal = 0;

  for (const e of expenses) {
    if (e.type !== 'DEBIT') continue;
    const desc = e.description.toLowerCase();

    let cat = 'Other Expenses';
    if (desc.includes('rent') || desc.includes('electricity') || desc.includes('recharge')) {
      cat = 'Housing & Utilities';
    } else if (desc.includes('emi') || desc.includes('loan') || desc.includes('settlement')) {
      cat = 'Loan EMIs';
    } else if (desc.includes('subscription') || desc.includes('cursor') || desc.includes('chatgpt') || desc.includes('claude')) {
      cat = 'Tech & Subscriptions';
    } else if (desc.includes('mummy') || desc.includes('gift') || desc.includes('ring') || desc.includes('suit') || desc.includes('bhaiya')) {
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
  const postRentBuffer = postNovBuffer; // Cushion after the next rent payment clears (from computeKPIs)

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

  // 5. Safe Total Daily Burn from Available Liquid Buffer
  const safeTotalDailyBurn = Math.round(postRentBuffer / daysRemainingInCycle);

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
  };
}
