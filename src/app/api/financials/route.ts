import { NextRequest, NextResponse } from 'next/server';
import {
  getExpensesFromSheet,
  getLoansFromSheet,
  getPeerLedgerFromSheet,
  getMeteorDataFromSheet,
} from '@/lib/sheets';
import {
  computeBcaCycle,
  computeBudgetPacing,
  computeKPIs,
  computeLoanPortfolio,
  computeSpendingCategories,
  detectDuplicates,
} from '@/lib/computations';
import { FinancialsResponse } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const refDate = searchParams.get('refDate') || '2026-11-10';
    const generalBudgetParam = Number(searchParams.get('generalBudget')) || 15000;
    const electricityBudgetParam = Number(searchParams.get('electricityBudget')) || 3200;
    const budgetRecurringDay = Number(searchParams.get('budgetRecurringDay')) || 7;
    const rentRecurringDay = Number(searchParams.get('rentRecurringDay')) || 15;
    const rentAmountParam = searchParams.get('rentAmount') ? Number(searchParams.get('rentAmount')) : undefined;
    const electricityRemainingParam = searchParams.get('electricityRemaining') ? Number(searchParams.get('electricityRemaining')) : undefined;

    const [expenses, loansData, peerLedger, meteorData] = await Promise.all([
      getExpensesFromSheet(),
      getLoansFromSheet(),
      getPeerLedgerFromSheet(),
      getMeteorDataFromSheet(),
    ]);

    const kpis = computeKPIs(expenses, refDate);
    const loans = computeLoanPortfolio(loansData.rows, loansData.b2RawValue, refDate);
    const bcaCycle = computeBcaCycle(loansData.b2RawValue, expenses, refDate);
    const spendingCategories = computeSpendingCategories(expenses);
    const duplicates = detectDuplicates(expenses);

    const budgetPacing = computeBudgetPacing(
      expenses,
      refDate,
      generalBudgetParam,
      electricityBudgetParam,
      kpis.currentBalance,
      kpis.postNovBalance,
      budgetRecurringDay,
      rentRecurringDay,
      rentAmountParam,
      electricityRemainingParam
    );

    const responseData: FinancialsResponse = {
      kpis,
      expenses,
      loans,
      bcaCycle,
      spendingCategories,
      duplicates,
      budgetPacing,
      peerLedger,
      meteorAccessories: meteorData.accessories,
      meteorCosts: meteorData.costs,
      referenceDate: refDate,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('Error in GET /api/financials:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch financial data from Google Sheets' },
      { status: 500 }
    );
  }
}
