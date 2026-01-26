import { Zap, Clock, ArrowRight, Tag, Mail } from "lucide-react";

interface AutomationCardProps {
    automation: any;
    onClick: () => void;
}

export function AutomationCard({ automation, onClick }: AutomationCardProps) {

    // Icon Logic
    const getIcon = () => {
        switch (automation.trigger) {
            case 'ENTER_STAGE': return <ArrowRight size={14} />;
            case 'SLA_BREACH': return <Clock size={14} />;
            case 'FIELD_UPDATE': return <Tag size={14} />;
            default: return <Zap size={14} />;
        }
    };

    const getTriggerLabel = () => {
        switch (automation.trigger) {
            case 'ENTER_STAGE': return "Ao entrar na etapa";
            case 'LEAVE_STAGE': return "Ao sair da etapa";
            case 'SLA_BREACH': return "Estouro de SLA";
            case 'TABULATION_UPDATE': return "Ao tabular";
            default: return automation.trigger;
        }
    };

    return (
        <div
            onClick={onClick}
            className="group bg-white dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700/50 rounded-lg p-3 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer relative overflow-hidden"
        >
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="flex items-start gap-3">
                <div className="mt-1 p-1.5 bg-indigo-50 dark:bg-indigo-900/20 rounded text-indigo-600 dark:text-indigo-400">
                    {getIcon()}
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-tight mb-1 truncate">
                        {automation.name}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        {getTriggerLabel()}
                    </p>

                    {/* Actions Preview */}
                    <div className="mt-2 flex flex-wrap gap-1">
                        {(automation.actions || []).map((action: any, idx: number) => (
                            <span key={idx} className="inline-flex text-[10px] bg-gray-100 dark:bg-zinc-700 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-zinc-600">
                                {action.type.replace('_', ' ')}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
