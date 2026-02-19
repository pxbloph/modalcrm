"use client"

import { useState, useRef, useEffect } from "react";
import { Search, Filter, X, ChevronDown, Calendar, User, List } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FilterPanel } from "./FilterPanel";
import { Badge } from "@/components/ui/badge";

interface UnifiedFilterBarProps {
    users: { id: string, name: string; surname?: string }[];
    children?: React.ReactNode;

    // Search
    searchTerm: string;
    onSearchChange: (val: string) => void;

    // Filters
    responsible: string | null;
    onResponsibleChange: (id: string | null) => void;

    tabulation: string;
    onTabulationChange: (val: string) => void;
    tabulationOptions: string[];

    // Dates
    creationDate?: { from: Date | undefined; to?: Date | undefined };
    onCreationDateChange: (range: { from: Date | undefined; to?: Date | undefined } | undefined) => void;

    accountDate?: { from: Date | undefined; to?: Date | undefined };
    onAccountDateChange: (range: { from: Date | undefined; to?: Date | undefined } | undefined) => void;

    onClear: () => void;

    // Style Variant
    variant?: 'default' | 'inline';
}

export function UnifiedFilterBar({
    users,
    searchTerm,
    onSearchChange,
    responsible,
    onResponsibleChange,
    tabulation,
    onTabulationChange,
    tabulationOptions,
    creationDate,
    onCreationDateChange,
    accountDate,
    onAccountDateChange,
    onClear,
    variant = 'default'
}: UnifiedFilterBarProps) {
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Helpers to display active filters
    const hasActiveFilters = responsible || tabulation || creationDate?.from || accountDate?.from;

    const formatDateRange = (range: { from: Date | undefined; to?: Date | undefined } | undefined) => {
        if (!range?.from) return '';
        if (!range.to || range.from.getTime() === range.to.getTime()) {
            return format(range.from, "dd/MM", { locale: ptBR });
        }
        return `${format(range.from, "dd/MM", { locale: ptBR })} - ${format(range.to, "dd/MM", { locale: ptBR })}`;
    };

    const getResponsibleName = (id: string) => {
        const u = users.find(u => u.id === id);
        return u ? `${u.name} ${u.surname || ''}`.trim() : 'Desconhecido';
    };

    const handleClearFilter = (type: string) => {
        if (type === 'responsible') onResponsibleChange(null);
        if (type === 'tabulation') onTabulationChange('');
        if (type === 'creationDate') onCreationDateChange(undefined);
        if (type === 'accountDate') onAccountDateChange(undefined);
        if (type === 'all') onClear();
    };

    const containerClasses = variant === 'inline'
        ? "flex items-center gap-2 w-full"
        : "flex flex-col gap-3 px-6 py-3 border-b border-gray-200 bg-white dark:bg-zinc-900 dark:border-zinc-800";

    return (
        <div className={containerClasses}>
            {/* Search Bar Area */}
            <div className={cn("flex items-center gap-3", variant === 'inline' ? "flex-1" : "w-full")}>
                <Popover open={isPanelOpen} onOpenChange={setIsPanelOpen}>
                    <PopoverTrigger asChild>
                        <div className="relative group flex-1 cursor-text" onClick={() => inputRef.current?.focus()}>
                            {/* Input Wrapper mimicking Bitrix/Gmail search bar */}
                            <div className={cn(
                                "flex items-center w-full h-9 px-3 border rounded-md bg-gray-50 dark:bg-zinc-800/50 transition-all shadow-sm",
                                isPanelOpen
                                    ? "border-indigo-500 ring-1 ring-indigo-500 bg-white dark:bg-zinc-800"
                                    : "border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600"
                            )}>
                                <Search className="w-4 h-4 text-gray-400 mr-2 shrink-0" />

                                <input
                                    ref={inputRef}
                                    type="text"
                                    placeholder="Buscar deals, clientes, CNPJ..."
                                    className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 min-w-[120px]"
                                    value={searchTerm}
                                    onChange={e => onSearchChange(e.target.value)}
                                />

                                {/* Icons Right */}
                                <div className="flex items-center gap-1 ml-auto">
                                    {searchTerm && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onSearchChange(''); }}
                                            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-400"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                    <div className="w-px h-4 bg-gray-300 dark:bg-zinc-600 mx-1" />
                                    <button className="p-1 rounded hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-500">
                                        <ChevronDown className={cn("w-4 h-4 transition-transform", isPanelOpen && "rotate-180")} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </PopoverTrigger>

                    <PopoverContent className="w-[calc(100vw-40px)] sm:w-[500px] p-0" align="start" sideOffset={5}>
                        <FilterPanel
                            users={users}
                            tabulationOptions={tabulationOptions}
                            responsible={responsible}
                            onResponsibleChange={onResponsibleChange}
                            tabulation={tabulation}
                            onTabulationChange={onTabulationChange}
                            creationDate={creationDate}
                            onCreationDateChange={onCreationDateChange}
                            accountDate={accountDate}
                            onAccountDateChange={onAccountDateChange}
                            onApply={() => setIsPanelOpen(false)}
                            onClear={() => {
                                onClear();
                                // Keep open or close? Usually reset and keep open to re-select
                            }}
                        />
                    </PopoverContent>
                </Popover>
            </div>

            {/* Active Filters Chips Row */}
            {hasActiveFilters && (
                <div className={cn("flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-top-1", variant === 'inline' ? "ml-2" : "")}>
                    {/* Only show label if NOT inline to save space, or keep it small */}
                    {variant !== 'inline' && <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mr-1">Filtros:</span>}

                    {/* Date Badges HIDDEN per user request: "visualização sem filtros lá em cima" but logic active.
                    {creationDate?.from && (
                        <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800 flex items-center gap-1 px-2 py-1">
                            <Calendar className="w-3 h-3" />
                            <span className="hidden sm:inline">Criado:</span> {formatDateRange(creationDate)}
                            <button onClick={() => handleClearFilter('creationDate')} className="ml-1 hover:text-indigo-900"><X className="w-3 h-3" /></button>
                        </Badge>
                    )}

                    {accountDate?.from && (
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 flex items-center gap-1 px-2 py-1">
                            <Calendar className="w-3 h-3" />
                            <span className="hidden sm:inline">Conta:</span> {formatDateRange(accountDate)}
                            <button onClick={() => handleClearFilter('accountDate')} className="ml-1 hover:text-blue-900"><X className="w-3 h-3" /></button>
                        </Badge>
                    )} 
                    */}

                    {responsible && (
                        <Badge variant="secondary" className="bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800 flex items-center gap-1 px-2 py-1">
                            <User className="w-3 h-3" />
                            {getResponsibleName(responsible)}
                            <button onClick={() => handleClearFilter('responsible')} className="ml-1 hover:text-orange-900"><X className="w-3 h-3" /></button>
                        </Badge>
                    )}

                    {tabulation && (
                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800 flex items-center gap-1 px-2 py-1">
                            <List className="w-3 h-3" />
                            {tabulation}
                            <button onClick={() => handleClearFilter('tabulation')} className="ml-1 hover:text-emerald-900"><X className="w-3 h-3" /></button>
                        </Badge>
                    )}

                    <button
                        onClick={() => handleClearFilter('all')}
                        className="text-xs text-red-500 hover:text-red-700 hover:underline ml-2"
                        title="Limpar todos"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
}

