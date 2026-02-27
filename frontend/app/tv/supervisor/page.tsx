'use client';

import { useEffect, useState } from 'react';
import { Maximize, Minimize } from 'lucide-react';

interface ClientItem {
    id: string;
    name: string;
    cnpj: string;
    phone: string;
    account_opening_date: string;
    created_by_name: string;
    responsible_name: string;
}

interface RankingItem {
    user_id: string;
    user_name: string;
    count: number;
    clients: ClientItem[];
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
    const [selectedUser, setSelectedUser] = useState<RankingItem | null>(null);

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
                                    <div
                                        key={user.user_id}
                                        className={`flex items-center justify-between p-4 ${index !== operatorsList.length - 1 ? 'border-b border-gray-100' : ''} hover:bg-white/50 transition-colors rounded-lg cursor-pointer hover:shadow-sm`}
                                        onClick={() => setSelectedUser(user)}
                                    >
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

            {/* Operator Details Modal */}
            {selectedUser && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-8"
                    onClick={() => setSelectedUser(null)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50 shrink-0">
                            <div>
                                <h3 className="text-3xl font-bold text-zinc-800 flex items-center gap-3">
                                    <span className="text-orange-500">Contas Abertas:</span> {selectedUser.user_name}
                                </h3>
                                <p className="text-zinc-500 mt-1 font-medium text-lg">Total de {selectedUser.count} contas hoje</p>
                            </div>
                            <button
                                onClick={() => setSelectedUser(null)}
                                className="p-3 bg-white hover:bg-red-50 hover:text-red-500 border border-gray-200 text-gray-500 rounded-full shadow-sm transition-colors"
                            >
                                <span className="sr-only">Fechar</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                            </button>
                        </div>

                        {/* Modal Body Base */}
                        <div className="flex-1 overflow-y-auto p-0 min-h-0 bg-white">
                            {selectedUser.clients && selectedUser.clients.length > 0 ? (
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 bg-white shadow-sm z-10">
                                        <tr className="bg-gray-100 border-b border-gray-200 text-zinc-600 font-bold uppercase tracking-wider text-sm">
                                            <th className="p-5 border-r border-gray-200">Razão Social / Nome</th>
                                            <th className="p-5 border-r border-gray-200 w-40 text-center">CNPJ</th>
                                            <th className="p-5 border-r border-gray-200 w-36 text-center">Telefone</th>
                                            <th className="p-5 border-r border-gray-200 w-48 text-center">Criado por</th>
                                            <th className="p-5 border-r border-gray-200 w-48 text-center">Responsável</th>
                                            <th className="p-5 w-44 text-center">Data Abertura</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {selectedUser.clients.map((client) => {
                                            const openDate = new Date(client.account_opening_date);
                                            return (
                                                <tr key={client.id} className="hover:bg-orange-50/40 transition-colors group">
                                                    <td className="p-5 border-r border-gray-100 text-zinc-800 font-semibold text-lg">{client.name}</td>
                                                    <td className="p-5 border-r border-gray-100 text-zinc-600 font-mono text-sm text-center group-hover:text-zinc-900">{client.cnpj}</td>
                                                    <td className="p-5 border-r border-gray-100 text-zinc-600 font-medium text-sm text-center">{client.phone}</td>
                                                    <td className="p-5 border-r border-gray-100 text-zinc-600 font-medium text-sm text-center truncate">{client.created_by_name}</td>
                                                    <td className="p-5 border-r border-gray-100 text-zinc-600 font-medium text-sm text-center truncate">{client.responsible_name}</td>
                                                    <td className="p-5 text-zinc-500 text-center font-mono text-sm">
                                                        {openDate.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="flex flex-col items-center justify-center p-20 text-zinc-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 mb-4 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></svg>
                                    <p className="text-2xl font-medium">Nenhum detalhe disponível para as contas de {selectedUser.user_name}.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
