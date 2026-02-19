import { useState, useEffect } from "react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { GripVertical } from "lucide-react";
import api from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";

interface FieldConfig {
    key: string;
    label: string;
    visible: boolean;
}

const AVAILABLE_FIELDS: FieldConfig[] = [
    { key: "deal_value", label: "Valor do Negócio", visible: true },
    { key: "deal_responsible", label: "Responsável (Avatar)", visible: true },
    { key: "deal_tags", label: "Tags", visible: true },
    { key: "client_name", label: "Cliente: Nome", visible: true },
    { key: "client_cnpj", label: "Cliente: CNPJ/CPF", visible: false },
    { key: "client_email", label: "Cliente: Email", visible: false },
    { key: "client_phone", label: "Cliente: Telefone", visible: false },
    { key: "qual_tabulation", label: "Qualificação: Tabulação", visible: false },
    { key: "qual_faturamento", label: "Qualificação: Faturamento", visible: false },
    { key: "created_at", label: "Data de Criação", visible: false },
    { key: "sla_status", label: "Status SLA", visible: true },
];

interface KanbanCardConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    pipelineId: string;
    userId: string;
    onSave: (config: FieldConfig[]) => void;
}

export function KanbanCardConfigModal({ isOpen, onClose, pipelineId, userId, onSave }: KanbanCardConfigModalProps) {
    const [fields, setFields] = useState<FieldConfig[]>(AVAILABLE_FIELDS);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        if (isOpen && pipelineId) {
            loadConfig();
        }
    }, [isOpen, pipelineId]);

    const loadConfig = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/pipelines/${pipelineId}/config?userId=${userId}`);

            if (res.data && Array.isArray(res.data.fields) && res.data.fields.length > 0) {
                // Merge saved config with available fields to ensure new fields appear
                const savedFieldsMap = new Map(res.data.fields.map((f: FieldConfig) => [f.key, f]));

                // 1. Start with saved fields provided they still exist in AVAILABLE_FIELDS
                const mergedFields = res.data.fields.filter((f: FieldConfig) =>
                    AVAILABLE_FIELDS.some(af => af.key === f.key)
                );

                // 2. Add any new AVAILABLE_FIELDS that aren't in saved config yet
                AVAILABLE_FIELDS.forEach(af => {
                    if (!savedFieldsMap.has(af.key)) {
                        mergedFields.push(af);
                    }
                });

                setFields(mergedFields);
            } else {
                setFields(AVAILABLE_FIELDS);
            }
        } catch (error) {
            console.error(error);
            setFields(AVAILABLE_FIELDS); // Fallback
        } finally {
            setLoading(false);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setFields((items) => {
                const oldIndex = items.findIndex((item) => item.key === active.id);
                const newIndex = items.findIndex((item) => item.key === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const toggleVisibility = (key: string) => {
        setFields(fields.map(f =>
            f.key === key ? { ...f, visible: !f.visible } : f
        ));
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            const config = { fields };
            await api.patch(`/pipelines/${pipelineId}/config`, {
                userId,
                config
            });
            onSave(fields);
            toast({ title: "Sucesso", description: "Configuração salva!" });
            onClose();
        } catch (error) {
            console.error(error);
            toast({ title: "Erro", description: "Falha ao salvar configuração.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-card border-border p-0 gap-0 overflow-hidden rounded-lg">
                <DialogHeader className="px-6 py-4 border-b border-border bg-card">
                    <DialogTitle className="text-lg font-bold text-foreground uppercase tracking-tight">Configurar Card</DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                        Arraste para reordenar e selecione os campos visíveis.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 p-6 max-h-[60vh] overflow-y-auto bg-muted/20">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={fields.map(f => f.key)}
                            strategy={verticalListSortingStrategy}
                        >
                            {fields.map((field) => (
                                <SortableItem
                                    key={field.key}
                                    field={field}
                                    onToggle={() => toggleVisibility(field.key)}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                </div>

                <DialogFooter className="bg-muted/50 border-t border-border p-4 sm:justify-end gap-2">
                    <Button variant="outline" onClick={onClose} disabled={loading} className="h-9">Cancelar</Button>
                    <Button onClick={handleSave} disabled={loading} className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 shadow-md">
                        {loading ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function SortableItem({ field, onToggle }: { field: FieldConfig, onToggle: () => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: field.key });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`
                flex items-center justify-between px-4 py-3 rounded-md border mb-2 bg-card transition-all
                ${isDragging ? 'shadow-lg ring-2 ring-primary/20 border-primary opacity-90 z-50' : 'border-border hover:border-primary/30'}
            `}
        >
            <div className="flex items-center gap-3">
                <div {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground">
                    <GripVertical size={20} />
                </div>
                <span className="text-sm font-medium text-foreground">{field.label}</span>
            </div>

            <Checkbox
                checked={field.visible}
                onCheckedChange={onToggle}
            />
        </div>
    );
}
