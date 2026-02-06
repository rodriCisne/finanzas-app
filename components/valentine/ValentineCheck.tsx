'use client';

import { useEffect, useState } from 'react';
import ValentineRecapModal, { ValentineStory } from './ValentineRecapModal';
import { supabaseBrowserClient } from '@/lib/supabaseClient';

export default function ValentineCheck() {
    const [isOpen, setIsOpen] = useState(false);
    const [stories, setStories] = useState<ValentineStory[]>([]);
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        async function init() {
            if (checked) return;

            const TEST_MODE = true; // 💘 Enable for testing on Feb 6th

            const supabase = supabaseBrowserClient();
            console.log('ValentineCheck: Checking eligibility...');

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setChecked(true);
                return;
            }

            // 1. Check Impressions (Already seen this year?)
            const currentYear = new Date().getFullYear();
            const { data: impression } = await supabase
                .from('valentine_impressions')
                .select('seen_at')
                .eq('user_id', user.id)
                .eq('year', currentYear)
                .single();

            if (impression) {
                console.log('Valentine already seen');
                if (!TEST_MODE) {
                    setChecked(true);
                    return;
                }
                console.log('🚧 TEST_MODE: Ignoring "already seen"');
            }

            // 2. Check Shared Wallet
            const { data: memberships } = await supabase
                .from('wallet_members')
                .select('wallet_id')
                .eq('user_id', user.id);

            if (!memberships || memberships.length === 0) {
                if (!TEST_MODE) {
                    setChecked(true);
                    return;
                }
            }

            const walletIds = memberships ? memberships.map(m => m.wallet_id) : [];
            // Clean query if walletIds is empty/undefined
            const { data: sharedWallets } = walletIds.length > 0 ? await supabase
                .from('wallet_members')
                .select('wallet_id')
                .in('wallet_id', walletIds)
                .neq('user_id', user.id)
                .limit(1) : { data: [] };

            if (!sharedWallets || sharedWallets.length === 0) {
                console.log('No shared wallet found');
                if (!TEST_MODE) {
                    setChecked(true);
                    return;
                }
                console.log('🚧 TEST_MODE: Ignoring "no shared wallet"');
            }

            // 3. Fetch Stories
            const { data, error } = await supabase
                .from('valentine_stories')
                .select('*')
                .eq('year', 2026)
                .order('order_index', { ascending: true });

            if (data && data.length > 0) {
                // Resolve Public URLs
                const storiesWithUrl = data.map(story => {
                    const { data: { publicUrl } } = supabase.storage
                        .from('valentine-assets')
                        .getPublicUrl(story.image_path);
                    return { ...story, image_path: publicUrl };
                });

                setStories(storiesWithUrl);
                setIsOpen(true);
            } else {
                // Fallback Mock Data for Demo
                setStories(getMockStories());
                setIsOpen(true);
            }

            setChecked(true);
        }

        init();
    }, [checked]);

    if (!isOpen) return null;

    return (
        <ValentineRecapModal
            stories={stories}
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
        />
    );
}

function getMockStories(): ValentineStory[] {
    return [
        {
            id: '1', order_index: 1, year: 2026,
            title: 'Hola amor ❤️',
            description: 'Tenía preparada una sorpresa especial para hoy...',
            image_path: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=2000'
        },
        {
            id: '2', order_index: 2, year: 2026,
            title: 'Nuestro año',
            description: 'Pasamos por tantas cosas juntos este año...',
            image_path: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?q=80&w=2000'
        },
        {
            id: '3', order_index: 3, year: 2026,
            title: 'Momentos únicos',
            description: 'Risas, salidas y esos pequeños detalles.',
            image_path: 'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?q=80&w=2000'
        },
        {
            id: '4', order_index: 4, year: 2026,
            title: 'Compartir es amar',
            description: 'Incluso cuando compartimos los gastos en esta app 😅',
            image_path: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=2000'
        },
        {
            id: '5', order_index: 5, year: 2026,
            title: 'Te elijo',
            description: 'Te volvería a elegir una y mil veces más.',
            image_path: 'https://images.unsplash.com/photo-1518621736915-f3b1c41bfd00?q=80&w=2000'
        },
        {
            id: '6', order_index: 6, year: 2026,
            title: 'Feliz San Valentín',
            description: 'Te amo hasta el infinito. ❤️',
            image_path: 'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?q=80&w=2000'
        }
    ];
}
