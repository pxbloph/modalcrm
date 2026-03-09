'use client';

import { useEffect, useState } from 'react';
import { Maximize, Minimize } from 'lucide-react';

interface DashboardData {
    total_open_accounts: number;
    ranking: { user_id: string; user_name: string; count: number }[];
    updated_at: string;
}

export default function TvDashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const fetchData = async () => {
        try {
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
        const interval = setInterval(fetchData, 60000);
        return () => clearInterval(interval);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    if (loading && !data) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-white">
                <div className="text-2xl animate-pulse">Carregando Dashboard TV...</div>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-screen items-center justify-center overflow-hidden font-sans bg-gray-50 text-zinc-900">

            {/* Background */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-gray-100 to-gray-200 opacity-80 z-0 pointer-events-none" />

            {/* 16:9 Container responsivo */}
            <div className="relative z-10 flex flex-col w-full aspect-video max-h-screen max-w-[177.78vh] p-[2.5vh] shadow-2xl border border-white/40 backdrop-blur-sm bg-white/60 ring-1 ring-black/5">

                {/* Header */}
                <header className="flex items-center justify-between mb-[2vh] pb-[2vh] shrink-0 border-b border-black/5">
                    <div className="flex flex-col">
                        <h1 className="font-bold tracking-tight flex items-center gap-3 text-zinc-800" style={{ fontSize: 'clamp(1.5rem, 3.5vh, 4rem)' }}>
                            <span className="text-orange-500">Analytics</span> Performance Diária
                        </h1>
                        <p className="mt-1 uppercase tracking-widest font-medium text-zinc-400" style={{ fontSize: 'clamp(0.7rem, 1.4vh, 1.25rem)' }}>
                            Visão Geral da Operação
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="inline-flex items-center gap-2 px-[1.5vh] py-[0.8vh] rounded-full border bg-white/80 border-gray-200 shadow-sm">
                            <div className="w-[1.2vh] h-[1.2vh] rounded-full bg-orange-500 animate-pulse" />
                            <p className="font-mono font-bold text-zinc-700" style={{ fontSize: 'clamp(1rem, 2.2vh, 2rem)' }}>
                                {lastUpdated?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </p>
                        </div>
                        <button
                            onClick={toggleFullscreen}
                            className="p-[0.8vh] bg-white hover:bg-gray-50 border border-gray-200 text-zinc-600 hover:text-orange-500 rounded-full shadow-sm transition-transform hover:scale-105"
                            title="Alternar Tela Cheia"
                        >
                            {isFullscreen
                                ? <Minimize style={{ width: 'clamp(1rem, 2vh, 2rem)', height: 'clamp(1rem, 2vh, 2rem)' }} />
                                : <Maximize style={{ width: 'clamp(1rem, 2vh, 2rem)', height: 'clamp(1rem, 2vh, 2rem)' }} />}
                        </button>
                    </div>
                </header>

                {/* Contador Central */}
                <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden rounded-xl shadow-[0_0_80px_rgba(249,115,22,0.12)] bg-white border border-orange-100 ring-4 ring-orange-50/50">
                    <div className="absolute inset-0 bg-gradient-to-b from-orange-50 to-transparent pointer-events-none opacity-50" />
                    <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-orange-300 to-transparent" />

                    <p className="uppercase tracking-widest text-orange-600 font-black flex items-center gap-3 mb-[3vh]"
                        style={{ fontSize: 'clamp(1rem, 2.2vh, 2rem)' }}>
                        <span className="w-[1.4vh] h-[1.4vh] rounded-full bg-orange-500 inline-block" />
                        Contas Abertas Hoje
                    </p>

                    <span
                        className="font-bold text-orange-500 leading-none tracking-tighter drop-shadow-sm"
                        style={{ fontSize: 'clamp(6rem, 28vh, 30rem)' }}
                    >
                        {data?.total_open_accounts ?? 0}
                    </span>

                    <p className="text-zinc-400 font-mono mt-[3vh]" style={{ fontSize: 'clamp(0.875rem, 1.8vh, 1.5rem)' }}>
                        Atualizado às {lastUpdated?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) ?? '--:--'}
                    </p>
                </div>
            </div>
        </div>
    );
}
