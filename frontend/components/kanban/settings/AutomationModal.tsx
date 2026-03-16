import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Zap, X } from "lucide-react";

interface AutomationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (automation: any) => void;
    initialData?: any;
    pipelineId: string;
    stages: any[];
    users: any[];
    tags: any[];
}

const ACTION_TYPES = [
    { value: 'MOVE_STAGE', label: 'Mover para Etapa' },
    { value: 'UPDATE_RESPONSIBLE', label: 'Alterar Responsável' },
    { value: 'ADD_TAG', label: 'Adicionar Tag' },
    { value: 'REMOVE_TAG', label: 'Remover Tag' },
    { value: 'SEND_WEBHOOK', label: 'Enviar Webhook' },
];

const TRIGGERS = [
    { value: 'ENTER_STAGE', label: 'Ao Entrar na Etapa' },
    { value: 'LEAVE_STAGE', label: 'Ao Sair da Etapa' },
];

export function AutomationModal({
    isOpen,
    onClose,
    onSave,
    initialData,
    pipelineId,
    stages,
    users,
    tags
}: AutomationModalProps) {
    const [name, setName] = useState("");
    const [trigger, setTrigger] = useState("ENTER_STAGE");
    const [stageId, setStageId] = useState<string | undefined>(undefined);
    const [actions, setActions] = useState<any[]>([]);

    useEffect(() => {
        if (initialData) {
            setName(initialData.name);
            setTrigger(initialData.trigger);
            setStageId(initialData.stage_id || "ALL");
            setActions(initialData.actions || []);
        } else {
            setName("");
            setTrigger("ENTER_STAGE");
            setStageId("ALL");
            setActions([]);
        }
    }, [initialData, isOpen]);

    const addAction = () => {
        setActions([...actions, { type: 'MOVE_STAGE' }]); // Default
    };

    const updateAction = (index: number, field: string, value: any) => {
        const newActions = [...actions];
        newActions[index] = { ...newActions[index], [field]: value };
        // Reset params if type changes
        if (field === 'type') {
            const type = value;
            if (type === 'MOVE_STAGE') newActions[index] = { type, target_stage_id: '' };
            if (type === 'UPDATE_RESPONSIBLE') newActions[index] = { type, responsible_id: '' };
            if (type === 'ADD_TAG') newActions[index] = { type, tag_id: '' };
            if (type === 'REMOVE_TAG') newActions[index] = { type, tag_id: '' };
            if (type === 'SEND_WEBHOOK') newActions[index] = { type, url: '' };
        }
        setActions(newActions);
    };

    const removeAction = (index: number) => {
        setActions(actions.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        if (!name.trim()) return;
        const payload = {
            id: initialData?.id, // Includes ID if editing
            pipeline_id: pipelineId,
            name,
            trigger,
            stage_id: stageId === "ALL" ? null : stageId,
            actions: actions, // Pass as is
            is_active: true
        };
        onSave(payload);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-zinc-800">
                <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-zinc-800">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{initialData ? 'Editar Automação' : 'Nova Automação'}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto space-y-6 flex-1">
                    {/* Basic Info */}
                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <Label>Nome da Automação</Label>
                            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Mover para Qualificação ao entrar" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Gatilho (Quando...)</Label>
                                <Select value={trigger} onValueChange={setTrigger}>
                                    <SelectTrigger className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm dark:bg-zinc-950 dark:border-zinc-800 dark:text-gray-100">
                                        <SelectValue placeholder="Selecione" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {TRIGGERS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Na Etapa (Onde...)</Label>
                                <Select value={stageId || "ALL"} onValueChange={setStageId}>
                                    <SelectTrigger className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm dark:bg-zinc-950 dark:border-zinc-800 dark:text-gray-100">
                                        <SelectValue placeholder="Todas as Etapas" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">Todas as Etapas</SelectItem>
                                        {stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-4 border-t border-gray-100 dark:border-zinc-800 pt-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-base font-semibold flex items-center gap-2 dark:text-gray-100">
                                <Zap className="w-4 h-4 text-amber-500" /> Ações (Então...)
                            </Label>
                            <Button size="sm" variant="outline" onClick={addAction}><Plus className="w-4 h-4 mr-1" /> Adicionar Ação</Button>
                        </div>

                        {actions.length === 0 && (
                            <div className="text-sm text-gray-500 italic text-center py-4 bg-gray-50 rounded dark:bg-zinc-800">
                                Nenhuma ação configurada.
                            </div>
                        )}

                        {actions.map((action, idx) => (
                            <div key={idx} className="flex gap-3 items-start p-3 bg-gray-50 dark:bg-zinc-800/50 rounded border border-gray-100 dark:border-zinc-700">
                                <div className="flex-1 space-y-3">
                                    <div className="w-full">
                                        <Label className="text-xs text-gray-500 mb-1 block">Tipo de Ação</Label>
                                        <Select value={action.type} onValueChange={(value) => updateAction(idx, 'type', value)}>
                                            <SelectTrigger className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors dark:bg-zinc-950 dark:border-zinc-800 dark:text-gray-100">
                                                <SelectValue placeholder="Tipo de ação" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {ACTION_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Dynamic Fields based on Type */}
                                    {action.type === 'MOVE_STAGE' && (
                                        <div>
                                            <Label className="text-xs text-gray-500 mb-1 block">Mover para</Label>
                                            <Select value={action.target_stage_id || '__none__'} onValueChange={(value) => updateAction(idx, 'target_stage_id', value === '__none__' ? '' : value)}>
                                                <SelectTrigger className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors dark:bg-zinc-950 dark:border-zinc-800 dark:text-gray-100">
                                                    <SelectValue placeholder="Selecione a etapa..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="__none__">Selecione a etapa...</SelectItem>
                                                    {stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    {action.type === 'UPDATE_RESPONSIBLE' && (
                                        <div>
                                            <Label className="text-xs text-gray-500 mb-1 block">Novo Responsável</Label>
                                            <Select value={action.responsible_id || '__none__'} onValueChange={(value) => updateAction(idx, 'responsible_id', value === '__none__' ? '' : value)}>
                                                <SelectTrigger className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors dark:bg-zinc-950 dark:border-zinc-800 dark:text-gray-100">
                                                    <SelectValue placeholder="Selecione o usuário..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="__none__">Selecione o usuário...</SelectItem>
                                                    {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    {(action.type === 'ADD_TAG' || action.type === 'REMOVE_TAG') && (
                                        <div>
                                            <Label className="text-xs text-gray-500 mb-1 block">Tag</Label>
                                            <Select value={action.tag_id || '__none__'} onValueChange={(value) => updateAction(idx, 'tag_id', value === '__none__' ? '' : value)}>
                                                <SelectTrigger className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors dark:bg-zinc-950 dark:border-zinc-800 dark:text-gray-100">
                                                    <SelectValue placeholder="Selecione a tag..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="__none__">Selecione a tag...</SelectItem>
                                                    {tags.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    {action.type === 'SEND_WEBHOOK' && (
                                        <div>
                                            <Label className="text-xs text-gray-500 mb-1 block">URL do Webhook</Label>
                                            <Input
                                                className="h-8"
                                                placeholder="https://api.exemplo.com/webhook"
                                                value={action.url || ''}
                                                onChange={(e) => updateAction(idx, 'url', e.target.value)}
                                            />
                                        </div>
                                    )}
                                </div>
                                <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600 mt-6" onClick={() => removeAction(idx)}>
                                    <Trash2 size={16} />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-zinc-800 flex justify-end gap-2 bg-gray-50 dark:bg-zinc-900">
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={actions.length === 0 || !name}>Salvar Automação</Button>
                </div>
            </div>
        </div>
    );
}
