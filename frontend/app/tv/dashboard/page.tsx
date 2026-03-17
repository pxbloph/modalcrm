'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Maximize, Minimize } from 'lucide-react';
import api from '@/lib/api';

interface TeamSummary {
    key: 'fenix' | 'titas' | 'nao_mapeado';
    name: string;
    leadership: string;
    total_open_accounts: number;
    share_percent: number;
}

interface DashboardData {
    total_open_accounts: number;
    team_summary: TeamSummary[];
    updated_at: string;
}

export default function TvDashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [now, setNow] = useState(new Date());

    
    useEffect(() => {
        const raw = localStorage.getItem('user');
        if (!raw || raw === 'undefined') {
            window.location.href = '/login';
            return;
        }

        try {
            const parsed = JSON.parse(raw);
            if (!['ADMIN', 'SUPERVISOR', 'LEADER'].includes(parsed?.role)) {
                window.location.href = '/';
            }
        } catch {
            window.location.href = '/login';
        }
    }, []);

    const fetchData = async () => {
        try {
            const response = await api.get('/dashboards/tv/contas-abertas');
            setData(response.data);
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

    useEffect(() => {
        const tick = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(tick);
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

    const fenix = data?.team_summary.find((team) => team.key === 'fenix');
    const titas = data?.team_summary.find((team) => team.key === 'titas');
    const unmapped = data?.team_summary.find((team) => team.key === 'nao_mapeado');

    return (
        <div className="flex h-screen w-screen items-center justify-center overflow-hidden font-sans selection:bg-orange-500/30 bg-gray-50 text-zinc-900">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-gray-100 to-gray-200 opacity-80 z-0 pointer-events-none" />

            <div className="relative z-10 flex flex-col w-full aspect-video max-h-screen max-w-[177.78vh] p-8 shadow-2xl border border-white/40 backdrop-blur-sm bg-white/60 ring-1 ring-black/5">
                <header className="flex items-center justify-between mb-6 pb-4 shrink-0 border-b border-black/5">
                    <div className="flex flex-col">
                        <h1 className="text-5xl font-bold tracking-tight flex items-baseline gap-3">
                            <span className="text-glow-sweep">Analytics</span>
                            <span className="text-zinc-900">Performance Diária</span>
                        </h1>
                        <p className="mt-1 uppercase tracking-widest font-medium text-zinc-400" style={{ fontSize: 'clamp(0.7rem, 1.4vh, 1.25rem)' }}>
                            Visão Geral da Operação
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full border bg-white/80 border-gray-200 shadow-sm">
                            <div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse" />
                            <p className="text-3xl font-mono font-bold text-zinc-700">
                                {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
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

                <div className="grid grid-cols-12 gap-8 h-full min-h-0">
                    <div className="col-span-4 flex flex-col gap-6">
                        <div className="flex-1 rounded-xl flex flex-col justify-center items-center text-center relative overflow-hidden shadow-[0_0_50px_rgba(249,115,22,0.1)] backdrop-blur-md bg-white border border-orange-100 ring-4 ring-orange-50/50 px-10">
                            <div className="absolute inset-0 bg-gradient-to-b from-orange-50 to-transparent pointer-events-none opacity-50" />
                            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-orange-300 to-transparent" />

                            <p className="text-xl uppercase tracking-widest text-orange-600 font-black mb-8">
                                Total geral
                            </p>
                            <span className="text-[12rem] leading-none font-bold text-orange-500 tracking-tighter drop-shadow-sm">
                                {data?.total_open_accounts || 0}
                            </span>
                            <p className="text-zinc-400 mt-8 font-mono text-xl">Hoje</p>
                        </div>
                    </div>

                    <div className="col-span-8 flex flex-col h-full min-h-0">
                        <div className="flex-1 border border-black/5 rounded-xl backdrop-blur-sm flex flex-col overflow-hidden bg-white/40 shadow-sm relative">
                            <div className="px-8 py-6 border-b shrink-0 flex items-center justify-between border-black/5 bg-black/[0.02]">
                                <h2 className="text-3xl font-semibold flex items-center gap-4 text-zinc-800">
                                    <span className="text-4xl">📊</span> {'Produção por Equipe'}
                                </h2>
                                <span className="text-lg font-mono uppercase tracking-wider text-zinc-400">Contas abertas consolidadas</span>
                            </div>

                            <div className="flex-1 p-8 pb-40 flex flex-col gap-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-white p-8 shadow-sm">
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <p className="text-sm uppercase tracking-[0.3em] text-red-500 font-black">{fenix?.name || 'Equipe Fênix'}</p>
                                            </div>
                                        </div>
                                        <div className="mt-10 flex items-end justify-between">
                                            <span className="text-7xl font-black tracking-tight text-red-500">
                                                {fenix?.total_open_accounts || 0}
                                            </span>
                                            <span className="rounded-full bg-red-100 px-4 py-2 text-lg font-bold text-red-700">
                                                {fenix?.share_percent || 0}% do total
                                            </span>
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-8 shadow-sm">
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <p className="text-sm uppercase tracking-[0.3em] text-blue-600 font-black">{titas?.name || 'Equipe Titãs'}</p>
                                            </div>
                                        </div>
                                        <div className="mt-10 flex items-end justify-between">
                                            <span className="text-7xl font-black tracking-tight text-blue-700">
                                                {titas?.total_open_accounts || 0}
                                            </span>
                                            <span className="rounded-full bg-blue-100 px-4 py-2 text-lg font-bold text-blue-700">
                                                {titas?.share_percent || 0}% do total
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {Boolean(unmapped?.total_open_accounts) && (
                                    <div className="rounded-2xl border border-black/5 bg-white/80 p-6">
                                        <p className="text-sm uppercase tracking-[0.3em] text-zinc-400 font-black">{'Não mapeado'}</p>
                                        <div className="mt-6 text-6xl font-black tracking-tight text-zinc-800">
                                            {unmapped?.total_open_accounts || 0}
                                        </div>
                                        <p className="mt-3 text-lg text-zinc-500">
                                            Produção fora das equipes mapeadas.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="pointer-events-none absolute bottom-6 right-8">
                                <div className="relative h-64 w-[32rem]">
                                    <Image
                                        src="/img/flexcall.png"
                                        alt="Flexcall"
                                        fill
                                        className="object-contain object-right"
                                        priority
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


