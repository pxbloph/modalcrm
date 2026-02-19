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
import { Loader2, GripVertical, Trash2, CheckCircle, Settings, RotateCcw, Search, X, Pencil, Ban, Check, UserPlus } from 'lucide-react';
import api from '@/lib/api';

interface User {
    id: string;
    name: string;
    surname?: string;
    email: string;
    role: string;
    is_active: boolean;
    supervisor: { name: string } | null;
    created_at: string;
}

interface UserListTableProps {
    users: User[];
    loading: boolean;
    onEdit: (user: User) => void;
    onDelete: (userId: string) => Promise<void>; // Single delete
    onRefresh: () => void;
}

// --- Constants ---
const DEFAULT_COLUMN_ORDER = ['select', 'user_info', 'email', 'role', 'is_active', 'supervisor', 'actions'];

// --- Draggable Header Component (Table) ---
const DraggableTableHeader = ({ header }: { header: Header<User, unknown> }) => {
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
                "relative text-left text-xs font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-200 bg-gray-50/50 group select-none cursor-grab active:cursor-grabbing hover:bg-gray-100/50 transition-colors dark:bg-zinc-900 dark:border-zinc-800 dark:text-gray-400 dark:hover:bg-zinc-800",
                isDragging && "bg-gray-100 shadow-lg dark:bg-zinc-800"
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
                        "absolute right-0 top-0 h-full w-px cursor-col-resize hover:bg-indigo-500 touch-none select-none",
                        header.column.getIsResizing() ? "bg-indigo-600 w-0.5 isResizing" : "bg-transparent"
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
            <span className="text-sm text-gray-700 flex-1 dark:text-gray-300">{label}</span>
        </div>
    );
};


export default function UserListTable({ users, loading, onEdit, onDelete, onRefresh }: UserListTableProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [actionLoading, setActionLoading] = useState(false);
    const [supervisorModalOpen, setSupervisorModalOpen] = useState(false);
    const [selectedSupervisorId, setSelectedSupervisorId] = useState('');


    // Column Config State
    const [columnSelectorOpen, setColumnSelectorOpen] = useState(false);
    const [columnSearch, setColumnSearch] = useState('');

    // State
    const [columnOrder, setColumnOrder] = useState<string[]>(DEFAULT_COLUMN_ORDER);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

    // Load Preferences
    useEffect(() => {
        const saved = localStorage.getItem('user-table-config');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.order) {
                    // Merge saved order with default/current columns to ensure new columns show up
                    const savedSet = new Set(parsed.order);
                    const newColumns = DEFAULT_COLUMN_ORDER.filter(colId => !savedSet.has(colId));
                    const existingSavedColumns = parsed.order.filter((colId: string) => DEFAULT_COLUMN_ORDER.includes(colId));
                    setColumnOrder([...existingSavedColumns, ...newColumns]);
                }
                if (parsed.visibility) setColumnVisibility(parsed.visibility);
            } catch (e) {
                console.error("Failed to load user table config", e);
            }
        }
    }, []);

    const savePreferences = (newOrder: string[], newVisibility: VisibilityState) => {
        localStorage.setItem('user-table-config', JSON.stringify({
            order: newOrder,
            visibility: newVisibility
        }));
    };

    // Temp state for selector (to allow "Cancel"/"Apply")
    const [tempOrder, setTempOrder] = useState<string[]>([]);
    const [tempVisibility, setTempVisibility] = useState<VisibilityState>({});

    // --- Selection Logic ---
    const toggleAll = () => {
        if (selectedIds.size === users.length && users.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(users.map(u => u.id)));
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
        setTempVisibility({});
    };

    // --- Column Definitions ---
    const columns = useMemo<ColumnDef<User>[]>(
        () => [
            {
                id: 'select',
                header: ({ table }) => (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                openColumnSelector();
                            }}
                            className="text-gray-400 hover:text-gray-600 p-0.5 rounded-sm hover:bg-gray-100"
                            title="Configurar Colunas"
                        >
                            <Settings className="h-3.5 w-3.5" />
                        </button>
                        <input
                            type="checkbox"
                            checked={users.length > 0 && selectedIds.size === users.length}
                            onChange={toggleAll}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 h-4 w-4 cursor-pointer"
                        />
                    </div>
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
                size: 50,
                enableResizing: false,
            },
            {
                accessorKey: 'name', // Using name for identification, but cell renders avatar + full name
                id: 'user_info',
                header: 'Usuário',
                cell: ({ row }) => {
                    const user = row.original;
                    return (
                        <div className="flex items-center">
                            <div className="h-9 w-9 flex-shrink-0 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm uppercase">
                                {user.name.charAt(0)}
                            </div>
                            <div className="ml-4">
                                <div className="font-medium text-gray-900 dark:text-gray-100">{user.name} {user.surname}</div>
                            </div>
                        </div>
                    );
                },
                minSize: 200,
            },
            {
                accessorKey: 'email',
                header: 'Email',
                cell: (info) => <span className="text-gray-500 dark:text-gray-400">{info.getValue() as string}</span>,
                minSize: 200,
            },
            {
                accessorKey: 'role',
                header: 'Função',
                cell: (info) => (
                    <span className={cn(
                        "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
                        info.getValue() === 'ADMIN' ? "bg-purple-50 text-purple-700 ring-purple-600/20" :
                            info.getValue() === 'SUPERVISOR' ? "bg-blue-50 text-blue-700 ring-blue-600/20" :
                                "bg-gray-50 text-gray-600 ring-gray-500/10"
                    )}>
                        {info.getValue() as string}
                    </span>
                ),
                minSize: 120,
            },
            {
                accessorKey: 'is_active',
                header: 'Status',
                cell: (info) => (
                    <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset",
                        info.getValue()
                            ? "bg-green-50 text-green-700 ring-green-600/20"
                            : "bg-red-50 text-red-700 ring-red-600/20"
                    )}>
                        {info.getValue() ? 'Ativo' : 'Inativo'}
                    </span>
                ),
                minSize: 100,
            },
            {
                id: 'supervisor',
                header: 'Supervisor',
                accessorFn: (row) => row.supervisor?.name || '-',
                minSize: 150,
            },
            {
                id: 'actions',
                header: 'Ações',
                cell: ({ row }) => (
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(row.original);
                            }}
                            className="text-indigo-600 hover:text-indigo-900 p-1 rounded-md hover:bg-indigo-50"
                            title="Editar"
                        >
                            <Pencil className="h-4 w-4" />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(row.original.id);
                            }}
                            className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-50"
                            title="Excluir"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                ),
                size: 100,
                enableResizing: false,
            }
        ],
        [onEdit, onDelete, selectedIds, users, columnSelectorOpen] //Added columnSelectorOpen dependency
    );

    // --- Bulk Actions ---
    const handleBulkDelete = async () => {
        const count = selectedIds.size;
        if (!confirm(`Tem certeza que deseja EXCLUIR ${count} usuários selecionados? Esta ação é irreversível.`)) return;

        setActionLoading(true);
        try {
            await api.delete('/users/batch/bulk-delete', { data: { ids: Array.from(selectedIds) } });
            alert(`${count} usuários excluídos com sucesso.`);
            setSelectedIds(new Set());
            if (onRefresh) onRefresh();
        } catch (error: any) {
            console.error("Bulk delete failed", error);
            alert(error.response?.data?.message || "Erro ao excluir usuários.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleBulkStatusChange = async (isActive: boolean) => {
        const action = isActive ? 'ATIVAR' : 'DESATIVAR';
        const count = selectedIds.size;
        if (!confirm(`Deseja realmente ${action} ${count} usuários selecionados?`)) return;

        setActionLoading(true);
        try {
            await api.patch('/users/batch/bulk-status', { ids: Array.from(selectedIds), isActive });
            alert(`${count} usuários atualizados com sucesso.`);
            setSelectedIds(new Set());
            if (onRefresh) onRefresh();
        } catch (error: any) {
            console.error("Bulk status update failed", error);
            alert(error.response?.data?.message || "Erro ao atualizar status.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleBulkSupervisorOpen = () => {
        setSupervisorModalOpen(true);
        setSelectedSupervisorId('');
    };

    const handleBulkSupervisorSubmit = async () => {
        const count = selectedIds.size;
        if (!selectedSupervisorId && selectedSupervisorId !== null) return;
        if (!selectedSupervisorId) {
            alert('Selecione um supervisor.');
            return;
        }

        setActionLoading(true);
        try {
            await api.patch('/users/batch/bulk-supervisor', {
                ids: Array.from(selectedIds),
                supervisorId: selectedSupervisorId === 'none' ? null : selectedSupervisorId
            });
            alert(`${count} usuários atualizados com sucesso.`);
            setSelectedIds(new Set());
            setSupervisorModalOpen(false);
            if (onRefresh) onRefresh();
        } catch (error: any) {
            console.error("Bulk supervisor update failed", error);
            alert(error.response?.data?.message || "Erro ao atribuir supervisor.");
        } finally {
            setActionLoading(false);
        }
    };

    // Filter supervisors for the modal list
    const supervisorsList = useMemo(() => users.filter(u => u.role === 'SUPERVISOR'), [users]);


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

    // Table Instance
    const table = useReactTable({
        data: users,
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

    // --- Render ---
    if (loading && users.length === 0) {
        return (
            <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl p-12 flex justify-center">
                <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="relative space-y-4">
            {/* Column Selector Popover (Relocated) */}
            {columnSelectorOpen && (
                <>
                    <div className="fixed inset-0 z-30" onClick={() => setColumnSelectorOpen(false)} />
                    <div className="absolute left-0 top-8 z-40 w-80 bg-white rounded-lg shadow-2xl ring-1 ring-black ring-opacity-5 p-4 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-100 origin-top-left dark:bg-zinc-900 dark:ring-zinc-700">
                        <div className="flex items-center justify-between border-b pb-2 dark:border-zinc-800">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Personalizar Colunas</h3>
                            <button onClick={() => setColumnSelectorOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Procurar coluna..."
                                className="w-full pl-8 pr-3 py-2 border rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
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
                            onClick={() => handleBulkStatusChange(true)}
                            disabled={actionLoading}
                            className="flex items-center gap-2 text-sm font-medium text-green-700 hover:text-green-800 hover:bg-green-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            Ativar
                        </button>
                        <button
                            onClick={() => handleBulkStatusChange(false)}
                            disabled={actionLoading}
                            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-zinc-800"
                        >
                            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                            Desativar
                        </button>
                        <div className="h-4 w-px bg-gray-300 mx-2" />
                        <button
                            onClick={handleBulkSupervisorOpen}
                            disabled={actionLoading}
                            className="flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                            <UserPlus className="h-4 w-4" />
                            Supervisor
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

            <div className="bg-white shadow-sm border border-gray-200 sm:rounded-lg dark:bg-zinc-900 dark:border-zinc-800 overflow-hidden">
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
                            <tbody className="divide-y divide-gray-200 bg-white dark:divide-zinc-800 dark:bg-zinc-900">
                                {users.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={columns.length}
                                            className="text-center py-10 text-gray-500"
                                        >
                                            Nenhum usuário encontrado.
                                        </td>
                                    </tr>
                                ) : (
                                    table.getRowModel().rows.map((row) => (
                                        <tr
                                            key={row.id}
                                            className={cn(
                                                "hover:bg-gray-50 cursor-pointer transition-colors dark:hover:bg-zinc-800/50",
                                                selectedIds.has(row.original.id) && "bg-indigo-50/40 dark:bg-indigo-900/20"
                                            )}
                                        >
                                            {row.getVisibleCells().map((cell) => (
                                                <td
                                                    key={cell.id}
                                                    className="break-words whitespace-normal px-6 py-2.5 text-[13px] text-gray-600 first:pl-6 first:text-gray-900 first:font-medium dark:text-gray-400 dark:first:text-gray-100"
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


            {/* Supervisor Selection Modal */}
            {
                supervisorModalOpen && (
                    <>
                        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" onClick={() => setSupervisorModalOpen(false)} />
                        <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-full max-w-md bg-white rounded-xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Atribuir Supervisor</h3>
                                <button onClick={() => setSupervisorModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <p className="text-sm text-gray-500 mb-4">
                                Selecione o supervisor para os <span className="font-medium text-gray-900">{selectedIds.size}</span> usuários selecionados.
                            </p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Supervisor
                                    </label>
                                    <select
                                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border text-gray-900"
                                        value={selectedSupervisorId}
                                        onChange={(e) => setSelectedSupervisorId(e.target.value)}
                                    >
                                        <option value="">Selecione...</option>
                                        <option value="none">-- Nenhum (Remover) --</option>
                                        {supervisorsList.map(s => (
                                            <option key={s.id} value={s.id}>{s.name} {s.surname ? s.surname : ''}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        onClick={() => setSupervisorModalOpen(false)}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleBulkSupervisorSubmit}
                                        disabled={actionLoading || !selectedSupervisorId}
                                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                        Salvar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )
            }
        </div>
    );
}
