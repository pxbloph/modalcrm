'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Loader2, Users, CheckCircle, Clock, FolderOpen, X, LogOut } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import ClientModal from '@/components/clients/ClientModal';
import DealModal from '@/components/kanban/DealModal';
import { ClientFilters } from '@/components/clients/ClientFilters';
import ClientRegistrationForm from '@/components/clients/ClientRegistrationForm';
import ClientListTable from '@/components/clients/ClientListTable';
import { WalletMetrics } from '@/components/clients/WalletMetrics';
import AppointmentNotification from '@/components/AppointmentNotification';
import { useSearchParams, useRouter } from 'next/navigation';
import ChatWidget from '@/components/chat/ChatWidget';




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

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [limit, setLimit] = useState(50);

    // Load limit preference on mount
    useEffect(() => {
        const savedLimit = localStorage.getItem('client-table-limit');
        if (savedLimit) {
            setLimit(Number(savedLimit));
        }
    }, []);

    const handleLimitChange = (newLimit: number) => {
        setLimit(newLimit);
        localStorage.setItem('client-table-limit', newLimit.toString());
        setCurrentPage(1); // Reset to first page on limit change
    };

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
    }, [user, searchParams, currentPage, limit]); // Re-fetch on page/limit change

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams(searchParams.toString());
            params.set('page', currentPage.toString());
            params.set('limit', limit.toString());

            const promises = [api.get(`/clients?${params.toString()}`)];

            // Fetch metrics for ALL roles. Backend handles RBAC via token.
            promises.push(api.get('/clients/dashboard-metrics'));

            const results = await Promise.all(promises);

            // Handle Paginated Response
            if (results[0].data && results[0].data.data) {
                setClients(results[0].data.data);
                setTotalPages(results[0].data.meta.totalPages);
            } else {
                // Fallback if backend rollout isn't complete (shouldn't happen if sync)
                setClients(Array.isArray(results[0].data) ? results[0].data : []);
            }

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

                {/* Floating Action Buttons Container */}
                <div className="fixed bottom-8 right-8 flex flex-col gap-4 z-40 items-end">
                    {/* Chat Button (Above Wallet) */}
                    {/* Chat Widget (Above Wallet) replaces simple button */}
                    <ChatWidget
                        currentUser={user}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-105 flex items-center justify-center relative"
                    />


                    {/* FAB - Carteira */}
                    <button
                        onClick={() => setWalletOpen(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-105 flex items-center justify-center"
                        title="Minha Carteira"
                    >
                        <FolderOpen className="h-6 w-6" />
                    </button>
                </div>

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
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    onPageChange={setCurrentPage}
                                    limit={limit}
                                    onLimitChange={handleLimitChange}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Mantemos o Client Modal para ver detalhes/editar quando clicar na tabela */}
                {modalOpen && (
                    <DealModal
                        dealId={null}
                        initialClientId={selectedClientId}
                        initialData={selectedClientId ? { client: clients.find(c => c.id === selectedClientId), title: clients.find(c => c.id === selectedClientId)?.name } : undefined}
                        pipelineId=""
                        onClose={() => setModalOpen(false)}
                        onUpdate={handleModalSuccess}
                    />
                )}
            </div>
        );
    }

    // --- VIEW PADRÃO (Admin / Supervisor) ---
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-end">
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
                    <div className="bg-indigo-50 overflow-hidden rounded-xl p-5 border border-indigo-100 dark:bg-indigo-950/30 dark:border-indigo-900">
                        <div className="flex items-center gap-2 mb-2">
                            <Users className="h-5 w-5 text-indigo-600" />
                            <dt className="text-sm font-semibold text-indigo-900 truncate dark:text-indigo-300">Leads</dt>
                        </div>
                        <dd className="text-3xl font-bold text-indigo-700 dark:text-indigo-400">{metrics.leads}</dd>
                    </div>

                    {/* Conversão - Green */}
                    <div className="bg-green-50 overflow-hidden rounded-xl p-5 border border-green-100 dark:bg-green-950/30 dark:border-green-900">
                        <div className="flex items-center gap-2 mb-2">
                            <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <dt className="text-sm font-semibold text-green-900 truncate dark:text-green-300">Conversão</dt>
                        </div>
                        <dd className="text-3xl font-bold text-green-700 dark:text-green-400">
                            {metrics.leads > 0 ? ((metrics.accounts / metrics.leads) * 100).toFixed(0) : '0'}%
                        </dd>
                    </div>

                    {/* Contas - Blue */}
                    <div className="bg-blue-50 overflow-hidden rounded-xl p-5 border border-blue-100 dark:bg-blue-950/30 dark:border-blue-900">
                        <div className="flex items-center gap-2 mb-2">
                            <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                            <dt className="text-sm font-semibold text-blue-900 truncate dark:text-blue-300">Contas</dt>
                        </div>
                        <dd className="text-3xl font-bold text-blue-700 dark:text-blue-400">{metrics.accounts}</dd>
                    </div>

                    {/* Pendentes - Orange/Amber */}
                    <div className="bg-amber-50 overflow-hidden rounded-xl p-5 border border-amber-100 dark:bg-amber-950/30 dark:border-amber-900">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock className="h-5 w-5 text-amber-600" />
                            <dt className="text-sm font-semibold text-amber-900 truncate dark:text-amber-300">Pendentes</dt>
                        </div>
                        <dd className="text-3xl font-bold text-amber-700 dark:text-amber-400">
                            {metrics.pending}
                        </dd>
                    </div>
                </div>
            )}

            {/* Supervisor/Admin Chat Section */}

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
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                limit={limit}
                onLimitChange={handleLimitChange}
            />

            {/* Replaced ClientModal with DealModal for unified UI */}
            {modalOpen && (
                <DealModal
                    dealId={null}
                    initialClientId={selectedClientId}
                    initialData={selectedClientId ? { client: clients.find(c => c.id === selectedClientId), title: clients.find(c => c.id === selectedClientId)?.name } : undefined}
                    pipelineId="" // Modal will try to find deal. If creation needed, it might need updating to select pipeline.
                    onClose={() => setModalOpen(false)}
                    onUpdate={handleModalSuccess}
                />
            )}

        </div>
    );
}
