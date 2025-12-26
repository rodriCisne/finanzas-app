'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/components/AuthContext';

export type Wallet = {
  id: string;
  name: string;
  default_currency_code: string;
  created_at?: string;
};

type WalletContextValue = {
  wallets: Wallet[];
  currentWalletId: string | null;
  currentWallet: Wallet | null;
  loading: boolean;
  setCurrentWalletId: (walletId: string) => void;
  refetchWallets: () => Promise<void>;
};

const WalletContext = createContext<WalletContextValue | null>(null);

const STORAGE_KEY = 'finanzas.currentWalletId';

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [currentWalletId, setCurrentWalletIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const currentWallet = useMemo(() => {
    if (!currentWalletId) return null;
    return wallets.find((w) => w.id === currentWalletId) ?? null;
  }, [wallets, currentWalletId]);

  const setCurrentWalletId = (walletId: string) => {
    setCurrentWalletIdState(walletId);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, walletId);
    }
  };

  const refetchWallets = async () => {
    if (!user) return;

    setLoading(true);

    // Traemos billeteras donde el user es miembro
    const { data, error } = await supabase
      .from('wallet_members')
      .select('wallets(id,name,default_currency_code,created_at)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error cargando billeteras:', error);
      setWallets([]);
      setLoading(false);
      return;
    }
    
    const list =
      (data ?? [])
        .map((row: any) => row.wallets)
        .filter(Boolean) as Wallet[];

    setWallets(list);

    // Elegimos billetera activa:
    // 1) la guardada en localStorage si existe y sigue siendo válida
    // 2) sino, la primera billetera
    const saved =
      typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;

    const savedIsValid = saved && list.some((w) => w.id === saved);

    if (savedIsValid) {
      setCurrentWalletIdState(saved!);
    } else {
      setCurrentWalletIdState(list.length > 0 ? list[0].id : null);
      if (list.length > 0 && typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, list[0].id);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    if (!user) {
      // Si no hay usuario (logout), limpiamos estado
      setWallets([]);
      setCurrentWalletIdState(null);
      setLoading(false);
      return;
    }

    refetchWallets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const value: WalletContextValue = {
    wallets,
    currentWalletId,
    currentWallet,
    loading,
    setCurrentWalletId,
    refetchWallets,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallets() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallets debe usarse dentro de WalletProvider');
  return ctx;
}
