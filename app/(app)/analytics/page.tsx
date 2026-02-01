'use client';

import { useState, useRef, useEffect } from 'react';
import { useWallets } from '@/components/WalletContext';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, LabelList
} from 'recharts';
import { ChevronLeft, ChevronRight, User, Tag } from 'lucide-react';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AnalyticsPage() {
    const { currentWalletId } = useWallets();
    const [period, setPeriod] = useState<'month' | 'year'>('month');

    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);

    // Filtros
    const [categoryId, setCategoryId] = useState<string>('');
    const [userId, setUserId] = useState<string>('');

    const { evolutionData, categoryDistribution, userDistribution, availableCategories, availableUsers, loading } = useAnalyticsData(
        currentWalletId,
        period,
        year,
        month,
        { categoryId, userId }
    );

    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
        }
    }, [evolutionData, loading]);

    const nextPeriod = () => {
        if (period === 'month') {
            if (month === 12) {
                setMonth(1);
                setYear(y => y + 1);
            } else {
                setMonth(m => m + 1);
            }
        } else {
            setYear(y => y + 1);
        }
    };

    const prevPeriod = () => {
        if (period === 'month') {
            if (month === 1) {
                setMonth(12);
                setYear(y => y - 1);
            } else {
                setMonth(m => m - 1);
            }
        } else {
            setYear(y => y - 1);
        }
    };

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);

    const formatCompactValue = (val: number) => {
        if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
        if (val >= 1000) return (val / 1000).toFixed(1) + 'K';
        return val.toString();
    };

    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    return (
        <main className="space-y-6 px-4 pt-4 pb-24">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold">Analítica</h1>
                    <p className="text-xs text-slate-400">Tus finanzas en perspectiva</p>
                </div>

                <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
                    <button
                        onClick={() => setPeriod('month')}
                        className={`px-3 py-1 text-xs rounded-md transition-all ${period === 'month' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400'}`}
                    >
                        Mes
                    </button>
                    <button
                        onClick={() => setPeriod('year')}
                        className={`px-3 py-1 text-xs rounded-md transition-all ${period === 'year' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400'}`}
                    >
                        Año
                    </button>
                </div>
            </header>

            {/* Selector de Fecha */}
            <div className="flex items-center justify-between bg-slate-900/50 backdrop-blur-md rounded-xl border border-slate-800 p-3">
                <button onClick={prevPeriod} className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white">
                    <ChevronLeft size={20} />
                </button>
                <span className="font-semibold text-sm">
                    {period === 'month' ? `${monthNames[month - 1]} ${year}` : year}
                </span>
                <button onClick={nextPeriod} className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white">
                    <ChevronRight size={20} />
                </button>
            </div>

            {/* Filtros */}
            <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                    <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    <select
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-2 py-2 text-xs text-slate-200 appearance-none focus:outline-none focus:border-emerald-500/50 min-h-[40px]"
                    >
                        <option value="">Todas las cat.</option>
                        {availableCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div className="relative">
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    <select
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-2 py-2 text-xs text-slate-200 appearance-none focus:outline-none focus:border-emerald-500/50 min-h-[40px]"
                    >
                        <option value="">Todos los usuarios</option>
                        {availableUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <p className="text-slate-400 animate-pulse text-sm">Calculando estadísticas...</p>
                </div>
            ) : (
                <div className="space-y-8">

                    {/* Evolutivo con Scroll Condicional */}
                    <section className="bg-slate-900/40 rounded-2xl border border-slate-800 p-4 space-y-4">
                        <h3 className="text-sm font-semibold text-slate-300">
                            {period === 'month' ? 'Gasto por día' : 'Gasto por mes'}
                        </h3>
                        <div
                            ref={scrollRef}
                            className="w-full overflow-x-auto custom-scrollbar pb-2"
                        >
                            <div
                                style={{
                                    width: evolutionData.length > 7 ? (period === 'month' ? '200%' : '120%') : '100%',
                                    minWidth: '350px'
                                }}
                                className="h-64"
                            >
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={evolutionData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                        <XAxis
                                            dataKey="month"
                                            fontSize={10}
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#94a3b8' }}
                                        />
                                        <YAxis hide />
                                        <Tooltip
                                            cursor={{ fill: '#ffffff10' }}
                                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', fontSize: '12px', color: '#f1f5f9', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' }}
                                            itemStyle={{ color: '#f1f5f9' }}
                                            formatter={(val: number) => [formatCurrency(val), '']}
                                        />
                                        <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="Ingresos">
                                            <LabelList
                                                dataKey="income"
                                                position="top"
                                                fontSize={9}
                                                fill="#10b981"
                                                formatter={(v: number) => v > 0 ? formatCompactValue(v) : ''}
                                            />
                                        </Bar>
                                        <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} name="Gastos">
                                            <LabelList
                                                dataKey="expense"
                                                position="top"
                                                fontSize={9}
                                                fill="#ef4444"
                                                formatter={(v: number) => v > 0 ? formatCompactValue(v) : ''}
                                            />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </section>

                    {/* Cat Distribution Pie Chart */}
                    <div className="grid grid-cols-1 gap-6">
                        <section className="bg-slate-900/40 rounded-2xl border border-slate-800 p-4 space-y-4">
                            <h3 className="text-sm font-semibold text-slate-300">Gastos por Categoría</h3>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={categoryDistribution}
                                            cx="50%"
                                            cy="40%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                            nameKey="name"
                                        >
                                            {categoryDistribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0.2)" />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', fontSize: '12px', color: '#f1f5f9', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' }}
                                            itemStyle={{ color: '#f1f5f9' }}
                                            formatter={(value: number, name: string) => [formatCurrency(value), `Categoría: ${name}`]}
                                        />
                                        <Legend
                                            verticalAlign="bottom"
                                            align="center"
                                            iconType="circle"
                                            wrapperStyle={{ fontSize: '11px', paddingTop: '20px', color: '#94a3b8' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </section>

                        {/* User Distribution */}
                        <section className="bg-slate-900/40 rounded-2xl border border-slate-800 p-4 space-y-4">
                            <h3 className="text-sm font-semibold text-slate-300">Gasto por Persona</h3>
                            <div className="space-y-3">
                                {userDistribution.length === 0 ? (
                                    <p className="text-xs text-slate-500 italic">No hay gastos registrados en este periodo.</p>
                                ) : (
                                    userDistribution.map((user, idx) => (
                                        <div key={user.name} className="space-y-1">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-400 font-medium">{user.name}</span>
                                                <span className="font-bold">{formatCurrency(user.amount)}</span>
                                            </div>
                                            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                                                    style={{ width: `${(user.amount / userDistribution.reduce((a, b) => a + b.amount, 0)) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>
                    </div>

                </div>
            )}
        </main>
    );
}
