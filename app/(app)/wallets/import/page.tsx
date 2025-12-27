'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useWallets } from '@/components/WalletContext';

export default function ImportWalletPage() {
  const router = useRouter();
  const { refetchWallets, setCurrentWalletId } = useWallets();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleImport = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const clean = code.trim();
    if (!clean) {
      setErrorMsg('Ingresa un código.');
      return;
    }

    setLoading(true);

    const { data: walletId, error } = await supabase.rpc('join_wallet_by_code', {
      p_code: clean,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    // refrescar lista, setear activa, volver
    await refetchWallets();
    if (walletId) setCurrentWalletId(walletId);
    router.replace('/wallets');
  };

  return (
    <main className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Importar billetera</h1>
          <p className="text-xs text-slate-400">
            Pegá el código que te compartieron para unirte.
          </p>
        </div>
        <button
          onClick={() => router.push('/wallets')}
          className="text-sm text-slate-300 underline"
        >
          Volver
        </button>
      </header>

      <form onSubmit={handleImport} className="space-y-3">
        <div className="space-y-1">
          <label className="text-sm text-slate-200">Código</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Ej: FZ-7K3M-9P2Q"
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-50"
          />
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
          {loading ? 'Importando...' : 'Importar'}
        </button>
      </form>
    </main>
  );
}
