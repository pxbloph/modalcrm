"use client";

import { useState, useEffect } from "react";
import { X, Save, Trash, User, Building2, CreditCard, ShoppingBag, Globe, FileText, CheckCircle, AlertCircle, Phone, Mail, DollarSign, Calendar, Tag, Shield, MoreHorizontal, Landmark, RefreshCw, Briefcase, MapPin, Plus, List } from "lucide-react";
import api from "@/lib/api";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

type DealModalProps = {
    dealId?: string | null;
    pipelineId: string;
    initialClientId?: string;
    initialData?: any; // Dados otimistas do Kanban
    onClose: () => void;
    onUpdate: () => void;
};

export default function DealModal({ dealId, pipelineId, initialClientId, initialData, onClose, onUpdate }: DealModalProps) {
    const { toast } = useToast();

    // Optimistic Logic: If we have initialData, we are NOT loading initially.
    const [deal, setDeal] = useState<any>(initialData || null);
    const [loading, setLoading] = useState(!initialData && !!dealId);
    const [saving, setSaving] = useState(false);
    const [userRole, setUserRole] = useState<string>("");

    useEffect(() => {
        // Simple role check from storage
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                const u = JSON.parse(storedUser);
                setUserRole(u.role || 'OPERATOR');
            } catch (e) { setUserRole('OPERATOR'); }
        }
    }, []);

    // --- Form States for CLIENT (Synced on Load) ---
    const [clientData, setClientData] = useState({
        name: initialData?.client?.name || "", // Optimistic
        surname: initialData?.client?.surname || "",
        cnpj: initialData?.client?.cnpj || "",
        email: initialData?.client?.email || "",
        phone: initialData?.client?.phone || "",
        id: initialData?.client?.id || "",
        integration_status: "",
        is_qualified: false,
        has_open_account: false
    });

    // --- Form States for QUALIFICATION (Synced on Load) ---
    const initialQual = initialData?.client?.qualifications?.[0] || {};

    const [qualData, setQualData] = useState<any>({
        // Old Financials
        faturamento_mensal: initialQual.faturamento_mensal || "",
        faturamento_maquina: initialQual.faturamento_maquina || "",
        maquininha_atual: initialQual.maquininha_atual || "",
        produto_interesse: initialQual.produto_interesse || "",
        emite_boletos: !!initialQual.emite_boletos,
        deseja_receber_ofertas: !!initialQual.deseja_receber_ofertas,
        informacoes_adicionais: initialQual.informacoes_adicionais || "",
        tabulacao: initialQual.tabulacao || "",
        agendamento: initialQual.agendamento || "",
        // NEW: Conta Corrente (Read Only)
        cc_tipo_conta: initialQual.cc_tipo_conta || "Conta Corrente",
        cc_status: initialQual.cc_status || "Ativa com senha",
        cc_numero: initialQual.cc_numero || "",
        cc_saldo: initialQual.cc_saldo || 0,
        cc_limite_utilizado: initialQual.cc_limite_utilizado || 0,
        cc_limite_disponivel: initialQual.cc_limite_disponivel || 0,
        // NEW: Cartão (Read Only)
        card_final: initialQual.card_final || "",
        card_status: initialQual.card_status || "",
        card_tipo: initialQual.card_tipo || "",
        card_adicionais: initialQual.card_adicionais || 0,
        card_fatura_aberta_data: initialQual.card_fatura_aberta_data || "",
        card_fatura_aberta_valor: initialQual.card_fatura_aberta_valor || 0,
        // NEW: Global (Read Only)
        global_dolar: !!initialQual.global_dolar,
        global_euro: !!initialQual.global_euro,
        // NEW: Produtos (Read Only)
        prod_multiplos_acessos: !!initialQual.prod_multiplos_acessos,
        prod_c6_pay: !!initialQual.prod_c6_pay,
        prod_c6_tag: !!initialQual.prod_c6_tag,
        prod_debito_automatico: !!initialQual.prod_debito_automatico,
        prod_seguros: !!initialQual.prod_seguros,
        prod_chaves_pix: !!initialQual.prod_chaves_pix,
        prod_web_banking: !!initialQual.prod_web_banking,
        prod_link_pagamento: !!initialQual.prod_link_pagamento,
        prod_boleto_dda: !!initialQual.prod_boleto_dda,
        prod_boleto_cobranca: !!initialQual.prod_boleto_cobranca,
        // NEW: Limites & Risco (Read Only)
        credit_blocklist: !!initialQual.credit_blocklist,
        credit_score_interno: initialQual.credit_score_interno || "Informação indisponível",
        credit_score_serasa: initialQual.credit_score_serasa || "Informação indisponível",
        credit_inadimplencia: initialQual.credit_inadimplencia || "Em dia",
        limit_cartao_utilizado: initialQual.limit_cartao_utilizado || 0,
        limit_cartao_aprovado: initialQual.limit_cartao_aprovado || 0,
        limit_cheque_utilizado: initialQual.limit_cheque_utilizado || 0,
        limit_cheque_aprovado: initialQual.limit_cheque_aprovado || 0,
        limit_parcelado_utilizado: initialQual.limit_parcelado_utilizado || 0,
        limit_parcelado_aprovado: initialQual.limit_parcelado_aprovado || 0,
        limit_anticipacao_disponivel: initialQual.limit_anticipacao_disponivel || "N/A"
    });

    // --- Form States for DEAL ---
    const [title, setTitle] = useState(initialData?.title || "");
    const [value, setValue] = useState(initialData?.value || "");
    const [customValues, setCustomValues] = useState<Record<string, any>>({});
    const [fields, setFields] = useState<any[]>([]);

    // --- Tags ---
    const [availableTags, setAvailableTags] = useState<{ id: string, name: string, color: string }[]>([]);
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
        initialData?.tags?.map((t: any) => t.tag.id) || []
    );
    const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);

    // --- Metadata / UI ---
    const [isEditingTab, setIsEditingTab] = useState(false);
    const [editTabValue, setEditTabValue] = useState("");
    const [tabulationOptions, setTabulationOptions] = useState<string[]>([
        "Aguardando abertura",
        "Retornar outro horário",
        "Conta aberta",
        "Sem interesse",
        "Inapto na Receita Federal",
        "Telefone Incorreto",
        "Recusado pelo banco"
    ]);

    // Standalone mode
    const [clientStandalone, setClientStandalone] = useState<any>(null);
    const [pipelines, setPipelines] = useState<any[]>([]);
    const [selectedPipelineForCreation, setSelectedPipelineForCreation] = useState("");

    // --- Initial Load ---
    useEffect(() => {
        const u = localStorage.getItem('user');
        if (u) setUserRole(JSON.parse(u).role);

        // Parallelize fetching
        const loadAll = async () => {
            setLoading(true);
            try {
                const pDeps = loadDependencies();
                const pFields = pipelineId ? fetchFields(pipelineId) : Promise.resolve();

                let pDeal = Promise.resolve();
                if (dealId) {
                    pDeal = fetchDeal(dealId);
                } else if (initialClientId) {
                    pDeal = fetchClientStandalone(initialClientId); // Changed to fetchClientStandalone
                }

                await Promise.all([pDeps, pFields, pDeal]);
            } catch (e) {
                console.error("Error loading modal data", e);
                toast({ title: "Erro", description: "Falha ao carregar detalhes.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };

        loadAll();
    }, [dealId, pipelineId, initialClientId]);

    const loadDependencies = async () => {
        try {
            const [tagsRes, pipesRes] = await Promise.all([
                api.get('/tags'),
                api.get('/pipelines')
            ]);
            setAvailableTags(tagsRes.data || []);
            setPipelines(pipesRes.data || []);

            if (pipesRes.data.length > 0 && !pipelineId) {
                setSelectedPipelineForCreation(pipesRes.data[0].id);
                // If we didn't have a pipelineId but now we have a default, fetch fields for it?
                // Maybe, but let's stick to explicit changes.
            } else if (!pipelineId) {
                setSelectedPipelineForCreation(pipesRes.data?.[0]?.id || "");
            }
        } catch (e) {
            console.error("Failed to load dependencies", e);
            toast({ title: "Erro", description: "Falha ao carregar dependências.", variant: "destructive" });
        }
    };

    const fetchFields = async (pid: string) => {
        if (!pid) return;
        try {
            const res = await api.get(`/custom-fields?pipeline_id=${pid}`);
            setFields(res.data);
        } catch (e) {
            console.error(e);
            toast({ title: "Erro", description: "Falha ao carregar campos personalizados.", variant: "destructive" });
        }
    };

    const fetchDeal = async (id: string) => {
        if (!initialData) setLoading(true); // Only show loading if no initial data
        try {
            const res = await api.get(`/deals/${id}`);
            const data = res.data;
            setDeal(data);

            setTitle(data.title);
            setValue(data.value || "");
            if (data.tags) setSelectedTagIds(data.tags.map((t: any) => t.tag.id));

            const cvMap: any = {};
            data.custom_values.forEach((cv: any) => cvMap[cv.field.key] = cv.value);
            setCustomValues(cvMap);

            // Optimisation: Only fetch fields if different from initial pipelineId (already fetched in parallel)
            if (data.pipeline_id && data.pipeline_id !== pipelineId) {
                fetchFields(data.pipeline_id);
            }
            if (data.client) mapClientToState(data.client);

        } catch (e) {
            console.error("Error loading deal", e);
            toast({ title: "Erro", description: "Falha ao carregar detalhes da oportunidade.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const fetchClientStandalone = async (cliId: string) => {
        try {
            const res = await api.get(`/clients/${cliId}`);
            setClientStandalone(res.data);
            mapClientToState(res.data);
            setTitle("Nova Oportunidade - " + (res.data.name || ""));
            if (selectedPipelineForCreation) fetchFields(selectedPipelineForCreation);
        } catch (e) {
            console.error(e);
            toast({ title: "Erro", description: "Falha ao carregar dados do cliente.", variant: "destructive" });
            onClose();
        }
    }

    const fetchDealByClient = async (cliId: string) => {
        // setLoading(true); // Handled by wrapper
        try {
            const res = await api.get('/deals', { params: { client_id: cliId } });
            if (res.data && res.data.length > 0) {
                await fetchDeal(res.data[0].id);
            } else {
                await fetchClientStandalone(cliId);
            }
        } catch (e) {
            console.error(e);
            toast({ title: "Erro", description: "Falha ao buscar oportunidade por cliente.", variant: "destructive" });
            // setLoading(false);
        }
    }

    const mapClientToState = (cli: any) => {
        setClientData({
            name: cli.name || "",
            surname: cli.surname || "",
            cnpj: cli.cnpj || "",
            email: cli.email || "",
            phone: cli.phone || "",
            id: cli.id,
            integration_status: cli.integration_status || "Desconhecido",
            is_qualified: cli.is_qualified || false,
            has_open_account: cli.has_open_account || false
        });

        // Debug: Ensure we get the latest qualification
        const qual = cli.qualifications && cli.qualifications.length > 0 ? cli.qualifications[0] : {};

        setQualData((prev: any) => ({
            ...prev, // Keep existing if needed, but usually we overwrite
            faturamento_mensal: qual.faturamento_mensal || "",
            faturamento_maquina: qual.faturamento_maquina || "",
            maquininha_atual: qual.maquininha_atual || "",
            produto_interesse: qual.produto_interesse || "",
            emite_boletos: !!qual.emite_boletos,
            deseja_receber_ofertas: !!qual.deseja_receber_ofertas,
            informacoes_adicionais: qual.informacoes_adicionais || "",
            tabulacao: qual.tabulacao || prev.tabulacao || "", // Fallback to prev or empty
            agendamento: qual.agendamento || "",

            // ... (rest)

            cc_tipo_conta: qual.cc_tipo_conta || "Conta Corrente",
            cc_status: qual.cc_status || "Ativa com senha",
            cc_numero: qual.cc_numero || "",
            cc_saldo: qual.cc_saldo || 0,
            cc_limite_utilizado: qual.cc_limite_utilizado || 0,
            cc_limite_disponivel: qual.cc_limite_disponivel || 0,

            card_final: qual.card_final || "",
            card_status: qual.card_status || "Normal",
            card_tipo: qual.card_tipo || "C6 Business",
            card_adicionais: qual.card_adicionais || 0,
            card_fatura_aberta_data: qual.card_fatura_aberta_data || "",
            card_fatura_aberta_valor: qual.card_fatura_aberta_valor || 0,

            global_dolar: !!qual.global_dolar,
            global_euro: !!qual.global_euro,

            prod_multiplos_acessos: !!qual.prod_multiplos_acessos,
            prod_c6_pay: !!qual.prod_c6_pay,
            prod_c6_tag: !!qual.prod_c6_tag,
            prod_debito_automatico: !!qual.prod_debito_automatico,
            prod_seguros: !!qual.prod_seguros,
            prod_chaves_pix: !!qual.prod_chaves_pix,
            prod_web_banking: !!qual.prod_web_banking,
            prod_link_pagamento: !!qual.prod_link_pagamento,
            prod_boleto_dda: !!qual.prod_boleto_dda,
            prod_boleto_cobranca: !!qual.prod_boleto_cobranca,

            credit_blocklist: !!qual.credit_blocklist,
            credit_score_interno: qual.credit_score_interno || "Informação indisponível",
            credit_score_serasa: qual.credit_score_serasa || "Informação indisponível",
            credit_inadimplencia: qual.credit_inadimplencia || "Em dia",

            limit_cartao_utilizado: qual.limit_cartao_utilizado || 0,
            limit_cartao_aprovado: qual.limit_cartao_aprovado || 0,
            limit_cheque_utilizado: qual.limit_cheque_utilizado || 0,
            limit_cheque_aprovado: qual.limit_cheque_aprovado || 0,
            limit_parcelado_utilizado: qual.limit_parcelado_utilizado || 0,
            limit_parcelado_aprovado: qual.limit_parcelado_aprovado || 0,
            limit_anticipacao_disponivel: qual.limit_anticipacao_disponivel || "N/A"
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payloadDeal: any = {
                title,
                value: value ? parseFloat(value) : null,
                pipeline_id: deal?.pipeline_id || pipelineId || selectedPipelineForCreation,
                custom_fields: customValues,
                tag_ids: selectedTagIds
            };

            if (dealId) {
                await api.patch(`/deals/${dealId}`, payloadDeal);
            }

            const targetClientId = deal?.client_id || initialClientId || clientData.id;

            if (targetClientId) {
                const payloadClient = {
                    name: clientData.name,
                    surname: clientData.surname,
                    email: clientData.email,
                    phone: clientData.phone,
                    cnpj: clientData.cnpj,
                    ...qualData,
                    agendamento: qualData.agendamento ? new Date(qualData.agendamento).toISOString() : null
                };
                await api.put(`/clients/${targetClientId}`, payloadClient);
            }

            onUpdate();
            onClose();
        } catch (e: any) {
            console.error(e);
            alert("Erro ao salvar: " + (e.response?.data?.message || e.message));
        } finally {
            setSaving(false);
        }
    };

    const handleTabulationChange = (newVal: string) => {
        setEditTabValue(newVal);
        setQualData((prev: any) => ({ ...prev, tabulacao: newVal }));
    };

    const handleDelete = async () => {
        if (!dealId || !confirm("Excluir oportunidade?")) return;
        try {
            await api.delete(`/deals/${dealId}`);
            onUpdate();
            onClose();
        } catch (e) { console.error(e); }
    };

    const toggleTag = (tagId: string) => {
        if (selectedTagIds.includes(tagId)) setSelectedTagIds(prev => prev.filter(id => id !== tagId));
        else setSelectedTagIds(prev => [...prev, tagId]);
    };

    if (loading) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-[100] p-4 font-sans">
            <div className="bg-white dark:bg-[#18181b] w-full max-w-5xl max-h-[95vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-200">

                {/* --- HEADER --- */}
                <div className="px-8 py-5 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-start bg-white dark:bg-[#18181b]">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">
                                {clientData.name || title || "Nova Oportunidade"}
                            </h2>
                            {dealId && <span className="text-xs font-mono text-gray-400 bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded">#{dealId.split('-')[0]}</span>}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                                {deal?.stage ? deal.stage.name : 'Sem Etapa'}
                            </span>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                                {selectedTagIds.map(tid => {
                                    const t = availableTags.find(tag => tag.id === tid);
                                    if (!t) return null;
                                    return (
                                        <span key={tid} className="px-2 py-0.5 text-[10px] font-bold text-white rounded bg-opacity-90" style={{ backgroundColor: t.color }}>
                                            {t.name}
                                        </span>
                                    )
                                })}
                                <button onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)} className="text-indigo-600 hover:underline flex items-center gap-1 ml-1 font-semibold">
                                    <Plus size={10} /> Tag
                                </button>
                                {isTagDropdownOpen && (
                                    <div className="absolute top-16 left-60 mt-1 w-48 bg-white dark:bg-zinc-900 shadow-xl border dark:border-zinc-700 rounded-lg p-1 z-50 grid gap-1">
                                        {availableTags.map(tag => (
                                            <button key={tag.id} onClick={() => toggleTag(tag.id)} className="text-xs text-left px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                                                <span className="dark:text-gray-300">{tag.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* --- BODY --- */}
                <div className="flex-1 overflow-y-auto p-8 bg-white dark:bg-[#18181b]">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

                        {/* === ESQUERDA: DADOS CADASTRAIS === */}
                        <div className="flex flex-col gap-6">
                            <SectionTitle icon={<User size={18} />} title="Dados Cadastrais" />

                            {/* Status Panel */}
                            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 flex justify-between items-center border border-indigo-100 dark:border-indigo-800/50">
                                <div>
                                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1 block flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full border-2 border-indigo-400"></div> Status Integração
                                    </span>
                                    <span className="text-sm font-bold text-indigo-900 dark:text-indigo-100 block">
                                        {clientData.integration_status || 'Pendente'}
                                    </span>
                                </div>
                                <div className="flex flex-col gap-1 items-end">
                                    {clientData.is_qualified && <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded">Qualificado</span>}
                                    {clientData.has_open_account && <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded">Conta Aberta</span>}
                                    {!clientData.has_open_account && <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">Sem Conta</span>}
                                </div>
                            </div>

                            {/* Inputs */}
                            <div className="space-y-4">
                                <InputGroup label="Razão Social / Nome">
                                    <input className="modal-input" value={clientData.name} onChange={e => setClientData({ ...clientData, name: e.target.value })} />
                                </InputGroup>
                                <InputGroup label="Sobrenome / Fantasia">
                                    <input className="modal-input" value={clientData.surname} onChange={e => setClientData({ ...clientData, surname: e.target.value })} />
                                </InputGroup>
                                <div className="grid grid-cols-2 gap-4">
                                    <InputGroup label="CNPJ / CPF">
                                        <input className="modal-input" value={clientData.cnpj} onChange={e => setClientData({ ...clientData, cnpj: e.target.value })} />
                                    </InputGroup>
                                    <InputGroup label="Telefone">
                                        <input className="modal-input" value={clientData.phone} onChange={e => setClientData({ ...clientData, phone: e.target.value })} />
                                    </InputGroup>
                                </div>
                                <InputGroup label="Email">
                                    <input className="modal-input" value={clientData.email} onChange={e => setClientData({ ...clientData, email: e.target.value })} />
                                </InputGroup>
                            </div>

                            {/* Meta Info */}
                            <div className="mt-4 pt-4 border-t border-dashed border-gray-200 dark:border-zinc-700 flex justify-between text-xs text-gray-400 uppercase font-semibold tracking-wide">
                                <div>
                                    <span className="block text-[10px] mb-0.5">Criado em</span>
                                    <span className="text-gray-600 dark:text-gray-400">
                                        {deal?.created_at ? format(new Date(deal.created_at), "dd/MM/yyyy HH:mm") : "-"}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="block text-[10px] mb-0.5">Responsável</span>
                                    <span className="text-gray-600 dark:text-gray-400">
                                        {deal?.responsible?.name || "N/A"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* === DIREITA: DADOS DA QUALIFICAÇÃO === */}
                        <div className="flex flex-col gap-6">
                            <SectionTitle icon={<CheckCircle size={18} />} title="Dados da Qualificação" />

                            {/* Tabulation Panel (Yellow) */}
                            <div className="bg-amber-50 dark:bg-amber-900/10 rounded-lg p-4 border border-amber-100 dark:border-amber-900/30 relative">
                                <div className="absolute top-4 right-4 text-amber-400 opacity-50"><FileText size={20} /></div>
                                <label className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1 block">
                                    Tabulação / Status do Lead
                                </label>
                                <select
                                    className="w-full bg-transparent text-lg font-bold text-amber-900 dark:text-amber-100 border-none p-0 focus:ring-0 cursor-pointer outline-none"
                                    value={editTabValue || qualData.tabulacao}
                                    onChange={e => handleTabulationChange(e.target.value)}
                                >
                                    <option value="">Selecione...</option>
                                    {tabulationOptions.map(t => <option key={t} value={t} className="text-gray-900">{t}</option>)}
                                </select>
                            </div>

                            {/* Form Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <InputGroup label="Faturamento Mensal">
                                    <input type="number" placeholder="R$ 0,00" className="modal-input" value={qualData.faturamento_mensal} onChange={e => setQualData({ ...qualData, faturamento_mensal: e.target.value })} />
                                </InputGroup>
                                <InputGroup label="Faturamento Máquina">
                                    <input type="number" placeholder="R$ 0,00" className="modal-input" value={qualData.faturamento_maquina} onChange={e => setQualData({ ...qualData, faturamento_maquina: e.target.value })} />
                                </InputGroup>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <InputGroup label="Maquininha Atual">
                                    <input className="modal-input" value={qualData.maquininha_atual} onChange={e => setQualData({ ...qualData, maquininha_atual: e.target.value })} />
                                </InputGroup>
                                <InputGroup label="Produto de Interesse">
                                    <select className="modal-input" value={qualData.produto_interesse} onChange={e => setQualData({ ...qualData, produto_interesse: e.target.value })}>
                                        <option value="">—</option>
                                        <option value="Conta PJ">Conta PJ</option>
                                        <option value="Cartão de Crédito">Cartão de Crédito</option>
                                        <option value="Antecipação">Antecipação</option>
                                    </select>
                                </InputGroup>
                            </div>

                            {/* Checks */}
                            <div className="flex gap-6 mt-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center transition-colors", qualData.emite_boletos ? "bg-indigo-600 border-indigo-600" : "border-gray-300 dark:border-zinc-600")}>
                                        {qualData.emite_boletos && <CheckCircle size={10} className="text-white" />}
                                    </div>
                                    <input type="checkbox" className="hidden" checked={qualData.emite_boletos} onChange={e => setQualData({ ...qualData, emite_boletos: e.target.checked })} />
                                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Emite Boletos? <span className="font-bold text-gray-900 dark:text-white">{qualData.emite_boletos ? 'Sim' : 'Não'}</span></span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center transition-colors", qualData.deseja_receber_ofertas ? "bg-indigo-600 border-indigo-600" : "border-gray-300 dark:border-zinc-600")}>
                                        {qualData.deseja_receber_ofertas && <CheckCircle size={10} className="text-white" />}
                                    </div>
                                    <input type="checkbox" className="hidden" checked={qualData.deseja_receber_ofertas} onChange={e => setQualData({ ...qualData, deseja_receber_ofertas: e.target.checked })} />
                                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Receber Ofertas? <span className="font-bold text-gray-900 dark:text-white">{qualData.deseja_receber_ofertas ? 'Sim' : 'Não'}</span></span>
                                </label>
                            </div>

                            {/* Additional Info */}
                            <InputGroup label="Informações Adicionais">
                                <textarea
                                    className="modal-input min-h-[100px] resize-none leading-relaxed"
                                    value={qualData.informacoes_adicionais}
                                    onChange={e => setQualData({ ...qualData, informacoes_adicionais: e.target.value })}
                                />
                            </InputGroup>
                        </div>
                    </div>

                    {/* === CUSTOM FIELDS === */}
                    {fields && fields.length > 0 && (
                        <div className="mt-8 pt-8 border-t border-gray-100 dark:border-zinc-800">
                            <SectionTitle icon={<List size={18} />} title="Campos Personalizados" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                {fields.map(field => (
                                    <InputGroup key={field.key} label={field.label}>
                                        <input
                                            className="modal-input"
                                            value={customValues[field.key] || ''}
                                            onChange={e => setCustomValues({ ...customValues, [field.key]: e.target.value })}
                                            placeholder={field.placeholder || ''}
                                        />
                                    </InputGroup>
                                ))}
                            </div>
                        </div>
                    )}

                </div>

                {/* --- FOOTER --- */}
                <div className="px-8 py-5 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-[#18181b] flex justify-between items-center z-10">
                    <div>
                        <button onClick={handleDelete} className="text-xs font-bold text-red-500 hover:text-red-700 uppercase tracking-wide px-2 py-1 hover:bg-red-50 rounded transition-colors">
                            Excluir Card
                        </button>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={onClose} className="px-6 py-2.5 rounded-lg border border-gray-200 dark:border-zinc-700 font-bold text-gray-600 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all">
                            Fechar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-8 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-95"
                        >
                            {saving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                            {saving ? 'Salvando...' : 'SALVAR'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Global Styles for Modal Inputs */}
            <style jsx global>{`
                .modal-input {
                    display: block;
                    width: 100%;
                    background-color: #f9fafb;
                    border: 1px solid #e5e7eb;
                    border-radius: 0.5rem; /* rounded-lg */
                    padding: 0.625rem 0.875rem; /* py-2.5 px-3.5 */
                    font-size: 0.875rem; /* text-sm */
                    font-weight: 500;
                    color: #1f2937;
                    transition: all 0.2s;
                    outline: none;
                }
                .dark .modal-input {
                    background-color: #27272a;
                    border-color: #3f3f46;
                    color: #e4e4e7;
                }
                .modal-input:focus {
                    border-color: #6366f1; /* indigo-500 */
                    background-color: #fff;
                    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
                }
                .dark .modal-input:focus {
                    background-color: #18181b;
                    border-color: #818cf8;
                }
            `}</style>
        </div>
    );
}

// --- Helper Components ---

function SectionTitle({ icon, title }: { icon: any, title: string }) {
    return (
        <div className="flex items-center gap-2 mb-2 pb-2 border-b-2 border-gray-100 dark:border-zinc-800">
            <div className="text-gray-800 dark:text-gray-200">{icon}</div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">{title}</h3>
        </div>
    )
}

function InputGroup({ label, children }: any) {
    return (
        <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5 pl-0.5">
                {label}
            </label>
            {children}
        </div>
    )
}

// Dummy/Unused components removal (LabelValue, DashboardCard, InfoBlock, etc.)
/* Removed unused components to clean up file */
