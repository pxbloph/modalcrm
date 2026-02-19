'use client';

import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, GripVertical, Pencil, Trash2, Copy, Check, Eye, EyeOff } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function CustomFieldsPage() {
    const { toast } = useToast();
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal States
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<any>(null);
    const [editingGroup, setEditingGroup] = useState<any>(null);
    const [editingField, setEditingField] = useState<any>(null);

    // Form States
    const [groupForm, setGroupForm] = useState({ name: '' });
    const [fieldForm, setFieldForm] = useState({
        label: '',
        type: 'TEXT',
        is_required: false,
        options_json: [] as string[],
        newOption: ''
    });

    useEffect(() => {
        fetchGroups();
    }, []);

    const fetchGroups = async () => {
        try {
            setLoading(true);
            const res = await api.get('/client-custom-fields/groups/admin');
            setGroups(res.data);
        } catch (error) {
            console.error(error);
            toast({ title: "Erro", description: 'Erro ao carregar campos.', variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    // --- GROUP ACTIONS ---

    const handleCreateGroup = () => {
        setEditingGroup(null);
        setGroupForm({ name: '' });
        setIsGroupModalOpen(true);
    };

    const handleEditGroup = (group: any) => {
        setEditingGroup(group);
        setGroupForm({ name: group.name });
        setIsGroupModalOpen(true);
    };

    const handleSaveGroup = async () => {
        try {
            if (editingGroup) {
                await api.patch(`/client-custom-fields/groups/${editingGroup.id}`, { name: groupForm.name });
                toast({ title: "Sucesso", description: 'Grupo atualizado!' });
            } else {
                await api.post('/client-custom-fields/groups', { name: groupForm.name, order_index: groups.length });
                toast({ title: "Sucesso", description: 'Grupo criado!' });
            }
            setIsGroupModalOpen(false);
            fetchGroups();
        } catch (error) {
            toast({ title: "Erro", description: 'Erro ao salvar grupo.', variant: "destructive" });
        }
    };

    const handleDeleteGroup = async (id: string) => {
        if (!confirm('Tem certeza? Isso pode falhar se houver campos.')) return;
        try {
            await api.delete(`/client-custom-fields/groups/${id}`);
            toast({ title: "Sucesso", description: 'Grupo removido.' });
            fetchGroups();
        } catch (error: any) {
            toast({ title: "Erro", description: error.response?.data?.message || 'Erro ao remover grupo.', variant: "destructive" });
        }
    };

    // --- FIELD ACTIONS ---

    const handleCreateField = (group: any) => {
        setSelectedGroup(group);
        setEditingField(null);
        setFieldForm({ label: '', type: 'TEXT', is_required: false, options_json: [], newOption: '' });
        setIsFieldModalOpen(true);
    };

    const handleEditField = (group: any, field: any) => {
        setSelectedGroup(group);
        setEditingField(field);
        setFieldForm({
            label: field.label,
            type: field.type,
            is_required: field.is_required,
            options_json: Array.isArray(field.options_json) ? field.options_json : [],
            newOption: ''
        });
        setIsFieldModalOpen(true);
    };

    const handleSaveField = async () => {
        try {
            const payload = {
                label: fieldForm.label,
                type: fieldForm.type,
                is_required: fieldForm.is_required,
                options_json: fieldForm.options_json,
                group_id: selectedGroup?.id
            };

            if (editingField) {
                await api.patch(`/client-custom-fields/fields/${editingField.id}`, payload);
                toast({ title: "Sucesso", description: 'Campo atualizado!' });
            } else {
                await api.post('/client-custom-fields/fields', { ...payload, order_index: selectedGroup?.fields?.length || 0 });
                toast({ title: "Sucesso", description: 'Campo criado!' });
            }
            setIsFieldModalOpen(false);
            fetchGroups();
        } catch (error: any) {
            toast({ title: "Erro", description: error.response?.data?.message || 'Erro ao salvar campo.', variant: "destructive" });
        }
    };

    const handleDeleteField = async (id: string) => {
        if (!confirm('Tem certeza? Dados preenchidos neste campo serão perdidos.')) return;
        try {
            await api.delete(`/client-custom-fields/fields/${id}`);
            toast({ title: "Sucesso", description: 'Campo removido.' });
            fetchGroups();
        } catch (error: any) {
            toast({ title: "Erro", description: error.response?.data?.message || 'Erro ao remover campo.', variant: "destructive" });
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Sucesso", description: `API Key copiada: ${text}` });
    };

    const onDragEnd = async (result: any) => {
        const { destination, source, type } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        // Reordering Groups
        if (type === 'group') {
            const newGroups = Array.from(groups);
            const [reorderedGroup] = newGroups.splice(source.index, 1);
            newGroups.splice(destination.index, 0, reorderedGroup);

            setGroups(newGroups);

            const ids = newGroups.map(g => g.id);
            try {
                await api.post('/client-custom-fields/groups/reorder', { ids });
            } catch (error) {
                console.error('Failed to reorder groups', error);
                toast({ title: "Erro", description: 'Falha ao salvar ordem dos grupos.', variant: "destructive" });
            }
            return;
        }

        // Reordering Fields
        if (type === 'field') {
            const sourceGroupId = source.droppableId.replace('group-', '');
            const destGroupId = destination.droppableId.replace('group-', '');

            // Moving within same group
            if (sourceGroupId === destGroupId) {
                const groupIndex = groups.findIndex(g => g.id === sourceGroupId);
                const group = groups[groupIndex];
                const newFields = Array.from(group.fields);
                const [reorderedField] = newFields.splice(source.index, 1);
                newFields.splice(destination.index, 0, reorderedField);

                const newGroups = [...groups];
                newGroups[groupIndex] = { ...group, fields: newFields };
                setGroups(newGroups);

                const ids = newFields.map((f: any) => f.id);
                try {
                    await api.post('/client-custom-fields/fields/reorder', { ids });
                } catch (error) {
                    toast({ title: "Erro", description: 'Falha ao reordenar campos.', variant: "destructive" });
                }
            } else {
                toast({ title: "Atenção", description: 'Mover campos entre grupos ainda não é suportado.', variant: "default" });
            }
        }
    };

    const fieldTypes = [
        { value: 'TEXT', label: 'Texto Curto' },
        { value: 'TEXTAREA', label: 'Texto Longo' },
        { value: 'NUMBER', label: 'Número' },
        { value: 'CURRENCY', label: 'Moeda (R$)' },
        { value: 'DATE', label: 'Data' },
        { value: 'BOOLEAN', label: 'Sim/Não (Switch)' },
        { value: 'SELECT', label: 'Seleção Única' },
        { value: 'MULTI_SELECT', label: 'Seleção Múltiple' },
    ];

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Campos Personalizados</h1>
                    <p className="text-muted-foreground mt-2">
                        Gerencie os campos extras que aparecem no cadastro do cliente.
                    </p>
                </div>
                <Button onClick={handleCreateGroup}>
                    <Plus className="mr-2 h-4 w-4" /> Novo Grupo
                </Button>
            </div>

            {loading ? (
                <div>Carregando...</div>
            ) : (
                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="all-groups" type="group">
                        {(provided) => (
                            <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className="grid gap-6"
                            >
                                {groups.map((group, index) => (
                                    <Draggable key={group.id} draggableId={group.id} index={index}>
                                        {(provided) => (
                                            <Card
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                className="overflow-hidden"
                                            >
                                                <CardHeader className="bg-muted/50 py-3 flex flex-row items-center justify-between space-y-0 text-foreground">
                                                    <div className="flex items-center gap-2">
                                                        <div {...provided.dragHandleProps} className="cursor-move">
                                                            <GripVertical className="h-5 w-5 text-muted-foreground" />
                                                        </div>
                                                        <CardTitle className="text-lg font-medium">{group.name}</CardTitle>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Button variant="ghost" size="sm" onClick={() => handleEditGroup(group)}>
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteGroup(group.id)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="p-0">
                                                    <Droppable droppableId={`group-${group.id}`} type="field">
                                                        {(provided) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.droppableProps}
                                                                className="divide-y divide-border"
                                                            >
                                                                {group.fields && group.fields.length > 0 ? (
                                                                    group.fields.map((field: any, index: number) => (
                                                                        <Draggable key={field.id} draggableId={field.id} index={index}>
                                                                            {(provided) => (
                                                                                <div
                                                                                    ref={provided.innerRef}
                                                                                    {...provided.draggableProps}
                                                                                    className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors bg-card"
                                                                                >
                                                                                    <div className="flex items-center gap-4">
                                                                                        <div {...provided.dragHandleProps} className="cursor-move">
                                                                                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                                                                                        </div>
                                                                                        <div>
                                                                                            <div className="flex items-center gap-2">
                                                                                                <span className="font-medium text-sm text-foreground">{field.label}</span>
                                                                                                <Badge variant="outline" className="text-[10px] uppercase text-muted-foreground">{fieldTypes.find(t => t.value === field.type)?.label || field.type}</Badge>
                                                                                                {field.is_required && <Badge variant="secondary" className="text-[10px] text-destructive bg-destructive/10">Obrigatório</Badge>}
                                                                                            </div>
                                                                                            <div className="flex items-center gap-2 mt-1">
                                                                                                <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">
                                                                                                    {field.key}
                                                                                                </code>
                                                                                                <button onClick={() => copyToClipboard(field.key)} className="text-muted-foreground hover:text-primary" title="Copiar Key">
                                                                                                    <Copy className="h-3 w-3" />
                                                                                                </button>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-2">
                                                                                        <Button variant="ghost" size="sm" onClick={() => handleEditField(group, field)}>
                                                                                            <Pencil className="h-3.5 w-3.5" />
                                                                                        </Button>
                                                                                        <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteField(field.id)}>
                                                                                            <Trash2 className="h-3.5 w-3.5" />
                                                                                        </Button>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </Draggable>
                                                                    ))
                                                                ) : (
                                                                    !provided.placeholder && (
                                                                        <div className="p-8 text-center text-sm text-muted-foreground">
                                                                            Nenhum campo neste grupo.
                                                                        </div>
                                                                    )
                                                                )}
                                                                {provided.placeholder}
                                                            </div>
                                                        )}
                                                    </Droppable>
                                                    <div className="p-2 bg-muted/30 border-t border-border">
                                                        <Button variant="ghost" size="sm" className="w-full text-primary hover:text-primary hover:bg-primary/10" onClick={() => handleCreateField(group)}>
                                                            <Plus className="h-4 w-4 mr-2" /> Adicionar Campo
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}

                                {groups.length === 0 && (
                                    <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
                                        <h3 className="text-lg font-medium text-foreground">Comece criando um grupo</h3>
                                        <p className="text-muted-foreground mt-1 mb-4">Grupos ajudam a organizar os campos no perfil do cliente.</p>
                                        <Button onClick={handleCreateGroup}>
                                            <Plus className="mr-2 h-4 w-4" /> Criar Primeiro Grupo
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            )}

            {/* GROUP MODAL */}
            <Dialog open={isGroupModalOpen} onOpenChange={setIsGroupModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingGroup ? 'Editar Grupo' : 'Novo Grupo'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nome do Grupo</Label>
                            <Input
                                value={groupForm.name}
                                onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                                placeholder="Ex: Financeiro, Documentos..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsGroupModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveGroup}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* FIELD MODAL */}
            <Dialog open={isFieldModalOpen} onOpenChange={setIsFieldModalOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingField ? 'Editar Campo' : 'Novo Campo'}</DialogTitle>
                        <DialogDescription>
                            Adicionando ao grupo: <strong>{selectedGroup?.name}</strong>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-5 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nome do Campo (Label)</Label>
                                <Input
                                    value={fieldForm.label}
                                    onChange={(e) => setFieldForm({ ...fieldForm, label: e.target.value })}
                                    placeholder="Ex: Nota Fiscal"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Tipo</Label>
                                <Select
                                    value={fieldForm.type}
                                    onValueChange={(val) => setFieldForm({ ...fieldForm, type: val })}
                                    disabled={!!editingField} // Lock type on edit to prevent migration issues
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {fieldTypes.map(t => (
                                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Switch
                                id="required-mode"
                                checked={fieldForm.is_required}
                                onCheckedChange={(checked) => setFieldForm({ ...fieldForm, is_required: checked })}
                            />
                            <Label htmlFor="required-mode">Preenchimento Obrigatório</Label>
                        </div>

                        {(fieldForm.type === 'SELECT' || fieldForm.type === 'MULTI_SELECT') && (
                            <div className="space-y-3 p-4 bg-muted/50 rounded-lg border border-border">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Opções de Seleção</Label>
                                <div className="space-y-2">
                                    {fieldForm.options_json.map((opt, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <Input value={opt} disabled className="bg-card h-8" />
                                            <Button
                                                size="sm" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                onClick={() => {
                                                    const newOpts = [...fieldForm.options_json];
                                                    newOpts.splice(idx, 1);
                                                    setFieldForm({ ...fieldForm, options_json: newOpts });
                                                }}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <Input
                                        value={fieldForm.newOption}
                                        onChange={(e) => setFieldForm({ ...fieldForm, newOption: e.target.value })}
                                        placeholder="Nova opção + Enter"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                if (fieldForm.newOption.trim()) {
                                                    setFieldForm({
                                                        ...fieldForm,
                                                        options_json: [...fieldForm.options_json, fieldForm.newOption.trim()],
                                                        newOption: ''
                                                    });
                                                }
                                            }
                                        }}
                                        className="h-8"
                                    />
                                    <Button
                                        size="sm" variant="secondary" className="h-8"
                                        onClick={() => {
                                            if (fieldForm.newOption.trim()) {
                                                setFieldForm({
                                                    ...fieldForm,
                                                    options_json: [...fieldForm.options_json, fieldForm.newOption.trim()],
                                                    newOption: ''
                                                });
                                            }
                                        }}
                                    >
                                        <Plus className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {editingField && (
                            <div className="text-xs text-muted-foreground">
                                <strong>API Key:</strong> <code className="bg-muted px-1 py-0.5 rounded ml-1">{editingField.key}</code>
                            </div>
                        )}

                        <div className="rounded-md bg-blue-50 dark:bg-blue-900/10 p-3">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <Eye className="h-5 w-5 text-blue-400" aria-hidden="true" />
                                </div>
                                <div className="ml-3 flex-1 md:flex md:justify-between">
                                    <p className="text-sm text-blue-700 dark:text-blue-300">
                                        Preview:
                                        {fieldForm.type === 'BOOLEAN' ? <Switch className="ml-2 align-middle scale-75" /> :
                                            <span className="ml-2 opacity-50 text-xs italic">[Input {fieldForm.type}]</span>
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsFieldModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveField}>Salvar Campo</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
