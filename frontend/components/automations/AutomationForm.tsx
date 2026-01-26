import { useState, useEffect } from "react";
import { X, Plus, Trash2, Save } from "lucide-react";
import api from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface AutomationFormProps {
    pipelineId: string;
    stages: any[];
    initialData?: any;
    onClose: () => void;
    onSave: () => void;
}

const TRIGGERS = [
    { value: 'ENTER_STAGE', label: 'Ao entrar na etapa' },
    { value: 'LEAVE_STAGE', label: 'Ao sair da etapa' },
    { value: 'SLA_BREACH', label: 'Estouro de SLA (Tempo)' },
    { value: 'TABULATION_UPDATE', label: 'Ao Tabular (Qualificação)' },
    { value: 'FIELD_UPDATE', label: 'Ao alterar campo' },
];

const ACTION_TYPES = [
    { value: 'SEND_WEBHOOK', label: 'Enviar Webhook (HTTP)' },
    { value: 'MOVE_STAGE', label: 'Mover para Etapa' },
    { value: 'UPDATE_RESPONSIBLE', label: 'Trocar Responsável' },
    { value: 'ADD_TAG', label: 'Adicionar Tag' },
    { value: 'REMOVE_TAG', label: 'Remover Tag' },
    { value: 'CREATE_DEAL', label: 'Criar Negócio (Outro Funil)' },
    { value: 'UPDATE_CLIENT', label: 'Atualizar Cliente' },
];

export function AutomationForm({ pipelineId, stages, initialData, onClose, onSave }: AutomationFormProps) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [name, setName] = useState("");
    const [trigger, setTrigger] = useState("ENTER_STAGE");
    const [stageId, setStageId] = useState<string | null>(null);
    const [isActive, setIsActive] = useState(true);
    const [actions, setActions] = useState<any[]>([]);

    useEffect(() => {
        if (initialData) {
            setName(initialData.name || "");
            setTrigger(initialData.trigger || "ENTER_STAGE");
            setStageId(initialData.stage_id || stages[0]?.id || null);
            setIsActive(initialData.is_active ?? true);
            setActions(initialData.actions || []);
        } else {
            setStageId(stages[0]?.id || null);
            setName("Nova Automação");
        }
    }, [initialData, stages]);

    const handleAddAction = () => {
        setActions([...actions, { type: 'SEND_WEBHOOK', config: {} }]);
    };

    const handleRemoveAction = (index: number) => {
        const newActions = [...actions];
        newActions.splice(index, 1);
        setActions(newActions);
    };

    const updateAction = (index: number, field: string, value: any) => {
        const newActions = [...actions];
        newActions[index] = { ...newActions[index], [field]: value };
        // Reset config if type changes
        if (field === 'type') newActions[index].config = {};
        setActions(newActions);
    };

    // Helper to update specific config keys directly on the action object (as backend expects flattened properties usually, or inside config? Backend uses flat properties in executeAction e.g. action.target_stage_id)
    // Wait, backend: action.type, action.target_stage_id. So flat.
    const updateActionConfig = (index: number, key: string, value: any) => {
        const newActions = [...actions];
        newActions[index] = { ...newActions[index], [key]: value };
        setActions(newActions);
    };

    const handleSubmit = async () => {
        try {
            setIsLoading(true);
            const payload = {
                name,
                pipeline_id: pipelineId,
                stage_id: stageId,
                trigger,
                is_active: isActive,
                actions,
                conditions: [] // TODO: Add conditions builder
            };

            if (initialData && initialData.id) {
                await api.patch(`/automations/${initialData.id}`, payload);
                toast({ title: "Automação atualizada!" });
            } else {
                await api.post("/automations", payload);
                toast({ title: "Automação criada!" });
            }
            onSave();
        } catch (error) {
            console.error(error);
            toast({ title: "Erro ao salvar", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[90vh] border border-gray-200 dark:border-zinc-800">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {initialData?.id ? "Editar Automação" : "Nova Automação"}
                    </h3>
                    <button onClick={onClose}><X size={20} className="text-gray-500" /></button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <Label>Nome da Automação</Label>
                            <input
                                className="w-full mt-1 p-2 border rounded-md dark:bg-zinc-800 dark:border-zinc-700"
                                value={name} onChange={e => setName(e.target.value)}
                            />
                        </div>

                        <div>
                            <Label>Gatilho (Trigger)</Label>
                            <select
                                className="w-full mt-1 p-2 border rounded-md dark:bg-zinc-800 dark:border-zinc-700"
                                value={trigger} onChange={e => setTrigger(e.target.value)}
                            >
                                {TRIGGERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>

                        <div>
                            <Label>Etapa Vinculada</Label>
                            <select
                                className="w-full mt-1 p-2 border rounded-md dark:bg-zinc-800 dark:border-zinc-700"
                                value={stageId || ""} onChange={e => setStageId(e.target.value)}
                            >
                                {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
                        <Label htmlFor="active" className="cursor-pointer">Automação Ativa</Label>
                    </div>

                    <hr className="dark:border-zinc-800" />

                    {/* Actions Editor */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-semibold text-gray-800 dark:text-gray-200">Ações</h4>
                            <button onClick={handleAddAction} className="text-sm text-indigo-600 flex items-center gap-1 font-medium hover:underline">
                                <Plus size={16} /> Adicionar Ação
                            </button>
                        </div>

                        <div className="space-y-4">
                            {actions.map((action, idx) => (
                                <div key={idx} className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-lg border border-gray-200 dark:border-zinc-700 relative group">
                                    <button
                                        onClick={() => handleRemoveAction(idx)}
                                        className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 size={16} />
                                    </button>

                                    <div className="grid gap-3">
                                        <div>
                                            <Label className="text-xs text-gray-500">Tipo de Ação</Label>
                                            <select
                                                className="w-full mt-1 p-1.5 text-sm border rounded dark:bg-zinc-800 dark:border-zinc-600"
                                                value={action.type}
                                                onChange={e => updateAction(idx, 'type', e.target.value)}
                                            >
                                                {ACTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                            </select>
                                        </div>

                                        {/* Dynamic Fields based on Type */}
                                        {action.type === 'SEND_WEBHOOK' && (
                                            <div>
                                                <Label className="text-xs">URL do Webhook</Label>
                                                <input
                                                    className="w-full mt-1 p-1.5 text-sm border rounded dark:bg-zinc-800 dark:border-zinc-600"
                                                    placeholder="https://n8n.webhook..."
                                                    value={action.url || ""}
                                                    onChange={e => updateActionConfig(idx, 'url', e.target.value)}
                                                />
                                            </div>
                                        )}

                                        {action.type === 'MOVE_STAGE' && (
                                            <div>
                                                <Label className="text-xs">Mover para etapa</Label>
                                                <select
                                                    className="w-full mt-1 p-1.5 text-sm border rounded dark:bg-zinc-800 dark:border-zinc-600"
                                                    value={action.target_stage_id || ""}
                                                    onChange={e => updateActionConfig(idx, 'target_stage_id', e.target.value)}
                                                >
                                                    <option value="">Selecione...</option>
                                                    {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                </select>
                                            </div>
                                        )}

                                        {/* Add other dynamic fields as needed for MVP */}
                                    </div>
                                </div>
                            ))}
                            {actions.length === 0 && <p className="text-sm text-gray-500 text-center py-4">Nenhuma ação configurada.</p>}
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-zinc-800 flex justify-end gap-3 bg-gray-50 dark:bg-zinc-900 rounded-b-xl">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg dark:text-gray-300 dark:hover:bg-zinc-800">
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-2"
                    >
                        <Save size={16} /> Salvar Automação
                    </button>
                </div>
            </div>
        </div>
    );
}
