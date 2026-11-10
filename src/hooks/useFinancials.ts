'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FinancialsResponse, LogExpenseInput, ScheduleEmiInput, TransactionType } from '@/lib/types';

export function useFinancials(
  refDate: string = '2026-11-10',
  generalBudget: number = 15000,
  electricityBudget: number = 3200,
  budgetRecurringDay: number = 6,
  rentRecurringDay: number = 15,
  rentAmount?: number,
  electricityRemaining?: number
) {
  const queryParams = new URLSearchParams({
    refDate,
    generalBudget: String(generalBudget),
    electricityBudget: String(electricityBudget),
    budgetRecurringDay: String(budgetRecurringDay),
    rentRecurringDay: String(rentRecurringDay),
  });
  if (rentAmount !== undefined) queryParams.set('rentAmount', String(rentAmount));
  if (electricityRemaining !== undefined) queryParams.set('electricityRemaining', String(electricityRemaining));

  return useQuery<FinancialsResponse>({
    queryKey: [
      'financials',
      refDate,
      generalBudget,
      electricityBudget,
      budgetRecurringDay,
      rentRecurringDay,
      rentAmount,
      electricityRemaining,
    ],
    queryFn: async () => {
      const res = await fetch(`/api/financials?${queryParams.toString()}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch financials');
      }
      return res.json();
    },
  });
}

export function useAddLedgerEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      date: string;
      amount: number;
      description: string;
      splitWith: string;
      perPersonShare: number;
    }) => {
      const res = await fetch('/api/ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add ledger entry');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financials'] });
    },
  });
}

export function useLogExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: LogExpenseInput) => {
      const res = await fetch('/api/expenses/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to log expense');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financials'] });
    },
  });
}

export function useScheduleEmi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ScheduleEmiInput) => {
      const res = await fetch('/api/expenses/schedule-emi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to schedule EMI');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financials'] });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      rowIndex,
      data,
    }: {
      rowIndex: number;
      data: { date: string; description: string; amount: number; type: TransactionType };
    }) => {
      const res = await fetch(`/api/expenses/${rowIndex}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update transaction');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financials'] });
    },
  });
}

export function useToggleType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      rowIndex,
      newType,
    }: {
      rowIndex: number;
      newType: TransactionType;
    }) => {
      const res = await fetch(`/api/expenses/${rowIndex}/type`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newType }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to toggle type');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financials'] });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rowIndex: number) => {
      const res = await fetch(`/api/expenses/${rowIndex}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete row');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financials'] });
    },
  });
}

export function useResetBCA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/loans/reset-bca', {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to reset BCA baseline');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financials'] });
    },
  });
}

export interface LoanActionInput {
  action: 'log_payment' | 'external_payment' | 'settle_loan' | 'settle_from_expense' | 'update_due' | 'reset_bca';
  loanId?: string;
  loanName?: string;
  columnLetter?: string;
  amount?: number;
  date?: string;
  payer?: string;
  notes?: string;
  cellRange?: string;
  value?: number;
  expenseRowIndex?: number;
}

export function useLoanAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: LoanActionInput) => {
      const res = await fetch('/api/loans/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to execute loan action');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financials'] });
    },
  });
}

export function useSortExpenses() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/expenses/sort', {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to sort expenses');
      }
      return res.json() as Promise<{
        success: boolean;
        message: string;
        sortedCount: number;
        previousOrder: Array<[any, any, any, any]>;
      }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financials'] });
    },
  });
}

export function useRestoreExpenseRow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      rowIndex,
      data,
    }: {
      rowIndex: number;
      data: { date: string; description: string; amount: number; type: TransactionType };
    }) => {
      const res = await fetch('/api/expenses/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: 'restore_row',
          rowIndex,
          data,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to restore deleted row');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financials'] });
    },
  });
}

export function useRestoreExpensesOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (previousOrder: Array<[any, any, any, any]>) => {
      const res = await fetch('/api/expenses/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: 'restore_order',
          previousOrder,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to restore expenses order');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financials'] });
    },
  });
}
