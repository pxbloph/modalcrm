'use client';

import { useState, useEffect } from 'react';
import { X, FolderOpen } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { WalletMetrics } from '@/components/clients/WalletMetrics';
import ClientListTable from '@/components/clients/ClientListTable';
import { ClientFilters } from '@/components/clients/ClientFilters';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';

import { ClientDealModal } from '@/components/crm/ClientDealModal';

interface WalletModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: any;
}

export default function WalletModal({ isOpen, onClose, currentUser }: WalletModalProps) {
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [clients, setClients] = useState<any[]>([]);
    const [metrics, setMetrics] = useState<any>(null);

    // Selected Client for Details Modal
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [limit, setLimit] = useState(50);

    const [allClients, setAllClients] = useState<any[]>([]); // Store full list for client-side pagination

    // Initial Load & Refetch on params change
    useEffect(() => {
        if (isOpen && currentUser) {
            fetchData();
        }
    }, [isOpen, currentUser, searchParams]); // Remove currentPage/limit from fetch dependency to avoid re-fetching full list

    // Client-side Pagination Effect
    useEffect(() => {
        if (allClients.length > 0) {
            const startIndex = (currentPage - 1) * limit;
            const endIndex = startIndex + limit;
            setClients(allClients.slice(startIndex, endIndex));

            // Recalculate total pages dynamically
            setTotalPages(Math.ceil(allClients.length / limit));
        }
    }, [currentPage, limit, allClients]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Build Query Params from URL Search Params
            const params = new URLSearchParams(searchParams.toString());
            // Remove pagination params from API call since we are fetching ALL
            params.delete('page');
            params.delete('limit');

            const [listRes, metricsRes] = await Promise.all([
                api.get(`/clients?${params.toString()}`),
                api.get('/clients/dashboard-metrics')
            ]);

            if (listRes.data && listRes.data.data) {
                // Server-side pagination supported
                setAllClients([]); // Clear client-side cache
                setClients(listRes.data.data);
                setTotalPages(listRes.data.meta.totalPages);
                setTotalRecords(listRes.data.meta.total || 0);
            } else if (Array.isArray(listRes.data)) {
                // Client-side pagination fallback
                const fullList = listRes.data;
                setAllClients(fullList);
                setTotalRecords(fullList.length);
                setTotalPages(Math.ceil(fullList.length / limit));

                // Initial slice
                const startIndex = (currentPage - 1) * limit;
                const endIndex = startIndex + limit;
                setClients(fullList.slice(startIndex, endIndex));
            } else {
                setClients([]);
                setAllClients([]);
            }

            if (metricsRes.data) {
                setMetrics(metricsRes.data);
            }

        } catch (error) {
            console.error("Erro ao carregar carteira:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = () => {
        setCurrentPage(1);
        // fetchData is triggered by searchParams change in useEffect
    };

    const handleClientClick = (clientId: string) => {
        setSelectedClientId(clientId);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-200">
            <div className="bg-background rounded-xl shadow-2xl w-full max-w-[95vw] h-full max-h-[90vh] flex flex-col overflow-hidden relative border border-border">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-muted/30 border-b border-border shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="bg-primary/10 p-2 rounded-full">
                            <FolderOpen className="h-5 w-5 text-primary" />
                        </div>
                        <h2 className="text-xl font-bold text-foreground">Minha Carteira</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-card/50">

                    {/* Metrics Section */}
                    <WalletMetrics metrics={metrics} loading={loading} />

                    {/* Filters & Table Section */}
                    <div className="space-y-4">
                        <ClientFilters
                            userRole={currentUser?.role}
                            onFilterChange={handleFilterChange}
                        />

                        <div className="border border-border rounded-lg bg-card overflow-hidden">
                            <ClientListTable
                                clients={clients}
                                loading={loading}
                                onClientClick={handleClientClick}
                                onRefresh={fetchData}
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                                limit={limit}
                                onLimitChange={setLimit}
                                totalRecords={totalRecords}
                                userRole={currentUser?.role}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal de Detalhes do Cliente */}
            {selectedClientId && (
                <ClientDealModal
                    initialClientId={selectedClientId}
                    onClose={() => setSelectedClientId(null)}
                    onUpdate={fetchData}
                />
            )}
        </div>
    );
}
