import { NextRequest, NextResponse } from 'next/server';
import { batchAppendExpenses } from '@/lib/sheets';
import { TransactionType } from '@/lib/types';


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, monthlyAmount, months, startDate, type = 'DEBIT' } = body;

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const amount = Number(monthlyAmount);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Valid monthly amount is required' }, { status: 400 });
    }

    const numMonths = parseInt(String(months), 10);
    if (isNaN(numMonths) || numMonths < 1 || numMonths > 60) {
      return NextResponse.json({ error: 'Months must be between 1 and 60' }, { status: 400 });
    }

    const start = startDate ? new Date(startDate) : new Date('2026-11-10');
    const startYear = start.getFullYear();
    const startMonth = start.getMonth();
    const startDay = start.getDate();

    const rowsToAppend = [];
    for (let i = 0; i < numMonths; i++) {
      // Calculate date for month i
      const d = new Date(startYear, startMonth + i, startDay);
      const yStr = d.getFullYear();
      const mStr = String(d.getMonth() + 1).padStart(2, '0');
      const dStr = String(d.getDate()).padStart(2, '0');
      const dateFormatted = `${yStr}-${mStr}-${dStr}`;

      const label = `${title.trim()} (EMI ${i + 1}/${numMonths})`;

      rowsToAppend.push({
        date: dateFormatted,
        description: label,
        amount,
        type: (type.toUpperCase()) as TransactionType,
      });
    }

    const result = await batchAppendExpenses(rowsToAppend);

    return NextResponse.json({
      success: true,
      message: `Successfully scheduled ${numMonths} installments starting at row ${result.startRow}`,
      count: numMonths,
      startRow: result.startRow,
    });
  } catch (error: any) {
    console.error('Error in POST /api/expenses/schedule-emi:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to schedule EMI installments' },
      { status: 500 }
    );
  }
}
