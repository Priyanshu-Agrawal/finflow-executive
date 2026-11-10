import { NextRequest, NextResponse } from 'next/server';
import { appendExpenseRow } from '@/lib/sheets';
import { TransactionType } from '@/lib/types';


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, description, amount, type } = body;

    if (!description || typeof description !== 'string') {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Valid positive amount is required' }, { status: 400 });
    }

    const validTypes: TransactionType[] = ['DEBIT', 'CREDIT', 'SETTLEMENT', 'ADJUSTMENT', 'OTHER', 'DIRECT'];
    const txType = (String(type || 'DEBIT').toUpperCase()) as TransactionType;
    if (!validTypes.includes(txType)) {
      return NextResponse.json({ error: `Invalid transaction type. Expected one of: ${validTypes.join(', ')}` }, { status: 400 });
    }

    const result = await appendExpenseRow({
      date: date || '2026-11-10',
      description: description.trim(),
      amount: numAmount,
      type: txType,
    });

    return NextResponse.json({
      success: true,
      message: `Transaction appended at row ${result.newRow}`,
      newRow: result.newRow,
    });
  } catch (error: any) {
    console.error('Error in POST /api/expenses/log:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to log expense' },
      { status: 500 }
    );
  }
}
