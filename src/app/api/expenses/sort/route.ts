import { NextRequest, NextResponse } from 'next/server';
import { sortExpensesSheet } from '@/lib/sheets';

export async function POST(request: NextRequest) {
  try {
    const result = await sortExpensesSheet();

    return NextResponse.json({
      success: true,
      message: `Successfully sorted ${result.sortedCount} expenses chronologically by date in Google Sheets with continuation formulas regenerated.`,
      sortedCount: result.sortedCount,
      previousOrder: result.previousOrder,
    });
  } catch (error: any) {
    console.error('Error in POST /api/expenses/sort:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to sort expenses' },
      { status: 500 }
    );
  }
}
