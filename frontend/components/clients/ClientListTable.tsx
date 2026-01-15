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
        email: string;
    };
    surname?: string;
    cnpj?: string; // New field
    qualifications?: {
        agendamento?: string;
    }[];
    has_open_account?: boolean;
    [key: string]: any;
}

interface ClientListTableProps {
    clients: Client[];
    loading: boolean;
    onClientClick: (clientId: string) => void;
    onRefresh?: () => void;
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
            className={cn(
                "relative text-left text-sm font-semibold text-gray-900 border-b border-gray-200 bg-gray-50 group select-none",
                isDragging && "bg-gray-100 shadow-lg"
            )}
        >
            <div className="flex items-center gap-2 px-3 py-3.5 h-full">
                {header.column.id !== 'select' && header.column.id !== 'actions' && (
                    <button
                        {...attributes}
                        {...listeners}
                        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
                        title="Arrastar para reordenar"
                    >
                        <GripVertical className="h-4 w-4" />
                    </button>
                )}
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
            className="flex items-center gap-3 p-2 bg-white rounded-md border border-gray-100 mb-1 hover:border-gray-200"
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
            <span className="text-sm text-gray-700 flex-1">{label}</span>
        </div>
    );
};


export default function ClientListTable({ clients, loading, onClientClick, onRefresh }: ClientListTableProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [actionLoading, setActionLoading] = useState(false);

    // Column Config State
    const [columnSelectorOpen, setColumnSelectorOpen] = useState(false);
    const [columnSearch, setColumnSearch] = useState('');

    // --- Column Definitions ---
    const columns = useMemo<ColumnDef<Client>[]>(
        () => [
            {
                id: 'select',
                header: ({ table }) => (
                    <input
                        type="checkbox"
                        checked={clients.length > 0 && selectedIds.size === clients.length}
                        onChange={toggleAll}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 h-4 w-4 cursor-pointer"
                    />
                ),
                cell: ({ row }) => (
                    <div className="flex items-center justify-center">
                        <input
                            type="checkbox"
                            checked={selectedIds.has(row.original.id)}
                            onChange={() => toggleRow(row.original.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 h-4 w-4 cursor-pointer"
                        />
                    </div>
                ),
                size: 40,
                enableResizing: false,
            },
            {
                accessorKey: 'name',
                header: 'Razão Social',
                cell: (info) => <span className="font-medium text-gray-900">{info.getValue() as string}</span>,
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
                                    status === 'Cadastro salvo com sucesso!' ? "bg-green-50 text-green-700 ring-green-600/20" :
                                        "bg-gray-50 text-gray-600 ring-gray-500/10"
                            )}>
                                {status}
                            </span>
                            {hasOpenAccount && (
                                <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
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
                accessorFn: (row) => row.created_by?.name || '-',
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
                        className="text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 px-2 py-1 rounded text-sm font-medium"
                    >
                        Ver
                    </button>
                ),
                size: 80,
                enableResizing: false,
            }
        ],
        [onClientClick, selectedIds, clients]
    );

    // Initial State Calculation
    const defaultColumnOrder = columns.map(c => c.id || (c as any).accessorKey as string);
    const defaultColumnVisibility = { 'cnpj': false }; // CNPJ hidden by default

    // State
    const [columnOrder, setColumnOrder] = useState<string[]>(defaultColumnOrder);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(defaultColumnVisibility);

    // Load Preferences
    useEffect(() => {
        const saved = localStorage.getItem('client-table-config');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.order) setColumnOrder(parsed.order);
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
        setTempOrder([...defaultColumnOrder]);
        setTempVisibility({ ...defaultColumnVisibility });
    };

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
            <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl p-12 flex justify-center">
                <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="relative space-y-4">
            {/* Toolbar */}
            <div className="flex justify-end">
                <div className="relative">
                    <button
                        onClick={openColumnSelector}
                        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <Settings className="h-4 w-4 text-gray-500" />
                        Colunas
                    </button>

                    {/* Column Selector Modal/Popover */}
                    {columnSelectorOpen && (
                        <>
                            <div className="fixed inset-0 z-30" onClick={() => setColumnSelectorOpen(false)} />
                            <div className="absolute right-0 top-12 z-40 w-80 bg-white rounded-lg shadow-2xl ring-1 ring-black ring-opacity-5 p-4 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                                <div className="flex items-center justify-between border-b pb-2">
                                    <h3 className="font-semibold text-gray-900">Personalizar Colunas</h3>
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
                                        className="w-full pl-8 pr-3 py-2 border rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
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
                                            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
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
                </div>
            </div>

            {/* Floating Action Bar */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-white shadow-2xl rounded-full border border-gray-200 px-6 py-3 flex items-center gap-6 animate-in slide-in-from-bottom-5 duration-200">
                    <div className="flex items-center gap-2 border-r border-gray-200 pr-4">
                        <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            {selectedIds.size}
                        </span>
                        <span className="text-sm font-medium text-gray-700">selecionado(s)</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleBulkOpenAccount}
                            disabled={actionLoading}
                            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
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

            <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
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
                            <thead className="bg-gray-50">
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
                            <tbody className="divide-y divide-gray-200 bg-white">
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
                                                "hover:bg-gray-50 cursor-pointer transition-colors",
                                                selectedIds.has(row.original.id) && "bg-indigo-50/40"
                                            )}
                                            onClick={() => onClientClick(row.original.id)}
                                        >
                                            {row.getVisibleCells().map((cell) => (
                                                <td
                                                    key={cell.id}
                                                    className="truncate px-3 py-4 text-sm text-gray-500 first:pl-4 first:text-gray-900 first:font-medium sm:first:pl-6"
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
            </div>
        </div>
    );
}
