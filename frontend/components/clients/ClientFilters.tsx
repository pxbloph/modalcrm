import React, { useState, useEffect } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';

interface ClientFiltersProps {
    userRole: string;
    onFilterChange: () => void; // Trigger parent fetch
}

export function ClientFilters({ userRole, onFilterChange }: ClientFiltersProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // State initialized from URL params
    // State initialized from URL params
    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [status, setStatus] = useState(searchParams.get('status') || '');
    const [startDate, setStartDate] = useState(searchParams.get('startDate') || '');
    const [endDate, setEndDate] = useState(searchParams.get('endDate') || '');
    const [responsibleId, setResponsibleId] = useState(searchParams.get('responsibleId') || '');

    const [users, setUsers] = useState<{ id: string, name: string }[]>([]);
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        // Fetch users for responsible filter if allowed
        if (userRole === 'ADMIN' || userRole === 'SUPERVISOR') {
            api.get('/users').then(res => {
                // If Supervisor, backend likely returns only team members anyway if calling /users logic is correct OR 
                // we might need a specific endpoint. Assuming /users is accessible or we filter.
                // For simplified scope, let's assume /users returns visible users.
                setUsers(res.data);
            }).catch(err => console.error("Failed to fetch users", err));
        }
    }, [userRole]);

    const applyFilters = () => {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (status) params.set('status', status);
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
        if (responsibleId) params.set('responsibleId', responsibleId);

        router.push(`?${params.toString()}`);
        // Notify parent to refetch? 
        // Actually, if we update URL, parent can watch searchParams OR we call onFilterChange. 
        // Usually Next.js router.push triggers re-render if parent uses searchParams.
        // Let's assume parent listens to searchParams OR we trigger callback. 
        // Requirement says "Alterar filtros não muda a tela, apenas atualiza a lista."
        // We will facilitate parent update via URL change which parent monitors, or explicit callback.
        setTimeout(onFilterChange, 100); // Small delay for URL to propagate if using that method, or just direct fetch
    };

    const clearFilters = () => {
        setSearch('');
        setStatus('');
        setStartDate('');
        setEndDate('');
        setResponsibleId('');
        router.push('?');
        setTimeout(onFilterChange, 100);
    };

    const activeFiltersCount = [status, startDate, endDate, responsibleId].filter(Boolean).length;

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 space-y-4 dark:bg-zinc-900 dark:border-zinc-800">
            {/* Main Search Bar */}
            <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                    type="text"
                    className="block w-full rounded-md border-0 py-2 pl-10 pr-20 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 dark:bg-zinc-800 dark:ring-zinc-700 dark:text-gray-100 dark:placeholder:text-gray-500"
                    placeholder="Buscar cliente por CNPJ, Razão Social ou Email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-1 px-2 py-1 text-sm font-medium rounded-md transition-colors ${showFilters || activeFiltersCount > 0 ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                    >
                        <Filter className="h-4 w-4" />
                        Filtros
                        {activeFiltersCount > 0 && (
                            <span className="ml-1 inline-flex items-center justify-center h-4 w-4 rounded-full bg-indigo-600 text-white text-[10px]">
                                {activeFiltersCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Advanced Filters Grid */}
            {showFilters && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-gray-100">
                    {/* Status Filter */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1 dark:text-gray-300">Status</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 dark:bg-zinc-800 dark:ring-zinc-700 dark:text-gray-100"
                        >
                            <option value="">Todos</option>
                            <option value="Pendente">Pendente</option>
                            <option value="Cadastrando...">Cadastrando...</option>
                            <option value="Cadastro salvo com sucesso!">Cadastrado</option>
                            <option value="Erro">Erro de Integração</option>
                        </select>
                    </div>

                    {(userRole === 'ADMIN' || userRole === 'SUPERVISOR') && (
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1 dark:text-gray-300">Responsável</label>
                            <select
                                value={responsibleId}
                                onChange={(e) => setResponsibleId(e.target.value)}
                                className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 dark:bg-zinc-800 dark:ring-zinc-700 dark:text-gray-100"
                            >
                                <option value="">Todos</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1 dark:text-gray-300">Data Início</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 dark:bg-zinc-800 dark:ring-zinc-700 dark:text-gray-100"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1 dark:text-gray-300">Data Fim</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 dark:bg-zinc-800 dark:ring-zinc-700 dark:text-gray-100"
                        />
                    </div>

                    <div className="sm:col-span-full flex justify-end gap-2 mt-2">
                        <button
                            onClick={clearFilters}
                            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                            Limpar Filtros
                        </button>
                        <button
                            onClick={applyFilters}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-500 text-sm font-semibold shadow-sm"
                        >
                            Aplicar Filtros
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
