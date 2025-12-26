'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWallets } from '@/components/WalletContext';

export default function WalletsPage() {
  const router = useRouter();
  const { wallets, currentWalletId, setCurrentWalletId, loading } = useWallets();

  if (loading) {
    return <p className="text-slate-300">Cargando billeteras...</p>;
  }

  return (
    <main className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Billeteras</h1>
          <p className="text-xs text-slate-400">Elegí cuál querés usar ahora</p>
        </div>

        <Link
          href="/wallets/new"
          className="rounded-md bg-emerald-500 px-3 py-2 text-sm font-semibold text-black"
        >
          + Nueva
        </Link>
      </header>

      {wallets.length === 0 ? (
        <p className="text-slate-300">No tenés billeteras todavía.</p>
      ) : (
        <div className="space-y-3">
          {wallets.map((w) => {
            const selected = w.id === currentWalletId;

            return (
              <button
                key={w.id}
                type="button"
                onClick={() => {
                  setCurrentWalletId(w.id);
                  router.push('/');
                }}
                className={`w-full rounded-xl border px-4 py-3 text-left ${
                  selected
                    ? 'border-emerald-500 bg-slate-900'
                    : 'border-slate-800 bg-slate-950'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-base font-semibold">{w.name}</p>
                    <p className="text-xs text-slate-400">
                      Moneda: {w.default_currency_code}
                    </p>
                  </div>

                  {selected && (
                    <span className="text-xs font-semibold text-emerald-400">
                      Actual
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </main>
  );
}
