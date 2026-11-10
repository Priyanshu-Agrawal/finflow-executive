'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FinancialsResponse, LogExpenseInput, ScheduleEmiInput, TransactionType } from '@/lib/types';

export function useFinancials(
  refDate: string = '2026-11-10',
  generalBudget: number = 15000,
  electricityBudget: number = 3200
) {
  return useQuery<FinancialsResponse>({
    queryKey: ['financials', refDate, generalBudget, electricityBudget],
    queryFn: async () => {
      const res = await fetch(
        `/api/financials?refDate=${encodeURIComponent(refDate)}&generalBudget=${generalBudget}&electricityBudget=${electricityBudget}`
      );
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
