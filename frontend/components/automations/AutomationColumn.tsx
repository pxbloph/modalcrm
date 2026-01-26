import { Plus } from "lucide-react";
import { AutomationCard } from "./AutomationCard";

interface AutomationColumnProps {
    stage: {
        id: string;
        name: string;
        color: string;
    };
    automations: any[];
    onAdd: () => void;
    onEdit: (automation: any) => void;
}

export function AutomationColumn({ stage, automations, onAdd, onEdit }: AutomationColumnProps) {
    return (
        <div className="flex-shrink-0 w-80 flex flex-col h-full bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
            {/* Header */}
            <div
                className="p-4 border-b border-gray-100 dark:border-zinc-800 rounded-t-xl bg-gray-50/50 dark:bg-zinc-800/30"
                style={{ borderTop: `4px solid ${stage.color}` }}
            >
                <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-gray-700 dark:text-gray-200 truncate pr-2">{stage.name}</h3>
                    <button
                        onClick={onAdd}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded transition text-gray-500 hover:text-indigo-600 dark:text-gray-400"
                        title="Adicionar Automação"
                    >
                        <Plus size={18} />
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-zinc-800">
                {automations.length === 0 ? (
                    <div className="text-center py-8 px-4 border-2 border-dashed border-gray-100 dark:border-zinc-800 rounded-lg">
                        <p className="text-xs text-gray-400">Nenhuma automação configurada</p>
                        <button onClick={onAdd} className="mt-2 text-xs text-indigo-500 hover:underline">
                            Adicionar
                        </button>
                    </div>
                ) : (
                    automations.map(auto => (
                        <AutomationCard key={auto.id} automation={auto} onClick={() => onEdit(auto)} />
                    ))
                )}
            </div>
        </div>
    );
}
