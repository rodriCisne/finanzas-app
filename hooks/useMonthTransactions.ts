'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getMonthRange } from '@/utils/date';

export type Tag = {
  id: string;
  name: string;
};

export type Transaction = {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  date: string; // 'YYYY-MM-DD'
  note: string | null;
  category_name: string | null;
  tags: Tag[];
};

export type MonthSummary = {
  income: number;
  expense: number;
  balance: number;
};

export function useMonthTransactions(walletId?: string, year?: number, month?: number ) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<MonthSummary>({
    income: 0,
    expense: 0,
    balance: 0,
  });
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!walletId) {
        setTransactions([]);
        setSummary({ income: 0, expense: 0, balance: 0 });
        setAvailableTags([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      const now = new Date();
      const yearToUse  = year ?? now.getFullYear();
      const monthToUse  = month ?? now.getMonth() + 1;

      const [start, end] = getMonthRange(yearToUse, monthToUse);

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
          ),
          tags:transaction_tags (
            tag:tags (
              id,
              name
            )
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
        setAvailableTags([]);
        setLoading(false);
        return;
      }

      const mapped: Transaction[] =
        (data ?? []).map((row: any) => {
          const tags: Tag[] =
            (row.tags ?? [])
              .map((tt: any) => tt.tag)
              .filter((t: any) => t)
              .map(
                (t: any) =>
                  ({
                    id: t.id,
                    name: t.name,
                  } as Tag)
              ) ?? [];

          return {
            id: row.id,
            type: row.type,
            amount: Number(row.amount),
            date: row.date,
            note: row.note ?? null,
            category_name: row.category?.name ?? null,
            tags,
          };
        }) ?? [];

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

      // Construir lista de etiquetas únicas usadas este mes
      const tagMap = new Map<string, Tag>();
      mapped.forEach((tx) => {
        tx.tags.forEach((tag) => {
          if (!tagMap.has(tag.id)) {
            tagMap.set(tag.id, tag);
          }
        });
      });

      setAvailableTags(
        Array.from(tagMap.values()).sort((a, b) =>
          a.name.localeCompare(b.name, 'es')
        )
      );

      setLoading(false);
    };

    load();
  }, [walletId, year, month]);

  return { transactions, summary, loading, availableTags };
}
