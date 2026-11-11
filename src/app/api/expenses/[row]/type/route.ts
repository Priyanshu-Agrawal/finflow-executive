import { NextRequest, NextResponse } from 'next/server';
import { updateExpenseType } from '@/lib/sheets';
import { TransactionType } from '@/lib/types';


export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ row: string }> }
) {
  try {
    const { row } = await context.params;
    const rowIndex = /^\d+$/.test(row) ? Number(row) : NaN; // reject '240.x', '240abc', etc.

    if (isNaN(rowIndex) || rowIndex < 2) {
      return NextResponse.json({ error: 'Invalid row index (must be 2 or greater)' }, { status: 400 });
    }

    const body = await request.json();
    const { newType } = body;

    const validTypes: TransactionType[] = ['DEBIT', 'CREDIT', 'SETTLEMENT', 'ADJUSTMENT', 'OTHER', 'DIRECT'];
    const txType = (String(newType || 'DEBIT').toUpperCase()) as TransactionType;
    if (!validTypes.includes(txType)) {
      return NextResponse.json({ error: `Invalid type. Expected one of: ${validTypes.join(', ')}` }, { status: 400 });
    }

    await updateExpenseType(rowIndex, txType);

    return NextResponse.json({
      success: true,
      message: `Row ${rowIndex} type updated to ${txType}`,
      newType: txType,
    });
  } catch (error: any) {
    console.error('Error in PATCH /api/expenses/[row]/type:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update transaction type' },
      { status: 500 }
    );
  }
}
