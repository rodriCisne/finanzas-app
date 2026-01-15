'use client';

import { useState } from 'react';
import { useWallets } from '@/components/WalletContext';
import { useMonthTransactions } from '@/hooks/useMonthTransactions';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { getMonthLabel, getCurrentYearMonth } from '@/utils/date';
import { useTags } from '@/hooks/useTags';
import Link from 'next/link';
import { formatCurrency } from '@/utils/format';
import {
  ChevronDown,
  Wallet,
  LogOut,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Plus
} from 'lucide-react';

function formatDateLabel(dateStr: string) {
  // dateStr viene como 'YYYY-MM-DD'
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);

  return d.toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export default function HomePage() {
  const router = useRouter();
  const { currentWallet: wallet, loading: walletLoading } = useWallets();

  const { year: currentYear, month: currentMonth } = getCurrentYearMonth();

  const [period, setPeriod] = useState({ year: currentYear, month: currentMonth });

  const year = period.year;
  const month = period.month;


  const {
    transactions,
    summary,
    loading: txLoading,
  } = useMonthTransactions(wallet?.id, year, month);

  const [selectedTagId, setSelectedTagId] = useState<string | 'all'>('all');

  const { tags: allTags } = useTags(wallet?.id);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // La redirección la maneja RequireAuth automáticamente
  };

  const handleNewTransaction = () => {
    router.push('/transactions/new');
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
      <main className="min-h-screen flex items-center justify-center flex-col gap-4 p-4">
        <p className="text-sm text-slate-400 text-center">
          No se encontró ninguna billetera asociada a tu usuario.
        </p>
        <button
          onClick={handleLogout}
          className="text-xs text-red-300 underline"
        >
          Cerrar sesión
        </button>
      </main>
    );
  }



  const goToPrevMonth = () => {
    setPeriod((prev) => {
      if (prev.month === 1) {
        return { year: prev.year - 1, month: 12 };
      }
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const goToNextMonth = () => {
    setPeriod((prev) => {
      if (prev.month === 12) {
        return { year: prev.year + 1, month: 1 };
      }
      return { year: prev.year, month: prev.month + 1 };
    });
  };



  const monthLabel = getMonthLabel(year, month);


  const filteredTransactions =
    selectedTagId === 'all'
      ? transactions
      : transactions.filter((t) =>
        t.tags.some((tag) => tag.id === selectedTagId)
      );

  return (
    <main className="min-h-screen flex flex-col relative">
      {/* Header moderno Simplificado */}
      <header className="px-5 pt-8 pb-6">
        <div className="flex items-center justify-between mb-6">
          <Link href="/wallets" className="flex items-center gap-2 group">
            <div className="h-10 w-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-500 group-hover:border-emerald-500/50 transition-colors">
              <Wallet size={20} strokeWidth={2} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Billetera</span>
              <div className="flex items-center gap-1.5 text-slate-100">
                <span className="text-base font-bold truncate max-w-[140px] leading-tight">
                  {wallet.name}
                </span>
                <ChevronDown size={14} className="text-slate-500 group-hover:text-emerald-500 transition-colors" />
              </div>
            </div>
          </Link>

          <button
            onClick={handleLogout}
            className="h-10 w-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition-all"
            aria-label="Cerrar sesión"
          >
            <LogOut size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Card de resumen Minimalista */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-[28px] p-6 shadow-2xl shadow-black/40">
          <div className="absolute top-0 right-0 p-5 opacity-10 pointer-events-none">
            <Wallet size={120} />
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              {/* Selector de Mes Sutil */}
              <div className="flex items-center gap-1 bg-slate-800/50 rounded-full p-1 pr-3 border border-slate-700/50">
                <button
                  onClick={goToPrevMonth}
                  className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-slate-700 text-slate-400 transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs font-semibold text-slate-300 capitalize min-w-[60px] text-center">
                  {monthLabel}
                </span>
                <button
                  onClick={goToNextMonth}
                  className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-slate-700 text-slate-400 transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Balance Total</span>
            </div>

            <div className="flex flex-col gap-1 mb-6">
              <h2 className={`text-4xl font-bold tracking-tight ${summary.balance >= 0 ? 'text-white' : 'text-rose-400'}`}>
                {formatCurrency(summary.balance, wallet.default_currency_code)}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Ingresos */}
              <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                <div className="flex items-center gap-1.5 text-emerald-400 mb-1">
                  <div className="p-1 rounded-full bg-emerald-500/10">
                    <TrendingUp size={12} strokeWidth={3} />
                  </div>
                  <span className="text-[10px] font-bold uppercase opacity-80">Ingresos</span>
                </div>
                <p className="text-sm font-bold text-slate-200">
                  {formatCurrency(summary.income, wallet.default_currency_code)}
                </p>
              </div>

              {/* Gastos */}
              <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-rose-500/5 border border-rose-500/10">
                <div className="flex items-center gap-1.5 text-rose-400 mb-1">
                  <div className="p-1 rounded-full bg-rose-500/10">
                    <TrendingDown size={12} strokeWidth={3} />
                  </div>
                  <span className="text-[10px] font-bold uppercase opacity-80">Gastos</span>
                </div>
                <p className="text-sm font-bold text-slate-200">
                  {formatCurrency(summary.expense, wallet.default_currency_code)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Lista de transacciones + filtros */}
      <section className="flex-1 p-4 pb-20">
        {/* Barra de filtros por etiqueta */}
        {allTags.length > 0 && (
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedTagId('all')}
              className={`px-3 py-1 rounded-full text-xs border whitespace-nowrap ${selectedTagId === 'all'
                ? 'bg-emerald-500 text-black border-emerald-400'
                : 'bg-slate-900 text-slate-200 border-slate-700'
                }`}
            >
              Todas
            </button>
            {allTags.map((tag) => {
              const selected = selectedTagId === tag.id;
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => setSelectedTagId(tag.id)}
                  className={`px-3 py-1 rounded-full text-xs border whitespace-nowrap ${selected
                    ? 'bg-emerald-500 text-black border-emerald-400'
                    : 'bg-slate-900 text-slate-200 border-slate-700'
                    }`}
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
        )}


        {txLoading ? (
          <p className="text-sm text-slate-400">Cargando transacciones...</p>
        ) : filteredTransactions.length === 0 ? (
          <p className="text-sm text-slate-500">
            No hay movimientos para este filtro en este mes.
          </p>
        ) : (
          <ul className="space-y-3">
            {filteredTransactions.map((t) => (
              <li
                key={t.id}
                onClick={() => router.push(`/transactions/${t.id}`)}
                className="flex items-center justify-between rounded-xl bg-slate-900 border border-slate-800 px-3 py-2.5 cursor-pointer hover:border-emerald-500/60 transition-colors"
              >
                <div className="flex flex-col">
                  <span className="text-xs text-slate-400">
                    {formatDateLabel(t.date)}
                  </span>
                  <span className="text-sm font-medium">
                    {t.category_name ?? 'Sin categoría'}
                  </span>
                  {t.note && (
                    <span className="text-xs text-slate-500 mt-0.5">{t.note}</span>
                  )}

                  {t.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {t.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700/50"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div
                  className={`text-base font-bold whitespace-nowrap ${t.type === 'income' ? 'text-emerald-400' : 'text-slate-50'
                    }`}
                >
                  {t.type === 'expense' ? '- ' : '+ '}
                  {formatCurrency(t.amount, wallet.default_currency_code)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Botón flotante "+" */}
      <button
        onClick={handleNewTransaction}
        className="fixed bottom-24 right-5 h-14 w-14 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all z-30"
      >
        <Plus size={32} strokeWidth={2.5} />
      </button>
    </main >
  );
}
