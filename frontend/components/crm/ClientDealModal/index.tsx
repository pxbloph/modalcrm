import React, { useEffect, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { ModalHeader } from "./ModalHeader";
import { ModalFooter } from "./ModalFooter";
import { ClientForm } from "./ClientForm";
import { clientDealFormSchema, ClientDealFormValues } from "./schemas";
import { Loader2 } from "lucide-react";
import {
    Div2_ClientData,
    Div3_Responsible,
    Div4_Tabulation,
    Div5_Qualification,
    Div6_CustomGroups
} from "./ModalComponents";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ClientDealModalProps {
    dealId?: string | null;
    pipelineId?: string;
    initialClientId?: string;
    initialData?: any;
    onClose: () => void;
    onUpdate: () => void;
}

// Helper to format history item
const HistoryItem = ({ item }: { item: any }) => {
    let text = "";
    let subtext = "";

    switch (item.action) {
        case "CREATED":
            text = "Negócio criado";
            break;
        case "STAGE_CHANGE":
            text = `Mudança de etapa: ${item.details?.from} ➝ ${item.details?.to}`;
            break;
        case "FIELD_UPDATE":
            text = `Alteração em ${item.details?.field || "campo"}: ${item.details?.from || "(vazio)"} ➝ ${item.details?.to || "(vazio)"}`;
            break;
        case "RESPONSIBLE_UPDATE":
            text = `Responsável alterado: ${item.details?.from} ➝ ${item.details?.to}`;
            break;
        case "STATUS_UPDATE":
            text = `Status alterado: ${item.details?.from} ➝ ${item.details?.to}`;
            break;
        case "TABULATION":
            text = `Tabulação: ${item.details?.tabulation || item.details?.status || "Atualização"}`;
            subtext = item.details?.notes ? `Obs: ${item.details.notes}` : "";
            break;
        default:
            text = item.action;
            break;
    }

    return (
        <div className="flex flex-col py-3 border-b border-border/50 last:border-0">
            <div className="flex justify-between items-start">
                <span className="text-sm font-medium text-foreground">{text}</span>
                <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                    {format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </span>
            </div>
            {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}

            <span className="text-[10px] text-muted-foreground mt-1">
                Por: {item.actor?.name || "Sistema"}
            </span>
        </div>
    );
};

export function ClientDealModal({
    dealId,
    pipelineId,
    initialClientId,
    initialData,
    onClose,
    onUpdate
}: ClientDealModalProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [tabulationOptions, setTabulationOptions] = useState<string[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loadedData, setLoadedData] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<"data" | "history">("data");

    const methods = useForm({
        resolver: zodResolver(clientDealFormSchema),
        defaultValues: {
            client: {
                name: "",
                surname: "",
                email: "",
                phone: "",
                cnpj: "",
                integration_status: "",
                is_qualified: false,
                has_open_account: false
            },
            qualification: {
                tabulacao: "",
                faturamento_mensal: "",
                faturamento_maquina: "",
                maquininha_atual: "",
                produto_interesse: "",
                emite_boletos: false,
                deseja_receber_ofertas: false,
                informacoes_adicionais: "",
                agendamento: null,
                account_opening_date: null
            },
            deal: {
                title: "",
                pipeline_id: "",
                user_id: ""
            }
        }
    });

    const [machineOptions, setMachineOptions] = useState<{ label: string, value: string }[]>([]);

    // Carregar Dados
    useEffect(() => {
        const loadAll = async () => {
            setLoading(true);
            try {
                // ... existing loads ...
                const tabsRes = api.get('/qualifications/tabulations').catch(() => ({ data: [] }));
                const templateRes = api.get('/form-templates/active').catch(() => ({ data: null }));

                let dataPromise = Promise.resolve(null);
                if (dealId) {
                    // Fetch full deal including history (already included in backend `findOne`)
                    dataPromise = api.get(`/deals/${dealId}`).then(res => res.data);
                } else if (initialClientId) {
                    dataPromise = api.get(`/clients/${initialClientId}`).then(res => res.data);
                }

                const usersPromise = api.get('/users').catch(() => ({ data: [] }));

                const [tabs, tmpl, mainData, usersRes] = await Promise.all([tabsRes, templateRes, dataPromise, usersPromise]);

                if (usersRes.data) setUsers(usersRes.data);

                // ... handle machines ...
                if (tmpl.data && tmpl.data.fields) {
                    const maqField = tmpl.data.fields.find((f: any) => f.systemField === 'maquininha_atual');
                    if (maqField && maqField.options) {
                        setMachineOptions(maqField.options);
                    } else {
                        // Fallback options
                        setMachineOptions([
                            { label: 'Nenhuma', value: 'Nenhuma' },
                            { label: 'Pagbank', value: 'Pagbank' },
                            { label: 'Mercado Pago', value: 'Mercado Pago' },
                            { label: 'Stone', value: 'Stone' },
                            { label: 'Cielo', value: 'Cielo' },
                            { label: 'Rede', value: 'Rede' },
                            { label: 'Getnet', value: 'Getnet' },
                            { label: 'Safra', value: 'Safra' },
                            { label: 'Sicredi', value: 'Sicredi' },
                            { label: 'Sicoob', value: 'Sicoob' }
                        ]);
                    }
                }

                if (Array.isArray(tabs.data)) setTabulationOptions(tabs.data);
                else setTabulationOptions([ /* defaults */ "Aguardando abertura", "Retornar outro horário", "Conta aberta"]);

                if (mainData) {
                    setLoadedData(mainData);
                    populateForm(mainData, dealId ? 'deal' : 'client');
                } else if (initialData) {
                    populateForm(initialData, 'deal');
                } else {
                    // NEW DEAL (No previous data) - Initialize defaults
                    populateForm({}, 'client');
                }

            } catch (error) {
                console.error("Erro ao carregar modal", error);
                toast({ title: "Erro", description: "Falha ao carregar dados.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };

        loadAll();
    }, [dealId, initialClientId, initialData]);

    const populateForm = (data: any, type: 'deal' | 'client') => {
        const client = type === 'deal' ? data.client : data;
        const qual = client?.qualifications?.[0] || {};

        let maqAtual = qual.maquininha_atual || "";
        if (typeof maqAtual === 'string' && maqAtual.includes(',')) {
            maqAtual = maqAtual.split(',').map((s: string) => s.trim());
        } else if (typeof maqAtual === 'string' && maqAtual) {
            maqAtual = [maqAtual];
        } else if (!maqAtual) {
            maqAtual = [];
        }

        const formValues: any = {
            client: {
                name: client?.name || "",
                surname: client?.surname || "",
                email: client?.email || "",
                phone: client?.phone || "",
                cnpj: client?.cnpj || "",
                integration_status: client?.integration_status || "",
                is_qualified: client?.is_qualified || false,
                has_open_account: client?.has_open_account || false,
            },
            qualification: {
                tabulacao: qual.tabulacao || "",
                faturamento_mensal: String(qual.faturamento_mensal || ""),
                faturamento_maquina: String(qual.faturamento_maquina || ""),
                maquininha_atual: maqAtual,
                produto_interesse: qual.produto_interesse || "",
                emite_boletos: !!qual.emite_boletos,
                deseja_receber_ofertas: !!qual.deseja_receber_ofertas,
                informacoes_adicionais: qual.informacoes_adicionais || "",
                account_opening_date: client?.account_opening_date ? client.account_opening_date.split('T')[0] : "",
            }
        };

        if (type === 'deal') {
            formValues.deal = {
                title: data.title,
                value: data.value,
                pipeline_id: data.pipeline_id,
                user_id: data.user_id || data.responsible?.id || ""
            };
        } else {
            formValues.deal = {
                title: `Negócio - ${client?.name || ''}`,
                pipeline_id: pipelineId || "",
                tag_ids: [],
                user_id: ""
            };
        }

        methods.reset(formValues);
    };

    const handleOpenAccount = async () => {
        const targetClientId = loadedData?.client?.id || loadedData?.id || initialClientId || initialData?.client?.id;
        if (!targetClientId) {
            toast({ title: "Erro", description: "Cliente não identificado.", variant: "destructive" });
            return;
        }

        if (!confirm("Confirmar que esta conta foi ABERTA? Isso atualizará o status do cliente.")) return;

        setSaving(true);
        try {
            await api.put(`/clients/${targetClientId}`, {
                has_open_account: true,
                account_opening_date: new Date().toISOString()
            });

            methods.setValue("client.has_open_account", true);
            methods.setValue("qualification.tabulacao", "Conta aberta");
            methods.setValue("qualification.account_opening_date", new Date().toISOString().split('T')[0]);

            const currentPipelineId = pipelineId || loadedData?.pipeline_id;
            if (currentPipelineId && dealId) {
                try {
                    const pipelineRes = await api.get(`/pipelines/${currentPipelineId}`);
                    const stages = pipelineRes.data?.stages || [];
                    const targetStage = stages.find((s: any) =>
                        s.name.trim().toLowerCase() === "consolidado conta aberta" ||
                        s.name.trim().toLowerCase().includes("conta aberta")
                    );

                    if (targetStage) {
                        await api.patch(`/deals/${dealId}`, { stage_id: targetStage.id });
                        toast({ title: "Movido", description: `Negócio movido para etapa: ${targetStage.name}` });
                    }
                } catch (err) {
                    console.error("Erro ao tentar mover card de etapa", err);
                }
            }

            toast({ title: "Sucesso", description: "Conta marcada como aberta!" });
            onUpdate();
        } catch (error) {
            console.error(error);
            toast({ title: "Erro", description: "Falha ao atualizar conta.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const onSubmit = async (values: ClientDealFormValues) => {
        setSaving(true);
        try {
            let targetClientId = loadedData?.client?.id || loadedData?.id || initialClientId || initialData?.client?.id;

            // PREPARE QUALIFICATION DATA
            let maqToSave = values.qualification.maquininha_atual;
            if (Array.isArray(maqToSave)) maqToSave = maqToSave.join(', ');

            const qualPayload = {
                ...values.qualification,
                maquininha_atual: maqToSave,
                faturamento_mensal: Number(values.qualification.faturamento_mensal) || 0,
                faturamento_maquina: Number(values.qualification.faturamento_maquina) || 0,
                account_opening_date: values.qualification.account_opening_date ? new Date(values.qualification.account_opening_date).toISOString() : null
            };

            // 1. CREATE OR UPDATE CLIENT
            if (!targetClientId) {
                // Feature: Create New Client on the fly
                const clientPayload = {
                    ...values.client,
                    ...qualPayload,
                    skip_auto_deal: true // Prevent backend from creating a default deal, as we will create a specific one below
                };
                const res = await api.post('/clients', clientPayload);
                targetClientId = res.data.id;
            } else {
                // Update Existing Client
                await api.put(`/clients/${targetClientId}`, { ...values.client, ...qualPayload });
            }

            // 2. SAVE CUSTOM FIELDS (CLIENT)
            if (targetClientId && values.custom_fields) {
                try {
                    await api.post(`/client-custom-fields/values/${targetClientId}`, values.custom_fields);
                } catch (e) { console.error("Erro custom fields", e); }
            }

            // 3. CREATE OR UPDATE DEAL
            if (!dealId) {
                // CREATE NEW DEAL
                await api.post('/deals', {
                    title: values.deal?.title || `Negócio - ${values.client.name}`,
                    value: values.deal?.value ? Number(values.deal.value) : 0,
                    pipeline_id: values.deal?.pipeline_id || pipelineId,
                    responsible_id: values.deal?.user_id,
                    client_id: targetClientId
                });
                toast({ title: "Sucesso", description: "Negócio criado com sucesso!" });
            } else {
                // UPDATE EXISTING DEAL
                await api.patch(`/deals/${dealId}`, {
                    title: values.deal?.title,
                    value: values.deal?.value ? Number(values.deal?.value) : null,
                    responsible_id: values.deal?.user_id || undefined
                });
                toast({ title: "Sucesso", description: "Dados salvos com sucesso." });
            }

            onUpdate();
            onClose();

        } catch (error: any) {
            console.error("Erro ao salvar", error);
            toast({ title: "Erro", description: error.response?.data?.message || "Erro ao salvar.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Tem certeza que deseja excluir?")) return;
        try {
            if (dealId) await api.delete(`/deals/${dealId}`);
            else if (initialClientId) await api.delete(`/clients/${initialClientId}`);
            onUpdate();
            onClose();
        } catch (error) {
            console.error(error);
            toast({ title: "Erro", description: "Falha ao excluir.", variant: "destructive" });
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-[2px] flex items-center justify-center z-[100]">
                <div className="bg-card p-8 rounded-xl shadow-2xl flex flex-col items-center gap-4 animate-in zoom-in-95 border border-border">
                    <Loader2 className="animate-spin text-primary" size={32} />
                    <span className="text-sm font-medium text-muted-foreground">Carregando...</span>
                </div>
            </div>
        );
    }

    const currentClientId = loadedData?.client?.id || loadedData?.id || initialClientId || initialData?.client?.id;

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-[2px] flex items-center justify-center z-[100] p-4 font-sans">
            <div className="bg-card w-full max-w-5xl max-h-[95vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-border animate-in fade-in zoom-in-95 duration-200">
                <FormProvider {...methods}>
                    <form onSubmit={methods.handleSubmit(onSubmit, (errors) => {
                        console.error("Validation Errors:", errors);
                        toast({ title: "Erro de Validação", description: "Verifique os campos obrigatórios.", variant: "destructive" });
                    })} className="flex flex-col h-full overflow-hidden font-sans">
                        <ModalHeader
                            title={methods.watch("client.name") || "Carregando..."}
                            subtitle={dealId ? `Deal: ${dealId.split('-')[0]}` : "Cliente"}
                            integrationStatus={methods.watch("client.integration_status")}
                            onClose={onClose}
                        />

                        {/* TABS HEADER */}
                        <div className="flex border-b border-border bg-card/50 px-6 pt-2">
                            <button
                                type="button"
                                onClick={() => setActiveTab("data")}
                                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "data" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                            >
                                Dados
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab("history")}
                                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "history" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                            >
                                Histórico
                            </button>
                        </div>

                        {/* CONTENT AREA */}
                        <div className="flex-1 overflow-y-auto p-6 bg-card/50">
                            {activeTab === "data" ? (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                                    <div className="flex flex-col gap-6">
                                        <Div2_ClientData>
                                            <ClientForm />
                                        </Div2_ClientData>
                                        <Div3_Responsible users={users} />
                                        <Div4_Tabulation options={tabulationOptions} />
                                    </div>
                                    <div className="flex flex-col gap-6">
                                        <Div5_Qualification machineOptions={machineOptions} />
                                        <Div6_CustomGroups clientId={currentClientId} />
                                    </div>
                                </div>
                            ) : (
                                <div className="max-w-3xl mx-auto flex flex-col gap-2">
                                    <h3 className="text-sm font-medium text-muted-foreground mb-2 px-2 uppercase tracking-wide">Linha do Tempo</h3>
                                    <div className="bg-card border border-border rounded-md p-4 shadow-sm">
                                        {loadedData?.history?.length > 0 ? (
                                            loadedData.history.map((item: any) => (
                                                <HistoryItem key={item.id} item={item} />
                                            ))
                                        ) : (
                                            <div className="text-center py-8 text-muted-foreground text-sm">
                                                Nenhum histórico registrado ainda.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {activeTab === "data" && (
                            <ModalFooter
                                onClose={onClose}
                                onSave={methods.handleSubmit(onSubmit)}
                                saving={saving}
                                onDelete={handleDelete}
                                onOpenAccount={handleOpenAccount}
                                canDelete={true}
                            />
                        )}
                        {activeTab === "history" && (
                            <div className="p-4 border-t border-border bg-background flex justify-end">
                                <button type="button" onClick={onClose} className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:bg-secondary/80">
                                    Fechar
                                </button>
                            </div>
                        )}
                    </form>
                </FormProvider>
            </div>
        </div>
    );
}

// Re-export default for lazy loading
export default ClientDealModal;
