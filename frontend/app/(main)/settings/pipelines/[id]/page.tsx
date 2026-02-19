'use client';

import { useState, useEffect, use } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus, Trash2, GripVertical, Network, Zap } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { AutomationModal } from '@/components/kanban/settings/AutomationModal';

interface Pipeline {
    id: string;
    name: string;
    is_default: boolean;
}

interface Stage {
    id: string;
    name: string;
    color: string;
    order_index: number;
}

interface CustomField {
    id: string;
    key: string;
    label: string;
    type: string;
    options?: any;
    is_required: boolean;
}

export default function PipelineDetailSettingsPage({ params }: { params: Promise<{ id: string }> }) {
    // Unwrap params using React.use()
    const { id } = use(params);

    const [pipeline, setPipeline] = useState<Pipeline | null>(null);
    const [stages, setStages] = useState<Stage[]>([]);
    const [customFields, setCustomFields] = useState<CustomField[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    // New Stage State
    const [newStageName, setNewStageName] = useState('');

    // New Field State
    const [newFieldLabel, setNewFieldLabel] = useState('');
    const [newFieldType, setNewFieldType] = useState('TEXT');

    // Automation State
    const [automations, setAutomations] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [tags, setTags] = useState<any[]>([]);
    const [isAutoModalOpen, setIsAutoModalOpen] = useState(false);
    const [selectedAuto, setSelectedAuto] = useState<any>(null);

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [pipeRes, stagesRes, fieldsRes, autoRes, usersRes, tagsRes] = await Promise.all([
                api.get(`/pipelines/${id}`),
                api.get(`/stages`, { params: { pipeline_id: id } }),
                api.get(`/custom-fields`, { params: { pipeline_id: id } }),
                api.get(`/automations`, { params: { pipeline_id: id } }),
                api.get(`/users`),
                api.get(`/tags`)
            ]);
            setPipeline(pipeRes.data);
            setStages(stagesRes.data.sort((a: Stage, b: Stage) => a.order_index - b.order_index));
            setCustomFields(fieldsRes.data);
            setAutomations(autoRes.data);
            setUsers(usersRes.data);
            setTags(tagsRes.data);
        } catch (error) {
            console.error(error);
            toast({ title: 'Erro', description: 'Falha ao carregar dados do pipeline', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const updatePipeline = async (data: Partial<Pipeline>) => {
        if (!pipeline) return;
        try {
            const res = await api.patch(`/pipelines/${id}`, data);
            setPipeline(res.data);
            toast({ title: 'Salvo', description: 'Configurações atualizadas' });
        } catch (error) {
            toast({ title: 'Erro', description: 'Falha ao atualizar pipeline', variant: 'destructive' });
        }
    }

    // --- STAGES LOGIC ---
    const addStage = async () => {
        if (!newStageName.trim()) return;
        try {
            const res = await api.post('/stages', {
                pipeline_id: id,
                name: newStageName,
                color: '#3b82f6', // Default blue
                order_index: stages.length
            });
            setStages([...stages, res.data]);
            setNewStageName('');
            toast({ title: 'Sucesso', description: 'Etapa adicionada' });
        } catch (error) {
            toast({ title: 'Erro', description: 'Falha ao criar etapa', variant: 'destructive' });
        }
    }

    const deleteStage = async (stageId: string) => {
        if (!confirm('Excluir esta etapa? Deals nela podem ficar órfãos.')) return;
        try {
            await api.delete(`/stages/${stageId}`);
            setStages(stages.filter(s => s.id !== stageId));
            toast({ title: 'Removido', description: 'Etapa excluída' });
        } catch (error) {
            toast({ title: 'Erro', description: 'Falha ao excluir etapa', variant: 'destructive' });
        }
    }

    const onDragEnd = async (result: any) => {
        if (!result.destination) return;

        const items = Array.from(stages);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        setStages(items);

        // Persist order
        try {
            await Promise.all(items.map((stage, index) =>
                api.patch(`/stages/${stage.id}`, { order_index: index })
            ));
        } catch (e) {
            console.error("Failed to persist order", e);
            toast({ title: 'Erro', description: 'Falha ao salvar ordem', variant: 'destructive' });
        }
    };

    // --- FIELDS LOGIC ---
    const addField = async () => {
        if (!newFieldLabel.trim()) return;
        try {
            // Auto-generate key from label
            const key = newFieldLabel.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");

            const res = await api.post('/custom-fields', {
                pipeline_id: id,
                label: newFieldLabel,
                key: key,
                type: newFieldType,
                is_required: false
            });
            setCustomFields([...customFields, res.data]);
            setNewFieldLabel('');
            toast({ title: 'Sucesso', description: 'Campo adicionado' });
        } catch (error) {
            toast({ title: 'Erro', description: 'Falha ao criar campo', variant: 'destructive' });
        }
    }

    const deleteField = async (fieldId: string) => {
        if (!confirm('Excluir campo? Dados preenchidos serão perdidos.')) return;
        try {
            await api.delete(`/custom-fields/${fieldId}`);
            setCustomFields(customFields.filter(f => f.id !== fieldId));
            toast({ title: 'Removido', description: 'Campo excluído' });
        } catch (error) {
            toast({ title: 'Erro', description: 'Falha ao excluir campo', variant: 'destructive' });
        }
    }

    // --- AUTOMATIONS LOGIC ---
    const saveAutomation = async (automationData: any) => {
        try {
            if (automationData.id) {
                // Update
                const res = await api.patch(`/automations/${automationData.id}`, automationData);
                setAutomations(automations.map(a => a.id === automationData.id ? res.data : a));
                toast({ title: 'Atualizado', description: 'Automação atualizada!' });
            } else {
                // Create
                const res = await api.post('/automations', automationData);
                setAutomations([...automations, res.data]);
                toast({ title: 'Criado', description: 'Automação criada!' });
            }
            setIsAutoModalOpen(false);
        } catch (error) {
            console.error(error);
            toast({ title: 'Erro', description: 'Falha ao salvar automação', variant: 'destructive' });
        }
    };

    const deleteAutomation = async (autoId: string) => {
        if (!confirm('Excluir esta automação?')) return;
        try {
            await api.delete(`/automations/${autoId}`);
            setAutomations(automations.filter(a => a.id !== autoId));
            toast({ title: 'Removido', description: 'Automação excluída' });
        } catch (error) {
            toast({ title: 'Erro', description: 'Falha ao excluir automação', variant: 'destructive' });
        }
    };


    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;
    if (!pipeline) return <div>Pipeline não encontrado</div>;

    return (
        <div className="p-6 space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Configuração: {pipeline.name}</h1>
                <Button variant="outline" onClick={() => window.history.back()}>Voltar</Button>
            </div>

            <Tabs defaultValue="stages" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="general">Geral</TabsTrigger>
                    <TabsTrigger value="stages">Etapas</TabsTrigger>
                    <TabsTrigger value="fields">Campos</TabsTrigger>
                    <TabsTrigger value="automations">Automações</TabsTrigger>
                </TabsList>

                {/* GENERAL TAB */}
                <TabsContent value="general">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-gray-700 dark:text-gray-100">Detalhes do Pipeline</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid w-full max-w-sm items-center gap-1.5">
                                <Label htmlFor="name" className="text-gray-700 dark:text-gray-200">Nome do Pipeline</Label>
                                <Input
                                    id="name"
                                    value={pipeline.name}
                                    onChange={(e) => setPipeline({ ...pipeline, name: e.target.value })}
                                    onBlur={() => updatePipeline({ name: pipeline.name })}
                                    className="text-gray-700 dark:text-gray-100"
                                />
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="default-mode"
                                    checked={pipeline.is_default}
                                    onCheckedChange={(checked) => {
                                        setPipeline({ ...pipeline, is_default: checked });
                                        updatePipeline({ is_default: checked });
                                    }}
                                />
                                <Label htmlFor="default-mode" className="text-gray-700 dark:text-gray-200">Definir como Pipeline Padrão</Label>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* STAGES TAB */}
                <TabsContent value="stages">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-gray-700 dark:text-gray-100">Etapas do Processo</CardTitle>
                            <CardDescription className="text-gray-500 dark:text-gray-400">Arraste para reordenar. O sistema move os cards linearmente por padrão.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* List */}
                            <DragDropContext onDragEnd={onDragEnd}>
                                <Droppable droppableId="stages-list">
                                    {(provided) => (
                                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                                            {stages.map((stage, index) => (
                                                <Draggable key={stage.id} draggableId={stage.id} index={index}>
                                                    {(provided) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            className="flex items-center gap-4 p-3 bg-white border border-gray-100 rounded shadow-sm dark:bg-zinc-900 dark:border-zinc-800/50"
                                                        >
                                                            <div {...provided.dragHandleProps} className="curr-grab text-gray-400 hover:text-gray-600">
                                                                <GripVertical size={20} />
                                                            </div>
                                                            <div className="w-8 h-8 rounded-full border border-gray-200" style={{ backgroundColor: stage.color }} />
                                                            <div className="flex-1 font-medium text-gray-700 dark:text-gray-100">{stage.name}</div>
                                                            <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600" onClick={() => deleteStage(stage.id)}>
                                                                <Trash2 size={18} />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </ Draggable>
                                            ))}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            </DragDropContext>

                            {/* Valid Add Form */}
                            <div className="flex gap-2 items-end pt-4 border-t">
                                <div className="grid w-full max-w-sm items-center gap-1.5">
                                    <Label className="text-gray-700 dark:text-gray-200">Nova Etapa</Label>
                                    <Input
                                        placeholder="Ex: Negociação"
                                        value={newStageName}
                                        onChange={(e) => setNewStageName(e.target.value)}
                                        className="text-gray-700 dark:text-gray-100"
                                    />
                                </div>
                                <Button onClick={addStage} disabled={!newStageName.trim()}>
                                    <Plus className="w-4 h-4 mr-2" /> Adicionar
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* FIELDS TAB */}
                <TabsContent value="fields">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-gray-700 dark:text-gray-100">Campos Personalizados</CardTitle>
                            <CardDescription className="text-gray-500 dark:text-gray-400">Campos extras que aparecem no card do negócio.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                {customFields.length === 0 && <p className="text-gray-500 text-sm italic">Nenhum campo personalizado.</p>}
                                {customFields.map(field => (
                                    <div key={field.id} className="flex items-center justify-between p-3 border border-gray-100 rounded bg-gray-50 dark:bg-zinc-900 dark:border-zinc-800/50">
                                        <div>
                                            <p className="font-medium text-gray-700 dark:text-gray-100">{field.label}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Chave: {field.key} | Tipo: {field.type}</p>
                                        </div>
                                        <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600" onClick={() => deleteField(field.id)}>
                                            <Trash2 size={18} />
                                        </Button>
                                    </div>
                                ))}
                            </div>

                            {/* Add Form */}
                            <div className="flex gap-2 items-end pt-4 border-t">
                                <div className="grid items-center gap-1.5 flex-1">
                                    <Label className="text-gray-700 dark:text-gray-200">Nome do Campo</Label>
                                    <Input
                                        placeholder="Ex: Motivo da Perda"
                                        value={newFieldLabel}
                                        onChange={(e) => setNewFieldLabel(e.target.value)}
                                        className="text-gray-700 dark:text-gray-100"
                                    />
                                </div>
                                <div className="grid items-center gap-1.5 w-32">
                                    <Label className="text-gray-700 dark:text-gray-200">Tipo</Label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-gray-700 dark:text-gray-100 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        value={newFieldType}
                                        onChange={(e) => setNewFieldType(e.target.value)}
                                    >
                                        <option value="TEXT">Texto</option>
                                        <option value="NUMBER">Número</option>
                                        <option value="DATE">Data</option>
                                        <option value="BOOLEAN">Sim/Não</option>
                                        <option value="SELECT">Seleção</option>
                                    </select>
                                </div>
                                <Button onClick={addField} disabled={!newFieldLabel.trim()}>
                                    <Plus className="w-4 h-4 mr-2" /> Adicionar
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* AUTOMATIONS TAB */}
                <TabsContent value="automations">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-gray-700 dark:text-gray-100 flex items-center gap-2">
                                    <Zap className="w-5 h-5 text-amber-500" />
                                    Automações Inteligentes
                                </CardTitle>
                                <CardDescription className="text-gray-500 dark:text-gray-400">Automatize ações quando cards entrarem ou saírem de etapas.</CardDescription>
                            </div>
                            <Button onClick={() => { setSelectedAuto(null); setIsAutoModalOpen(true); }}>
                                <Plus className="w-4 h-4 mr-2" /> Nova Regra
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {automations.length === 0 && (
                                <div className="text-center py-10 bg-gray-50 dark:bg-zinc-900/50 rounded border border-dashed border-gray-200 dark:border-zinc-800">
                                    <Network className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                                    <p className="text-gray-500">Nenhuma automação configurada.</p>
                                </div>
                            )}

                            {automations.map(auto => (
                                <div key={auto.id} className="flex gap-4 p-4 items-start bg-white border border-gray-100 rounded shadow-sm dark:bg-zinc-900 dark:border-zinc-800/50 hover:border-indigo-200 transition-colors cursor-pointer" onClick={() => { setSelectedAuto(auto); setIsAutoModalOpen(true); }}>
                                    <div className="pt-1">
                                        <Zap className="w-4 h-4 text-amber-500" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-800 dark:text-gray-100">{auto.name}</h3>
                                        <div className="mt-1 text-sm text-gray-500 flex items-center gap-2">
                                            <span className="bg-gray-100 px-2 py-0.5 rounded text-xs border dark:bg-zinc-800 dark:border-zinc-700">Gatilho: {auto.trigger}</span>
                                            {auto.stage_id && <span className="text-xs">na etapa <b>{stages.find(s => s.id === auto.stage_id)?.name || 'Desconhecida'}</b></span>}
                                        </div>
                                        <div className="mt-2 text-xs text-gray-400">
                                            {auto.actions?.length || 0} ações configuradas
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600" onClick={(e) => { e.stopPropagation(); deleteAutomation(auto.id); }}>
                                        <Trash2 size={18} />
                                    </Button>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <AutomationModal
                isOpen={isAutoModalOpen}
                onClose={() => setIsAutoModalOpen(false)}
                onSave={saveAutomation}
                initialData={selectedAuto}
                pipelineId={id}
                stages={stages}
                users={users}
                tags={tags}
            />
        </div>
    );
}
