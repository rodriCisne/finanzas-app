'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { supabaseBrowserClient } from '@/lib/supabaseClient';
import clsx from 'clsx';

export interface ValentineStory {
    id: string;
    order_index: number;
    title: string;
    description: string;
    image_path: string;
    year: number;
}

interface ValentineRecapModalProps {
    stories: ValentineStory[];
    isOpen: boolean;
    onClose: () => void;
}

const DURATION_PER_SLIDE = 6000; // 6 seconds

export default function ValentineRecapModal({ stories, isOpen, onClose }: ValentineRecapModalProps) {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Handle closing - mark as seen
    const handleClose = useCallback(async () => {
        // Optimistic close
        onClose();

        // Fire and forget - Client Side
        try {
            const supabase = supabaseBrowserClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                const currentYear = new Date().getFullYear();
                await supabase
                    .from('valentine_impressions')
                    .upsert({
                        user_id: user.id,
                        year: currentYear,
                        seen_at: new Date().toISOString()
                    });
            }
        } catch (err) {
            console.error('Failed to mark valentine as seen', err);
        }
    }, [onClose]);

    // Timer logic
    // Timer removed for manual navigation

    const nextSlide = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (currentIndex < stories.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            handleClose();
        }
    };

    const prevSlide = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    if (!isOpen) return null;

    const currentStory = stories[currentIndex];

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-black text-white flex flex-col items-center justify-center font-sans"
                >
                    {/* Main Container - Mobile First strict max-w */}
                    <div className="relative w-full h-full max-w-md bg-black shadow-2xl overflow-hidden flex flex-col">

                        {/* Background Image with Ken Burns effect */}
                        <AnimatePresence mode='wait'>
                            <motion.div
                                key={currentStory.id}
                                initial={{ scale: 1.1, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.8 }}
                                className="absolute inset-0 z-0"
                            >
                                <div
                                    className="absolute inset-0 bg-cover bg-center"
                                    style={{ backgroundImage: `url(${currentStory.image_path})` }}
                                />
                                {/* Overlay Gradient */}
                                <div className="absolute inset-0 bg-linear-to-b from-black/40 via-transparent to-black/80" />
                            </motion.div>
                        </AnimatePresence>

                        {/* Top Bar: Progress & Close */}
                        <div className="absolute top-0 left-0 right-0 z-20 p-4 pt-12 flex flex-col gap-2">
                            {/* Progress Bars */}
                            <div className="flex gap-1 w-full">
                                {stories.map((_, idx) => (
                                    <div key={idx} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-white"
                                            initial={{ width: idx <= currentIndex ? '100%' : '0%' }}
                                            animate={{ width: idx <= currentIndex ? '100%' : '0%' }}
                                            transition={{ duration: 0.3 }}
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Header Info */}
                            <div className="flex justify-between items-center mt-2 px-1">
                                <div className="flex items-center gap-2">
                                    <span className="bg-pink-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                        San Valentín
                                    </span>
                                    <span className="text-xs font-medium text-white/80">
                                        {currentIndex + 1} de {stories.length}
                                    </span>
                                </div>
                                <button onClick={handleClose} className="p-2 backdrop-blur-md bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                                    <X size={20} className="text-white" />
                                </button>
                            </div>
                        </div>

                        {/* Navigation Touch Areas (Invisible) */}
                        <div className="absolute inset-0 z-10 flex">
                            <div
                                className="w-1/3 h-full"
                                onClick={prevSlide}
                            />
                            <div
                                className="w-2/3 h-full"
                                onClick={nextSlide}
                            />
                        </div>

                        {/* Content Area */}
                        <div className="absolute bottom-0 left-0 right-0 z-20 p-8 pb-16 flex flex-col items-start gap-4 pointer-events-none">
                            <motion.div
                                key={`text-${currentStory.id}`}
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3, duration: 0.5 }}
                                className={clsx(
                                    "flex flex-col gap-2",
                                    currentStory.description.length > 100
                                        ? "bg-black/60 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-xl max-h-[65vh] overflow-y-auto pointer-events-auto"
                                        : ""
                                )}
                            >
                                <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-linear-to-br from-pink-400 to-red-400 drop-shadow-xs">
                                    {currentStory.title}
                                </h2>
                                <p className={clsx(
                                    "mt-2 text-lg text-white/90 font-medium leading-relaxed font-serif italic whitespace-pre-line",
                                    currentStory.description.length > 100 ? "max-w-full text-base" : "max-w-[90%]"
                                )}>
                                    {currentStory.description}
                                </p>
                            </motion.div>
                        </div>

                        {/* Controls (Visual indicators mostly) */}
                        {currentIndex > 0 && (
                            <button
                                onClick={prevSlide}
                                className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2 bg-black/20 backdrop-blur-xs rounded-full text-white/50 hover:text-white hover:bg-black/40 transition-all pointer-events-auto"
                            >
                                <ChevronLeft size={24} />
                            </button>
                        )}

                        <button
                            onClick={nextSlide}
                            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2 bg-black/20 backdrop-blur-xs rounded-full text-white/50 hover:text-white hover:bg-black/40 transition-all pointer-events-auto"
                        >
                            <ChevronRight size={24} />
                        </button>

                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
