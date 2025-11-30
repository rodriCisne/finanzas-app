'use client';

import { useCurrentWallet } from '@/hooks/useCurrentWallet';
import { useMonthTransactions } from '@/hooks/useMonthTransactions';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { getCurrentMonthLabel } from '@/utils/date';

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDateLabel(dateStr: string) {
  // dateStr viene como 'YYYY-MM-DD'
  const [year, month, day] = dateStr.split('-').map(Number);
  // new Date(año, mesIndex, día) interpreta la fecha en hora LOCAL
  const d = new Date(year, month - 1, day);

  return d.toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export default function HomePage() {
  const router = useRouter();
  const { wallet, loading: walletLoading } = useCurrentWallet();
  const { transactions, summary, loading: txLoading } = useMonthTransactions(
    wallet?.id
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/auth/login');
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

  const monthLabel = getCurrentMonthLabel();

  return (
    <main className="min-h-screen flex flex-col relative">
      {/* Header tipo mobile */}
      <header className="px-4 pt-6 pb-4 border-b border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs uppercase text-slate-400">
              Billetera actual
            </p>
            <h1 className="text-lg font-semibold">{wallet.name}</h1>
            <p className="text-xs text-slate-500">
              Moneda: {wallet.default_currency_code}
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="text-xs text-slate-400 underline"
          >
            Salir
          </button>
        </div>

        {/* Card de resumen mensual */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-400">{monthLabel}</p>
            <p className="text-[11px] text-slate-500">
              Ingresos / Gastos / Balance
            </p>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[11px] text-emerald-400 mb-1">Ingresos</p>
              <p className="text-sm font-semibold">
                {formatAmount(summary.income, wallet.default_currency_code)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-rose-400 mb-1">Gastos</p>
              <p className="text-sm font-semibold">
                {formatAmount(summary.expense, wallet.default_currency_code)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400 mb-1 text-right">
                Balance
              </p>
              <p
                className={`text-lg font-bold text-right ${
                  summary.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatAmount(summary.balance, wallet.default_currency_code)}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Lista de transacciones */}
      <section className="flex-1 p-4 pb-20">
        {txLoading ? (
          <p className="text-sm text-slate-400">Cargando transacciones...</p>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-slate-500">
            Aún no registraste movimientos este mes.
          </p>
        ) : (
          <ul className="space-y-3">
            {transactions.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded-xl bg-slate-900 border border-slate-800 px-3 py-2.5"
              >
                <div className="flex flex-col">
                  <span className="text-xs text-slate-400">
                    {formatDateLabel(t.date)}
                  </span>
                  <span className="text-sm font-medium">
                    {t.category_name ?? 'Sin categoría'}
                  </span>
                  {t.note && (
                    <span className="text-xs text-slate-500">{t.note}</span>
                  )}
                </div>
                <div
                  className={`text-sm font-semibold ${
                    t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {t.type === 'expense' ? '-' : '+'}{' '}
                  {formatAmount(t.amount, wallet.default_currency_code)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Botón flotante "+" */}
      <button
        onClick={handleNewTransaction}
        className="fixed bottom-6 right-6 md:right-[calc(50%-8rem)] md:bottom-8 h-14 w-14 rounded-full bg-emerald-500 text-black font-bold text-3xl flex items-center justify-center shadow-lg shadow-emerald-500/30"
      >
        +
      </button>
    </main>
  );
}
