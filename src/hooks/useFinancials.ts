'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FinancialsResponse, LogExpenseInput, RowOrderUndo, ScheduleEmiInput, TransactionType } from '@/lib/types';
import { previewRowMove } from '@/lib/row-move';

// Row-order changes (drag reorder, sort, undo of either) run one at a time, in order:
// each uses row numbers that assume the previous change has been applied.
const ROW_ORDER_MUTATION = { mutationKey: ['expenses-row-order'], scope: { id: 'expenses-row-order' } };

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
      const json = await res.json();
      // Set by the service worker when this came from its offline cache, not a live read —
      // never inferred from navigator.onLine, which stays true for "online but the request is
      // actually failing" (flaky wifi, a captive portal, DNS, the server being down), exactly
      // the case this flag exists to catch.
      if (res.headers.get('x-finflow-offline-copy') === '1') json.offlineCopy = true;
      return json;
    },
    // 'always': a genuinely offline fetch attempt still runs (TanStack Query's default,
    // 'online', pauses it instead and silently keeps showing old in-memory data with no way to
    // know it's stale). Letting it run is what lets the service worker's catch branch above —
    // and the offlineCopy flag it sets — ever engage for a real offline session, not only a
    // same-tab network hiccup while the browser still thinks it's connected.
    networkMode: 'always',
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
    ...ROW_ORDER_MUTATION,
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
        previousOrder: RowOrderUndo;
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
    ...ROW_ORDER_MUTATION,
    mutationFn: async (previousOrder: RowOrderUndo) => {
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

export function useReorderExpenses() {
  const queryClient = useQueryClient();

  return useMutation({
    ...ROW_ORDER_MUTATION,
    // Show the move at once: renumber rows and recompute running balances in the cache,
    // then let Google Sheets catch up. Rolled back if the server refuses the move.
    onMutate: async ({ sourceIndex, targetIndex }: { sourceIndex: number; targetIndex: number }) => {
      await queryClient.cancelQueries({ queryKey: ['financials'] });
      const snapshot = queryClient.getQueriesData<FinancialsResponse>({ queryKey: ['financials'] });
      queryClient.setQueriesData<FinancialsResponse>({ queryKey: ['financials'] }, (old) =>
        old ? { ...old, expenses: previewRowMove(old.expenses, sourceIndex, targetIndex) } : old
      );
      return { snapshot };
    },
    onError: (_err, _vars, context) => {
      context?.snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: () => {
      // Refetch once the last queued row-order change has finished, so a refetch
      // never overwrites a move that is still waiting its turn.
      if (queryClient.isMutating({ mutationKey: ROW_ORDER_MUTATION.mutationKey }) <= 1) {
        queryClient.invalidateQueries({ queryKey: ['financials'] });
      }
    },
    mutationFn: async ({ sourceIndex, targetIndex }: { sourceIndex: number; targetIndex: number }) => {
      const res = await fetch('/api/expenses/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceIndex, targetIndex }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to reorder expenses');
      }
      return res.json() as Promise<{
        success: boolean;
        message: string;
        previousOrder: RowOrderUndo;
      }>;
    },
  });
}
