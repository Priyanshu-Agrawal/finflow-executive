import { NextResponse } from 'next/server';
import { resetBCALoanToBaseline } from '@/lib/sheets';


export async function POST() {
  try {
    await resetBCALoanToBaseline();

    return NextResponse.json({
      success: true,
      message: 'Loans!B2 successfully reset to baseline ₹18,000',
      value: 18000,
    });
  } catch (error: any) {
    console.error('Error in POST /api/loans/reset-bca:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to reset BCA loan baseline' },
      { status: 500 }
    );
  }
}
