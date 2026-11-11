import { NextRequest, NextResponse } from 'next/server';
import { restoreExpenseRow, restoreExpensesOrder } from '@/lib/sheets';
import { TransactionType } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { actionType } = body;

    if (actionType === 'restore_order') {
      const { previousOrder } = body;
      if (!previousOrder || !Array.isArray(previousOrder.moves)) {
        return NextResponse.json({ error: 'Valid previousOrder ({ moves }) is required; refresh the page if this undo is old' }, { status: 400 });
      }

      await restoreExpensesOrder(previousOrder);

      return NextResponse.json({
        success: true,
        message: 'Successfully restored previous row order in Google Sheets',
      });
    }

    if (actionType === 'restore_row') {
      const { rowIndex, data } = body;
      const numRow = Number(rowIndex);

      if (isNaN(numRow) || numRow < 3) {
        return NextResponse.json({ error: 'Valid rowIndex >= 3 is required' }, { status: 400 });
      }

      if (!data || !data.description) {
        return NextResponse.json({ error: 'Valid row data is required' }, { status: 400 });
      }

      await restoreExpenseRow(numRow, {
        date: data.date || '2026-11-10',
        description: String(data.description).trim(),
        amount: Number(data.amount) || 0,
        type: (String(data.type || 'DEBIT').toUpperCase()) as TransactionType,
      });

      return NextResponse.json({
        success: true,
        message: `Successfully restored deleted row at index ${numRow}`,
      });
    }

    return NextResponse.json({ error: 'Invalid actionType. Expected "restore_row" or "restore_order"' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in POST /api/expenses/restore:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to restore transaction' },
      { status: 500 }
    );
  }
}
