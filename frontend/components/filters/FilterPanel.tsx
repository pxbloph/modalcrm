'use client';

import React, { useState } from 'react';
import { Search, X, Check, Calendar, User, List, Filter, Plus, Save, Trash2 } from 'lucide-react';
import { DateRangePickerBtx } from './DateRangePickerBtx';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AddFieldModal } from './AddFieldModal';
import { FILTER_FIELDS, FilterField } from '@/lib/filter-definitions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FilterPanelProps {
    users: { id: string, name: string; surname?: string }[];
    tabulationOptions: string[];

    // New Dynamic Props
    visibleFields: string[];
    activeFilters: { id: string, value: any }[];
    onFilterChange: (id: string, value: any) => void;
    onRemoveField: (id: string) => void;
    onAddField: (id: string) => void;
    onClearAll: () => void;
    onApply: () => void;

    // Presets (Optional for now, will implement logic soon)
    presets?: any[];
    onSavePreset?: (name: string) => void;
    onDeletePreset?: (id: string) => void;
}

export function FilterPanel({
    users,
    tabulationOptions,
    visibleFields,
    activeFilters,
    onFilterChange,
    onRemoveField,
    onAddField,
    onClearAll,
    onApply,
    presets = [],
    onSavePreset,
    onDeletePreset
}: FilterPanelProps) {
    const [isAddingField, setIsAddingField] = useState(false);
    const [isSavingPreset, setIsSavingPreset] = useState(false);
    const [presetName, setPresetName] = useState('');

    const getFieldValue = (id: string) => activeFilters.find(f => f.id === id)?.value || '';

    const renderField = (field: FilterField) => {
        const value = getFieldValue(field.id);

        switch (field.type) {
            case 'text':
                return (
                    <input
                        type="text"
                        className="w-full h-9 px-3 text-sm border rounded-md bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 focus:ring-1 focus:ring-green-500 outline-none"
                        placeholder={field.placeholder}
                        value={value}
                        onChange={(e) => onFilterChange(field.id, e.target.value)}
                    />
                );
            case 'select':
                const options = field.id === 'tabulation' ? tabulationOptions : (field.options?.map(o => o.value) || []);
                return (
                    <Select value={value || '__all__'} onValueChange={(val) => onFilterChange(field.id, val === '__all__' ? '' : val)}>
                        <SelectTrigger className="w-full h-9 px-3 text-sm border rounded-md bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700">
                            <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__all__">Todas</SelectItem>
                            {options.map((opt, idx) => (
                                <SelectItem key={idx} value={opt}>{opt}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                );
            case 'user':
                return (
                    <Select value={value || '__all__'} onValueChange={(val) => onFilterChange(field.id, val === '__all__' ? '' : val)}>
                        <SelectTrigger className="w-full h-9 px-3 text-sm border rounded-md bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700">
                            <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__all__">Todos</SelectItem>
                            {users.map((u) => (
                                <SelectItem key={u.id} value={u.id}>{u.name} {u.surname || ''}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                );
            case 'date-range':
                // Assuming value is { from, to } or string?
                // Let's stick to the DateRangePickerBtx component
                return (
                    <DateRangePickerBtx
                        date={value}
                        onDateChange={(range) => onFilterChange(field.id, range)}
                        label={field.label}
                    />
                );
            case 'boolean':
                return (
                    <div className="flex gap-2">
                        <Button
                            variant={value === 'true' ? 'default' : 'outline'}
                            size="sm"
                            className="h-8 text-xs flex-1"
                            onClick={() => onFilterChange(field.id, value === 'true' ? '' : 'true')}
                        >
                            Sim
                        </Button>
                        <Button
                            variant={value === 'false' ? 'default' : 'outline'}
                            size="sm"
                            className="h-8 text-xs flex-1"
                            onClick={() => onFilterChange(field.id, value === 'false' ? '' : 'false')}
                        >
                            Não
                        </Button>
                    </div>
                );
        }
    };

    return (
        <div className="p-4 space-y-6 min-w-[320px] sm:min-w-[450px] bg-white dark:bg-zinc-900 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-green-50 dark:bg-green-500/10 rounded-lg">
                        <Filter className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Filtros</h3>
                        <p className="text-[10px] text-gray-400">Configure sua visualização</p>
                    </div>
                </div>
                <Button variant="ghost" size="sm" onClick={onClearAll} className="h-8 text-xs text-gray-400 hover:text-red-500">
                    Limpar Tudo
                </Button>
            </div>

            {/* Presets / Favorites (Bitrix Style) */}
            <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Favoritos</label>
                <div className="flex flex-wrap gap-2">
                    {presets.map(p => (
                        <div key={p.id} className="group relative">
                            <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                    "h-7 text-xs rounded-full border-gray-200 dark:border-zinc-700 bg-gray-50/50 dark:bg-zinc-800/50 pr-8",
                                    p.is_active && "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30 text-green-600"
                                )}
                                onClick={() => {
                                    // Apply preset filters from config_json
                                    const config = p.config_json;
                                    if (config && config.filters) {
                                        config.filters.forEach((f: any) => onFilterChange(f.id, f.value));
                                    }
                                    // Apply visible fields if we had a way to set them
                                    // For now, applying the filters is already a big step
                                    onApply();
                                }}
                            >
                                {p.name}
                            </Button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onDeletePreset?.(p.id); }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-500 transition-all"
                            >
                                <X className="w-2.5 h-2.5" />
                            </button>
                        </div>
                    ))}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs rounded-full text-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10"
                        onClick={() => setIsSavingPreset(true)}
                    >
                        <Plus className="w-3 h-3 mr-1" /> Salvar Filtro
                    </Button>
                </div>
            </div>

            {/* Fields List */}
            <div className="flex-1 overflow-y-auto space-y-5 pr-2 custom-scrollbar">
                {visibleFields.map(fieldId => {
                    const field = FILTER_FIELDS.find(f => f.id === fieldId);
                    if (!field) return null;

                    return (
                        <div key={fieldId} className="space-y-2 group">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                    {field.label}
                                </label>
                                <button
                                    onClick={() => onRemoveField(fieldId)}
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-all"
                                >
                                    <X className="w-3 h-3 text-gray-400" />
                                </button>
                            </div>
                            {renderField(field)}
                        </div>
                    );
                })}

                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-4 h-9 border-dashed border-2 border-gray-100 dark:border-zinc-800 text-gray-400 hover:text-green-500 hover:border-green-500/30 hover:bg-green-50 dark:hover:bg-green-500/5 text-xs"
                    onClick={() => setIsAddingField(true)}
                >
                    <Plus className="w-3 h-3 mr-2" />
                    Adicionar Campo
                </Button>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t mt-4 flex gap-2">
                <Button
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium h-10 shadow-lg shadow-green-500/20"
                    onClick={onApply}
                >
                    <Check className="w-4 h-4 mr-2" />
                    Pesquisar
                </Button>
            </div>

            {isAddingField && (
                <AddFieldModal
                    onClose={() => setIsAddingField(false)}
                    onAdd={onAddField}
                    visibleFields={visibleFields}
                />
            )}

            {/* Save Preset Modal (Small) */}
            {isSavingPreset && (
                <div className="absolute inset-0 z-[60] bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-2xl border w-full max-w-xs space-y-4">
                        <h4 className="font-semibold text-sm">Salvar este filtro?</h4>
                        <input
                            autoFocus
                            className="w-full h-9 px-3 text-sm border rounded-md"
                            placeholder="Nome do filtro (ex: Meus Leads)"
                            value={presetName}
                            onChange={(e) => setPresetName(e.target.value)}
                        />
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" className="flex-1" onClick={() => setIsSavingPreset(false)}>Cancelar</Button>
                            <Button size="sm" className="flex-1 bg-green-500 hover:bg-green-600" onClick={() => {
                                if (presetName.trim() && onSavePreset) {
                                    onSavePreset(presetName.trim());
                                    setPresetName('');
                                    setIsSavingPreset(false);
                                }
                            }}>Salvar</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
