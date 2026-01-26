import { Search, Filter, X } from "lucide-react";
import { useState } from "react";

interface User {
    id: string;
    name: string;
}

interface Tag {
    id: string;
    name: string;
    color: string;
}

interface KanbanFilterBarProps {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    filterResponsible: string | null;
    setFilterResponsible: (id: string | null) => void;
    filterTag: string | null;
    setFilterTag: (id: string | null) => void;
    users: User[];
    tags: Tag[];
    onClear: () => void;
}

export function KanbanFilterBar({
    searchTerm,
    setSearchTerm,
    filterResponsible,
    setFilterResponsible,
    filterTag,
    setFilterTag,
    users,
    tags,
    onClear
}: KanbanFilterBarProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const hasActiveFilters = searchTerm || filterResponsible || filterTag;

    return (
        <div className="flex flex-col gap-3 px-4 pb-4">
            <div className="flex items-center gap-3 overflow-x-auto">
                {/* Search Input */}
                <div className="relative group">
                    <input
                        type="text"
                        placeholder="Buscar deals e clientes..."
                        className="pl-9 pr-8 py-2 text-sm border rounded-lg w-64 bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all focus:w-80 shadow-sm"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    )}
                </div>

                {/* Quick Filters */}
                <div className="flex items-center gap-2">
                    <select
                        className={`px-3 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-zinc-800 outline-none transition-colors cursor-pointer ${filterResponsible ? 'border-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'border-gray-200 dark:border-zinc-700 hover:border-gray-300'}`}
                        value={filterResponsible || ''}
                        onChange={e => setFilterResponsible(e.target.value || null)}
                    >
                        <option value="">Responsável</option>
                        {users.map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                    </select>

                    <select
                        className={`px-3 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-zinc-800 outline-none transition-colors cursor-pointer ${filterTag ? 'border-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'border-gray-200 dark:border-zinc-700 hover:border-gray-300'}`}
                        value={filterTag || ''}
                        onChange={e => setFilterTag(e.target.value || null)}
                    >
                        <option value="">Tag</option>
                        {tags.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>

                    {/* Clear Button */}
                    {hasActiveFilters && (
                        <button
                            onClick={onClear}
                            className="ml-2 text-xs text-gray-500 hover:text-red-500 flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                            <X className="w-3 h-3" />
                            Limpar
                        </button>
                    )}
                </div>

                {/* Advanced Filter Placeholder */}
                <button
                    className="ml-auto flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <Filter className="w-4 h-4" />
                    <span>Filtros Avançados</span>
                </button>
            </div>

            {/* Expanded Area (Placeholder for future complexity) */}
            {isExpanded && (
                <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-700/50 rounded-lg text-sm text-gray-500">
                    <p>Filtros avançados (Data, Valor, Campos Personalizados) serão implementados aqui.</p>
                </div>
            )}
        </div>
    );
}
