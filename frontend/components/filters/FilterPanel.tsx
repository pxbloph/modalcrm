'use client';

import React, { useState } from 'react';
import { Search, X, Check, Filter, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DateRangePickerBtx } from './DateRangePickerBtx';
import { Button } from '@/components/ui/button';
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
    const [userSearch, setUserSearch] = useState('');
    const [optionSearch, setOptionSearch] = useState('');

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
            case 'user-multi': {
                const selectedIds: string[] = Array.isArray(value) ? value : (value ? [value] : []);
                const filteredUsers = userSearch.trim()
                    ? users.filter(u =>
                        `${u.name} ${u.surname ?? ''}`.toLowerCase().includes(userSearch.toLowerCase())
                    )
                    : users;
                return (
                    <div className="rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 overflow-hidden">
                        {/* Busca + contador */}
                        <div className="flex items-center gap-2 px-2 py-1.5 border-b border-gray-100 dark:border-zinc-700">
                            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <input
                                type="text"
                                placeholder="Buscar responsável..."
                                value={userSearch}
                                onChange={e => setUserSearch(e.target.value)}
                                className="flex-1 text-xs bg-transparent border-none outline-none text-gray-700 dark:text-gray-300 placeholder:text-gray-400"
                            />
                            {selectedIds.length > 0 && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 shrink-0">
                                    {selectedIds.length} sel.
                                </span>
                            )}
                        </div>
                        {/* Lista com scroll limitado */}
                        <div className="max-h-44 overflow-y-auto">
                            {filteredUsers.length === 0 ? (
                                <p className="text-xs text-gray-400 text-center py-4">Nenhum resultado</p>
                            ) : (
                                filteredUsers.map((u) => {
                                    const isSelected = selectedIds.includes(u.id);
                                    return (
                                        <button
                                            key={u.id}
                                            type="button"
                                            onClick={() => {
                                                const next = isSelected
                                                    ? selectedIds.filter(id => id !== u.id)
                                                    : [...selectedIds, u.id];
                                                onFilterChange(field.id, next.length > 0 ? next : '');
                                            }}
                                            className={cn(
                                                'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors',
                                                isSelected
                                                    ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400'
                                                    : 'hover:bg-gray-50 dark:hover:bg-zinc-700/50 text-gray-700 dark:text-gray-300'
                                            )}
                                        >
                                            <div className={cn(
                                                'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                                                isSelected ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-zinc-600'
                                            )}>
                                                {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                                            </div>
                                            <span className="truncate">{u.name}{u.surname ? ' ' + u.surname : ''}</span>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                );
            }
            case 'select-multi': {
                const selectedValues: string[] = Array.isArray(value) ? value : (value ? [value] : []);
                const allOptions = field.id === 'tabulation' ? tabulationOptions : (field.options?.map(o => o.value) || []);
                const filteredOptions = optionSearch.trim()
                    ? allOptions.filter(o => o.toLowerCase().includes(optionSearch.toLowerCase()))
                    : allOptions;
                return (
                    <div className="rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 overflow-hidden">
                        <div className="flex items-center gap-2 px-2 py-1.5 border-b border-gray-100 dark:border-zinc-700">
                            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <input
                                type="text"
                                placeholder="Buscar tabulação..."
                                value={optionSearch}
                                onChange={e => setOptionSearch(e.target.value)}
                                className="flex-1 text-xs bg-transparent border-none outline-none text-gray-700 dark:text-gray-300 placeholder:text-gray-400"
                            />
                            {selectedValues.length > 0 && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 shrink-0">
                                    {selectedValues.length} sel.
                                </span>
                            )}
                        </div>
                        <div className="max-h-44 overflow-y-auto">
                            {filteredOptions.length === 0 ? (
                                <p className="text-xs text-gray-400 text-center py-4">Nenhum resultado</p>
                            ) : (
                                filteredOptions.map((opt) => {
                                    const isSelected = selectedValues.includes(opt);
                                    return (
                                        <button
                                            key={opt}
                                            type="button"
                                            onClick={() => {
                                                const next = isSelected
                                                    ? selectedValues.filter(v => v !== opt)
                                                    : [...selectedValues, opt];
                                                onFilterChange(field.id, next.length > 0 ? next : '');
                                            }}
                                            className={cn(
                                                'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors',
                                                isSelected
                                                    ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400'
                                                    : 'hover:bg-gray-50 dark:hover:bg-zinc-700/50 text-gray-700 dark:text-gray-300'
                                            )}
                                        >
                                            <div className={cn(
                                                'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                                                isSelected ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-zinc-600'
                                            )}>
                                                {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                                            </div>
                                            <span className="truncate">{opt}</span>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                );
            }
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
        <div className="p-4 space-y-4 bg-white dark:bg-zinc-900 flex flex-col overflow-hidden min-h-0">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4 shrink-0">
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
            <div className="space-y-2 shrink-0">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Favoritos</label>
                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
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
            <div className="flex-1 min-h-0 overflow-y-auto space-y-5 pr-1 custom-scrollbar">
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
            <div className="pt-3 border-t shrink-0 flex gap-2">
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
