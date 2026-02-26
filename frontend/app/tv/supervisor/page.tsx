'use client';

import { useEffect, useState } from 'react';
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

export default function SupervisorDashboardPage() {
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
            console.error('Error fetching supervisor dashboard data:', error);
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
                <div className="text-2xl animate-pulse">Carregando Painel do Supervisor...</div>
            </div>
        );
    }

    const operatorsList = data?.ranking || [];

    return (
        <div className="flex h-screen w-screen bg-gray-50 text-zinc-900 p-8 flex-col font-sans selection:bg-orange-500/30 overflow-hidden">
            {/* Background Gradient Mesh (Light Mode) */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-gray-100 to-gray-200 opacity-80 z-0 pointer-events-none" />

            <div className="relative z-10 flex flex-col h-full max-w-6xl mx-auto w-full">
                {/* Header */}
                <header className="flex items-center justify-between mb-8 pb-4 shrink-0 border-b border-black/5">
                    <div className="flex flex-col">
                        <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3 text-zinc-800">
                            <span className="text-orange-500">Painel do</span> Supervisor
                        </h1>
                        <p className="text-lg mt-1 uppercase tracking-widest font-medium text-zinc-400">Produção Diária de Contas Abertas</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full border bg-white/80 border-gray-200 shadow-sm">
                            <span className="text-zinc-500 uppercase text-sm font-semibold tracking-wider">Total Hoje:</span>
                            <span className="text-3xl font-black text-orange-500">{data?.total_open_accounts || 0}</span>
                        </div>
                        <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full border bg-white/80 border-gray-200 shadow-sm">
                            <div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse" />
                            <p className="text-xl font-mono font-bold text-zinc-700">
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

                {/* Main Content List */}
                <div className="flex-1 overflow-hidden flex flex-col bg-white/60 backdrop-blur-md rounded-2xl shadow-xl border border-white/40 ring-1 ring-black/5">
                    <div className="overflow-y-auto flex-1 p-8 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-400">
                        <div className="flex flex-col">
                            {operatorsList.length > 0 ? (
                                operatorsList.map((user, index) => (
                                    <div key={user.user_id} className={`flex items-center justify-between p-4 ${index !== operatorsList.length - 1 ? 'border-b border-gray-100' : ''} hover:bg-white/50 transition-colors rounded-lg`}>
                                        <span className="text-zinc-800 font-semibold text-xl truncate" title={user.user_name}>
                                            {user.user_name}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-3xl font-black text-orange-500 leading-none">{user.count}</span>
                                            <span className="text-zinc-500 font-medium text-lg leading-tight">
                                                {user.count === 1 ? 'conta' : 'contas'}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center h-48 text-zinc-400">
                                    <p className="text-2xl font-medium">Nenhuma conta aberta hoje ainda.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
