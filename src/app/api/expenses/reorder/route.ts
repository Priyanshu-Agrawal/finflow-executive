import { NextRequest, NextResponse } from 'next/server';
import { reorderExpenseRows } from '@/lib/sheets';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceIndex, targetIndex } = body;

    const from = Number(sourceIndex);
    const to = Number(targetIndex);

    if (isNaN(from) || isNaN(to) || from < 3 || to < 3) {
      return NextResponse.json(
        { error: 'Valid sourceIndex and targetIndex >= 3 are required' },
        { status: 400 }
      );
    }

    if (from === to) {
      return NextResponse.json({
        success: true,
        message: 'No movement required',
      });
    }

    const result = await reorderExpenseRows(from, to);

    return NextResponse.json({
      success: true,
      message: `Successfully moved Row #${from} to Row #${to}`,
      previousOrder: result.previousOrder,
    });
  } catch (error: any) {
    console.error('Error in POST /api/expenses/reorder:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to reorder expenses' },
      { status: 500 }
    );
  }
}
