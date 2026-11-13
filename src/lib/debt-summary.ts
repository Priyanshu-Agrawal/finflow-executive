// A one-card summary of the loans, for Home. The full breakdown lives on /loans.
import type { LoanStatus } from './types';

/** Sum of what is still owed on loans that are not paid off. */
export function activeDebtTotal(loans: readonly LoanStatus[]): number {
  return loans.filter((l) => !l.isPaidOff).reduce((sum, l) => sum + l.currentDue, 0);
}

/** Sum of what has been paid off across every loan (matches the Loans page's "Total Retired Debt"). */
export function retiredDebtTotal(loans: readonly LoanStatus[]): number {
  return loans.reduce((sum, l) => sum + l.paidToDate, 0);
}

/** The active loan with the soonest payoff date, or null when nothing is active or dated. */
export function nextLoanMilestone(loans: readonly LoanStatus[]): LoanStatus | null {
  const dated = loans.filter((l) => !l.isPaidOff && l.targetPayoffDate);
  if (dated.length === 0) return null;
  return [...dated].sort((a, b) => (a.targetPayoffDate as string).localeCompare(b.targetPayoffDate as string))[0];
}
