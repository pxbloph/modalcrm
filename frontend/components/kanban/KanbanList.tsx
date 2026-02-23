
import { useState, useMemo, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    ChevronDown, ChevronUp, ChevronsUpDown, ChevronLeft, ChevronRight,
    Settings, GripVertical, RotateCcw, X, Search
} from "lucide-react";
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from "@/lib/utils";

// --- Interfaces ---

interface Tag {
    id: string;
    name: string;
    color: string;
}

interface Deal {
    id: string;
    title: string;
    value?: number;
    stage_id: string;
    created_at: string;
    // Allow any client field access for dynamic columns
    client?: any;
    responsible?: { id: string, name: string; surname?: string };
    tags?: { tag: Tag }[];
    [key: string]: any; // Allow direct access
}

interface Stage {
    id: string;
    name: string;
    color: string;
}

interface KanbanListProps {
    stages: Stage[];
    dealsByStage: Record<string, Deal[]>;
    onDealClick: (id: string) => void;
}

type SortConfig = {
    key: string;
    direction: 'asc' | 'desc';
};

// --- Helpers & Constants ---

const formatCurrency = (val: any) => {
    if (!val) return '-';
    const num = Number(val);
    if (isNaN(num)) return val;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
        return format(parseISO(dateString), "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
        return dateString;
    }
};

const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

// Column Definitions
const AVAILABLE_COLUMNS = [
    // --- Negócio ---
    { id: 'title', label: 'Negócio', category: 'Negócio' },
    { id: 'stage_name', label: 'Etapa', category: 'Negócio' },
    { id: 'value', label: 'Valor', category: 'Negócio', format: formatCurrency },
    { id: 'created_at', label: 'Data Criação', category: 'Negócio', format: formatDate },
    { id: 'responsible', label: 'Responsável', category: 'Negócio' },

    // --- Cadastro (Cliente) ---
    { id: 'client_name', label: 'Nome (Razão Social)', category: 'Cadastro', path: 'client.name' },
    { id: 'client_surname', label: 'Sócio (Apelido)', category: 'Cadastro', path: 'client.surname' },
    { id: 'client_cnpj', label: 'CNPJ', category: 'Cadastro', path: 'client.cnpj' },
    { id: 'client_email', label: 'Email', category: 'Cadastro', path: 'client.email' },
    { id: 'client_phone', label: 'Telefone', category: 'Cadastro', path: 'client.phone' },
    { id: 'client_city', label: 'Endereço/Cidade', category: 'Cadastro', path: 'client.address' },

    // --- Qualificação: Financeiro ---
    { id: 'qual_fat_mensal', label: 'Fat. Mensal', category: 'Financeiro', path: 'client.faturamento_mensal', format: formatCurrency },
    { id: 'qual_fat_maq', label: 'Fat. Máquina', category: 'Financeiro', path: 'client.faturamento_maquina', format: formatCurrency },
    { id: 'qual_maq_atual', label: 'Máquina Atual', category: 'Financeiro', path: 'client.maquininha_atual' },

    // --- Qualificação: Conta ---
    { id: 'qual_cc_banco', label: 'Banco (CC)', category: 'Conta', path: 'client.cc_tipo_conta' }, // Using cc_tipo_conta as proxy for bank info if needed or map correctly
    { id: 'qual_cc_saldo', label: 'Saldo (CC)', category: 'Conta', path: 'client.cc_saldo', format: formatCurrency },
    { id: 'qual_cc_limite', label: 'Limite Global', category: 'Conta', path: 'client.cc_limite_disponivel', format: formatCurrency },

    // --- Qualificação: Cartão ---
    { id: 'qual_card_tipo', label: 'Tipo Cartão', category: 'Cartão', path: 'client.card_tipo' },
    { id: 'qual_card_limite', label: 'Limite Cartão', category: 'Cartão', path: 'client.limit_cartao_aprovado', format: formatCurrency },
    { id: 'qual_card_fatura', label: 'Fatura Aberta', category: 'Cartão', path: 'client.card_fatura_aberta_valor', format: formatCurrency },

    // --- Gestão ---
    { id: 'qual_tabulacao', label: 'Tabulação', category: 'Gestão', path: 'client.tabulacao' },
    { id: 'qual_agendamento', label: 'Agendamento', category: 'Gestão', path: 'client.agendamento', format: formatDate },
    { id: 'account_opening_date', label: 'Abertura Conta', category: 'Gestão', path: 'client.account_opening_date', format: formatDate },
];

const DEFAULT_VISIBLE_COLUMNS = ['title', 'client_name', 'stage_name', 'value', 'created_at', 'responsible'];

// --- Components ---

const SortableColumnItem = ({ id, label, category, isVisible, onToggle }: any) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : 'auto',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex items-center gap-3 p-2 bg-card rounded-md border border-border mb-1 hover:border-primary/50"
        >
            <button
                {...attributes}
                {...listeners}
                className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
            >
                <GripVertical className="h-4 w-4" />
            </button>
            <input
                type="checkbox"
                checked={isVisible}
                onChange={() => onToggle(id)}
                className="h-4 w-4 rounded border-input text-primary focus:ring-ring bg-background"
            />
            <div className="flex flex-col">
                <span className="text-sm text-foreground font-medium">{label}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{category}</span>
            </div>
        </div>
    );
};

// --- Main Component ---

export function KanbanList({ stages, dealsByStage, onDealClick }: KanbanListProps) {
    const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);

    // Column State
    const [columnOrder, setColumnOrder] = useState<string[]>(DEFAULT_VISIBLE_COLUMNS);
    const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(DEFAULT_VISIBLE_COLUMNS));

    // Configuration UI State
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [configSearch, setConfigSearch] = useState('');
    const [tempOrder, setTempOrder] = useState<string[]>([]); // For modal
    const [tempVisible, setTempVisible] = useState<Set<string>>(new Set());

    // Load Preferences
    useEffect(() => {
        const saved = localStorage.getItem('crm-list-config-v2');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.order && Array.isArray(parsed.order)) {
                    setColumnOrder(parsed.order);
                    setVisibleColumns(new Set(parsed.order)); // Sync visibility with order list presence for simplicity, or use separate
                }
            } catch (e) {
                console.error("Failed to load list config", e);
            }
        }
    }, []);

    const savePreferences = (order: string[]) => {
        localStorage.setItem('crm-list-config-v2', JSON.stringify({ order }));
    };

    // Flatten Data
    const flatDeals = useMemo(() => {
        return Object.values(dealsByStage).flat();
    }, [dealsByStage]);

    // Sort Data
    const sortedDeals = useMemo(() => {
        let sortableItems = [...flatDeals];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const colDef = AVAILABLE_COLUMNS.find(c => c.id === sortConfig.key);
                let aValue: any;
                let bValue: any;

                if (colDef && colDef.path) {
                    aValue = getNestedValue(a, colDef.path);
                    bValue = getNestedValue(b, colDef.path);
                } else {
                    // Special handlers or direct access
                    if (sortConfig.key === 'title') { aValue = a.title; bValue = b.title; }
                    else if (sortConfig.key === 'value') { aValue = a.value || 0; bValue = b.value || 0; }
                    else if (sortConfig.key === 'created_at') { aValue = a.created_at; bValue = b.created_at; }
                    else if (sortConfig.key === 'responsible') { aValue = a.responsible?.name || ''; bValue = b.responsible?.name || ''; }
                    else if (sortConfig.key === 'stage_name') {
                        aValue = stages.find(s => s.id === a.stage_id)?.name || '';
                        bValue = stages.find(s => s.id === b.stage_id)?.name || '';
                    }
                }

                // Null safety
                if (aValue === undefined || aValue === null) aValue = '';
                if (bValue === undefined || bValue === null) bValue = '';

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [flatDeals, sortConfig, stages]);

    // Paginate
    const paginatedDeals = useMemo(() => {
        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        return sortedDeals.slice(indexOfFirstItem, indexOfLastItem);
    }, [sortedDeals, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(sortedDeals.length / itemsPerPage);

    // Handlers
    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Config Handlers
    const openConfig = () => {
        // Initialize temp state with current ALL available columns, but ordered: visible first (in order), then hidden
        const currentVisible = columnOrder;
        const hidden = AVAILABLE_COLUMNS.filter(c => !visibleColumns.has(c.id)).map(c => c.id);

        setTempOrder([...currentVisible, ...hidden]);
        setTempVisible(new Set(visibleColumns));
        setIsConfigOpen(true);
    };

    const applyConfig = () => {
        // Filter tempOrder to only include those that are marked visible
        const newOrder = tempOrder.filter(id => tempVisible.has(id));
        setColumnOrder(newOrder);
        setVisibleColumns(tempVisible);
        savePreferences(newOrder);
        setIsConfigOpen(false);
    };

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active && over && active.id !== over.id) {
            setTempOrder((items) => {
                const oldIndex = items.indexOf(active.id as string);
                const newIndex = items.indexOf(over.id as string);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const toggleTempVisibility = (id: string) => {
        const newSet = new Set(tempVisible);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setTempVisible(newSet);
    };

    // Render Helpers
    const getSortIcon = (key: string) => {
        if (!sortConfig || sortConfig.key !== key) return <ChevronsUpDown className="w-3 h-3 text-gray-400 ml-1" />;
        return sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 text-indigo-600 ml-1" /> : <ChevronDown className="w-3 h-3 text-indigo-600 ml-1" />;
    };

    const renderCell = (deal: Deal, colId: string) => {
        // Special renderers that need React nodes or complex logic
        if (colId === 'stage_name') {
            const stage = stages.find(s => s.id === deal.stage_id) || { name: '?', color: '#ccc' };
            return (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap"
                    style={{
                        borderColor: stage.color,
                        color: stage.color,
                        backgroundColor: `${stage.color}10`
                    }}>
                    {stage.name}
                </span>
            );
        }

        if (colId === 'responsible') {
            const name = deal.responsible?.name || '';
            const surname = deal.responsible?.surname || '';
            return `${name} ${surname}`.trim() || '—';
        }
        if (colId === 'title') return <span className="font-medium text-gray-900 dark:text-gray-100">{deal.title}</span>;

        // Generic renderer based on path/format
        const colDef = AVAILABLE_COLUMNS.find(c => c.id === colId);
        if (!colDef) return '-';

        let val;
        if (colDef.path) {
            val = getNestedValue(deal, colDef.path);
        } else {
            // Fallback for direct props handled above or raw access
            val = deal[colId];
        }

        if (colDef.format) return colDef.format(val);
        return val || '—';
    };

    return (
        <div className="h-full flex flex-col overflow-hidden bg-white">

            {/* --- Configuration Modal --- */}
            {isConfigOpen && (
                <>
                    <div className="fixed inset-0 bg-background/80 z-40 backdrop-blur-sm" onClick={() => setIsConfigOpen(false)} />
                    <div className="absolute top-16 right-4 z-50 w-80 bg-popover rounded-lg shadow-2xl ring-1 ring-border p-4 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-150 origin-top-right max-h-[80vh]">
                        <div className="flex items-center justify-between border-b border-border pb-2">
                            <h3 className="font-semibold text-foreground">Personalizar Colunas</h3>
                            <button onClick={() => setIsConfigOpen(false)}><X className="h-4 w-4 text-muted-foreground hover:text-foreground" /></button>
                        </div>

                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Buscar coluna..."
                                className="w-full pl-8 pr-3 py-2 border border-input rounded-md text-sm outline-none bg-background text-foreground focus:ring-2 focus:ring-ring"
                                value={configSearch}
                                onChange={e => setConfigSearch(e.target.value)}
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto pr-1">
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <SortableContext items={tempOrder} strategy={verticalListSortingStrategy}>
                                    {tempOrder
                                        .filter(id => {
                                            const col = AVAILABLE_COLUMNS.find(c => c.id === id);
                                            return col && (
                                                col.label.toLowerCase().includes(configSearch.toLowerCase()) ||
                                                col.category?.toLowerCase().includes(configSearch.toLowerCase())
                                            );
                                        })
                                        .map(id => {
                                            const col = AVAILABLE_COLUMNS.find(c => c.id === id);
                                            if (!col) return null;
                                            return (
                                                <SortableColumnItem
                                                    key={id}
                                                    id={id}
                                                    label={col.label}
                                                    category={col.category}
                                                    isVisible={tempVisible.has(id)}
                                                    onToggle={toggleTempVisibility}
                                                />
                                            );
                                        })}
                                </SortableContext>
                            </DndContext>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-border">
                            <button onClick={() => setIsConfigOpen(false)} className="px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded">Cancelar</button>
                            <button onClick={applyConfig} className="px-3 py-1.5 text-sm text-primary-foreground bg-primary hover:bg-primary/90 rounded shadow-sm">Aplicar</button>
                        </div>
                    </div>
                </>
            )}

            <div className="flex-1 bg-card rounded-lg border border-border shadow-sm flex flex-col overflow-hidden">
                <div className="overflow-auto flex-1 relative">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-white border-b border-border font-semibold text-muted-foreground sticky top-0 z-10 shadow-sm">
                            <tr>
                                {/* Config Button Column */}
                                <th className="w-10 px-2 py-3 text-center border-r border-border bg-muted/30">
                                    <button
                                        onClick={openConfig}
                                        className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                                        title="Configurar Colunas"
                                    >
                                        <Settings className="w-4 h-4" />
                                    </button>
                                </th>

                                {/* Dynamic Columns */}
                                {columnOrder.map(colId => {
                                    const colDef = AVAILABLE_COLUMNS.find(c => c.id === colId);
                                    if (!colDef) return null;
                                    return (
                                        <th
                                            key={colId}
                                            onClick={() => handleSort(colId)}
                                            className="px-4 py-3 cursor-pointer hover:bg-accent transition-colors select-none whitespace-nowrap group border-r border-border last:border-0"
                                        >
                                            <div className="flex items-center gap-1">
                                                {colDef.label}
                                                {getSortIcon(colId)}
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {paginatedDeals.length > 0 ? (
                                paginatedDeals.map((deal, idx) => (
                                    <tr
                                        key={deal.id}
                                        onClick={() => onDealClick(deal.id)}
                                        className="hover:bg-muted/50 cursor-pointer transition-colors group"
                                    >
                                        <td className="w-10 px-2 py-3 text-center text-xs text-muted-foreground border-r border-border">
                                            {(currentPage - 1) * itemsPerPage + idx + 1}
                                        </td>
                                        {columnOrder.map(colId => (
                                            <td key={`${deal.id}-${colId}`} className="px-4 py-3 text-foreground border-r border-border last:border-0 truncate max-w-[300px]">
                                                {renderCell(deal, colId)}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={columnOrder.length + 1} className="px-4 py-16 text-center">
                                        <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                                            <Search className="w-8 h-8 opacity-20" />
                                            <p>Nenhum negócio encontrado com os filtros atuais.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div className="border-t border-border p-4 bg-muted/30 flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        Mostrando <span className="font-medium">{paginatedDeals.length}</span> de <span className="font-medium">{sortedDeals.length}</span> resultados
                    </div>

                    <div className="flex items-center gap-4">
                        <select
                            value={itemsPerPage}
                            onChange={(e) => {
                                setItemsPerPage(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            className="bg-background border border-border text-foreground text-sm rounded-md focus:ring-ring focus:border-ring block p-1.5 outline-none"
                        >
                            <option value={10}>10 por página</option>
                            <option value={25}>25 por página</option>
                            <option value={50}>50 por página</option>
                            <option value={100}>100 por página</option>
                        </select>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="p-1 px-2 rounded-md hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <span className="text-sm text-foreground min-w-[3rem] text-center">
                                Pg. {currentPage} / {totalPages || 1}
                            </span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages || totalPages === 0}
                                className="p-1 px-2 rounded-md hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
