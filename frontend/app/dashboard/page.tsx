'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Loader2, Users, CheckCircle, Clock, FolderOpen, X, LogOut } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import ClientModal from '@/components/clients/ClientModal';
import { ClientFilters } from '@/components/clients/ClientFilters';
import ClientRegistrationForm from '@/components/clients/ClientRegistrationForm';
import ClientListTable from '@/components/clients/ClientListTable';
import { WalletMetrics } from '@/components/clients/WalletMetrics';
import AppointmentNotification from '@/components/AppointmentNotification';
import { useSearchParams, useRouter } from 'next/navigation';

interface Client {
    id: string;
    name: string;
    email: string;
    phone: string;
    is_qualified: boolean;
    has_open_account: boolean;
    integration_status: string;
    created_at: string;
    created_by?: {
        name: string;
        email: string;
    };
}

interface DashboardMetrics {
    leads: number;
    accounts: number;
    pending: number;
    conversionRate: number;
}

export default function DashboardPage() {
    const [user, setUser] = useState<any>(null);
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);

    // Admin Metrics
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);

    // Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedClientId, setSelectedClientId] = useState<string | undefined>(undefined);

    // Operator Wallet State
    const [walletOpen, setWalletOpen] = useState(false);

    const searchParams = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser && storedUser !== 'undefined') {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Failed to parse user", e);
            }
        }
    }, []);

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user, searchParams]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams(searchParams.toString());

            const isOperator = user?.role === 'OPERATOR';

            // If Operator, maybe we only need clients? 
            // Reuse same endpoints. Backend handles RBAC scoping.

            const promises = [api.get(`/clients?${params.toString()}`)];

            // Fetch metrics for ALL roles. Backend handles RBAC via token.
            promises.push(api.get('/clients/dashboard-metrics'));

            const results = await Promise.all(promises);
            setClients(results[0].data);

            if (results[1]) {
                setMetrics(results[1].data);
            }

        } catch (error) {
            console.error('Erro ao buscar dados', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClientClick = (clientId: string) => {
        setSelectedClientId(clientId);
        setModalOpen(true);
    };

    const handleModalSuccess = () => {
        fetchData(); // Refresh list/metrics
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
    };

    if (!user) return <div className="p-12 text-center text-gray-500">Carregando...</div>;

    const isAdmin = user.role === 'ADMIN';
    const isOperator = user.role === 'OPERATOR';

    // --- VIEW DO OPERADOR ---
    if (isOperator) {
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center relative">
                <AppointmentNotification onViewClient={handleClientClick} />
                {/* Logout Button */}
                <button
                    onClick={handleLogout}
                    className="absolute top-0 right-0 m-4 p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors flex items-center gap-2"
                    title="Sair do Sistema"
                >
                    <span className="text-sm font-medium">Sair</span>
                    <LogOut className="h-5 w-5" />
                </button>

                <div className="w-full max-w-2xl">
                    <ClientRegistrationForm
                        onSuccess={(clientId) => router.push(`/dashboard/clients/${clientId}/qualify`)}
                    />
                </div>

                {/* FAB - Carteira */}
                <button
                    onClick={() => setWalletOpen(true)}
                    className="fixed bottom-8 right-8 bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-105 flex items-center justify-center z-40"
                    title="Minha Carteira"
                >
                    <FolderOpen className="h-6 w-6" />
                </button>

                {/* Modal da Carteira (Full Screen ou Large) */}
                {walletOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-6">
                        <div className="bg-gray-50 rounded-xl shadow-2xl w-full max-w-[95vw] h-full max-h-[90vh] flex flex-col overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
                            {/* Header do Modal */}
                            <div className="flex items-center justify-between px-6 py-4 bg-white border-b shrink-0">
                                <div className="flex items-center gap-2">
                                    <FolderOpen className="h-5 w-5 text-indigo-600" />
                                    <h2 className="text-lg font-semibold text-gray-900">Minha Carteira</h2>
                                </div>
                                <button
                                    onClick={() => setWalletOpen(false)}
                                    className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            {/* Conteúdo da Carteira (Filtros + Tabela) */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                <WalletMetrics metrics={metrics} loading={loading} />
                                <ClientFilters
                                    userRole={user.role}
                                    onFilterChange={() => { }}
                                />
                                <ClientListTable
                                    clients={clients}
                                    loading={loading}
                                    onClientClick={handleClientClick}
                                    onRefresh={fetchData}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Mantemos o Client Modal para ver detalhes/editar quando clicar na tabela */}
                <ClientModal
                    isOpen={modalOpen}
                    onClose={() => setModalOpen(false)}
                    onSuccess={handleModalSuccess}
                    clientId={selectedClientId}
                    userRole={user.role}
                    canEdit={true}
                    canDelete={false}
                />
            </div>
        );
    }

    // --- VIEW PADRÃO (Admin / Supervisor) ---
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Dashboard
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Visão geral e gestão de clientes.
                    </p>
                </div>
                {!isAdmin && (
                    <Link href="/dashboard/new-client" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-500 text-sm font-semibold flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Novo Cliente
                    </Link>
                )}
            </div>

            {/* Metrics Cards - Visible for ALL roles, data filtered by backend */}
            {metrics && (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Leads - Indigo/Purple */}
                    <div className="bg-indigo-50 overflow-hidden rounded-xl p-5 border border-indigo-100">
                        <div className="flex items-center gap-2 mb-2">
                            <Users className="h-5 w-5 text-indigo-600" />
                            <dt className="text-sm font-semibold text-indigo-900 truncate">Leads</dt>
                        </div>
                        <dd className="text-3xl font-bold text-indigo-700">{metrics.leads}</dd>
                    </div>

                    {/* Conversão - Green */}
                    <div className="bg-green-50 overflow-hidden rounded-xl p-5 border border-green-100">
                        <div className="flex items-center gap-2 mb-2">
                            <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <dt className="text-sm font-semibold text-green-900 truncate">Conversão</dt>
                        </div>
                        <dd className="text-3xl font-bold text-green-700">
                            {metrics.leads > 0 ? ((metrics.accounts / metrics.leads) * 100).toFixed(0) : '0'}%
                        </dd>
                    </div>

                    {/* Contas - Blue */}
                    <div className="bg-blue-50 overflow-hidden rounded-xl p-5 border border-blue-100">
                        <div className="flex items-center gap-2 mb-2">
                            <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                            <dt className="text-sm font-semibold text-blue-900 truncate">Contas</dt>
                        </div>
                        <dd className="text-3xl font-bold text-blue-700">{metrics.accounts}</dd>
                    </div>

                    {/* Pendentes - Orange/Amber */}
                    <div className="bg-amber-50 overflow-hidden rounded-xl p-5 border border-amber-100">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock className="h-5 w-5 text-amber-600" />
                            <dt className="text-sm font-semibold text-amber-900 truncate">Pendentes</dt>
                        </div>
                        <dd className="text-3xl font-bold text-amber-700">
                            {metrics.pending}
                        </dd>
                    </div>
                </div>
            )}

            {/* Configurable Filters Component */}
            <ClientFilters
                userRole={user.role}
                onFilterChange={() => { }}
            />

            {/* Table */}
            <ClientListTable
                clients={clients}
                loading={loading}
                onClientClick={handleClientClick}
                onRefresh={fetchData}
            />

            <ClientModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSuccess={handleModalSuccess}
                clientId={selectedClientId}
                userRole={user.role}
                canEdit={true}
                canDelete={isAdmin}
            />
        </div>
    );
}
