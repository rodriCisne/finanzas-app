'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabaseBrowserClient } from '@/lib/supabaseClient';
import phrasesData from '@/data/phrases.json';
import { Loader2 } from 'lucide-react';

interface ExpenseConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface Phrase {
    id: string;
    text: string;
    author?: string;
}

export function ExpenseConfirmationModal({ isOpen, onClose }: ExpenseConfirmationModalProps) {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [phrase, setPhrase] = useState<Phrase | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isOpen) return;

        async function loadContent() {
            setLoading(true);
            try {
                // 1. Pick Random Phrase
                const randomPhrase = phrasesData[Math.floor(Math.random() * phrasesData.length)];
                setPhrase(randomPhrase);

                // 2. Pick Random Image from Supabase
                const supabase = supabaseBrowserClient();
                const { data: files, error } = await supabase
                    .storage
                    .from('fotosRodricu') // Bucket Name
                    .list('random-moments', { limit: 100, offset: 0 }); // Folder Path inside bucket

                if (error) {
                    console.error('Error fetching images:', error);
                    setImageUrl(null);
                } else if (files && files.length > 0) {
                    // Filter out non-image files (folders, empty placeholders)
                    const imageFiles = files.filter(f => f.name !== '.emptyFolderPlaceholder' && !f.name.startsWith('.'));

                    if (imageFiles.length > 0) {
                        const randomFile = imageFiles[Math.floor(Math.random() * imageFiles.length)];
                        // Construct public URL with folder path
                        const { data: { publicUrl } } = supabase
                            .storage
                            .from('fotosRodricu')
                            .getPublicUrl(`random-moments/${randomFile.name}`);

                        // 🚀 Optimize Image using Supabase Image Transformation API
                        // Standard: .../storage/v1/object/public/...
                        // Optimal:  .../storage/v1/render/image/public/...
                        const optimizedUrl = publicUrl.replace('/object/public/', '/render/image/public/') + '?width=800&quality=60&format=webp';

                        setImageUrl(optimizedUrl);
                    }
                }
            } catch (err) {
                console.error('Unexpected error loading content:', err);
            } finally {
                setLoading(false);
            }
        }

        loadContent();
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex flex-col bg-black"
                >
                    {/* Blurred Background for immersive feel */}
                    {imageUrl && (
                        <div
                            className="absolute inset-0 bg-cover bg-center blur-2xl opacity-50 scale-110"
                            style={{ backgroundImage: `url(${imageUrl})` }}
                        />
                    )}

                    {/* Main Image - Contained to fit screen */}
                    <div className="flex-1 relative flex items-center justify-center overflow-hidden">
                        {loading ? (
                            <Loader2 className="w-12 h-12 text-white/50 animate-spin" />
                        ) : imageUrl ? (
                            <motion.img
                                key={imageUrl}
                                src={imageUrl}
                                alt="Random Memory"
                                initial={{ scale: 1.1, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.8 }}
                                className="w-full h-full object-contain relative z-10 shadow-2xl"
                            />
                        ) : null}
                    </div>

                    {/* Text Content - Always at Bottom */}
                    <motion.div
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="relative z-20 pt-12 pb-12 px-6 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col items-center text-center gap-6"
                    >
                        {loading ? null : (
                            <>
                                <div className="space-y-3 max-w-sm">
                                    <h2 className="text-2xl md:text-3xl font-bold text-white font-serif italic leading-tight drop-shadow-lg">
                                        "{phrase?.text}"
                                    </h2>
                                    {phrase?.author && (
                                        <p className="text-white/70 text-sm font-medium leading-snug">
                                            {phrase.author}
                                        </p>
                                    )}
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={onClose}
                                    className="px-10 py-3 bg-white text-black font-bold rounded-full shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:bg-slate-100 transition-all text-sm uppercase tracking-wide"
                                >
                                    Continuar
                                </motion.button>
                            </>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
