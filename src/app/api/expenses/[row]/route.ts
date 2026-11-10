import { NextRequest, NextResponse } from 'next/server';
import { deleteExpenseRow, updateExpenseRow } from '@/lib/sheets';
import { TransactionType } from '@/lib/types';


export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ row: string }> }
) {
  try {
    const { row } = await context.params;
    const rowIndex = parseInt(row, 10);

    if (isNaN(rowIndex) || rowIndex < 2) {
      return NextResponse.json({ error: 'Invalid row index (must be 2 or greater)' }, { status: 400 });
    }

    const body = await request.json();
    const { date, description, amount, type } = body;

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
    }

    await updateExpenseRow(rowIndex, {
      date: date || '2026-11-10',
      description: String(description || '').trim(),
      amount: numAmount,
      type: (String(type || 'DEBIT').toUpperCase()) as TransactionType,
    });

    return NextResponse.json({
      success: true,
      message: `Row ${rowIndex} updated successfully`,
    });
  } catch (error: any) {
    console.error('Error in PATCH /api/expenses/[row]:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update transaction' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ row: string }> }
) {
  try {
    const { row } = await context.params;
    const rowIndex = parseInt(row, 10);

    if (isNaN(rowIndex) || rowIndex < 2) {
      return NextResponse.json({ error: 'Invalid row index (must be 2 or greater)' }, { status: 400 });
    }

    await deleteExpenseRow(rowIndex);

    return NextResponse.json({
      success: true,
      message: `Row ${rowIndex} deleted and downstream formulas re-indexed`,
    });
  } catch (error: any) {
    console.error('Error in DELETE /api/expenses/[row]:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to delete transaction' },
      { status: 500 }
    );
  }
}
