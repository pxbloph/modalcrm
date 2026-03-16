import { Search, Filter, X } from "lucide-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
                        className="pl-9 pr-8 py-2 text-sm border rounded-lg w-64 bg-input/50 border-input focus:ring-2 focus:ring-primary/20 outline-none transition-all focus:w-80 shadow-sm text-foreground placeholder:text-muted-foreground"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    )}
                </div>

                {/* Quick Filters */}
                <div className="flex items-center gap-2">
                    <Select value={filterResponsible || '__all__'} onValueChange={(value) => setFilterResponsible(value === '__all__' ? null : value)}>
                        <SelectTrigger className={`px-3 py-2 text-sm border rounded-lg outline-none transition-colors bg-input/50 border-input text-foreground ${filterResponsible ? 'border-primary/50 bg-primary/10 text-primary' : 'hover:border-primary/30'}`}>
                            <SelectValue placeholder="Responsável" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__all__">Responsável</SelectItem>
                            {users.map((u) => (
                                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={filterTag || '__all__'} onValueChange={(value) => setFilterTag(value === '__all__' ? null : value)}>
                        <SelectTrigger className={`px-3 py-2 text-sm border rounded-lg outline-none transition-colors bg-input/50 border-input text-foreground ${filterTag ? 'border-primary/50 bg-primary/10 text-primary' : 'hover:border-primary/30'}`}>
                            <SelectValue placeholder="Tag" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__all__">Tag</SelectItem>
                            {tags.map((t) => (
                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Clear Button */}
                    {hasActiveFilters && (
                        <button
                            onClick={onClear}
                            className="ml-2 text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-destructive/10"
                        >
                            <X className="w-3 h-3" />
                            Limpar
                        </button>
                    )}
                </div>

                {/* Advanced Filter Placeholder */}
                <button
                    className="ml-auto flex items-center gap-1 text-sm text-muted-foreground hover:text-primary px-3 py-2 rounded-lg hover:bg-accent transition-colors"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <Filter className="w-4 h-4" />
                    <span>Filtros Avançados</span>
                </button>
            </div>

            {/* Expanded Area (Placeholder for future complexity) */}
            {isExpanded && (
                <div className="p-4 bg-muted/50 border border-border rounded-lg text-sm text-muted-foreground">
                    <p>Filtros avançados (Data, Valor, Campos Personalizados) serão implementados aqui.</p>
                </div>
            )}
        </div>
    );
}
