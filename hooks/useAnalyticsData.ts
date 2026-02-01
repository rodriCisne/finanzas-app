'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export type MonthlyData = {
  month: string;
  income: number;
  expense: number;
};

export type CategoryData = {
  name: string;
  value: number;
  color?: string;
};

export type UserData = {
  name: string;
  amount: number;
};

export function useAnalyticsData(
  walletId: string | null, 
  period: 'month' | 'year', 
  year?: number, 
  month?: number,
  filters?: { categoryId?: string; userId?: string }
) {
  const [data, setData] = useState<{
    evolutionData: MonthlyData[];
    categoryDistribution: CategoryData[];
    userDistribution: UserData[];
    availableCategories: { id: string, name: string }[];
    availableUsers: { id: string, name: string }[];
  }>({
    evolutionData: [],
    categoryDistribution: [],
    userDistribution: [],
    availableCategories: [],
    availableUsers: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!walletId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      const now = new Date();
      const currentYear = year ?? now.getFullYear();
      let start: string;
      let end: string;

      if (period === 'year') {
        start = `${currentYear}-01-01`;
        end = `${currentYear}-12-31`;
      } else {
        const currentMonth = month ?? (now.getMonth() + 1);
        const lastDay = new Date(currentYear, currentMonth, 0).getDate();
        start = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
        end = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      }

      let query = supabase
        .from('transactions')
        .select(`
          type,
          amount,
          date,
          category_id,
          created_by,
          category:categories (name),
          creator:profiles (full_name)
        `)
        .eq('wallet_id', walletId)
        .gte('date', start)
        .lte('date', end);

      if (filters?.categoryId) query = query.eq('category_id', filters.categoryId);
      if (filters?.userId) query = query.eq('created_by', filters.userId);

      const { data: txs, error } = await query;

      if (error) {
        console.error('Error fetching analytics data', error);
        setLoading(false);
        return;
      }

      // Proceso de datos
      const evolutionNodes: Record<string, MonthlyData> = {};
      const categoryNodes: Record<string, number> = {};
      const userNodes: Record<string, number> = {};
      const categorySet = new Map<string, string>();
      const userSet = new Map<string, string>();

      (txs || []).forEach((row: any) => {
        const amount = Number(row.amount);
        const type = row.type as 'income' | 'expense';
        const date = new Date(row.date + 'T00:00:00');
        
        let label: string;
        if (period === 'month') {
          label = date.getDate().toString();
        } else {
          label = date.toLocaleString('es', { month: 'short' });
        }

        const catId = row.category_id;
        const catName = row.category?.name || 'Sin categoría';
        const userId = row.created_by;
        const userName = row.creator?.full_name || 'Desconocido';

        if (catId) categorySet.set(catId, catName);
        if (userId) userSet.set(userId, userName);

        // Evolución
        if (!evolutionNodes[label]) {
          evolutionNodes[label] = { month: label, income: 0, expense: 0 };
        }
        if (type === 'income') evolutionNodes[label].income += amount;
        else evolutionNodes[label].expense += amount;

        // Distribución (solo gastos)
        if (type === 'expense') {
          categoryNodes[catName] = (categoryNodes[catName] || 0) + amount;
          userNodes[userName] = (userNodes[userName] || 0) + amount;
        }
      });

      // Convertir a arrays ordenados
      let evolutionData: MonthlyData[];
      if (period === 'month') {
        evolutionData = Object.values(evolutionNodes).sort((a, b) => Number(a.month) - Number(b.month));
      } else {
        const monthOrder = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
        evolutionData = Object.values(evolutionNodes).sort((a, b) => 
          monthOrder.indexOf(a.month.toLowerCase()) - monthOrder.indexOf(b.month.toLowerCase())
        );
      }

      const categoryDistribution = Object.entries(categoryNodes)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      const userDistribution = Object.entries(userNodes)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount);

      setData({
        evolutionData,
        categoryDistribution,
        userDistribution,
        availableCategories: Array.from(categorySet.entries()).map(([id, name]) => ({ id, name })),
        availableUsers: Array.from(userSet.entries()).map(([id, name]) => ({ id, name })),
      });
      setLoading(false);
    };

    load();
  }, [walletId, period, year, month, filters?.categoryId, filters?.userId]);

  return { ...data, loading };
}
