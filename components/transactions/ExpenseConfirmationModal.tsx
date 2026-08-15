'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import phrasesData from '@/data/phrases.json';

interface ExpenseConfirmationModalProps {
    isOpen: boolean;
    imageUrl: string | null;
    onClose: () => void;
}

interface Phrase {
    id: string;
    text: string;
    author?: string;
}

export function ExpenseConfirmationModal({ isOpen, imageUrl, onClose }: ExpenseConfirmationModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <ConfirmationContent imageUrl={imageUrl} onClose={onClose} />
            )}
        </AnimatePresence>
    );
}

function ConfirmationContent({ imageUrl, onClose }: Omit<ExpenseConfirmationModalProps, 'isOpen'>) {
    const [phrase] = useState<Phrase>(
        () => phrasesData[Math.floor(Math.random() * phrasesData.length)],
    );
    const [imageFailed, setImageFailed] = useState(false);
    const displayUrl = imageFailed ? null : imageUrl;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex flex-col bg-black pb-[env(safe-area-inset-bottom)]"
        >
                    {/* Una sola imagen evita descargar o pintar duplicados de pantalla completa. */}
                    <div className="flex-1 relative flex items-center justify-center overflow-hidden">
                        {displayUrl ? (
                            <motion.img
                                key={displayUrl}
                                src={displayUrl}
                                alt="Recuerdo aleatorio"
                                decoding="async"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.18, ease: 'easeOut' }}
                                className="h-full w-full object-contain"
                                onError={() => {
                                    console.warn('La foto optimizada no pudo mostrarse.');
                                    setImageFailed(true);
                                }}
                            />
                        ) : (
                            <div className="mx-6 max-w-sm rounded-2xl border border-slate-800 bg-slate-950 p-6 text-center">
                                <p className="text-pretty text-sm text-slate-400" role="status">
                                    La transacción se guardó correctamente. La foto no está disponible por el momento.
                                </p>
                            </div>
                        )}
                    </div>

                    <motion.div
                        initial={{ y: 12, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        className="relative z-20 flex flex-col items-center gap-6 border-t border-white/10 bg-black/90 px-6 py-8 text-center"
                    >
                        <div className="max-w-sm space-y-3">
                            <h2 className="text-balance font-serif text-2xl font-bold italic leading-tight text-white md:text-3xl">
                                “{phrase?.text}”
                            </h2>
                            {phrase?.author && (
                                <p className="text-pretty text-sm font-medium leading-snug text-white/70">
                                    {phrase.author}
                                </p>
                            )}
                        </div>

                        <motion.button
                            whileTap={{ scale: 0.98 }}
                            transition={{ duration: 0.12, ease: 'easeOut' }}
                            onClick={onClose}
                            className="rounded-full bg-white px-10 py-3 text-sm font-bold uppercase text-black shadow-sm transition-colors hover:bg-slate-100"
                        >
                            Continuar
                        </motion.button>
                    </motion.div>
        </motion.div>
    );
}
