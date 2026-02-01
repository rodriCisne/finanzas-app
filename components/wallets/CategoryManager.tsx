'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useCategories, Category } from '@/hooks/useCategories';

export default function CategoryManager({ walletId }: { walletId: string }) {
    const { categories, loading, refetch } = useCategories(walletId);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [newName, setNewName] = useState('');
    const [newType, setNewType] = useState<Category['type']>('expense');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        const trimmed = (editingCategory ? editingCategory.name : newName).trim();

        if (!trimmed) {
            setErrorMsg('El nombre es obligatorio.');
            return;
        }

        setIsSubmitting(true);

        if (editingCategory) {
            const { error } = await supabase
                .from('categories')
                .update({ name: editingCategory.name, type: editingCategory.type })
                .eq('id', editingCategory.id);

            if (error) {
                setErrorMsg(error.message);
            } else {
                setEditingCategory(null);
                refetch();
            }
        } else {
            const { error } = await supabase
                .from('categories')
                .insert({
                    wallet_id: walletId,
                    name: trimmed,
                    type: newType,
                });

            if (error) {
                setErrorMsg(error.message);
            } else {
                setNewName('');
                setNewType('expense');
                refetch();
            }
        }
        setIsSubmitting(false);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('¿Seguro que querés eliminar esta categoría?')) return;

        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', id);

        if (error) {
            setErrorMsg(error.message);
        } else {
            refetch();
        }
    };

    return (
        <div className="mt-8 space-y-6 border-t border-slate-800 pt-8">
            <div>
                <h2 className="text-lg font-bold">Categorías</h2>
                <p className="text-xs text-slate-400">Gestioná los rubros de tus movimientos</p>
            </div>

            {/* Listado */}
            <div className="space-y-2">
                {loading && <p className="text-sm text-slate-400">Cargando categorías...</p>}
                {!loading && categories.length === 0 && (
                    <p className="text-sm text-slate-500 italic">No hay categorías en esta billetera.</p>
                )}
                {categories.map((cat) => (
                    <div
                        key={cat.id}
                        className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2"
                    >
                        {editingCategory?.id === cat.id ? (
                            <div className="flex flex-1 gap-2">
                                <input
                                    value={editingCategory.name}
                                    onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                                    className="flex-1 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-50"
                                    placeholder="Nombre"
                                    autoFocus
                                />
                                <select
                                    value={editingCategory.type}
                                    onChange={(e) => setEditingCategory({ ...editingCategory, type: e.target.value as Category['type'] })}
                                    className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-50"
                                >
                                    <option value="expense">Gasto</option>
                                    <option value="income">Ingreso</option>
                                    <option value="both">Ambos</option>
                                </select>
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className="text-xs font-semibold text-emerald-400"
                                >
                                    Ok
                                </button>
                                <button
                                    onClick={() => setEditingCategory(null)}
                                    className="text-xs font-semibold text-slate-400"
                                >
                                    X
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs px-1.5 py-0.5 rounded ${cat.type === 'expense' ? 'bg-rose-900/30 text-rose-400' :
                                            cat.type === 'income' ? 'bg-emerald-900/30 text-emerald-400' :
                                                'bg-slate-800 text-slate-400'
                                        }`}>
                                        {cat.type === 'expense' ? 'G' : cat.type === 'income' ? 'I' : 'A'}
                                    </span>
                                    <span className="text-sm text-slate-200">{cat.name}</span>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setEditingCategory(cat)}
                                        className="text-xs text-slate-400 hover:text-slate-200"
                                    >
                                        Editar
                                    </button>
                                    <button
                                        onClick={() => handleDelete(cat.id)}
                                        className="text-xs text-rose-500/80 hover:text-rose-400"
                                    >
                                        Borrar
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>

            {/* Nuevo */}
            {!editingCategory && (
                <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-dashed border-slate-700 p-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Nueva categoría</p>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="flex-1 space-y-1">
                            <label className="text-[10px] text-slate-500 uppercase">Nombre</label>
                            <input
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Ej: Supermercado"
                                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-50"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] text-slate-500 uppercase">Tipo</label>
                            <select
                                value={newType}
                                onChange={(e) => setNewType(e.target.value as Category['type'])}
                                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-50"
                            >
                                <option value="expense">Gasto</option>
                                <option value="income">Ingreso</option>
                                <option value="both">Ambos (I/G)</option>
                            </select>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-black hover:bg-white disabled:opacity-50"
                        >
                            {isSubmitting ? '...' : 'Agregar'}
                        </button>
                    </div>
                    {errorMsg && <p className="text-xs text-rose-400">{errorMsg}</p>}
                </form>
            )}
        </div>
    );
}
