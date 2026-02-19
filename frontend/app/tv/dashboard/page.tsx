'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Maximize, Minimize } from 'lucide-react';

interface RankingItem {
    user_id: string;
    user_name: string;
    count: number;
}

interface DashboardData {
    total_open_accounts: number;
    ranking: RankingItem[];
    updated_at: string;
}

export default function TvDashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const fetchData = async () => {
        try {
            // Using relative path assuming API proxy is set up or full URL if needed.
            // Assuming frontend proxy or standard NEXT_PUBLIC_API_URL usage. 
            // For now, hardcoding localhost if ENV not available or using relative /api proxy.
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3500'}/dashboards/tv/contas-abertas`);
            if (!response.ok) throw new Error('Failed to fetch data');
            const jsonData = await response.json();
            setData(jsonData);
            setLastUpdated(new Date());
        } catch (error) {
            console.error('Error fetching TV dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000); // Refresh every 60s
        return () => clearInterval(interval);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullscreen(false);
            }
        }
    };

    if (loading && !data) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-white">
                <div className="text-2xl animate-pulse">Carregando Dashboard TV...</div>
            </div>
        );
    }

    const top10 = data?.ranking.slice(0, 10) || [];
    const others = data?.ranking.slice(10) || [];

    return (
        <div className="flex h-screen w-screen items-center justify-center overflow-hidden font-sans selection:bg-orange-500/30 bg-gray-50 text-zinc-900">
            {/* Inject Custom CSS for Marquee */}
            <style jsx global>{`
                @keyframes marquee {
                    0% { transform: translateX(100%); }
                    100% { transform: translateX(-100%); }
                }
                .animate-marquee {
                    animation: marquee 30s linear infinite;
                }
                .animate-marquee:hover {
                    animation-play-state: paused;
                }
            `}</style>

            {/* Background Gradient Mesh (Light Mode) */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-gray-100 to-gray-200 opacity-80 z-0 pointer-events-none" />

            {/* 16:9 Container - Enhanced for TV visibility */}
            <div className="relative z-10 flex flex-col w-full aspect-video max-h-screen max-w-[177.78vh] p-8 shadow-2xl border border-white/40 backdrop-blur-sm bg-white/60 ring-1 ring-black/5">

                {/* Header */}
                <header className="flex items-center justify-between mb-6 pb-4 shrink-0 border-b border-black/5">
                    <div className="flex flex-col">
                        <h1 className="text-5xl font-bold tracking-tight flex items-center gap-3 text-zinc-800">
                            <span className="text-orange-500">Analytics</span> Performance Diária
                        </h1>
                        <p className="text-lg mt-1 uppercase tracking-widest font-medium text-zinc-400">Visão Geral da Operação</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full border bg-white/80 border-gray-200 shadow-sm">
                            <div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse" />
                            <p className="text-3xl font-mono font-bold text-zinc-700">
                                {lastUpdated?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                        <button
                            onClick={toggleFullscreen}
                            className="p-3 bg-white hover:bg-gray-50 border border-gray-200 text-zinc-600 hover:text-orange-500 rounded-full shadow-sm transition-transform hover:scale-105"
                            title="Alternar Tela Cheia"
                        >
                            {isFullscreen ? <Minimize className="h-6 w-6" /> : <Maximize className="h-6 w-6" />}
                        </button>
                    </div>
                </header>

                {/* Main Content Grid */}
                <div className="grid grid-cols-12 gap-8 h-full min-h-0">

                    {/* Left Column: Big Counter */}
                    <div className="col-span-4 flex flex-col gap-6">
                        <div className="flex-1 rounded-xl flex flex-col justify-center items-center relative overflow-hidden shadow-[0_0_50px_rgba(249,115,22,0.1)] backdrop-blur-md bg-white border border-orange-100 ring-4 ring-orange-50/50">
                            <div className="absolute inset-0 bg-gradient-to-b from-orange-50 to-transparent pointer-events-none opacity-50" />
                            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-orange-300 to-transparent" />

                            <p className="text-xl uppercase tracking-widest text-orange-600 font-black mb-8 flex items-center gap-3">
                                <span className="w-4 h-4 rounded-full bg-orange-500" /> Contas Abertas
                            </p>
                            <span className="text-[12rem] leading-none font-bold text-orange-500 tracking-tighter drop-shadow-sm">
                                {data?.total_open_accounts || 0}
                            </span>
                            <p className="text-zinc-400 mt-8 font-mono text-xl">Hoje</p>
                        </div>
                    </div>

                    {/* Right Column: Ranking List + Marquee */}
                    <div className="col-span-8 flex flex-col h-full min-h-0">
                        <div className="flex-1 border border-black/5 rounded-xl backdrop-blur-sm flex flex-col overflow-hidden bg-white/40 shadow-sm relative">
                            {/* Ranking Header */}
                            <div className="px-8 py-6 border-b shrink-0 flex items-center justify-between border-black/5 bg-black/[0.02]">
                                <h2 className="text-3xl font-semibold flex items-center gap-4 text-zinc-800">
                                    <span className="text-4xl">🏆</span> Ranking de Abertura
                                </h2>
                                <span className="text-lg font-mono uppercase tracking-wider text-zinc-400">Top 10 Performers</span>
                            </div>

                            {/* Ranking List (Single Column) - UPSCALED FONTS */}
                            <div className="flex-1 p-0 overflow-y-auto min-h-0 relative scrollbar-hide">
                                <div className="p-6 space-y-4">
                                    {top10.map((user, index) => (
                                        <div key={user.user_id} className={`
                                            relative flex items-center py-5 px-8 rounded-xl transition-all duration-300 group shadow-sm
                                            ${index === 0
                                                ? 'bg-gradient-to-r from-orange-50 to-white border border-orange-200 scale-[1.02] z-10'
                                                : 'bg-white border border-gray-100 hover:bg-gray-50'}
                                        `}>
                                            {/* Decorative bar for 1st place */}
                                            {index === 0 && <div className="absolute left-0 inset-y-0 w-2.5 bg-orange-500 rounded-l-xl" />}

                                            <div className="grid grid-cols-12 gap-6 w-full items-center z-10">
                                                <div className="col-span-1 flex justify-center">
                                                    <span className={`
                                                    w-12 h-12 flex items-center justify-center rounded-xl font-black text-2xl shadow-sm
                                                    ${index === 0 ? 'bg-orange-500 text-white shadow-orange-200' :
                                                            index === 1 ? 'bg-gray-200 text-gray-700' :
                                                                index === 2 ? 'bg-[#CD7F32] text-white' :
                                                                    'bg-gray-100 text-gray-500 border border-gray-200'}
                                                    `}>
                                                        {index + 1}
                                                    </span>
                                                </div>
                                                <div className={`col-span-9 font-medium truncate flex items-center gap-4
                                                    ${index === 0
                                                        ? 'text-orange-900 text-4xl font-bold tracking-tight'
                                                        : 'text-zinc-700 text-3xl'}
                                                `}>
                                                    {user.user_name}
                                                    {index === 0 && <span className="text-orange-500 text-3xl">👑</span>}
                                                </div>
                                                <div className={`col-span-2 text-right font-mono font-bold
                                                    ${index === 0
                                                        ? 'text-orange-500 text-4xl'
                                                        : 'text-zinc-400 text-3xl'}
                                                `}>
                                                    {user.count}
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {top10.length === 0 && (
                                        <div className="flex h-40 flex-col items-center justify-center text-zinc-400 italic text-2xl">
                                            Sem dados de performance para hoje.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Marquee Footer (Others) */}
                            {others.length > 0 && (
                                <div className="shrink-0 h-16 bg-white border-t border-gray-200 overflow-hidden flex items-center relative">
                                    <div className="absolute left-0 bg-gradient-to-r from-white to-transparent w-12 h-full z-10" />
                                    <div className="absolute right-0 bg-gradient-to-l from-white to-transparent w-12 h-full z-10" />

                                    <div className="whitespace-nowrap animate-marquee flex items-center gap-12 pl-full">
                                        {others.map((user, idx) => (
                                            <div key={user.user_id} className="inline-flex items-center gap-3 text-zinc-600 font-medium">
                                                <span className="text-lg font-mono text-zinc-400">#{11 + idx}</span>
                                                <span className="uppercase tracking-tight text-xl">{user.user_name}</span>
                                                <span className="text-orange-500 font-bold bg-orange-50 px-2 py-0.5 rounded ml-1 text-xl">{user.count}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
