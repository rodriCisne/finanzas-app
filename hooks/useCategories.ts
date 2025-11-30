// hooks/useCategories.ts
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export type Category = {
  id: string;
  name: string;
  type: 'income' | 'expense' | 'both';
};

export function useCategories(walletId?: string) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!walletId) {
        setCategories([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data, error } = await supabase
        .from('categories')
        .select('id, name, type')
        .eq('wallet_id', walletId)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error cargando categorías', error);
        setCategories([]);
        setLoading(false);
        return;
      }

      setCategories((data as Category[]) ?? []);
      setLoading(false);
    };

    load();
  }, [walletId]);

  return { categories, loading };
}
