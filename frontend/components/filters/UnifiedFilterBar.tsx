"use client"

import { useState, useRef, useEffect } from "react";
import { Search, Filter, X, ChevronDown, Calendar, User, List, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FilterPanel } from "./FilterPanel";
import { Badge } from "@/components/ui/badge";
import { FILTER_FIELDS } from "@/lib/filter-definitions";

interface UnifiedFilterBarProps {
    users: { id: string, name: string; surname?: string }[];
    tabulationOptions: string[];

    // Search
    searchTerm: string;
    onSearchChange: (val: string) => void;

    // Dynamic Filter Props
    activeFilters: { id: string, value: any }[];
    visibleFields: string[];
    onFilterChange: (id: string, value: any) => void;
    onRemoveField: (id: string) => void;
    onAddField: (id: string) => void;
    onClearAll: () => void;

    // Presets
    presets?: any[];
    onSavePreset?: (name: string) => void;
    onDeletePreset?: (id: string) => void;
    onApply?: () => void;

    // Style Variant
    variant?: 'default' | 'inline';
}

export function UnifiedFilterBar({
    users,
    tabulationOptions,
    searchTerm,
    onSearchChange,
    activeFilters,
    visibleFields,
    onFilterChange,
    onRemoveField,
    onAddField,
    onClearAll,
    presets,
    onSavePreset,
    onDeletePreset,
    onApply,
    variant = 'default'
}: UnifiedFilterBarProps) {
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const hasActiveFilters = activeFilters.length > 0;

    const getFieldName = (id: string) => FILTER_FIELDS.find(f => f.id === id)?.label || id;

    const getFilterLabel = (id: string, value: any) => {
        const field = FILTER_FIELDS.find(f => f.id === id);
        if (!field) return String(value);

        if (field.type === 'select-multi') {
            if (Array.isArray(value)) return value.join(', ');
            return String(value);
        }

        if (field.type === 'user' || field.type === 'user-multi') {
            if (Array.isArray(value)) {
                const names = value.map(id => {
                    const u = users.find(u => u.id === id);
                    return u ? u.name : 'Desconhecido';
                });
                return names.join(', ');
            }
            const u = users.find(u => u.id === value);
            return u ? `${u.name} ${u.surname || ''}`.trim() : 'Desconhecido';
        }

        if (field.type === 'date-range' && value?.from) {
            const fromStr = format(new Date(value.from), "dd/MM", { locale: ptBR });
            if (!value.to) return fromStr;
            const toStr = format(new Date(value.to), "dd/MM", { locale: ptBR });
            return `${fromStr} - ${toStr}`;
        }

        if (field.type === 'boolean') {
            return value === 'true' ? 'Sim' : 'Não';
        }

        return String(value);
    };

    const containerClasses = variant === 'inline'
        ? "flex items-center gap-2 w-full"
        : "flex flex-col gap-3 px-6 py-3 border-b border-gray-200 bg-white dark:bg-zinc-900 dark:border-zinc-800";

    return (
        <div className={containerClasses}>
            <div className={cn("flex items-center gap-3", variant === 'inline' ? "flex-1" : "w-full")}>
                <Popover open={isPanelOpen} onOpenChange={setIsPanelOpen}>
                    <PopoverTrigger asChild>
                        <div className="relative group flex-1 cursor-text" onClick={() => inputRef.current?.focus()}>
                            <div className={cn(
                                "flex items-center w-full h-9 px-3 border rounded-md bg-gray-50 dark:bg-zinc-800/50 transition-all shadow-sm",
                                isPanelOpen
                                    ? "border-green-500 ring-1 ring-green-500 bg-white dark:bg-zinc-800"
                                    : "border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600"
                            )}>
                                <Search className="w-4 h-4 text-gray-400 mr-2 shrink-0" />

                                <input
                                    ref={inputRef}
                                    type="text"
                                    placeholder="Pesquisar por nome ou CNPJ..."
                                    className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 min-w-[120px]"
                                    value={searchTerm}
                                    onChange={e => onSearchChange(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            onApply?.();
                                            setIsPanelOpen(false);
                                        }
                                    }}
                                />

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

                    <PopoverContent className="w-[calc(100vw-40px)] sm:w-[500px] p-0 border-none shadow-2xl max-h-[calc(100dvh-100px)] overflow-hidden flex flex-col" align="start" sideOffset={5}>
                        <FilterPanel
                            users={users}
                            tabulationOptions={tabulationOptions}
                            visibleFields={visibleFields}
                            activeFilters={activeFilters}
                            onFilterChange={onFilterChange}
                            onRemoveField={onRemoveField}
                            onAddField={onAddField}
                            onClearAll={onClearAll}
                            onApply={() => {
                                onApply?.();
                                setIsPanelOpen(false);
                            }}
                            presets={presets}
                            onSavePreset={onSavePreset}
                            onDeletePreset={onDeletePreset}
                        />
                    </PopoverContent>
                </Popover>
            </div>

            {hasActiveFilters && (
                <div className={cn("flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-top-1", variant === 'inline' ? "ml-2" : "")}>
                    {activeFilters.map(filter => (
                        <Badge
                            key={filter.id}
                            variant="secondary"
                            className="bg-green-50 text-green-700 border-green-100 dark:bg-green-900/10 dark:text-green-400 dark:border-green-500/20 flex items-center gap-1 px-2 py-0.5 text-[10px]"
                        >
                            <span className="font-bold opacity-70 uppercase mr-0.5">{getFieldName(filter.id)}:</span>
                            {getFilterLabel(filter.id, filter.value)}
                            <button onClick={() => onFilterChange(filter.id, '')} className="ml-1 hover:text-green-900"><X className="w-2.5 h-2.5" /></button>
                        </Badge>
                    ))}

                    <button
                        onClick={onClearAll}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        title="Limpar todos"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}
        </div>
    );
}

