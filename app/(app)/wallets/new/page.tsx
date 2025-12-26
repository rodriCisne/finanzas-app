'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useWallets } from '@/components/WalletContext';

const CURRENCIES = ['ARS', 'USD', 'EUR']; // podés ampliarlo después

export default function NewWalletPage() {
  const router = useRouter();
  const { setCurrentWalletId, refetchWallets } = useWallets();

  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('ARS');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg('El nombre es obligatorio.');
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.rpc('create_wallet', {
      p_name: trimmedName,
      p_default_currency_code: currency,
    });

    if (error) {
      console.error(error);
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    const walletId = data as string; // la RPC devuelve uuid
    setCurrentWalletId(walletId);

    // refrescamos lista del provider para que quede la nueva wallet en memoria
    await refetchWallets();

    router.push('/');
  };

  return (
    <main className="space-y-4">
      <header>
        <h1 className="text-xl font-bold">Nueva billetera</h1>
        <p className="text-xs text-slate-400">
          Creá una billetera nueva y la dejamos como activa.
        </p>
      </header>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm text-slate-200">Nombre</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Casa, Rodri+Vicu, Vacaciones..."
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-50"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-slate-200">Moneda</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-50"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {errorMsg && (
          <p className="rounded-lg border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-200">
            {errorMsg}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-black disabled:opacity-60"
        >
          {loading ? 'Creando...' : 'Crear billetera'}
        </button>

        <button
          type="button"
          onClick={() => router.push('/wallets')}
          className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-2 text-slate-200"
        >
          Cancelar
        </button>
      </form>
    </main>
  );
}
