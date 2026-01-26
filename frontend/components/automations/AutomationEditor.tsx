import { useState, useEffect } from "react";
import { X, Plus, Zap } from "lucide-react";
import api from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { AutomationColumn } from "./AutomationColumn";
import { AutomationForm } from "./AutomationForm";

interface AutomationEditorProps {
    pipelineId: string;
    stages: any[];
    onClose: () => void;
}

export function AutomationEditor({ pipelineId, stages, onClose }: AutomationEditorProps) {
    const [automations, setAutomations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingAutomation, setEditingAutomation] = useState<any | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        fetchAutomations();
    }, [pipelineId]);

    const fetchAutomations = async () => {
        try {
            setIsLoading(true);
            const res = await api.get(`/automations?pipeline_id=${pipelineId}`);
            setAutomations(res.data);
        } catch (error) {
            console.error(error);
            toast({ title: "Erro ao carregar automações", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = (stageId: string | null) => {
        setEditingAutomation({ stage_id: stageId, pipeline_id: pipelineId }); // Pre-fill
        setIsFormOpen(true);
    };

    const handleEdit = (automation: any) => {
        setEditingAutomation(automation);
        setIsFormOpen(true);
    };

    const handleSave = async () => {
        setIsFormOpen(false);
        setEditingAutomation(null);
        fetchAutomations();
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-zinc-950">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                        <Zap className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Editor de Automações</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Configure triggers e ações para cada etapa do funil</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                >
                    <X className="w-6 h-6 text-gray-500" />
                </button>
            </div>

            {/* Content - Horizontal Scroll Columns */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 bg-gray-50 dark:bg-black/20">
                <div className="flex h-full gap-4 min-w-max">
                    {/* Global Automations Column (No Stage) */}
                    {/* Optional: Add a "Global" column if needed, skipping for now to focus on stages */}

                    {stages.map(stage => {
                        const stageAutomations = automations.filter(a => a.stage_id === stage.id);
                        return (
                            <AutomationColumn
                                key={stage.id}
                                stage={stage}
                                automations={stageAutomations}
                                onAdd={() => handleCreate(stage.id)}
                                onEdit={handleEdit}
                            />
                        );
                    })}
                </div>
            </div>

            {/* Form Modal Overlay */}
            {isFormOpen && (
                <AutomationForm
                    pipelineId={pipelineId}
                    initialData={editingAutomation}
                    stages={stages}
                    onClose={() => setIsFormOpen(false)}
                    onSave={handleSave}
                />
            )}
        </div>
    );
}
