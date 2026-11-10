import { NextRequest, NextResponse } from 'next/server';
import { appendPeerLedgerRow } from '@/lib/sheets';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, amount, description, splitWith, perPersonShare } = body;

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
    }

    await appendPeerLedgerRow({
      date: date || '10 Nov',
      amount: numAmount,
      description: String(description || 'Shared Expense').trim(),
      splitWith: String(splitWith || 'Friends').trim(),
      perPersonShare: Number(perPersonShare) || numAmount,
    });

    return NextResponse.json({
      success: true,
      message: 'Ledger split entry saved successfully',
    });
  } catch (error: any) {
    console.error('Error in POST /api/ledger:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to save ledger entry' },
      { status: 500 }
    );
  }
}
