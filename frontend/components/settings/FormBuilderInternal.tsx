'use client';

import React, { useState } from 'react';
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
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, Plus, Trash2, Settings } from 'lucide-react';

interface FieldOption {
    label: string;
    value: string;
}

export interface FormField {
    id: string;
    type: 'text' | 'textarea' | 'number' | 'email' | 'select' | 'radio' | 'checkbox' | 'date' | 'datetime-local';
    label: string;
    required: boolean;
    options?: FieldOption[]; // For select, radio
    placeholder?: string;
    systemField?: string; // If mapped to a fixed database column
}

interface SortableFieldProps {
    field: FormField;
    onRemove: (id: string) => void;
    onEdit: (field: FormField) => void;
}

const SortableField = ({ field, onRemove, onEdit }: SortableFieldProps) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: field.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="group relative bg-white border border-gray-200 rounded-lg p-4 mb-3 hover:border-indigo-300 transition-colors shadow-sm dark:bg-zinc-800 dark:border-zinc-700 dark:hover:border-indigo-500"
        >
            <div className="flex items-start gap-3">
                <button
                    {...attributes}
                    {...listeners}
                    className="mt-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing dark:text-gray-500 dark:hover:text-gray-300"
                >
                    <GripVertical className="h-5 w-5" />
                </button>

                <div className="flex-1" onClick={() => onEdit(field)}>
                    <div className="flex justify-between items-start">
                        <div>
                            <h4 className="font-medium text-gray-900 flex items-center gap-2 dark:text-gray-100">
                                {field.label}
                                {field.required && <span className="text-red-500 text-xs">*</span>}
                            </h4>
                            <p className="text-xs text-gray-500 uppercase mt-0.5 dark:text-gray-400">{field.type}</p>

                            {field.systemField && (
                                <span className="inline-block mt-1 bg-gray-100 text-gray-600 text-[10px] px-1.5 py-0.5 rounded border border-gray-200 dark:bg-zinc-700 dark:text-gray-300 dark:border-zinc-600">
                                    Campo de Sistema: {field.systemField}
                                </span>
                            )}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={(e) => { e.stopPropagation(); onEdit(field); }}
                                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded dark:text-gray-500 dark:hover:text-indigo-400 dark:hover:bg-indigo-900/30"
                            >
                                <Settings className="h-4 w-4" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onRemove(field.id); }}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded dark:text-gray-500 dark:hover:text-red-400 dark:hover:bg-red-900/30"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Preview of options */}
                    {(field.type === 'select' || field.type === 'radio') && field.options && field.options.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                            {field.options.map((opt, idx) => (
                                <span key={idx} className="text-xs bg-gray-50 text-gray-600 px-2 py-0.5 rounded border border-gray-100 dark:bg-zinc-700 dark:text-gray-300 dark:border-zinc-600">
                                    {opt.label}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default function FormBuilderInternal({
    fields,
    onChange
}: {
    fields: FormField[];
    onChange: (fields: FormField[]) => void;
}) {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const [editingField, setEditingField] = useState<FormField | null>(null);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active && over && active.id !== over.id) {
            const oldIndex = fields.findIndex(f => f.id === active.id);
            const newIndex = fields.findIndex(f => f.id === over.id);
            onChange(arrayMove(fields, oldIndex, newIndex));
        }
    };

    const addField = () => {
        const newField: FormField = {
            id: `field_${Date.now()}`,
            type: 'text',
            label: 'Nova Pergunta',
            required: false,
        };
        onChange([...fields, newField]);
        setEditingField(newField);
    };

    const updateField = (updated: FormField) => {
        setEditingField(updated);
        onChange(fields.map(f => f.id === updated.id ? updated : f));
    };

    const removeField = (id: string) => {
        if (confirm('Remover este campo?')) {
            onChange(fields.filter(f => f.id !== id));
        }
    };

    return (
        <div className="flex gap-6 h-[calc(100vh-200px)]">
            {/* Main Builder Area */}
            <div className="flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Estrutura do Formulário</h3>
                    <button
                        onClick={addField}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium"
                    >
                        <Plus className="h-4 w-4" /> Adicionar Campo
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto bg-gray-50 rounded-xl border border-gray-200 p-4 dark:bg-zinc-900 dark:border-zinc-800">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={fields.map(f => f.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {fields.length === 0 ? (
                                <div className="text-center py-20 text-gray-400 dark:text-gray-500">
                                    Nenhum campo adicionado. Clique em "Adicionar Campo".
                                </div>
                            ) : (
                                fields.map((field) => (
                                    <SortableField
                                        key={field.id}
                                        field={field}
                                        onRemove={removeField}
                                        onEdit={setEditingField}
                                    />
                                ))
                            )}
                        </SortableContext>
                    </DndContext>
                </div>
            </div>

            {/* Properties Panel (Sidebar) */}
            {editingField && (
                <div className="w-80 bg-white border-l border-gray-200 p-6 overflow-y-auto shadow-xl fixed right-0 top-0 bottom-0 z-50 md:relative md:z-auto md:shadow-none md:top-auto md:bottom-auto md:h-full dark:bg-zinc-900 dark:border-zinc-800">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Editar Campo</h3>
                        <button onClick={() => setEditingField(null)} className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Tipo</label>
                            <select
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border text-gray-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-gray-100"
                                value={editingField.type}
                                onChange={e => updateField({ ...editingField, type: e.target.value as any })}
                            >
                                <option value="text">Texto Curto</option>
                                <option value="email">E-mail</option>
                                <option value="textarea">Texto Longo</option>
                                <option value="number">Número / Moeda</option>
                                <option value="select">Lista de Opções (Select)</option>
                                <option value="radio">Múltipla Escolha (Radio)</option>
                                <option value="checkbox">Checkbox (Sim/Não)</option>
                                <option value="date">Data</option>
                                <option value="datetime-local">Data e Hora</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Rótulo (Label)</label>
                            <input
                                type="text"
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border text-gray-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-gray-100"
                                value={editingField.label}
                                onChange={e => updateField({ ...editingField, label: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Placeholder</label>
                            <input
                                type="text"
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border text-gray-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-gray-100"
                                value={editingField.placeholder || ''}
                                onChange={e => updateField({ ...editingField, placeholder: e.target.value })}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="req"
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 dark:bg-zinc-800 dark:border-zinc-700"
                                checked={editingField.required}
                                onChange={e => updateField({ ...editingField, required: e.target.checked })}
                            />
                            <label htmlFor="req" className="text-sm text-gray-700 dark:text-gray-300">Obrigatório</label>
                        </div>

                        {/* Options Editor for Select/Radio */}
                        {(editingField.type === 'select' || editingField.type === 'radio') && (
                            <div className="pt-4 border-t border-gray-100 dark:border-zinc-800">
                                <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">Opções</label>
                                <button
                                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium mb-2 flex items-center gap-1"
                                    onClick={() => {
                                        const newOpts = [...(editingField.options || []), { label: 'Nova Opção', value: 'nova' }];
                                        updateField({ ...editingField, options: newOpts });
                                    }}
                                >
                                    <Plus className="h-3 w-3" /> Adicionar Opção
                                </button>

                                <div className="space-y-2">
                                    {editingField.options?.map((opt, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <input
                                                type="text"
                                                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs p-1.5 border text-gray-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-gray-100"
                                                value={opt.label}
                                                onChange={e => {
                                                    const newOpts = [...(editingField.options || [])];
                                                    newOpts[idx] = { ...newOpts[idx], label: e.target.value, value: e.target.value };
                                                    updateField({ ...editingField, options: newOpts });
                                                }}
                                            />
                                            <button
                                                onClick={() => {
                                                    const newOpts = (editingField.options || []).filter((_, i) => i !== idx);
                                                    updateField({ ...editingField, options: newOpts });
                                                }}
                                                className="text-gray-400 hover:text-red-500"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="pt-4 mt-4 border-t border-gray-100 text-xs text-gray-500 dark:border-zinc-800 dark:text-gray-400">
                            <p>ID do Campo: <span className="font-mono">{editingField.id}</span></p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
