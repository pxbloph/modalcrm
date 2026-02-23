import React from 'react';
import { Plus, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FilterField, FILTER_FIELDS } from '@/lib/filter-definitions';

interface AddFieldModalProps {
    onClose: () => void;
    onAdd: (id: string) => void;
    visibleFields: string[];
}

export function AddFieldModal({ onClose, onAdd, visibleFields }: AddFieldModalProps) {
    const [search, setSearch] = React.useState('');

    const availableFields = FILTER_FIELDS.filter(
        field => !visibleFields.includes(field.id) &&
            (field.label.toLowerCase().includes(search.toLowerCase()) || field.id.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-4 border-b flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <Plus className="w-4 h-4 text-green-500" />
                        Adicionar Campo de Filtro
                    </h3>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full text-gray-400">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar campos..."
                            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-zinc-800 border-none rounded-lg focus:ring-2 focus:ring-green-500/20 outline-none"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="max-h-[300px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                        {availableFields.length > 0 ? (
                            availableFields.map(field => (
                                <button
                                    key={field.id}
                                    onClick={() => {
                                        onAdd(field.id);
                                        onClose();
                                    }}
                                    className="w-full flex items-center justify-between p-3 text-sm hover:bg-green-50 dark:hover:bg-green-500/10 rounded-lg group transition-colors"
                                >
                                    <span className="text-gray-700 dark:text-gray-300 group-hover:text-green-600 dark:group-hover:text-green-400 font-medium">
                                        {field.label}
                                    </span>
                                    <Plus className="w-4 h-4 text-gray-300 group-hover:text-green-500" />
                                </button>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-400 text-sm">
                                Nenhum campo disponível para adicionar.
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t bg-gray-50 dark:bg-zinc-950 flex justify-end">
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        Cancelar
                    </Button>
                </div>
            </div>
        </div>
    );
}
