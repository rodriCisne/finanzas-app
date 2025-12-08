'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentWallet } from '@/hooks/useCurrentWallet';
import { useCategories } from '@/hooks/useCategories';
import { useAuth } from '@/components/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { useTags } from '@/hooks/useTags';

export default function NewTransactionPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { wallet, loading: walletLoading } = useCurrentWallet();
  const { tags, loading: tagsLoading, refetch: refetchTags } = useTags(wallet?.id);
  const { categories, loading: categoriesLoading } = useCategories(wallet?.id);

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [tagCreating, setTagCreating] = useState(false);
  const [tagError, setTagError] = useState<string | null>(null);

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

  const toggleTag = (id: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

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

    const { data: insertedTx, error } = await supabase
      .from('transactions')
      .insert({
        wallet_id: wallet.id,
        created_by: user.id,
        type,
        amount: numericAmount,
        currency_code: wallet.default_currency_code,
        category_id: categoryId || null,
        date,
        note: note || null,
      })
      .select('id')
      .single();

    if (error || !insertedTx) {
      console.error('Error creando transacción', error);
      setErrorMsg(error?.message ?? 'Error creando transacción');
      setSubmitting(false);
      return;
    }

    const transactionId = insertedTx.id;

    // Insertar vínculos con etiquetas (si hay seleccionadas)
    if (selectedTagIds.length > 0) {
      const rows = selectedTagIds.map((tagId) => ({
        transaction_id: transactionId,
        tag_id: tagId,
      }));

      const { error: tagsError } = await supabase
        .from('transaction_tags')
        .insert(rows);

      if (tagsError) {
        console.error('Error asignando etiquetas a la transacción', tagsError);
        // No rompemos el flujo si falla esto, pero lo dejamos logueado
      }
    }

    router.replace('/');
  };


  const handleCancel = () => {
    router.back();
  };

  const handleCreateTag = async () => {
    if (!wallet) return;
    const name = newTagName.trim();
    if (!name) return;

    setTagCreating(true);
    setTagError(null);

    const { data, error } = await supabase
      .from('tags')
      .insert({
        wallet_id: wallet.id,
        name,
      })
      .select('id, name')
      .single();

    if (error) {
      console.error('Error creando etiqueta', error);
      setTagError(error.message);
      setTagCreating(false);
      return;
    }

    setNewTagName('');
    setTagCreating(false);

    // Recargamos la lista de tags
    await refetchTags();

    // Opcional: seleccionar automáticamente la tag recién creada
    if (data?.id) {
      setSelectedTagIds((prev) => [...prev, data.id]);
    }
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

          {/* Etiquetas */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs">Etiquetas</label>
              {tagsLoading && (
                <span className="text-[10px] text-slate-500">cargando...</span>
              )}
            </div>

            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag) => {
                  const selected = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={`px-2 py-1 rounded-full text-[11px] border ${
                        selected
                          ? 'bg-emerald-500 text-black border-emerald-400'
                          : 'bg-slate-900 text-slate-200 border-slate-700'
                      }`}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 mb-2">
                Aún no tienes etiquetas para esta billetera.
              </p>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Nombre de nueva etiqueta"
                className="flex-1 rounded-md bg-slate-900 border border-slate-700 px-3 py-1.5 text-sm outline-none focus:border-emerald-400"
              />
              <button
                type="button"
                disabled={!newTagName.trim() || tagCreating}
                onClick={handleCreateTag}
                className="text-xs px-3 rounded-md bg-slate-800 border border-slate-600 text-slate-100 disabled:opacity-60"
              >
                {tagCreating ? 'Creando...' : 'Crear'}
              </button>
            </div>

            {tagError && (
              <p className="mt-1 text-[10px] text-red-400">{tagError}</p>
            )}
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
