import React from "react";
import { Draggable } from "@hello-pangea/dnd";
import { User, DollarSign, Calendar, Tag as TagIcon, Phone, Mail, FileText, AlertCircle } from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Tag {
    id: string;
    name: string;
    color: string;
}

interface Deal {
    id: string;
    title: string;
    value?: number;
    stage_id: string;
    created_at: string | Date;
    is_overdue?: boolean; // Provided by backend logic or deal
    client?: {
        name: string;
        surname?: string;
        cnpj?: string;
        email?: string;
        phone?: string;
        // [SIMPLIFICATION] Direct fields
        tabulacao?: string;
        faturamento_mensal?: number;
        integration_status?: string;
    };
    responsible?: { id: string, name: string, surname?: string };
    tags?: { tag: Tag }[];
}

interface DealCardProps {
    deal: Deal;
    index: number;
    onClick: (id: string) => void;
    cardConfig?: { key: string; visible: boolean; label: string }[];
    stageColor?: string;
    users?: any[];
    onResponsibleChange?: (dealId: string, userId: string) => void;
    isOperator?: boolean;
}

export function DealCardComponent({ deal, index, onClick, cardConfig, stageColor, users, onResponsibleChange, isOperator }: DealCardProps) {
    // Default config if none provided (Basic layout)
    // USER REQUEST: Only Title, Responsible, CNPJ, Tabulation.
    const activeConfig = cardConfig && cardConfig.length > 0 ? cardConfig.filter(c => c.visible) : [
        { key: "deal_responsible", visible: true, label: "Responsável" },
        { key: "client_cnpj", visible: true, label: "CNPJ" },
        { key: "qual_tabulation", visible: true, label: "Tabulação" }
    ];

    const renderField = (key: string) => {
        switch (key) {
            case "deal_tags":
                if (!deal.tags || deal.tags.length === 0) return null;
                return (
                    <div className="flex flex-wrap gap-1 mb-2">
                        {deal.tags.map(dt => (
                            <span
                                key={dt.tag.id}
                                className="text-[9px] px-1.5 py-0.5 rounded-sm font-medium text-white truncate max-w-[80px]"
                                style={{ backgroundColor: dt.tag.color, opacity: 0.9 }}
                            >
                                {dt.tag.name}
                            </span>
                        ))}
                    </div>
                );

            case "deal_value":
                if (deal.value == null) return null;
                return (
                    <div className="text-sm text-foreground font-bold mb-1 flex items-center gap-1">
                        <DollarSign size={12} className="text-muted-foreground" />
                        {Number(deal.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                );

            case "deal_responsible":
                // Se temos users e callback, renderizamos o seletor interativo
                if (users && onResponsibleChange) {
                    return (
                        <div
                            className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border"
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()} // Importante para não iniciar o drag ao clicar
                        >
                            <div className="w-5 h-5 rounded-full bg-muted text-foreground flex items-center justify-center text-[9px] font-medium border border-border shrink-0">
                                {deal.responsible?.name ? deal.responsible.name.substring(0, 2).toUpperCase() : '?'}
                            </div>

                            <Select
                                value={deal.responsible?.id || '__none__'}
                                onValueChange={(value) => {
                                    if (value === '__none__') return;
                                    onResponsibleChange(deal.id, value);
                                }}
                            >
                                <SelectTrigger
                                    className="h-6 border-none bg-transparent p-0 text-[10px] text-muted-foreground hover:text-foreground shadow-none focus:ring-0"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <SelectValue placeholder="Selecionar..." />
                                </SelectTrigger>
                                <SelectContent onClick={(e) => e.stopPropagation()}>
                                    <SelectItem value="__none__" disabled>Selecionar...</SelectItem>
                                    {users.map((u: any) => (
                                        <SelectItem key={u.id} value={u.id}>
                                            {u.name} {u.surname && u.surname}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    );
                }

                // Fallback para visualização estática
                if (!deal.responsible) return null;
                return (
                    <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
                        <div className="w-5 h-5 rounded-full bg-muted text-foreground flex items-center justify-center text-[9px] font-medium border border-border">
                            {deal.responsible.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="truncate max-w-[150px] text-[10px]">{deal.responsible.name} {deal.responsible.surname}</span>
                    </div>
                );

            case "client_name":
                if (!deal.client) return null;
                return (
                    <div className="flex items-center gap-1 text-xs text-foreground font-medium mb-1">
                        <User size={12} className="text-muted-foreground shrink-0" />
                        <span className="truncate">{`${deal.client.name} ${deal.client.surname || ''}`.trim()}</span>
                    </div>
                );

            case "client_cnpj":
                if (!deal.client?.cnpj) return null;
                return (
                    <div className="flex items-center gap-1 text-[12px] text-muted-foreground mb-1">
                        <FileText size={11} className="shrink-0" />
                        <span className="truncate">{deal.client.cnpj}</span>
                    </div>
                );

            case "client_email":
                if (!deal.client?.email) return null;
                return (
                    <div className="flex items-center gap-1 text-[12px] text-muted-foreground mb-1">
                        <Mail size={11} className="shrink-0" />
                        <span className="truncate max-w-full">{deal.client.email}</span>
                    </div>
                );

            case "client_phone":
                if (!deal.client?.phone) return null;
                return (
                    <div className="flex items-center gap-1 text-[12px] text-muted-foreground mb-1">
                        <Phone size={11} className="shrink-0" />
                        <span className="truncate">{deal.client.phone}</span>
                    </div>
                );

            case "qual_tabulation":
                const tab = deal.client?.tabulacao;
                if (!tab) return null;
                return (
                    <div className="inline-block px-1.5 py-0.5 rounded bg-green-500/10 text-green-700 dark:text-green-400 text-[10px] font-bold border border-green-200 dark:border-green-500/20 mb-1">
                        {tab}
                    </div>
                );

            case "qual_faturamento":
                const fat = deal.client?.faturamento_mensal;
                if (!fat) return null;
                return (
                    <div className="flex items-center gap-1 text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                        <DollarSign size={11} className="text-green-500" />
                        <span className="opacity-70 font-medium mr-0.5 text-[9px]">FAT:</span>
                        {Number(fat).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                );

            case "created_at":
                const date = deal.created_at ? (typeof deal.created_at === 'string' ? parseISO(deal.created_at) : deal.created_at) : null;
                if (!date || !isValid(date)) return null;
                return (
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70 mb-1">
                        <Calendar size={10} />
                        {format(date, "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </div>
                );
            case "sla_status":
                if (!deal.is_overdue) return null;
                return (
                    <div className="flex items-center gap-1 text-[10px] text-destructive font-bold mb-1">
                        <AlertCircle size={10} />
                        Atrasado
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <Draggable draggableId={deal.id} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    onClick={() => onClick(deal.id)}
                    className={`
                        bg-card p-3 mb-2 rounded-md shadow-sm border border-border text-left transition-all group relative
                        hover:bg-accent/50
                        ${snapshot.isDragging ? 'shadow-lg ring-1 ring-primary/20 z-50 scale-[1.02]' : ''}
                    `}
                    style={{
                        ...provided.draggableProps.style,
                        borderLeftWidth: stageColor ? '4px' : '1px',
                        borderLeftColor: stageColor || undefined
                    }}
                >
                    {isOperator && deal.client?.integration_status !== 'Cadastro salvo com sucesso!' && (
                        <div className="absolute inset-0 z-10 rounded-md flex flex-col items-center justify-center gap-1.5 bg-destructive/90 text-white text-center px-3 cursor-pointer">
                            <AlertCircle size={26} />
                            <span className="text-xs font-bold leading-tight tracking-wide uppercase">Lead não apto</span>
                            <span className="text-[10px] opacity-80 leading-tight">Cadastro não integrado ao banco</span>
                        </div>
                    )}
                    <div className="font-semibold text-card-foreground mb-2 leading-tight text-xs">
                        {deal.title}
                    </div>

                    <div className="flex flex-col gap-0.5">
                        {activeConfig.map(field => (
                            <div key={field.key}>
                                {renderField(field.key)}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </Draggable>
    );
}

export const DealCard = React.memo(DealCardComponent, (prev, next) => {
    return (
        prev.deal === next.deal &&
        prev.index === next.index &&
        prev.cardConfig === next.cardConfig
    );
});



