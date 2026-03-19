'use client';

import { useEffect, useState } from 'react';
import { Maximize, Minimize, Search, X } from 'lucide-react';
import api from '@/lib/api';

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
    team: string | null;
    count: number;
    clients: ClientItem[];
}

const TEAM_BADGE: Record<string, string> = {
    fenix: '🐦‍🔥 Fênix',
    titas: '⚔️ Titãs',
};

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
    const [nameFilter, setNameFilter] = useState('');
    const [teamFilter, setTeamFilter] = useState('');
    const [now, setNow] = useState(new Date());
    const [allTeams, setAllTeams] = useState(false);
    const [userRole, setUserRole] = useState<string>('');

    useEffect(() => {
        const raw = localStorage.getItem('user');
        if (!raw || raw === 'undefined') {
            window.location.href = '/login';
            return;
        }

        try {
            const parsed = JSON.parse(raw);
            if (!['ADMIN', 'SUPERVISOR'].includes(parsed?.role)) {
                window.location.href = '/';
                return;
            }
            setUserRole(parsed.role);
        } catch {
            window.location.href = '/login';
        }
    }, []);

    const fetchData = async () => {
        try {
            const params = allTeams ? '?allTeams=true' : '';
            const { data: jsonData } = await api.get(`/dashboards/tv/contas-abertas${params}`);
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
    }, [allTeams]);

    useEffect(() => {
        const tick = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(tick);
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

    const operatorsList = (data?.ranking || []).filter((user) => {
        const matchesName = nameFilter === '' || user.user_name.toLowerCase().includes(nameFilter.toLowerCase());
        const matchesTeam = teamFilter === '' || user.team === teamFilter;
        return matchesName && matchesTeam;
    });

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
                                {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
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

                {/* Filters */}
                <div className="flex items-center gap-3 mb-4 shrink-0 flex-wrap">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Filtrar por nome..."
                            value={nameFilter}
                            onChange={(e) => setNameFilter(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 text-sm rounded-xl border border-gray-200 bg-white/80 text-zinc-800 placeholder-zinc-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                        />
                        {nameFilter && (
                            <button onClick={() => setNameFilter('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => setTeamFilter('')}
                            className={`px-4 py-2 text-sm font-semibold rounded-xl border shadow-sm transition-colors ${teamFilter === '' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white/80 text-zinc-600 border-gray-200 hover:bg-gray-50'}`}
                        >
                            Todos
                        </button>
                        {Object.entries(TEAM_BADGE).map(([key, label]) => (
                            <button
                                key={key}
                                onClick={() => setTeamFilter(teamFilter === key ? '' : key)}
                                className={`px-4 py-2 text-sm font-semibold rounded-xl border shadow-sm transition-colors whitespace-nowrap ${teamFilter === key ? 'bg-orange-500 text-white border-orange-500' : 'bg-white/80 text-zinc-600 border-gray-200 hover:bg-gray-50'}`}
                            >
                                {label}
                            </button>
                        ))}
                        {userRole === 'SUPERVISOR' && (
                            <button
                                onClick={() => { setAllTeams(prev => !prev); setTeamFilter(''); }}
                                className={`px-4 py-2 text-sm font-semibold rounded-xl border shadow-sm transition-colors whitespace-nowrap ${allTeams ? 'bg-zinc-800 text-white border-zinc-800' : 'bg-white/80 text-zinc-600 border-gray-200 hover:bg-gray-50'}`}
                                title={allTeams ? 'Mostrando todos os times — clique para ver apenas o seu time' : 'Ver todos os times'}
                            >
                                {allTeams ? '🌐 Todos os Times' : '👥 Meu Time'}
                            </button>
                        )}
                    </div>
                </div>

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
                                        <div className="flex items-center gap-3">
                                            <span className="text-zinc-800 font-semibold text-xl truncate" title={user.user_name}>
                                                {user.user_name}
                                            </span>
                                            {user.team && TEAM_BADGE[user.team] && (
                                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200 whitespace-nowrap">
                                                    {TEAM_BADGE[user.team]}
                                                </span>
                                            )}
                                        </div>
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
                                    <p className="text-2xl font-medium">
                                        {nameFilter || teamFilter ? 'Nenhum operador encontrado para os filtros aplicados.' : 'Nenhuma conta aberta hoje ainda.'}
                                    </p>
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


