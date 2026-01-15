'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Wallet, User } from 'lucide-react';

export function BottomMenu() {
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path;

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/80 backdrop-blur-lg border-t border-slate-800 pb-safe">
            <div className="max-w-md mx-auto flex items-center justify-around h-16">
                <Link
                    href="/"
                    className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${isActive('/') ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
                        }`}
                >
                    <Home size={24} strokeWidth={isActive('/') ? 2.5 : 2} />
                    <span className="text-[10px] font-medium">Inicio</span>
                </Link>

                <Link
                    href="/wallets"
                    className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${isActive('/wallets') ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
                        }`}
                >
                    <Wallet size={24} strokeWidth={isActive('/wallets') ? 2.5 : 2} />
                    <span className="text-[10px] font-medium">Billeteras</span>
                </Link>

                {/* Placeholder para perfil/logout por ahora */}
                <button
                    className="flex flex-col items-center justify-center w-full h-full gap-1 text-slate-500 hover:text-slate-300 transition-colors"
                    onClick={() => {
                        // Futuro: Ir a /profile
                        // Por ahora no hace nada o podría abrir un modal
                    }}
                >
                    <User size={24} strokeWidth={2} />
                    <span className="text-[10px] font-medium">Perfil</span>
                </button>
            </div>
        </nav>
    );
}
