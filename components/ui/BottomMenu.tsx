'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Wallet, User, BarChart3, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

export function BottomMenu() {
    const pathname = usePathname();

    const isActive = (path: string) =>
        pathname === path || (path !== '/' && pathname.startsWith(`${path}/`));

    const destinos = [
        { href: '/', etiqueta: 'Inicio', Icono: Home },
        { href: '/analytics', etiqueta: 'Analítica', Icono: BarChart3 },
        { href: '/assistant', etiqueta: 'Asistente', Icono: MessageCircle },
        { href: '/wallets', etiqueta: 'Billeteras', Icono: Wallet },
    ];

    return (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/95 pb-[env(safe-area-inset-bottom)]">
            <div className="mx-auto flex h-16 max-w-md items-center justify-around">
                {destinos.map(({ href, etiqueta, Icono }) => {
                    const activo = isActive(href);
                    return (
                        <Link
                            key={href}
                            href={href}
                            aria-current={activo ? 'page' : undefined}
                            className={cn(
                                'flex h-full w-full flex-col items-center justify-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400',
                                activo
                                    ? 'text-emerald-400'
                                    : 'text-slate-500 hover:text-slate-300'
                            )}
                        >
                            <Icono
                                aria-hidden="true"
                                size={24}
                                strokeWidth={activo ? 2.5 : 2}
                            />
                            <span className="text-[10px] font-medium">{etiqueta}</span>
                        </Link>
                    );
                })}

                {/* Placeholder para perfil/logout por ahora */}
                <button
                    type="button"
                    className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-500 transition-colors hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400"
                    onClick={() => {
                        // Futuro: Ir a /profile
                        // Por ahora no hace nada o podría abrir un modal
                    }}
                >
                    <User aria-hidden="true" size={24} strokeWidth={2} />
                    <span className="text-[10px] font-medium">Perfil</span>
                </button>
            </div>
        </nav>
    );
}
