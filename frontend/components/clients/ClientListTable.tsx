'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    ColumnDef,
    Header,
    VisibilityState,
} from '@tanstack/react-table';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    horizontalListSortingStrategy,
    verticalListSortingStrategy,
    sortableKeyboardCoordinates,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Loader2, GripVertical, Trash2, CheckCircle, Settings, RotateCcw, Search, X, Download, Upload } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ImportModal } from './ImportModal';

interface Client {
    id: string;
    name: string;
    email: string;
    description?: string;
    phone: string;
    integration_status: string;
    created_at: string;
    created_by?: {
        name: string;
        surname?: string;
        email: string;
    };
    surname?: string;
    cnpj?: string; // New field
    qualifications?: {
        agendamento?: string;
        tabulacao?: string;
    }[];
    has_open_account?: boolean;
    [key: string]: any;
}

interface ClientListTableProps {
    clients: Client[];
    loading: boolean;
    onClientClick: (clientId: string) => void;
    onRefresh?: () => void;
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    limit: number;
    onLimitChange: (limit: number) => void;
    totalRecords?: number;
    // Export/Import Extensions
    onDelete?: (ids: string[]) => void;
    onOpenAccount?: (ids: string[]) => void;
    currentFilters?: any;
}

// --- Draggable Header Component (Table) ---
const DraggableTableHeader = ({ header }: { header: Header<Client, unknown> }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: header.column.id });

    const style: React.CSSProperties = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.8 : 1,
        zIndex: isDragging ? 1 : 0,
        position: 'relative',
        width: header.getSize(),
    };

    return (
        <th
            ref={setNodeRef}
            style={style}
            colSpan={header.colSpan}
            {...attributes}
            {...listeners}
            className={cn(
                "relative text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/50 group select-none cursor-grab active:cursor-grabbing hover:bg-muted transition-colors",
                isDragging && "bg-muted shadow-lg"
            )}
        >
            <div className="flex items-center gap-2 px-6 py-3 h-full">
                <span className="flex-1 truncate">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </span>
                <div
                    onMouseDown={header.getResizeHandler()}
                    onTouchStart={header.getResizeHandler()}
                    className={cn(
                        "absolute right-0 top-0 h-full w-px cursor-col-resize hover:bg-primary touch-none select-none",
                        header.column.getIsResizing() ? "bg-primary w-0.5 isResizing" : "bg-transparent"
                    )}
                    style={{ transform: header.column.getIsResizing() ? `translateX(${0}px)` : undefined }}
                />
            </div>
        </th>
    );
};

// --- Sortable Item for Column Selector ---
const SortableColumnItem = ({ id, label, isVisible, isFixed, onToggle }: any) => {
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
            className="flex items-center gap-3 p-2 bg-card rounded-md border border-border mb-1 hover:border-input transition-colors"
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
                disabled={isFixed}
                onChange={() => onToggle(id)}
                className="h-4 w-4 rounded border-input text-primary focus:ring-primary disabled:opacity-50"
            />
            <span className="text-sm text-foreground flex-1">{label}</span>
        </div>
    );
};


const DEFAULT_COLUMN_ORDER = [
    'select',
    'name',
    'surname',
    'cnpj',
    'email',
    'integration_status',
    'responsible',
    'tabulacao',
    'agendamento',
    'created_at',
    'actions'
];

export default function ClientListTable({
    clients,
    loading,
    onClientClick,
    onRefresh,
    currentPage,
    totalPages,
    onPageChange,
    limit,
    onLimitChange,
    totalRecords,
    // Actions
    onDelete,
    onOpenAccount,
    currentFilters,
    userRole = 'OPERATOR' // defaulting to safest permission
}: ClientListTableProps & { userRole?: string }) { // extending locally to avoid breaking other usages immediately if any
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [actionLoading, setActionLoading] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [exporting, setExporting] = useState(false);

    // Export Logic
    const handleExport = async () => {
        setExporting(true);
        try {
            const params = new URLSearchParams();
            if (currentFilters) {
                // Assuming currentFilters is already an object of query params
                Object.entries(currentFilters).forEach(([key, val]) => {
                    if (val) params.append(key, String(val));
                });
            }

            const response = await api.get('/clients/export', {
                params: params,
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `clientes_export_${new Date().getTime()}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error(err);
            alert("Erro ao exportar dados.");
        } finally {
            setExporting(false);
        }
    };

    // Column Config State
    const [columnSelectorOpen, setColumnSelectorOpen] = useState(false);
    const [columnSearch, setColumnSearch] = useState('');

    // State
    const [columnOrder, setColumnOrder] = useState<string[]>(DEFAULT_COLUMN_ORDER);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({ 'cnpj': false });

    // Load Preferences
    useEffect(() => {
        const saved = localStorage.getItem('client-table-config');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.order) {
                    // Merge saved order with default/current columns to ensure new columns show up
                    const savedSet = new Set(parsed.order);
                    const newColumns = DEFAULT_COLUMN_ORDER.filter(colId => !savedSet.has(colId));
                    // Filter out any saved columns that no longer exist
                    const existingSavedColumns = parsed.order.filter((colId: string) => DEFAULT_COLUMN_ORDER.includes(colId));

                    setColumnOrder([...existingSavedColumns, ...newColumns]);
                }
                if (parsed.visibility) setColumnVisibility(parsed.visibility);
            } catch (e) {
                console.error("Failed to load table config", e);
            }
        }
    }, []);

    const savePreferences = (newOrder: string[], newVisibility: VisibilityState) => {
        localStorage.setItem('client-table-config', JSON.stringify({
            order: newOrder,
            visibility: newVisibility
        }));
    };

    // Temp state for selector (to allow "Cancel"/"Apply")
    const [tempOrder, setTempOrder] = useState<string[]>([]);
    const [tempVisibility, setTempVisibility] = useState<VisibilityState>({});

    const openColumnSelector = () => {
        setTempOrder([...columnOrder]);
        setTempVisibility({ ...columnVisibility });
        setColumnSelectorOpen(true);
    };

    const applyColumnPreferences = () => {
        setColumnOrder(tempOrder);
        setColumnVisibility(tempVisibility);
        savePreferences(tempOrder, tempVisibility);
        setColumnSelectorOpen(false);
    };

    const resetColumnPreferences = () => {
        setTempOrder([...DEFAULT_COLUMN_ORDER]);
        setTempVisibility({ 'cnpj': false });
    };

    // --- Column Definitions (Moved here to access openColumnSelector) ---
    const columns = useMemo<ColumnDef<Client>[]>(
        () => [
            {
                id: 'select',
                header: ({ table }) => (
                    <div className="flex items-center gap-2 pl-4">
                        <input
                            type="checkbox"
                            checked={clients.length > 0 && selectedIds.size === clients.length}
                            onChange={toggleAll}
                            className="rounded border-input text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                        />
                        <button
                            onClick={(e) => { e.stopPropagation(); openColumnSelector(); }}
                            className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-accent transition-colors"
                            title="Colunas"
                        >
                            <Settings className="h-3.5 w-3.5" />
                        </button>
                    </div>
                ),
                cell: ({ row }) => (
                    <div className="flex items-center justify-center">
                        <input
                            type="checkbox"
                            checked={selectedIds.has(row.original.id)}
                            onChange={() => toggleRow(row.original.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded border-input text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                        />
                    </div>
                ),
                size: 65,
                enableResizing: false,
            },
            {
                accessorKey: 'name',
                header: 'Razão Social',
                cell: (info) => <span className="font-medium text-foreground">{info.getValue() as string}</span>,
                minSize: 150,
            },
            {
                accessorKey: 'surname',
                header: 'Nome do Sócio',
                cell: (info) => info.getValue() || '-',
                minSize: 150,
            },
            {
                accessorKey: 'cnpj',
                header: 'CNPJ',
                cell: (info) => info.getValue() || '-',
                minSize: 140,
            },
            {
                accessorKey: 'email',
                header: 'Email',
                cell: (info) => info.getValue(),
                minSize: 200,
            },
            {
                accessorKey: 'integration_status',
                header: 'Status',
                cell: (info) => {
                    const status = info.getValue() as string;
                    const hasOpenAccount = info.row.original.has_open_account;

                    return (
                        <div className="flex flex-col gap-1 items-start">
                            <span className={cn(
                                "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
                                (status === 'Pendente' || status === 'Cadastrando...') ? "bg-status-waiting/10 text-status-waiting ring-status-waiting/20" :
                                    status === 'Cadastro salvo com sucesso!' ? "bg-status-new/10 text-status-new ring-status-new/20" :
                                        "bg-muted text-muted-foreground ring-border"
                            )}>
                                {status}
                            </span>
                            {hasOpenAccount && (
                                <span className="inline-flex items-center rounded-md bg-status-open/10 px-2 py-0.5 text-[10px] font-medium text-status-open ring-1 ring-inset ring-status-open/20">
                                    Conta Aberta
                                </span>
                            )}
                        </div>
                    );
                },
                minSize: 150,
            },
            {
                id: 'responsible',
                header: 'Responsável',
                accessorFn: (row) => row.created_by ? `${row.created_by.name} ${row.created_by.surname || ''}`.trim() : '-',
                minSize: 150,
            },
            {
                id: 'tabulacao',
                header: 'Tabulação',
                accessorFn: (row) => row.qualifications?.[0]?.tabulacao || '-',
                cell: (info) => <span className="text-muted-foreground">{info.getValue() as string}</span>,
                minSize: 150,
            },
            {
                id: 'agendamento',
                header: 'Agendamento',
                accessorFn: (row) => row.qualifications?.[0]?.agendamento,
                cell: (info) => {
                    const val = info.getValue() as string;
                    return val ? new Date(val).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '-';
                },
                minSize: 150,
            },
            {
                accessorKey: 'created_at',
                header: 'Data',
                cell: (info) => new Date(info.getValue() as string).toLocaleDateString('pt-BR'),
                minSize: 100,
            },
            {
                id: 'actions',
                header: 'Ações',
                cell: ({ row }) => (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onClientClick(row.original.id);
                        }}
                        className="text-black-900 dark:text-black-100 hover:text-blue-800 dark:hover:text-white hover:underline px-2 py-1 rounded text-sm font-medium transition-colors"
                    >
                        Ver
                    </button>
                ),
                size: 80,
                enableResizing: false,
            }
        ],
        [onClientClick, selectedIds, clients, openColumnSelector]
    );

    // Table Instance
    const table = useReactTable({
        data: clients,
        columns,
        getCoreRowModel: getCoreRowModel(),
        columnResizeMode: 'onChange',
        state: {
            columnOrder,
            columnVisibility,
        },
        onColumnOrderChange: setColumnOrder,
        onColumnVisibilityChange: setColumnVisibility,
        enableColumnResizing: true,
    });

    // --- Selection Logic ---
    const toggleAll = () => {
        if (selectedIds.size === clients.length && clients.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(clients.map(c => c.id)));
        }
    };

    const toggleRow = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    // --- Bulk Actions ---
    const handleBulkDelete = async () => {
        const count = selectedIds.size;
        if (!confirm(`Tem certeza que deseja EXCLUIR ${count} clientes selecionados? Esta ação é irreversível.`)) return;

        setActionLoading(true);
        try {
            await api.delete('/clients/batch/bulk-delete', { data: { ids: Array.from(selectedIds) } });
            alert(`${count} clientes excluídos com sucesso.`);
            setSelectedIds(new Set());
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error("Bulk delete failed", error);
            alert("Erro ao excluir clientes.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleBulkOpenAccount = async () => {
        const count = selectedIds.size;
        if (!confirm(`Marcar ${count} clientes como CONTA ABERTA?`)) return;

        setActionLoading(true);
        try {
            await api.patch('/clients/batch/bulk-open-account', { ids: Array.from(selectedIds) });
            alert(`${count} clientes atualizados com sucesso.`);
            setSelectedIds(new Set());
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error("Bulk update failed", error);
            alert("Erro ao atualizar status.");
        } finally {
            setActionLoading(false);
        }
    };

    // --- DnD Sensors (Header) ---
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    function handleHeaderDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (active && over && active.id !== over.id) {
            setColumnOrder((order) => {
                const oldIndex = order.indexOf(active.id as string);
                const newIndex = order.indexOf(over.id as string);
                const newOrder = arrayMove(order, oldIndex, newIndex);
                savePreferences(newOrder, columnVisibility); // Save on drop
                return newOrder;
            });
        }
    }

    // --- DnD Sensors (Selector) ---
    const selectorSensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    function handleSelectorDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (active && over && active.id !== over.id) {
            setTempOrder((order) => {
                const oldIndex = order.indexOf(active.id as string);
                const newIndex = order.indexOf(over.id as string);
                return arrayMove(order, oldIndex, newIndex);
            });
        }
    }

    // Utils for Selector
    const getColumnLabel = (colId: string) => {
        const col = columns.find(c => (c.id === colId || (c as any).accessorKey === colId));
        if (!col) return colId;
        if (typeof col.header === 'string') return col.header;
        if (colId === 'select') return 'Seleção';
        if (colId === 'actions') return 'Ações';
        return colId;
    };

    const isFixedColumn = (id: string) => id === 'select' || id === 'actions';

    // --- Render ---
    if (loading && clients.length === 0) {
        return (
            <div className="bg-card shadow-sm ring-1 ring-border sm:rounded-xl p-12 flex justify-center">
                <Loader2 className="animate-spin h-8 w-8 text-primary" />
            </div>
        );
    }

    return (
        <div className="relative">
            {userRole !== 'OPERATOR' && (
                <div className="flex justify-end gap-2 mb-4">
                    <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting} className="border-border text-foreground hover:bg-accent">
                        {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                        Exportar
                    </Button>
                    <Button variant="default" size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setIsImportModalOpen(true)}>
                        <Upload className="w-4 h-4 mr-2" />
                        Importar
                    </Button>
                </div>
            )}

            <ImportModal
                open={isImportModalOpen}
                onOpenChange={setIsImportModalOpen}
                onSuccess={() => {
                    setIsImportModalOpen(false);
                    if (onRefresh) onRefresh();
                }}
            />

            {/* Column Selector Popover (Relocated) */}
            {columnSelectorOpen && (
                <>
                    <div className="fixed inset-0 z-30" onClick={() => setColumnSelectorOpen(false)} />
                    <div className="absolute left-0 top-8 z-40 w-80 bg-card rounded-lg shadow-2xl ring-1 ring-border p-4 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-100 origin-top-left border border-border">
                        <div className="flex items-center justify-between border-b border-border pb-2">
                            <h3 className="font-semibold text-foreground">Personalizar Colunas</h3>
                            <button onClick={() => setColumnSelectorOpen(false)} className="text-muted-foreground hover:text-foreground">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Procurar coluna..."
                                className="w-full pl-8 pr-3 py-2 border border-input rounded-md text-sm bg-background text-foreground focus:ring-primary focus:border-primary"
                                value={columnSearch}
                                onChange={(e) => setColumnSearch(e.target.value)}
                            />
                        </div>

                        {/* List */}
                        <div className="max-h-60 overflow-y-auto space-y-1">
                            <DndContext
                                sensors={selectorSensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleSelectorDragEnd}
                            >
                                <SortableContext
                                    items={tempOrder}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {tempOrder
                                        .filter(id => {
                                            const label = getColumnLabel(id).toLowerCase();
                                            return label.includes(columnSearch.toLowerCase());
                                        })
                                        .map(id => (
                                            <SortableColumnItem
                                                key={id}
                                                id={id}
                                                label={getColumnLabel(id)}
                                                isVisible={tempVisibility[id] !== false} // Default true if undefined
                                                isFixed={isFixedColumn(id)}
                                                onToggle={(clickedId: string) => {
                                                    setTempVisibility(prev => ({
                                                        ...prev,
                                                        [clickedId]: prev[clickedId] === false ? true : false
                                                    }));
                                                }}
                                            />
                                        ))}
                                </SortableContext>
                            </DndContext>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-between items-center pt-2 border-t border-border mt-1">
                            <button
                                onClick={resetColumnPreferences}
                                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                            >
                                <RotateCcw className="h-3 w-3" />
                                Restaurar
                            </button>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setColumnSelectorOpen(false)}
                                    className="px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent rounded transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={applyColumnPreferences}
                                    className="px-3 py-1.5 text-sm text-primary-foreground bg-primary hover:bg-primary/90 rounded shadow-sm transition-colors"
                                >
                                    Aplicar
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Floating Action Bar */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-card shadow-2xl rounded-full border border-border px-6 py-3 flex items-center gap-6 animate-in slide-in-from-bottom-5 duration-200">
                    <div className="flex items-center gap-2 border-r border-border pr-4">
                        <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                            {selectedIds.size}
                        </span>
                        <span className="text-sm font-medium text-foreground">selecionado(s)</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleBulkOpenAccount}
                            disabled={actionLoading}
                            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-accent px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                            <CheckCircle className="h-4 w-4" />
                            Marcar Conta Aberta
                        </button>
                        <div className="h-4 w-px bg-border mx-2" />
                        <button
                            onClick={handleBulkDelete}
                            disabled={actionLoading}
                            className="flex items-center gap-2 text-sm font-medium text-destructive hover:text-destructive/80 hover:bg-destructive/10 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            Excluir
                        </button>
                    </div>

                    <button
                        onClick={() => setSelectedIds(new Set())}
                        className="ml-2 text-muted-foreground hover:text-foreground"
                        title="Cancelar seleção"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
            )}

            <div className="bg-card shadow-sm border border-border sm:rounded-lg overflow-hidden">
                <DndContext
                    collisionDetection={closestCenter}
                    modifiers={[]}
                    onDragEnd={handleHeaderDragEnd}
                    sensors={sensors}
                >
                    <div className="w-full">
                        <table
                            className="w-full"
                            style={{
                                width: table.getTotalSize(),
                                minWidth: '100%',
                                tableLayout: 'fixed',
                            }}
                        >
                            <thead className="bg-muted/50">
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <tr key={headerGroup.id}>
                                        <SortableContext
                                            items={columnOrder}
                                            strategy={horizontalListSortingStrategy}
                                        >
                                            {headerGroup.headers.map((header) => (
                                                <DraggableTableHeader key={header.id} header={header} />
                                            ))}
                                        </SortableContext>
                                    </tr>
                                ))}
                            </thead>
                            <tbody className="divide-y divide-border bg-card">
                                {clients.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={columns.length}
                                            className="text-center py-10 text-muted-foreground"
                                        >
                                            Nenhum cliente encontrado.
                                        </td>
                                    </tr>
                                ) : (
                                    table.getRowModel().rows.map((row) => (
                                        <tr
                                            key={row.id}
                                            className={cn(
                                                "hover:bg-accent/50 cursor-pointer transition-colors",
                                                selectedIds.has(row.original.id) && "bg-primary/5"
                                            )}
                                            onClick={() => onClientClick(row.original.id)}
                                        >
                                            {row.getVisibleCells().map((cell) => (
                                                <td
                                                    key={cell.id}
                                                    className="break-words whitespace-normal px-6 py-2.5 text-[13px] text-muted-foreground first:pl-6 first:text-foreground first:font-medium"
                                                    style={{
                                                        width: cell.column.getSize(),
                                                    }}
                                                >
                                                    {flexRender(
                                                        cell.column.columnDef.cell,
                                                        cell.getContext()
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </DndContext>

                {/* Pagination Controls */}
                {clients.length > 0 && (
                    <div className="flex items-center justify-between border-t border-border bg-card px-6 py-3 sm:rounded-b-lg">
                        <div className="flex flex-1 justify-between sm:hidden">
                            <button
                                onClick={() => onPageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="relative inline-flex items-center rounded-md border border-input bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
                            >
                                Anterior
                            </button>
                            <button
                                onClick={() => onPageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="relative ml-3 inline-flex items-center rounded-md border border-input bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
                            >
                                Próxima
                            </button>
                        </div>
                        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                            <div className="flex items-center gap-4">
                                <p className="text-sm text-muted-foreground">
                                    Página <span className="font-medium">{currentPage}</span> de <span className="font-medium">{totalPages}</span>
                                </p>
                                {totalRecords !== undefined && totalRecords > 0 && (
                                    <p className="text-sm text-muted-foreground hidden sm:block">
                                        Total: <span className="font-medium text-foreground">{totalRecords}</span>
                                    </p>
                                )}
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">Linhas por página:</span>
                                    <select
                                        value={limit}
                                        onChange={(e) => onLimitChange(Number(e.target.value))}
                                        className="h-8 w-16 rounded-md border-input bg-background text-sm text-foreground focus:ring-primary focus:border-primary"
                                    >
                                        <option value={10}>10</option>
                                        <option value={20}>20</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                    </select>
                                </div>
                                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                    <button
                                        onClick={() => onPageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="relative inline-flex items-center rounded-l-md px-2 py-2 text-muted-foreground ring-1 ring-inset ring-border hover:bg-accent focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                    >
                                        <span className="sr-only">Anterior</span>
                                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                    {/* Simplified Pagination Numbers */}
                                    <button
                                        disabled
                                        className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-foreground ring-1 ring-inset ring-border focus:outline-offset-0 bg-transparent"
                                    >
                                        {currentPage}
                                    </button>
                                    <button
                                        onClick={() => onPageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className="relative inline-flex items-center rounded-r-md px-2 py-2 text-muted-foreground ring-1 ring-inset ring-border hover:bg-accent focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                    >
                                        <span className="sr-only">Próxima</span>
                                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

