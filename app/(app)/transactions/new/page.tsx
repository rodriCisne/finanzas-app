'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentWallet } from '@/hooks/useCurrentWallet';
import { useCategories } from '@/hooks/useCategories';
import { useAuth } from '@/components/AuthContext';
import { supabase } from '@/lib/supabaseClient';

export default function NewTransactionPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { wallet, loading: walletLoading } = useCurrentWallet();
  const { categories, loading: categoriesLoading } = useCategories(wallet?.id);

  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [categoryId, setCategoryId] = useState<string | ''>('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const filteredCategories = useMemo(
    () =>
      categories.filter(
        (c) => c.type === type || c.type === 'both'
      ),
    [categories, type]
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!wallet || !user) return;

    const numericAmount = Number(amount.replace(',', '.'));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMsg('El monto debe ser un número mayor a 0.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const { error } = await supabase.from('transactions').insert({
      wallet_id: wallet.id,
      created_by: user.id,
      type,
      amount: numericAmount,
      currency_code: wallet.default_currency_code,
      category_id: categoryId || null,
      date,
      note: note || null,
    });

    if (error) {
      console.error('Error creando transacción', error);
      setErrorMsg(error.message);
      setSubmitting(false);
      return;
    }

    // Volver a la home
    router.replace('/');
  };

  const handleCancel = () => {
    router.back();
  };

  if (walletLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-slate-400">Cargando billetera...</p>
      </main>
    );
  }

  if (!wallet) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <p className="text-sm text-slate-400">
          No se encontró billetera para crear una transacción.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <header className="px-4 pt-6 pb-3 border-b border-slate-800 flex items-center justify-between">
        <button
          onClick={handleCancel}
          className="text-sm text-slate-400 underline"
        >
          Cancelar
        </button>
        <h1 className="text-base font-semibold">Nueva transacción</h1>
        <div className="w-16" /> {/* spacer para centrar el título */}
      </header>

      <section className="px-4 py-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo */}
          <div className="flex gap-2 text-sm">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`flex-1 py-2 rounded-lg border text-center ${
                type === 'expense'
                  ? 'bg-rose-500 text-black border-rose-400'
                  : 'bg-slate-900 border-slate-700 text-slate-300'
              }`}
            >
              Gasto
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`flex-1 py-2 rounded-lg border text-center ${
                type === 'income'
                  ? 'bg-emerald-500 text-black border-emerald-400'
                  : 'bg-slate-900 border-slate-700 text-slate-300'
              }`}
            >
              Ingreso
            </button>
          </div>

          {/* Monto */}
          <div>
            <label className="block text-xs mb-1">
              Monto ({wallet.default_currency_code})
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-emerald-400"
            />
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-xs mb-1">Fecha</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-emerald-400"
            />
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-xs mb-1">
              Categoría ({categoriesLoading ? 'cargando...' : ''})
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-emerald-400"
            >
              <option value="">Sin categoría</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Nota */}
          <div>
            <label className="block text-xs mb-1">Nota (opcional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-emerald-400"
            />
          </div>

          {errorMsg && (
            <p className="text-xs text-red-400 bg-red-950/40 border border-red-800 rounded-md px-3 py-2">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-emerald-500 text-black font-semibold py-2 text-sm disabled:opacity-60"
          >
            {submitting ? 'Guardando...' : 'Guardar transacción'}
          </button>
        </form>
      </section>
    </main>
  );
}
