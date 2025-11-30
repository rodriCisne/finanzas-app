'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/components/AuthContext';

export type Wallet = {
  id: string;
  name: string;
  default_currency_code: string;
};

export function useCurrentWallet() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadWallet = async () => {
      if (!user) {
        setWallet(null);
        setLoading(false);
        return;
      }

      // 1) Buscar la primera billetera en la que el usuario es miembro
      const { data: membership, error: membershipError } = await supabase
        .from('wallet_members')
        .select('wallet_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (membershipError) {
        console.error('Error cargando membership de billetera', membershipError);
        setWallet(null);
        setLoading(false);
        return;
      }

      if (!membership?.wallet_id) {
        // Usuario sin billeteras (no debería pasar en nuestro flujo, pero por las dudas)
        setWallet(null);
        setLoading(false);
        return;
      }

      // 2) Con ese wallet_id, traer la info de la billetera
      const { data: walletRow, error: walletError } = await supabase
        .from('wallets')
        .select('id, name, default_currency_code')
        .eq('id', membership.wallet_id)
        .single();

      if (walletError) {
        console.error('Error cargando billetera actual', walletError);
        setWallet(null);
        setLoading(false);
        return;
      }

      // TypeScript lo ve como any, pero matchea perfecto con Wallet
      setWallet(walletRow as Wallet);
      setLoading(false);
    };

    loadWallet();
  }, [user]);

  return { wallet, loading };
}
