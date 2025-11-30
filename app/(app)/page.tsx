'use client';

import { useCurrentWallet } from '@/hooks/useCurrentWallet';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const { wallet, loading } = useCurrentWallet();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/auth/login');
  };

  if (loading) {
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

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header tipo mobile */}
      <header className="px-4 pt-6 pb-4 border-b border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs uppercase text-slate-400">
              Billetera actual
            </p>
            <h1 className="text-lg font-semibold">{wallet.name}</h1>
            <p className="text-xs text-slate-500">
              Moneda por defecto: {wallet.default_currency_code}
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="text-xs text-slate-400 underline"
          >
            Salir
          </button>
        </div>

        {/* Placeholder del balance mensual (lo implementamos en el siguiente paso) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
          <p className="text-xs text-slate-400 mb-1">Balance de este mes</p>
          <p className="text-2xl font-bold text-emerald-400">0,00</p>
        </div>
      </header>

      {/* Contenido, por ahora vacío */}
      <section className="flex-1 p-4">
        <p className="text-sm text-slate-500">
          Acá va a ir la lista de transacciones del mes.
        </p>
      </section>
    </main>
  );
}
