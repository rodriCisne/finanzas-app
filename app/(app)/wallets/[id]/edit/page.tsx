'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useWallets } from '@/components/WalletContext';

const CURRENCIES = ['ARS', 'USD', 'EUR'];

export default function EditWalletPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const walletId = params.id;

  const { wallets, currentWalletId, setCurrentWalletId, refetchWallets } = useWallets();

  const wallet = useMemo(
    () => wallets.find((w) => w.id === walletId) ?? null,
    [wallets, walletId]
  );

  // 👇 estados “opcionales”: solo si el usuario cambia algo
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [currencyDraft, setCurrencyDraft] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!wallet) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-slate-400">Cargando billetera...</p>
      </main>
    );
  }

  // ✅ valores reales que se ven y se guardan
  const name = nameDraft ?? wallet.name;
  const currency = currencyDraft ?? wallet.default_currency_code;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setErrorMsg('El nombre es obligatorio.');
      return;
    }

    setLoading(true);

    const { error } = await supabase.rpc('update_wallet', {
      p_wallet_id: walletId,
      p_name: trimmed,
      p_default_currency_code: currency,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    await refetchWallets();
    router.push('/wallets');
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      '¿Seguro que querés eliminar esta billetera? Se borrarán sus transacciones, categorías y etiquetas.'
    );
    if (!confirmed) return;

    setLoading(true);
    setErrorMsg(null);

    const { error } = await supabase.rpc('delete_wallet', {
      p_wallet_id: walletId,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    await refetchWallets();

    // si borraste la activa, seteamos otra
    if (currentWalletId === walletId) {
      const remaining = wallets.filter((w) => w.id !== walletId);
      if (remaining.length > 0) setCurrentWalletId(remaining[0].id);
    }

    router.push('/wallets');
  };

  return (
    <main className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Editar billetera</h1>
          <p className="text-xs text-slate-400">Cambiar nombre o moneda por defecto</p>
        </div>
        <button onClick={() => router.push('/wallets')} className="text-sm text-slate-300 underline">
          Volver
        </button>
      </header>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm text-slate-200">Nombre</label>
          <input
            value={name}
            onChange={(e) => setNameDraft(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-50"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-slate-200">Moneda por defecto</label>
          <select
            value={currency}
            onChange={(e) => setCurrencyDraft(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-50"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
        <label className="text-sm text-slate-200">Código para compartir</label>

        <div className="flex gap-2">
            <input
            value={wallet.invite_code ?? ''}
            readOnly
            className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-50"
            />
            <button
            type="button"
            onClick={async () => {
                if (!wallet.invite_code) return;
                await navigator.clipboard.writeText(wallet.invite_code);
            }}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            >
            Copiar
            </button>
        </div>

        <p className="text-xs text-slate-500">
            Compártelo con quien quieras. Al importarlo, el usuario quedará como <b>member</b>.
        </p>
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
          {loading ? 'Guardando...' : 'Guardar cambios'}
        </button>

        <button
          type="button"
          onClick={handleDelete}
          disabled={loading}
          className="w-full rounded-lg border border-rose-900 bg-rose-950 px-4 py-2 text-rose-200 disabled:opacity-60"
        >
          Eliminar billetera
        </button>
      </form>
    </main>
  );
}
