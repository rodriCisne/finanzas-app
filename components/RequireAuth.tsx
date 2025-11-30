'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50">
        <div className="text-center">
          <p className="text-sm text-slate-400">Cargando sesión...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    // Mientras redirige, evitamos parpadeos raros
    return null;
  }

  return <>{children}</>;
}
