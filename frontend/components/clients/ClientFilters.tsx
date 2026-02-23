import React, { useState, useEffect } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

import api from '@/lib/api';
import { SmartDateFilter } from '../ui/SmartDateFilter';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ClientFiltersProps {
    userRole: string;
    onFilterChange: () => void; // Trigger parent fetch
}

export function ClientFilters({ userRole, onFilterChange }: ClientFiltersProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // State initialized from URL params
    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [status, setStatus] = useState(searchParams.get('status') || '');
    const [startDate, setStartDate] = useState(searchParams.get('startDate') || '');
    const [endDate, setEndDate] = useState(searchParams.get('endDate') || '');
    const [responsibleId, setResponsibleId] = useState(searchParams.get('responsibleId') || '');

    // New Filters
    const [tabulation, setTabulation] = useState(searchParams.get('tabulation') || '');
    const [openAccountStartDate, setOpenAccountStartDate] = useState(searchParams.get('openAccountStartDate') || '');
    const [openAccountEndDate, setOpenAccountEndDate] = useState(searchParams.get('openAccountEndDate') || '');

    const [users, setUsers] = useState<{ id: string, name: string, surname?: string | null }[]>([]);
    const [tabulationOptions, setTabulationOptions] = useState<string[]>([]); // Options for select
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        // Fetch users for responsible filter if allowed
        if (userRole === 'ADMIN' || userRole === 'SUPERVISOR') {
            api.get('/users').then(res => {
                setUsers(res.data);
            }).catch(err => console.error("Failed to fetch users", err));
        }

        // Fetch Tabulation Options
        api.get('/clients/tabulations').then(res => {
            if (Array.isArray(res.data)) {
                setTabulationOptions(res.data);
            }
        }).catch(err => console.error("Failed to fetch tabulations", err));
    }, [userRole]);

    const applyFilters = () => {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (status) params.set('status', status);
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
        if (responsibleId) params.set('responsibleId', responsibleId);
        if (tabulation) params.set('tabulation', tabulation);
        if (openAccountStartDate) params.set('openAccountStartDate', openAccountStartDate);
        if (openAccountEndDate) params.set('openAccountEndDate', openAccountEndDate);

        router.push(`?${params.toString()}`);
        setTimeout(onFilterChange, 100);
    };

    const clearFilters = () => {
        setSearch('');
        setStatus('');
        setStartDate('');
        setEndDate('');
        setResponsibleId('');
        setTabulation('');
        setOpenAccountStartDate('');
        setOpenAccountEndDate('');
        router.push('?');
        setTimeout(onFilterChange, 100);
    };

    const activeFiltersCount = [status, startDate, endDate, responsibleId, tabulation, openAccountStartDate, openAccountEndDate].filter(Boolean).length;

    return (
        <div className="bg-card p-4 rounded-lg shadow-sm border border-border space-y-4">
            {/* Main Search Bar */}
            <div className="relative flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <Input
                        type="text"
                        className="pl-9 bg-background text-foreground border-input focus-visible:ring-primary"
                        placeholder="Buscar cliente por CNPJ, Razão Social ou Email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                    />
                </div>
                <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className={cn(
                        "flex items-center gap-2 border-border text-foreground hover:bg-accent",
                        (showFilters || activeFiltersCount > 0) && "border-primary/50 bg-primary/5 text-primary hover:bg-primary/10"
                    )}
                >
                    <Filter className="h-4 w-4" />
                    <span className="hidden sm:inline">Filtros</span>
                    {activeFiltersCount > 0 && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                            {activeFiltersCount}
                        </span>
                    )}
                </Button>
            </div>

            {/* Advanced Filters Grid */}
            {showFilters && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-border animate-in slide-in-from-top-2 duration-200">
                    {/* Status Filter */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Status</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors data-[placeholder]:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="">Todos</option>
                            <option value="Pendente">Pendente</option>
                            <option value="Cadastrando...">Cadastrando...</option>
                            <option value="Cadastro salvo com sucesso!">Cadastrado</option>
                            <option value="Erro">Erro de Integração</option>
                        </select>
                    </div>

                    {/* Tabulation Filter */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Tabulação</label>
                        <select
                            value={tabulation}
                            onChange={(e) => setTabulation(e.target.value)}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors data-[placeholder]:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="">Todas</option>
                            {tabulationOptions.map((opt, idx) => (
                                <option key={idx} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>

                    {/* Created At Smart Filter */}
                    <div className="space-y-1">
                        <SmartDateFilter
                            label="Cadastrado em"
                            startDate={startDate}
                            endDate={endDate}
                            onFilterChange={(start, end) => {
                                setStartDate(start);
                                setEndDate(end);
                            }}
                        />
                    </div>

                    {/* Open Account Smart Filter */}
                    <div className="space-y-1">
                        <SmartDateFilter
                            label="Data Conta Aberta"
                            startDate={openAccountStartDate}
                            endDate={openAccountEndDate}
                            onFilterChange={(start, end) => {
                                setOpenAccountStartDate(start);
                                setOpenAccountEndDate(end);
                            }}
                        />
                    </div>

                    {/* Responsible Filter (Admin/Supervisor) */}
                    {(userRole === 'ADMIN' || userRole === 'SUPERVISOR') && (
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Responsável</label>
                            <select
                                value={responsibleId}
                                onChange={(e) => setResponsibleId(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors data-[placeholder]:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="">Todos</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.name} {u.surname || ''}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="sm:col-span-full flex justify-end gap-2 mt-2 border-t border-border pt-4">
                        <Button
                            variant="ghost"
                            onClick={clearFilters}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            Limpar Filtros
                        </Button>
                        <Button
                            onClick={applyFilters}
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            Aplicar Filtros
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
