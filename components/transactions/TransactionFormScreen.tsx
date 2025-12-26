'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWallets } from '@/components/WalletContext';
import { useCategories } from '@/hooks/useCategories';
import { useTags } from '@/hooks/useTags';
import { useAuth } from '@/components/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { getTodayLocalDateString } from '@/utils/date';


type Props = {
  mode: 'create' | 'edit';
  transactionId?: string;
};

type TxFromDb = {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  date: string;
  note: string | null;
  category_id: string | null;
  transaction_tags: { tag_id: string }[];
};

export function TransactionFormScreen({ mode, transactionId }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const { currentWallet: wallet, loading: walletLoading } = useWallets();
  const { categories, loading: categoriesLoading } = useCategories(wallet?.id);
  const { tags, loading: tagsLoading, refetch: refetchTags } = useTags(
    wallet?.id
  );

  const [loadingTx, setLoadingTx] = useState(mode === 'edit');

  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => getTodayLocalDateString());

  const [categoryId, setCategoryId] = useState<string | ''>('');
  const [note, setNote] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [tagCreating, setTagCreating] = useState(false);
  const [tagError, setTagError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);


  // 🔄 Cargar la transacción en modo edición
  useEffect(() => {
    const loadTx = async () => {
      if (mode !== 'edit') {
        setLoadingTx(false);
        return;
      }
      if (!transactionId || !wallet) return;

      setLoadingTx(true);

      const { data, error } = await supabase
        .from('transactions')
        .select(
          `
          id,
          type,
          amount,
          date,
          note,
          category_id,
          transaction_tags (
            tag_id
          )
        `
        )
        .eq('id', transactionId)
        .eq('wallet_id', wallet.id)
        .single();

      if (error || !data) {
        console.error('Error cargando transacción', error);
        setErrorMsg('No se pudo cargar la transacción.');
        setLoadingTx(false);
        return;
      }

      const tx = data as TxFromDb;

      setType(tx.type);
      setAmount(String(tx.amount));
      setDate(tx.date);
      setCategoryId(tx.category_id ?? '');
      setNote(tx.note ?? '');
      setSelectedTagIds(tx.transaction_tags?.map((tt) => tt.tag_id) ?? []);
      setLoadingTx(false);
    };

    if (wallet) {
      loadTx();
    }
  }, [mode, transactionId, wallet]);

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

    await refetchTags();

    if (data?.id) {
      setSelectedTagIds((prev) => [...prev, data.id]);
    }
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

    if (mode === 'create') {
      // ➕ Crear
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
        setErrorMsg(error?.message ?? 'Error creando transacción.');
        setSubmitting(false);
        return;
      }

      const transactionId = insertedTx.id;

      if (selectedTagIds.length > 0) {
        const rows = selectedTagIds.map((tagId) => ({
          transaction_id: transactionId,
          tag_id: tagId,
        }));

        const { error: tagsError } = await supabase
          .from('transaction_tags')
          .insert(rows);

        if (tagsError) {
          console.error(
            'Error asignando etiquetas a la transacción',
            tagsError
          );
        }
      }
    } else {
      // ✏️ Editar
      if (!transactionId) return;

      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          type,
          amount: numericAmount,
          category_id: categoryId || null,
          date,
          note: note || null,
          currency_code: wallet.default_currency_code,
          updated_at: new Date().toISOString(),
        })
        .eq('id', transactionId)
        .eq('wallet_id', wallet.id);

      if (updateError) {
        console.error('Error actualizando transacción', updateError);
        setErrorMsg(updateError.message);
        setSubmitting(false);
        return;
      }

      const { error: deleteTagsError } = await supabase
        .from('transaction_tags')
        .delete()
        .eq('transaction_id', transactionId);

      if (deleteTagsError) {
        console.error(
          'Error eliminando etiquetas de la transacción',
          deleteTagsError
        );
      }

      if (selectedTagIds.length > 0) {
        const rows = selectedTagIds.map((tagId) => ({
          transaction_id: transactionId,
          tag_id: tagId,
        }));

        const { error: insertTagsError } = await supabase
          .from('transaction_tags')
          .insert(rows);

        if (insertTagsError) {
          console.error(
            'Error asignando etiquetas a la transacción',
            insertTagsError
          );
        }
      }
    }

    router.replace('/');
  };

  const handleCancel = () => {
    router.back();
  };

  const handleDelete = async () => {
    if (mode !== 'edit' || !transactionId || !wallet) return;

    const confirmed = window.confirm(
      '¿Seguro que quieres eliminar esta transacción? Esta acción no se puede deshacer.'
    );
    if (!confirmed) return;

    setSubmitting(true);
    setErrorMsg(null);

    const { error: deleteTagsError } = await supabase
      .from('transaction_tags')
      .delete()
      .eq('transaction_id', transactionId);

    if (deleteTagsError) {
      console.error(
        'Error eliminando etiquetas de la transacción',
        deleteTagsError
      );
    }

    const { error: deleteTxError } = await supabase
      .from('transactions')
      .delete()
      .eq('id', transactionId)
      .eq('wallet_id', wallet.id)
      .single();

    if (deleteTxError) {
      console.error('Error eliminando transacción', deleteTxError);
      setErrorMsg(deleteTxError.message);
      setSubmitting(false);
      return;
    }

    router.replace('/');
  };

  if (walletLoading || loadingTx) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-slate-400">Cargando transacción...</p>
      </main>
    );
  }

  if (!wallet) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <p className="text-sm text-slate-400">
          No se encontró billetera para esta transacción.
        </p>
      </main>
    );
  }

  const title =
    mode === 'create' ? 'Nueva transacción' : 'Editar transacción';

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <header className="px-4 pt-6 pb-3 border-b border-slate-800 flex items-center justify-between">
        <button
          onClick={handleCancel}
          className="text-sm text-slate-400 underline"
        >
          {mode === 'create' ? 'Cancelar' : 'Volver'}
        </button>
        <h1 className="text-base font-semibold">{title}</h1>
        {mode === 'edit' ? (
          <button
            onClick={handleDelete}
            disabled={submitting}
            className="text-xs text-rose-400 underline disabled:opacity-60"
          >
            Eliminar
          </button>
        ) : (
          <div className="w-12" />
        )}
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
              {(tagsLoading || tagCreating) && (
                <span className="text-[10px] text-slate-500">
                  {tagsLoading ? 'cargando...' : 'guardando...'}
                </span>
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
            {submitting
              ? mode === 'create'
                ? 'Guardando...'
                : 'Guardando cambios...'
              : mode === 'create'
              ? 'Guardar transacción'
              : 'Guardar cambios'}
          </button>
        </form>
      </section>
    </main>
  );
}
