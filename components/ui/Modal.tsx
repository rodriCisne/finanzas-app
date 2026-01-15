'use client';

import { ReactNode, useEffect } from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    children?: ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm?: () => void;
    variant?: 'danger' | 'info';
    isLoading?: boolean;
}

export function Modal({
    isOpen,
    onClose,
    title,
    description,
    children,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    onConfirm,
    variant = 'info',
    isLoading = false,
}: ModalProps) {
    // Cerrar con la tecla ESC
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6">
                    <h3 className="text-xl font-bold text-slate-50 mb-2">{title}</h3>
                    {description && (
                        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                            {description}
                        </p>
                    )}

                    {children && <div className="mb-6">{children}</div>}

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 text-slate-200 text-sm font-medium hover:bg-slate-700 transition-colors disabled:opacity-50"
                        >
                            {cancelLabel}
                        </button>
                        {onConfirm && (
                            <button
                                onClick={onConfirm}
                                disabled={isLoading}
                                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 ${variant === 'danger'
                                        ? 'bg-rose-500 text-rose-950 hover:bg-rose-400'
                                        : 'bg-emerald-500 text-emerald-950 hover:bg-emerald-400'
                                    }`}
                            >
                                {isLoading ? 'Cargando...' : confirmLabel}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
