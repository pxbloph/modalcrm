import React, { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { CheckCircle, FileText } from "lucide-react";
import { ModalInput, ModalSelect } from "./ModalUI";
import { QualificationRadioGroup } from "./QualificationRadioGroup";
import { ClientDealFormValues } from "./schemas";
import { cn } from "@/lib/utils";

interface QualificationFormProps {
    tabulationOptions: string[];
    users?: any[];
}

export function QualificationForm({ tabulationOptions, users = [] }: QualificationFormProps) {
    const { register, watch, setValue } = useFormContext<ClientDealFormValues>();

    // Watch tabulação para mostrar data condicional
    const tabulacao = watch("qualification.tabulacao");
    const showAccountDate = tabulacao === "Conta aberta";

    return (
        <div className="flex flex-col gap-6 h-full">
            {/* Título da Seção */}
            <div className="flex items-center gap-2 mb-2 pb-2 border-b-2 border-border">
                <div className="text-primary"><CheckCircle size={18} /></div>
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Dados da Qualificação</h3>
            </div>

            {/* Seletor de Responsável (Independente) */}
            <div className="bg-muted/30 rounded-lg p-4 border border-border">
                
                <ModalSelect
                    label="Responsável pelo Negócio"
                    className="bg-background border-input text-foreground focus:ring-primary h-9 text-sm"
                    value={watch('deal.user_id') || '__empty__'}
                    onValueChange={(value) => setValue('deal.user_id', value === '__empty__' ? '' : value, { shouldDirty: true })}
                    options={[
                        { label: 'Sem responsável', value: '__empty__' },
                        ...users.map((u: any) => ({ label: [u.name, u.surname].filter(Boolean).join(' '), value: u.id }))
                    ]}
                />
            </div>

            {/* Painel de Destaque (Tabulação Apenas) */}
            <div className="bg-status-waiting/10 rounded-lg p-4 border border-status-waiting/20 relative transition-all">
                <div className="absolute top-4 right-4 text-status-waiting opacity-50"><FileText size={20} /></div>

                <label className="block text-[12px] font-bold text-muted-foreground uppercase tracking-wide mb-2 pl-0.5">
                    Tabulação / Status do Lead
                </label>
                <QualificationRadioGroup
                    name="qualification.tabulacao"
                    value={watch('qualification.tabulacao') || ''}
                    onChange={(value) => setValue('qualification.tabulacao', value, { shouldDirty: true })}
                    options={tabulationOptions.map((opt) => ({ label: opt, value: opt }))}
                />

                {showAccountDate && (
                    <div className="mt-3 pt-3 border-t border-status-waiting/20 animate-in slide-in-from-top-2 fade-in duration-300">
                        <ModalInput
                            label="Data de Abertura da Conta"
                            type="date"
                            className="bg-background/50 border-status-waiting/30 text-foreground focus:ring-status-waiting"
                            {...register("qualification.account_opening_date")}
                        />
                    </div>
                )}
            </div>

            {/* Grids de Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ModalInput
                    label="Faturamento Mensal"
                    placeholder="R$ 0,00"
                    {...register("qualification.faturamento_mensal")}
                />
                <ModalInput
                    label="Faturamento Máquina"
                    placeholder="R$ 0,00"
                    {...register("qualification.faturamento_maquina")}
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ModalInput
                    label="Maquininha Atual"
                    {...register("qualification.maquininha_atual")}
                />

                <div className="flex flex-col gap-1.5">
                    <label className="block text-[12px] font-bold text-muted-foreground uppercase tracking-wide pl-0.5">
                        Produto de Interesse
                    </label>
                    <QualificationRadioGroup
                        name="qualification.produto_interesse"
                        value={watch('qualification.produto_interesse') || ''}
                        onChange={(value) => setValue('qualification.produto_interesse', value, { shouldDirty: true })}
                        options={[
                            { label: 'Conta PJ', value: 'Conta PJ' },
                            { label: 'Cartão de Crédito', value: 'Cartão de Crédito' },
                            { label: 'Antecipação', value: 'Antecipação' },
                        ]}
                    />
                </div>
            </div>

            {/* Checkboxes Estilizados */}
            <div className="flex gap-6 mt-2">
                <Checkbox label="Emite Boletos?" registerName="qualification.emite_boletos" />
                <Checkbox label="Receber Ofertas?" registerName="qualification.deseja_receber_ofertas" />
            </div>

            {/* Info Adicional */}
            <div>
                <label className="block text-[12px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5 pl-0.5">
                    Informações Adicionais
                </label>
                <textarea
                    className="w-full bg-input/50 border border-input rounded-lg px-3 py-2.5 text-sm font-medium text-foreground outline-none transition-all focus:bg-background focus:border-primary focus:ring-2 focus:ring-primary/10 resize-none leading-relaxed"
                    {...register("qualification.informacoes_adicionais")}
                />
            </div>

        </div>
    );
}

// Helper local para checkbox
function Checkbox({ label, registerName }: { label: string, registerName: any }) {
    const { register, watch } = useFormContext();
    const checked = watch(registerName);

    return (
        <label className="flex items-center gap-2 cursor-pointer select-none group">
            <div className={cn(
                "w-4 h-4 rounded-full border flex items-center justify-center transition-colors shadow-sm",
                checked
                    ? "bg-primary border-primary"
                    : "border-input bg-background group-hover:border-primary/50"
            )}>
                {checked && <CheckCircle size={10} className="text-primary-foreground" strokeWidth={3} />}
            </div>
            <input type="checkbox" className="hidden" {...register(registerName)} />
            <span className="text-xs font-semibold text-muted-foreground group-hover:text-primary transition-colors">
                {label} <span className={cn("font-bold ml-1", checked ? "text-primary dark:text-primary" : "text-muted-foreground/50")}>{checked ? 'Sim' : 'Não'}</span>
            </span>
        </label>
    );
}
