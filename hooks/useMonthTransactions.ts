// hooks/useMonthTransactions.ts
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentMonthRange } from '@/utils/date';

export type Transaction = {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  date: string; // 'YYYY-MM-DD'
  note: string | null;
  category_name: string | null;
};

export type MonthSummary = {
  income: number;
  expense: number;
  balance: number;
};

export function useMonthTransactions(walletId?: string) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<MonthSummary>({
    income: 0,
    expense: 0,
    balance: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!walletId) {
        setTransactions([]);
        setSummary({ income: 0, expense: 0, balance: 0 });
        setLoading(false);
        return;
      }

      setLoading(true);

      const [start, end] = getCurrentMonthRange();

      const { data, error } = await supabase
        .from('transactions')
        .select(
          `
          id,
          type,
          amount,
          date,
          note,
          category:categories (
            name
          )
        `
        )
        .eq('wallet_id', walletId)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error cargando transacciones del mes', error);
        setTransactions([]);
        setSummary({ income: 0, expense: 0, balance: 0 });
        setLoading(false);
        return;
      }

      const mapped: Transaction[] =
        (data ?? []).map((row: any) => ({
          id: row.id,
          type: row.type,
          amount: Number(row.amount),
          date: row.date,
          note: row.note ?? null,
          category_name: row.category?.name ?? null,
        })) ?? [];

      const income = mapped
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const expense = mapped
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      setTransactions(mapped);
      setSummary({
        income,
        expense,
        balance: income - expense,
      });
      setLoading(false);
    };

    load();
  }, [walletId]);

  return { transactions, summary, loading };
}
