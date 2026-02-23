import React from "react";
import { useFormContext } from "react-hook-form";
import { Copy, User, CheckCircle, FileText, Briefcase, ArrowRightLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModalInput, ModalSelect } from "./ModalUI";
import { ClientCustomFieldsRenderer } from "./ClientCustomFieldsRenderer";

// --- DIV 1: Header Info ---
export function Div1_HeaderInfo({ dealId, dealTitle, className }: { dealId?: string, dealTitle?: string, className?: string }) {
    const { register } = useFormContext();
    const displayId = dealId ? dealId.substring(0, 8).toUpperCase() : "NOVO";

    return (
        <div className={cn("bg-card p-4 rounded-lg border border-border shadow-sm flex flex-col gap-2", className)}>
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted-foreground uppercase bg-muted px-1.5 py-0.5 rounded">
                    ID: {displayId}
                </span>
            </div>
            <div className="flex-1 flex flex-col justify-center">
                <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Título do Negócio</label>
                <input
                    {...register("deal.title")}
                    className="text-lg font-bold text-foreground bg-transparent border-none p-0 focus:ring-0 w-full placeholder:text-muted-foreground"
                    placeholder="Nome do Negócio"
                />
            </div>
        </div>
    );
}

// --- DIV 2: Client Data ---
export function Div2_ClientData({ className, children }: { className?: string, children: React.ReactNode }) {
    return (
        <div className={cn("bg-card p-4 rounded-lg border border-border pb-1", className)}>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border">
                <div className="text-primary"><User size={16} /></div>
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Dados Cadastrais</h3>
            </div>
            {children}
        </div>
    );
}

// --- DIV 3: Responsible ---
export function Div3_Responsible({ users, currentUser, onRequestResponsibility, className }: { users: any[], currentUser?: any, onRequestResponsibility?: () => void, className?: string, control?: any }) {
    const { register, watch } = useFormContext();
    const currentUserId = watch("deal.user_id");

    // Check if user is operator
    const isOperator = currentUser?.role === 'OPERATOR';

    return (
        <div className={cn("bg-card p-4 rounded-lg border border-border flex flex-col justify-center", className)}>
            <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Responsável</label>

            {isOperator ? (
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <select
                            className="w-full bg-muted/50 border border-input rounded-lg px-3 py-2.5 text-xs font-medium text-foreground outline-none appearance-none cursor-not-allowed opacity-70"
                            disabled
                            value={currentUserId || ""}
                        >
                            <option value="">Sem responsável</option>
                            {users.map((u: any) => (
                                <option key={u.id} value={u.id}>{u.name} {u.surname}</option>
                            ))}
                        </select>
                    </div>
                    {onRequestResponsibility && (
                        <button
                            type="button"
                            onClick={onRequestResponsibility}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg transition-colors flex items-center justify-center shrink-0"
                            title="Solicitar Troca de Responsável"
                        >
                            <ArrowRightLeft size={16} />
                        </button>
                    )}
                </div>
            ) : (
                <div className="relative">
                    <select
                        className="w-full bg-input/20 border border-input rounded-lg px-3 py-2.5 text-xs font-medium text-foreground outline-none transition-all duration-200 focus:bg-background focus:border-ring focus:ring-2 focus:ring-ring/20 appearance-none cursor-pointer"
                        {...register("deal.user_id")}
                    >
                        <option value="">Sem responsável</option>
                        {users.map((u: any) => (
                            <option key={u.id} value={u.id}>{u.name} {u.surname}</option>
                        ))}
                    </select>
                </div>
            )}
        </div>
    );
}

// --- DIV 4: Tabulation ---
export function Div4_Tabulation({ options, className }: { options: string[], className?: string }) {
    const { register, watch } = useFormContext();
    const tabulacao = watch("qualification.tabulacao");
    const showAccountDate = tabulacao === "Conta aberta";

    return (
        <div className={cn("bg-status-waiting/10 p-4 rounded-lg border border-border flex flex-col gap-4", className)}>
            <div className="flex items-center gap-2 text-status-waiting opacity-80">
                <FileText size={18} />
                <span className="text-xs font-bold uppercase">Status / Tabulação</span>
            </div>

            <select
                className="w-full bg-input/20 border border-input rounded-lg text-xs font-Semibold text-foreground focus:outline-none focus:border-status-waiting p-3 cursor-pointer"
                {...register("qualification.tabulacao")}
            >
                <option value="" className="bg-popover text-base font-normal">Selecione...</option>
                {options.map(opt => (
                    <option key={opt} value={opt} className="bg-popover text-foreground text-xs">{opt}</option>
                ))}
            </select>

            {showAccountDate && (
                <div className="animate-in slide-in-from-top-2 fade-in">
                    <label className="text-xs font-semibold text-status-waiting mb-1 block">Data Abertura Conta</label>
                    <input
                        type="date"
                        className="w-full bg-input/20 border border-input rounded-lg px-2 py-1.5 text-xs font-medium text-foreground outline-none focus:bg-background focus:border-ring focus:ring-2 focus:ring-ring/20"
                        {...register("qualification.account_opening_date")}
                    />
                </div>
            )}
        </div>
    );
}

// --- MultiSelect Helper ---
function MultiSelect({ label, options, value, onChange }: { label: string, options: { label: string, value: string }[], value: string[], onChange: (val: string[]) => void }) {
    const [open, setOpen] = React.useState(false);

    const handleSelect = (optionValue: string) => {
        const newValue = value.includes(optionValue)
            ? value.filter(v => v !== optionValue)
            : [...value, optionValue];
        onChange(newValue);
    };

    return (
        <div className="flex flex-col gap-1.5 relative">
            <label className="text-xs font-bold text-muted-foreground uppercase">{label}</label>
            <div
                className="flex w-full items-center justify-between bg-input/20 border border-input rounded-lg px-3 py-2.5 text-xs font-medium text-foreground shadow-sm cursor-pointer hover:bg-muted/50 transition-all duration-200"
                onClick={() => setOpen(!open)}
            >
                <span className="truncate">
                    {value.length > 0 ? `${value.length} selecionado(s)` : "Selecione..."}
                </span>
                <span className="ml-2 text-muted-foreground">▼</span>
            </div>

            {open && (
                <>
                    <div className="fixed inset-0 z-50" onClick={() => setOpen(false)} />
                    <div className="absolute top-full left-0 w-full mt-1 bg-popover border border-border rounded-md shadow-md z-50 max-h-60 overflow-y-auto p-1">
                        {options.map(opt => (
                            <div
                                key={opt.value}
                                className={cn(
                                    "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-muted",
                                    value.includes(opt.value) && "bg-muted font-medium"
                                )}
                                onClick={() => handleSelect(opt.value)}
                            >
                                <div className={cn(
                                    "w-4 h-4 rounded border flex items-center justify-center text-primary-foreground",
                                    value.includes(opt.value) ? "bg-primary border-primary" : "border-muted-foreground"
                                )}>
                                    {value.includes(opt.value) && <CheckCircle size={10} className="text-white" />}
                                </div>
                                <span className="text-xs">{opt.label}</span>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

// --- DIV 5: Qualification ---
export function Div5_Qualification({ className, machineOptions = [] }: { className?: string, machineOptions?: { label: string, value: string }[] }) {
    const { register, control, watch, setValue } = useFormContext();
    const currentMachines = watch("qualification.maquininha_atual"); // Pode ser string ou array

    // Normalizar valor para array
    const machineValue = Array.isArray(currentMachines)
        ? currentMachines
        : (currentMachines ? currentMachines.split(',').map((s: string) => s.trim()).filter(Boolean) : []);

    return (
        <div className={cn("bg-card p-4 rounded-lg border border-border", className)}>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border">
                <div className="text-primary"><CheckCircle size={16} /></div>
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Qualificação</h3>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
                <ModalInput label="Fat. Mensal" placeholder="R$ 0,00" {...register("qualification.faturamento_mensal")} />
                <ModalInput label="Fat. Máquina" placeholder="R$ 0,00" {...register("qualification.faturamento_maquina")} />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
                <MultiSelect
                    label="Maquininha"
                    options={machineOptions}
                    value={machineValue}
                    onChange={(val) => setValue("qualification.maquininha_atual", val, { shouldDirty: true })}
                />
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Interesse</label>
                    <select {...register("qualification.produto_interesse")} className="w-full bg-input/20 border border-input rounded-lg px-3 py-2.5 text-xs font-medium text-foreground outline-none transition-all duration-200 focus:bg-background focus:border-ring focus:ring-2 focus:ring-ring/20 appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-muted-foreground">
                        <option value="">—</option>
                        <option value="Conta PJ">Conta PJ</option>
                        <option value="Cartão de Crédito">Cartão de Crédito</option>
                        <option value="Antecipação">Antecipação</option>
                    </select>
                </div>
            </div>

            <div className="flex gap-4 mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" {...register("qualification.emite_boletos")} className="rounded border-input text-primary focus:ring-primary" />
                    <span className="text-xs font-medium text-muted-foreground">Emite Boletos?</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" {...register("qualification.deseja_receber_ofertas")} className="rounded border-input text-primary focus:ring-primary" />
                    <span className="text-xs font-medium text-muted-foreground">Receber Ofertas?</span>
                </label>
            </div>

            <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-bold text-muted-foreground uppercase block mb-1">Notas</label>
                <textarea
                    {...register("qualification.informacoes_adicionais")}
                    className="w-full bg-input/20 border border-input rounded-lg p-3 text-xs font-medium text-foreground min-h-[80px] resize-none outline-none transition-all duration-200 focus:bg-background focus:border-ring focus:ring-2 focus:ring-ring/20 placeholder:text-muted-foreground"
                    placeholder="Adicionar observações..."
                />
            </div>
        </div>
    );
}

// --- DIV 6+: Custom Fields Wrapper ---
export function Div6_CustomGroups({ clientId, className }: { clientId?: string, className?: string }) {
    return (
        <div className={cn("flex flex-col gap-2", className)}>
            <ClientCustomFieldsRenderer clientId={clientId} />
        </div>
    );
}
