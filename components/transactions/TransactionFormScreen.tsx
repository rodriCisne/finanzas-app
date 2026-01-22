'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWallets } from '@/components/WalletContext';
import { useCategories } from '@/hooks/useCategories';
import { useTags } from '@/hooks/useTags';
import { useAuth } from '@/components/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { getTodayLocalDateString } from '@/utils/date';
import { Modal } from '@/components/ui/Modal';
import { ArrowLeft, Trash2 } from 'lucide-react';


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
  const { tags, loading: tagsLoading } = useTags(
    wallet?.id
  );

  const [loadingTx, setLoadingTx] = useState(mode === 'edit');

  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => getTodayLocalDateString());

  const [categoryId, setCategoryId] = useState<string | ''>('');
  const [note, setNote] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);


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

  const handleDelete = () => {
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (mode !== 'edit' || !transactionId || !wallet) return;

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
      setIsDeleteModalOpen(false);
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
    <main className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      {/* HEADER */}
      <header className="px-4 py-4 flex items-center justify-between sticky top-0 bg-slate-950 z-10">
        <button
          onClick={handleCancel}
          className="p-2 -ml-2 text-slate-400 hover:text-slate-200"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold">{title}</h1>
        {mode === 'edit' ? (
          <button
            onClick={handleDelete}
            disabled={submitting}
            className="p-2 -mr-2 text-rose-400 hover:text-rose-300 disabled:opacity-60"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-9" /> // Placeholder to center title
        )}
      </header>

      <section className="flex-1 px-4 pb-20 overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* TIPO (Segmented Control) */}
          <div className="p-1 bg-slate-900 rounded-xl flex">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${type === 'expense'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              Gasto
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${type === 'income'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              Ingreso
            </button>
          </div>

          {/* MONTO */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-500 mb-2">
              Monto ({wallet.default_currency_code})
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              autoFocus
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-transparent text-4xl font-bold text-slate-100 placeholder-slate-700 outline-none"
            />
          </div>

          {/* FECHA */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-500 mb-2">
              Fecha
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
            />
          </div>

          {/* CATEGORÍA */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-500 mb-2">
              Categoría
            </label>
            <div className="relative">
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                disabled={categoriesLoading}
                className="w-full appearance-none bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all disabled:opacity-50"
              >
                <option value="">Seleccionar categoría</option>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* ETIQUETAS */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs uppercase tracking-wider text-slate-500">
                Etiquetas
              </label>
              {tagsLoading && (
                <span className="text-[10px] text-slate-500">cargando...</span>
              )}
            </div>

            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const selected = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${selected
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                          : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
                        }`}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-slate-500 italic p-2 bg-slate-900/50 rounded-lg">
                No hay etiquetas disponibles.
              </div>
            )}
          </div>

          {/* NOTA */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-500 mb-2">
              Nota (opcional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Escribe una nota..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all resize-none"
            />
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-slate-950 font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:active:scale-100 shadow-lg shadow-emerald-500/20"
          >
            {submitting
              ? 'Guardando...'
              : mode === 'create'
                ? 'Guardar Transacción'
                : 'Guardar Cambios'}
          </button>
        </form>
      </section>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="¿Eliminar transacción?"
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        isLoading={submitting}
      />
    </main>
  );
}
