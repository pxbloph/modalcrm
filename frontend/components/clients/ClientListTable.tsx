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
import { Loader2, GripVertical, Trash2, CheckCircle, Settings, RotateCcw, Search, X } from 'lucide-react';
import api from '@/lib/api';

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
                "relative text-left text-sm font-semibold text-gray-900 border-b border-gray-200 bg-gray-50 group select-none cursor-grab active:cursor-grabbing hover:bg-gray-100/50 transition-colors dark:bg-zinc-900 dark:text-gray-100 dark:border-zinc-800 dark:hover:bg-zinc-800",
                isDragging && "bg-gray-100 shadow-lg dark:bg-zinc-800"
            )}
        >
            <div className="flex items-center gap-2 px-3 py-3.5 h-full">
                <span className="flex-1 truncate">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </span>
                <div
                    onMouseDown={header.getResizeHandler()}
                    onTouchStart={header.getResizeHandler()}
                    className={cn(
                        "absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-indigo-500 touch-none select-none",
                        header.column.getIsResizing() ? "bg-indigo-600 w-1.5 isResizing" : "bg-transparent"
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
            className="flex items-center gap-3 p-2 bg-white rounded-md border border-gray-100 mb-1 hover:border-gray-200 dark:bg-zinc-800 dark:border-zinc-700 dark:hover:border-zinc-600"
        >
            <button
                {...attributes}
                {...listeners}
                className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
            >
                <GripVertical className="h-4 w-4" />
            </button>
            <input
                type="checkbox"
                checked={isVisible}
                disabled={isFixed}
                onChange={() => onToggle(id)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 disabled:opacity-50"
            />
            <span className="text-sm text-gray-700 flex-1 dark:text-gray-200">{label}</span>
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
    totalRecords
}: ClientListTableProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [actionLoading, setActionLoading] = useState(false);

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
                    <div className="flex items-center gap-2 pl-1">
                        <input
                            type="checkbox"
                            checked={clients.length > 0 && selectedIds.size === clients.length}
                            onChange={toggleAll}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 h-4 w-4 cursor-pointer dark:bg-zinc-800 dark:border-zinc-600"
                        />
                        <button
                            onClick={(e) => { e.stopPropagation(); openColumnSelector(); }}
                            className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-200/50 transition-colors dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-zinc-700"
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
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 h-4 w-4 cursor-pointer dark:bg-zinc-800 dark:border-zinc-600"
                        />
                    </div>
                ),
                size: 65,
                enableResizing: false,
            },
            {
                accessorKey: 'name',
                header: 'Razão Social',
                cell: (info) => <span className="font-medium text-gray-900 dark:text-gray-100">{info.getValue() as string}</span>,
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
                                (status === 'Pendente' || status === 'Cadastrando...') ? "bg-yellow-50 text-yellow-800 ring-yellow-600/20" :
                                    status === 'Cadastro salvo com sucesso!' ? "bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/30 dark:text-green-400 dark:ring-green-500/30" :
                                        "bg-gray-50 text-gray-600 ring-gray-500/10 dark:bg-zinc-800 dark:text-gray-400 dark:ring-gray-700"
                            )}>
                                {status}
                            </span>
                            {hasOpenAccount && (
                                <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-500/30">
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
                cell: (info) => <span className="text-gray-700 dark:text-gray-300">{info.getValue() as string}</span>,
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
                        className="text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 px-2 py-1 rounded text-sm font-medium dark:text-indigo-400 dark:hover:text-indigo-200 dark:hover:bg-indigo-900/30"
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
            <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl p-12 flex justify-center dark:bg-zinc-900 dark:ring-zinc-800">
                <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="relative">
            {/* Column Selector Popover (Relocated) */}
            {columnSelectorOpen && (
                <>
                    <div className="fixed inset-0 z-30" onClick={() => setColumnSelectorOpen(false)} />
                    <div className="absolute left-0 top-8 z-40 w-80 bg-white rounded-lg shadow-2xl ring-1 ring-black ring-opacity-5 p-4 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-100 origin-top-left dark:bg-zinc-900 dark:ring-zinc-700">
                        <div className="flex items-center justify-between border-b pb-2">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Personalizar Colunas</h3>
                            <button onClick={() => setColumnSelectorOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Procurar coluna..."
                                className="w-full pl-8 pr-3 py-2 border rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-zinc-800 dark:border-zinc-700 dark:text-gray-100"
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
                        <div className="flex justify-between items-center pt-2 border-t mt-1">
                            <button
                                onClick={resetColumnPreferences}
                                className="text-xs text-gray-500 hover:text-indigo-600 flex items-center gap-1"
                            >
                                <RotateCcw className="h-3 w-3" />
                                Restaurar
                            </button>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setColumnSelectorOpen(false)}
                                    className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded dark:text-gray-400 dark:hover:bg-zinc-800"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={applyColumnPreferences}
                                    className="px-3 py-1.5 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow-sm"
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
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-white shadow-2xl rounded-full border border-gray-200 px-6 py-3 flex items-center gap-6 animate-in slide-in-from-bottom-5 duration-200 dark:bg-zinc-900 dark:border-zinc-700">
                    <div className="flex items-center gap-2 border-r border-gray-200 pr-4">
                        <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            {selectedIds.size}
                        </span>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">selecionado(s)</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleBulkOpenAccount}
                            disabled={actionLoading}
                            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 dark:text-gray-300 dark:hover:text-indigo-400 dark:hover:bg-zinc-800"
                        >
                            <CheckCircle className="h-4 w-4" />
                            Marcar Conta Aberta
                        </button>
                        <div className="h-4 w-px bg-gray-300 mx-2" />
                        <button
                            onClick={handleBulkDelete}
                            disabled={actionLoading}
                            className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            Excluir
                        </button>
                    </div>

                    <button
                        onClick={() => setSelectedIds(new Set())}
                        className="ml-2 text-gray-400 hover:text-gray-600"
                        title="Cancelar seleção"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
            )}

            <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl dark:bg-zinc-900 dark:ring-zinc-800">
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
                            <thead className="bg-gray-50 dark:bg-zinc-900">
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
                            <tbody className="divide-y divide-gray-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
                                {clients.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={columns.length}
                                            className="text-center py-10 text-gray-500"
                                        >
                                            Nenhum cliente encontrado.
                                        </td>
                                    </tr>
                                ) : (
                                    table.getRowModel().rows.map((row) => (
                                        <tr
                                            key={row.id}
                                            className={cn(
                                                "hover:bg-gray-50 cursor-pointer transition-colors dark:hover:bg-zinc-900",
                                                selectedIds.has(row.original.id) && "bg-indigo-50/40 dark:bg-indigo-900/20"
                                            )}
                                            onClick={() => onClientClick(row.original.id)}
                                        >
                                            {row.getVisibleCells().map((cell) => (
                                                <td
                                                    key={cell.id}
                                                    className="break-words whitespace-normal px-3 py-3 text-sm text-gray-500 first:pl-4 first:text-gray-900 first:font-medium sm:first:pl-6 dark:text-gray-400 dark:first:text-gray-100"
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
                    <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 sm:rounded-b-xl dark:bg-zinc-900 dark:border-zinc-800">
                        <div className="flex flex-1 justify-between sm:hidden">
                            <button
                                onClick={() => onPageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-gray-300 dark:hover:bg-zinc-700"
                            >
                                Anterior
                            </button>
                            <button
                                onClick={() => onPageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-gray-300 dark:hover:bg-zinc-700"
                            >
                                Próxima
                            </button>
                        </div>
                        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                            <div className="flex items-center gap-4">
                                <p className="text-sm text-gray-700 dark:text-gray-400">
                                    Página <span className="font-medium">{currentPage}</span> de <span className="font-medium">{totalPages}</span>
                                </p>
                                {totalRecords !== undefined && totalRecords > 0 && (
                                    <p className="text-sm text-gray-500 hidden sm:block dark:text-gray-500">
                                        Total: <span className="font-medium text-gray-700 dark:text-gray-400">{totalRecords}</span>
                                    </p>
                                )}
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-700 whitespace-nowrap dark:text-gray-400">Por página:</span>
                                    <select
                                        value={limit}
                                        onChange={(e) => onLimitChange(Number(e.target.value))}
                                        className="block w-auto rounded-md border-0 py-1 pl-2 pr-8 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6 dark:bg-zinc-800 dark:text-gray-100 dark:ring-zinc-700"
                                    >
                                        <option value={5}>5</option>
                                        <option value={10}>10</option>
                                        <option value={20}>20</option>
                                        <option value={50}>50</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                    <button
                                        onClick={() => onPageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 dark:bg-zinc-800 dark:ring-zinc-700 dark:hover:bg-zinc-700"
                                    >
                                        <span className="sr-only">Anterior</span>
                                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => onPageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 dark:bg-zinc-800 dark:ring-zinc-700 dark:hover:bg-zinc-700"
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
