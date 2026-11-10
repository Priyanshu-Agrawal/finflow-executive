import { NextRequest, NextResponse } from 'next/server';
import { appendExpenseRow, resetBCALoanToBaseline, updateLoanCell } from '@/lib/sheets';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, loanId, loanName, columnLetter, amount, date, payer, notes, cellRange, value, expenseRowIndex } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    switch (action) {
      case 'log_payment': {
        // Priyanshu pays from his account -> DEBIT in Expenses
        if (!amount || isNaN(Number(amount))) {
          return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
        }
        const description = notes ? `${loanName} - ${notes}` : `Payment: ${loanName}`;
        const paymentDate = date || new Date().toISOString().split('T')[0];
        const res = await appendExpenseRow({
          date: paymentDate,
          description,
          amount: Number(amount),
          type: 'DEBIT',
        });
        return NextResponse.json({
          success: true,
          message: `Logged payment of ₹${amount} for ${loanName} to Expenses (Row ${res.newRow})`,
          newRow: res.newRow,
        });
      }

      case 'external_payment': {
        // Third party (e.g. Khushboo or Bhaiya) pays -> SETTLEMENT in Expenses
        // Crucial: Column E formula does NOT deduct SETTLEMENT from liquid bank balance
        if (!amount || isNaN(Number(amount))) {
          return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
        }
        const payerName = payer?.trim() || 'External Person';
        const description = `[External: ${payerName}] Paid ${loanName}${notes ? ` (${notes})` : ''}`;
        const paymentDate = date || new Date().toISOString().split('T')[0];
        const res = await appendExpenseRow({
          date: paymentDate,
          description,
          amount: Number(amount),
          type: 'SETTLEMENT',
        });
        return NextResponse.json({
          success: true,
          message: `Recorded external payment of ₹${amount} by ${payerName} for ${loanName} (Row ${res.newRow}, bank balance preserved)`,
          newRow: res.newRow,
        });
      }

      case 'settle_loan': {
        // Settle loan in full or set balance to 0 in Loans sheet
        const targetCol = columnLetter || 'B';
        const targetCell = `${targetCol}2`;
        await updateLoanCell(targetCell, 0);

        // Also record an audit entry in Expenses as SETTLEMENT
        const paymentDate = date || new Date().toISOString().split('T')[0];
        await appendExpenseRow({
          date: paymentDate,
          description: `[Settled] ${loanName} cleared in full`,
          amount: Number(amount) || 0,
          type: 'SETTLEMENT',
        });

        return NextResponse.json({
          success: true,
          message: `Successfully marked ${loanName} as settled (Loans!${targetCell} updated to 0)`,
        });
      }

      case 'settle_from_expense': {
        // Link to existing expense row without double-debiting
        const targetCol = columnLetter || 'B';
        const targetCell = `${targetCol}2`;
        if (value !== undefined) {
          await updateLoanCell(targetCell, value);
        }
        return NextResponse.json({
          success: true,
          message: `Settled ${loanName} from expense row #${expenseRowIndex}`,
        });
      }

      case 'update_due': {
        // Update baseline or due amount in Loans sheet
        const cell = cellRange || `${columnLetter || 'B'}2`;
        const numVal = Number(value);
        if (isNaN(numVal)) {
          return NextResponse.json({ error: 'Valid numeric value is required' }, { status: 400 });
        }
        await updateLoanCell(cell, numVal);
        return NextResponse.json({
          success: true,
          message: `Updated Loans!${cell} to ₹${numVal}`,
        });
      }

      case 'reset_bca': {
        await resetBCALoanToBaseline();
        return NextResponse.json({
          success: true,
          message: 'Reset Loans!B2 baseline to ₹18,000',
        });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error in POST /api/loans/action:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process loan action' },
      { status: 500 }
    );
  }
}
