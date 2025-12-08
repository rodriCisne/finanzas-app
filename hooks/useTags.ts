// hooks/useTags.ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export type Tag = {
  id: string;
  name: string;
};

export function useTags(walletId?: string) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTags = useCallback(async () => {
    if (!walletId) {
      setTags([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from('tags')
      .select('id, name')
      .eq('wallet_id', walletId)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error cargando etiquetas', error);
      setTags([]);
      setLoading(false);
      return;
    }

    setTags((data as Tag[]) ?? []);
    setLoading(false);
  }, [walletId]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  return { tags, loading, refetch: fetchTags };
}
