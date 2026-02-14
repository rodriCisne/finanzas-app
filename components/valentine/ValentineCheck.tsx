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

            const TEST_MODE = false; // 💘 Disabled for production

            const now = new Date();
            const isValentineDay = now.getMonth() === 1 && now.getDate() === 14; // Month is 0-indexed (1 = Feb)

            if (!isValentineDay && !TEST_MODE) {
                console.log('Not Valentine\'s Day yet');
                setChecked(true);
                return;
            }

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
    const PROJECT_REF = 'xgdmipmjonjikyxtfaxn';
    const BUCKET = 'valentine-assets';
    // -----------------------------------------------------------------------------------------
    // INSTRUCCIONES:
    // 1. Las imágenes se cargan desde tu Supabase Storage.
    // 2. Asegúrate de que las fotos en el bucket se llamen PyH1, PyH2, ..., PyH10.
    // 3. Si tus fotos tienen extensión (ej: .jpg, .png), agrégala en la variable 'EXT'.
    // -----------------------------------------------------------------------------------------
    const EXT = '.png'; // Ajustado según tu ejemplo

    const getImg = (id: string) =>
        `https://${PROJECT_REF}.supabase.co/storage/v1/object/public/${BUCKET}/PyH${id}${EXT}`;

    return [
        {
            id: '1', order_index: 1, year: 2026,
            title: 'Hola amor ❤️',
            description: 'Pato & Huevito Nuestra historia de amor. 💚',
            image_path: getImg('1')
        },
        {
            id: '2', order_index: 2, year: 2026,
            title: 'Match',
            description: 'Un match, un chat… y de repente: vermouth en MalaSangre y ganas de volver a vernos.',
            image_path: getImg('2')
        },
        {
            id: '3', order_index: 3, year: 2026,
            title: 'Momento clave',
            description: 'En esa lancha, con el río alrededor y mis amigos mirando… yo ya lo sabía: vos ibas a ser mi novia.',
            image_path: getImg('3')
        },
        {
            id: '4', order_index: 4, year: 2026,
            title: 'La propuesta',
            description: 'Bajo las estrellas, el Huevito se animó a preguntar…y el Patito dijo sí: “somos nosotros”',
            image_path: getImg('4')
        },
        {
            id: '5', order_index: 5, year: 2026,
            title: 'Los viajes',
            description: 'Y ahí entendí que viajar con vos… es mi forma favorita de vivir.',
            image_path: getImg('5')
        },
        {
            id: '6', order_index: 6, year: 2026,
            title: 'Casi Ruptura',
            description: 'Nos dolió. Nos asustó. Casi nos rompe. Pero al final hicimos lo más valiente: elegirnos y aprender.',
            image_path: getImg('6')
        },
        {
            id: '7', order_index: 7, year: 2026,
            title: 'Juntos es mejor',
            description: 'El mundo cambió de paisaje, pero no de plan: vos y yo.',
            image_path: getImg('7')
        },
        {
            id: '8', order_index: 8, year: 2026,
            title: 'Convivencia',
            description: 'Descubrimos que separados es peor. Así que armamos nido: cajas, abrazos…',
            image_path: getImg('8')
        },
        {
            id: '9', order_index: 9, year: 2026,
            title: 'Diferencias',
            description: 'Vos sentís todo. Yo a veces me cuelgo demasiado. Nos molestamos un poquito… y nos amamos un montón',
            image_path: getImg('9')
        },
        {
            id: '10', order_index: 10, year: 2026,
            title: 'Por siempre',
            description: `Hoy quiero decirte que de estos últimos casi 4 años juntos, no cambiaría nada. Que te amo como nunca amé a nadie.

Quién hubiera dicho que después de prometerme varias veces nunca convivir más con nadie, terminaríamos construyendo este hogar juntos, entre mudanzas intensas, cajas de cartón y nuestro peachito.

Quiero que sepas que valoro cada detalle de nuestra relación: desde tus “mimitos” cuando vuelvo roto del pádel, nuestros momentos de chillazo, nuestras jodas locas, viajes, nuestras cenas de “fiderricos” o sushito viendo alguna serie.

Quiero que sepas que, a pesar de que a veces me cuesta expresarme con palabras, intento que entiendas que me haces muy bien, me encanta vivir con vos, charlar con vos, salir de joda con vos, viajar con vos, hacerte chistes, molestarte, abrazarte, quererte, besarte.

Sos una persona increible, mucho mejor que yo y me enseñas a ser mejor cada día.

Gracias por cuidarme cuando estoy “cachuso” y por bancar mis colgadas.

Sos el pato más lindo de este mundo y yo siempre voy a ser tu huevito.

Como te dije una vez, te amo...y quiero que sientas eso.

Tu huevo, Rodri.`,
            image_path: getImg('10')
        }
    ];
}
