// hooks/useCategories.ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export type Category = {
  id: string;
  name: string;
  type: 'income' | 'expense' | 'both';
};

export function useCategories(walletId?: string) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
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
  }, [walletId]);

  useEffect(() => {
    // La carga es asíncrona y sincroniza este hook con Supabase.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return { categories, loading, refetch: load };
}
