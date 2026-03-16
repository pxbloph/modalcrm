import React from "react";
import { useFormContext } from "react-hook-form";
import { User, CheckCircle, FileText, ArrowRightLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModalInput } from "./ModalUI";
import { QualificationRadioGroup } from "./QualificationRadioGroup";
import { ClientCustomFieldsRenderer } from "./ClientCustomFieldsRenderer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// --- DIV 1: Header Info ---
export function Div1_HeaderInfo({ dealId, className }: { dealId?: string, dealTitle?: string, className?: string }) {
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
                <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1">T\u00edtulo do Neg\u00f3cio</label>
                <input
                    {...register("deal.title")}
                    className="text-lg font-bold text-foreground bg-transparent border-none p-0 focus:ring-0 w-full placeholder:text-muted-foreground"
                    placeholder="Nome do Neg\u00f3cio"
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
    const { watch, setValue } = useFormContext();
    const currentUserId = watch("deal.user_id");

    const isOperator = currentUser?.role === "OPERATOR";

    return (
        <div className={cn("bg-card p-4 rounded-lg border border-border flex flex-col justify-center", className)}>
            <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Respons\u00e1vel</label>

            {isOperator ? (
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Select value={currentUserId || "__none__"} disabled>
                            <SelectTrigger className="w-full bg-muted/50 border border-input text-xs font-medium text-foreground opacity-70">
                                <SelectValue placeholder="Sem respons\u00e1vel" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__none__">Sem respons\u00e1vel</SelectItem>
                                {users.map((u: any) => (
                                    <SelectItem key={u.id} value={u.id}>{u.name} {u.surname}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {onRequestResponsibility && (
                        <button
                            type="button"
                            onClick={onRequestResponsibility}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg transition-colors flex items-center justify-center shrink-0"
                            title="Solicitar Troca de Respons\u00e1vel"
                        >
                            <ArrowRightLeft size={16} />
                        </button>
                    )}
                </div>
            ) : (
                <div className="relative">
                    <Select
                        value={currentUserId || "__none__"}
                        onValueChange={(value) => setValue("deal.user_id", value === "__none__" ? "" : value, { shouldDirty: true })}
                    >
                        <SelectTrigger className="w-full bg-input/20 border border-input rounded-lg px-3 py-2.5 text-xs font-medium text-foreground">
                            <SelectValue placeholder="Sem respons\u00e1vel" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__none__">Sem respons\u00e1vel</SelectItem>
                            {users.map((u: any) => (
                                <SelectItem key={u.id} value={u.id}>{u.name} {u.surname}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
        </div>
    );
}

// --- DIV 4: Tabulation ---
export function Div4_Tabulation({ options, className, isBlocked }: { options: string[], className?: string, isBlocked?: boolean }) {
    const { register, watch, setValue } = useFormContext();
    const tabulacao = watch("qualification.tabulacao");
    const showAccountDate = tabulacao === "Conta aberta";

    return (
        <div className={cn("bg-status-waiting/10 p-4 rounded-lg border border-border flex flex-col gap-4", className)}>
            <div className="flex items-center gap-2 text-status-waiting opacity-80">
                <FileText size={18} />
                <span className="text-xs font-bold uppercase">Status / Tabula\u00e7\u00e3o</span>
            </div>

            <QualificationRadioGroup
                name="qualification.tabulacao"
                value={tabulacao || ""}
                onChange={(value) => {
                    if (isBlocked) return;
                    setValue("qualification.tabulacao", value, { shouldDirty: true });
                }}
                options={options.map((opt) => ({ label: opt, value: opt }))}
                disabled={isBlocked}
            />

            {showAccountDate && (
                <div className="animate-in slide-in-from-top-2 fade-in">
                    <label className="text-xs font-semibold text-status-waiting mb-1 block">Data Abertura Conta</label>
                    <input
                        type="date"
                        disabled={isBlocked}
                        className={cn("w-full bg-input/20 border border-input rounded-lg px-2 py-1.5 text-xs font-medium text-foreground outline-none focus:bg-background focus:border-ring focus:ring-2 focus:ring-ring/20", isBlocked && "opacity-50 cursor-not-allowed")}
                        {...register("qualification.account_opening_date")}
                    />
                </div>
            )}
        </div>
    );
}

// --- DIV 5: Qualification ---
export function Div5_Qualification({ className, machineOptions = [], isBlocked }: { className?: string, machineOptions?: { label: string, value: string }[], isBlocked?: boolean }) {
    const { register, watch, setValue } = useFormContext();
    const currentMachine = watch("qualification.maquininha_atual");
    const machineValue = Array.isArray(currentMachine) ? currentMachine[0] || "" : currentMachine || "";

    return (
        <div className={cn("bg-card p-4 rounded-lg border border-border", className)}>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border">
                <div className="text-primary"><CheckCircle size={16} /></div>
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Qualifica\u00e7\u00e3o</h3>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
                <ModalInput label="Fat. Mensal" placeholder="R$ 0,00" disabled={isBlocked} {...register("qualification.faturamento_mensal")} />
                <ModalInput label="Fat. M\u00e1quina" placeholder="R$ 0,00" disabled={isBlocked} {...register("qualification.faturamento_maquina")} />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Maquininha</label>
                    <QualificationRadioGroup
                        name="qualification.maquininha_atual"
                        value={machineValue}
                        onChange={(value) => {
                            if (isBlocked) return;
                            setValue("qualification.maquininha_atual", value, { shouldDirty: true });
                        }}
                        options={machineOptions}
                        disabled={isBlocked}
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Interesse</label>
                    <QualificationRadioGroup
                        name="qualification.produto_interesse"
                        value={watch("qualification.produto_interesse") || ""}
                        onChange={(value) => {
                            if (isBlocked) return;
                            setValue("qualification.produto_interesse", value, { shouldDirty: true });
                        }}
                        options={[
                            { label: "Conta PJ", value: "Conta PJ" },
                            { label: "Cart\u00e3o de Cr\u00e9dito", value: "Cart\u00e3o de Cr\u00e9dito" },
                            { label: "Antecipa\u00e7\u00e3o", value: "Antecipa\u00e7\u00e3o" },
                        ]}
                        disabled={isBlocked}
                    />
                </div>
            </div>

            <div className="flex gap-4 mb-3">
                <label className={cn("flex items-center gap-2", isBlocked ? "cursor-not-allowed opacity-50" : "cursor-pointer")}>
                    <input type="checkbox" disabled={isBlocked} {...register("qualification.emite_boletos")} className="rounded border-input text-primary focus:ring-primary" />
                    <span className="text-xs font-medium text-muted-foreground">Emite Boletos?</span>
                </label>
                <label className={cn("flex items-center gap-2", isBlocked ? "cursor-not-allowed opacity-50" : "cursor-pointer")}>
                    <input type="checkbox" disabled={isBlocked} {...register("qualification.deseja_receber_ofertas")} className="rounded border-input text-primary focus:ring-primary" />
                    <span className="text-xs font-medium text-muted-foreground">Receber Ofertas?</span>
                </label>
            </div>

            <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-bold text-muted-foreground uppercase block mb-1">Notas</label>
                <textarea
                    disabled={isBlocked}
                    {...register("qualification.informacoes_adicionais")}
                    className={cn("w-full bg-input/20 border border-input rounded-lg p-3 text-xs font-medium text-foreground min-h-[80px] resize-none outline-none transition-all duration-200 focus:bg-background focus:border-ring focus:ring-2 focus:ring-ring/20 placeholder:text-muted-foreground", isBlocked && "opacity-50 cursor-not-allowed")}
                    placeholder="Adicionar observa\u00e7\u00f5es..."
                />
            </div>
        </div>
    );
}

// --- DIV 6+: Custom Fields Wrapper ---
export function Div6_CustomGroups({ clientId, className, isBlocked }: { clientId?: string, className?: string, isBlocked?: boolean }) {
    return (
        <div className={cn("flex flex-col gap-2 relative", className)}>
            {isBlocked && <div className="absolute inset-0 z-10 rounded-lg cursor-not-allowed" />}
            <ClientCustomFieldsRenderer clientId={clientId} />
        </div>
    );
}
