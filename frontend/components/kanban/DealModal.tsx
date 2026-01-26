"use client";

import { useState, useEffect } from "react";
import { X, Save, Trash, User, Building2, CreditCard, ShoppingBag, Globe, FileText, CheckCircle, AlertCircle, Phone, Mail, DollarSign, Calendar, Tag, Shield, MoreHorizontal, Landmark, RefreshCw, Briefcase, MapPin } from "lucide-react";
import api from "@/lib/api";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type DealModalProps = {
    dealId?: string | null;
    pipelineId: string;
    initialClientId?: string;
    onClose: () => void;
    onUpdate: () => void;
};

export default function DealModal({ dealId, pipelineId, initialClientId, onClose, onUpdate }: DealModalProps) {
    const [deal, setDeal] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [userRole, setUserRole] = useState<string>("");

    // --- Form States for CLIENT (Synced on Load) ---
    const [clientData, setClientData] = useState({
        name: "", // Razão Social
        surname: "", // Fantasia / Sobrenome
        cnpj: "",
        email: "",
        phone: "",
        id: "",
        integration_status: "",
        is_qualified: false,
        has_open_account: false
    });

    // --- Form States for QUALIFICATION (Synced on Load) ---
    const [qualData, setQualData] = useState<any>({
        // Old Financials
        faturamento_mensal: "",
        faturamento_maquina: "",
        maquininha_atual: "",
        produto_interesse: "",
        emite_boletos: false,
        deseja_receber_ofertas: false,
        informacoes_adicionais: "",
        tabulacao: "",
        agendamento: "",

        // NEW: Conta Corrente (Read Only)
        cc_tipo_conta: "Conta Corrente",
        cc_status: "Ativa com senha",
        cc_numero: "",
        cc_saldo: 0,
        cc_limite_utilizado: 0,
        cc_limite_disponivel: 0,

        // NEW: Cartão (Read Only)
        card_final: "",
        card_status: "",
        card_tipo: "",
        card_adicionais: 0,
        card_fatura_aberta_data: "",
        card_fatura_aberta_valor: 0,

        // NEW: Global (Read Only)
        global_dolar: false,
        global_euro: false,

        // NEW: Produtos (Read Only)
        prod_multiplos_acessos: false,
        prod_c6_pay: false,
        prod_c6_tag: false,
        prod_debito_automatico: false,
        prod_seguros: false,
        prod_chaves_pix: false,
        prod_web_banking: false,
        prod_link_pagamento: false,
        prod_boleto_dda: false,
        prod_boleto_cobranca: false,

        // NEW: Limites & Risco (Read Only)
        credit_blocklist: false,
        credit_score_interno: "Informação indisponível",
        credit_score_serasa: "Informação indisponível",
        credit_inadimplencia: "Em dia",

        limit_cartao_utilizado: 0,
        limit_cartao_aprovado: 0,
        limit_cheque_utilizado: 0,
        limit_cheque_aprovado: 0,
        limit_parcelado_utilizado: 0,
        limit_parcelado_aprovado: 0,
        limit_anticipacao_disponivel: "N/A"
    });

    // --- Form States for DEAL ---
    const [title, setTitle] = useState("");
    const [value, setValue] = useState("");
    const [customValues, setCustomValues] = useState<Record<string, any>>({});
    const [fields, setFields] = useState<any[]>([]);

    // --- Tags ---
    const [availableTags, setAvailableTags] = useState<{ id: string, name: string, color: string }[]>([]);
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
    const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);

    // --- Metadata / UI ---
    const [isEditingTab, setIsEditingTab] = useState(false);
    const [editTabValue, setEditTabValue] = useState("");
    const [tabulationOptions, setTabulationOptions] = useState<string[]>([]);

    // Standalone mode
    const [clientStandalone, setClientStandalone] = useState<any>(null);
    const [pipelines, setPipelines] = useState<any[]>([]);
    const [selectedPipelineForCreation, setSelectedPipelineForCreation] = useState("");

    // --- Initial Load ---
    useEffect(() => {
        const u = localStorage.getItem('user');
        if (u) setUserRole(JSON.parse(u).role);

        loadDependencies();

        if (dealId) {
            fetchDeal(dealId);
        } else if (initialClientId) {
            fetchDealByClient(initialClientId);
        } else {
            setLoading(false);
            if (pipelineId) fetchFields(pipelineId);
        }
    }, [dealId, pipelineId, initialClientId]);

    const loadDependencies = async () => {
        try {
            const [tagsRes, tabsRes, pipesRes] = await Promise.all([
                api.get('/tags'),
                api.get('/qualifications/tabulations'),
                api.get('/pipelines')
            ]);
            setAvailableTags(tagsRes.data || []);
            setTabulationOptions(tabsRes.data || []);
            setPipelines(pipesRes.data || []);

            if (pipesRes.data.length > 0 && !pipelineId) {
                setSelectedPipelineForCreation(pipesRes.data[0].id);
            } else {
                setSelectedPipelineForCreation(pipelineId);
            }
        } catch (e) {
            console.error("Failed to load dependencies", e);
        }
    };

    const fetchFields = async (pid: string) => {
        if (!pid) return;
        try {
            const res = await api.get(`/custom-fields?pipeline_id=${pid}`);
            setFields(res.data);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchDeal = async (id: string) => {
        setLoading(true);
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

            if (data.pipeline_id) fetchFields(data.pipeline_id);
            if (data.client) mapClientToState(data.client);

        } catch (e) {
            console.error("Error loading deal", e);
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
            onClose();
        }
    }

    const fetchDealByClient = async (cliId: string) => {
        setLoading(true);
        try {
            const res = await api.get('/deals', { params: { client_id: cliId } });
            if (res.data && res.data.length > 0) {
                fetchDeal(res.data[0].id);
            } else {
                await fetchClientStandalone(cliId);
                setLoading(false);
            }
        } catch (e) {
            console.error(e);
            setLoading(false);
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

        const qual = cli.qualifications && cli.qualifications.length > 0 ? cli.qualifications[0] : {};
        setQualData({
            faturamento_mensal: qual.faturamento_mensal || "",
            faturamento_maquina: qual.faturamento_maquina || "",
            maquininha_atual: qual.maquininha_atual || "",
            produto_interesse: qual.produto_interesse || "",
            emite_boletos: !!qual.emite_boletos,
            deseja_receber_ofertas: !!qual.deseja_receber_ofertas,
            informacoes_adicionais: qual.informacoes_adicionais || "",
            tabulacao: qual.tabulacao || "",
            agendamento: qual.agendamento || "",

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
        });
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

    const handleSaveTabulation = async () => {
        if (!editTabValue) return;
        try {
            const targetClientId = deal?.client_id || initialClientId || clientData.id;
            if (targetClientId) {
                await api.post(`/qualifications/${targetClientId}`, { answers: {}, tabulacao: editTabValue });
                setQualData((prev: any) => ({ ...prev, tabulacao: editTabValue }));
                setIsEditingTab(false);
                onUpdate();
            }
        } catch (e) {
            console.error(e);
            alert("Erro ao salvar tabulação");
        }
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
        <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white dark:bg-[#09090b] w-full max-w-[98vw] h-[95vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-200">

                {/* --- HEADER SUPERIOR (TITLE w/ ID) --- */}
                <div className="px-8 py-3 bg-white dark:bg-[#09090b] flex justify-between items-start border-b border-gray-100 dark:border-zinc-800">
                    <div className="flex-1 flex gap-4 items-center">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600">
                            <Briefcase size={24} />
                        </div>
                        <div className="flex-1">
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="Título do Negócio"
                                className="text-xl font-bold bg-transparent border-none focus:ring-0 p-0 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 w-full"
                            />
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-500 font-medium">ID: {deal?.id ? deal.id.split('-')[0] : (dealId ? dealId.split('-')[0] : 'NOVO')}</span>
                                {deal?.stage && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 font-semibold border border-indigo-100 dark:border-indigo-800">
                                        {deal.stage.name}
                                    </span>
                                )}
                                <div className="flex items-center gap-1 ml-2">
                                    {selectedTagIds.map(tid => {
                                        const t = availableTags.find(tag => tag.id === tid);
                                        if (!t) return null;
                                        return (
                                            <span key={tid} className="px-2 py-0.5 text-[10px] font-bold text-white rounded shadow-sm cursor-pointer hover:opacity-80" style={{ backgroundColor: t.color }} onClick={() => toggleTag(tid)}>
                                                {t.name}
                                            </span>
                                        )
                                    })}
                                    <div className="relative">
                                        <button onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)} className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full text-gray-400"><Tag size={14} /></button>
                                        {isTagDropdownOpen && (
                                            <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-zinc-900 shadow-xl border dark:border-zinc-700 rounded-lg p-1 z-50 grid gap-1">
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
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* --- HEADER INFERIOR (COMPACT INFO ROW) - Salesforce Style --- */}
                <div className="px-8 py-4 bg-white dark:bg-[#09090b] border-b border-gray-200 dark:border-zinc-800 grid grid-cols-1 md:grid-cols-5 gap-6 items-start shadow-[0_2px_4px_-2px_rgba(0,0,0,0.05)] z-10">

                    {/* Coluna 1: Razão / CNPJ */}
                    <div className="space-y-1">
                        <LabelValue label="Razão Social" value={<input className="w-full bg-transparent border-b border-dashed border-gray-300 focus:border-indigo-500 outline-none font-semibold text-gray-800 text-sm" value={clientData.name} onChange={e => setClientData({ ...clientData, name: e.target.value })} />} />
                        <LabelValue label="CNPJ" value={<input className="w-full bg-transparent border-b border-dashed border-gray-300 focus:border-indigo-500 outline-none font-medium text-gray-600 text-xs" value={clientData.cnpj} onChange={e => setClientData({ ...clientData, cnpj: e.target.value })} />} />
                    </div>

                    {/* Coluna 2: Contato */}
                    <div className="space-y-1">
                        <LabelValue label="Nome do Sócio" value={<input className="w-full bg-transparent border-b border-dashed border-gray-300 focus:border-indigo-500 outline-none font-medium text-gray-800 text-sm" value={clientData.surname} onChange={e => setClientData({ ...clientData, surname: e.target.value })} placeholder="Nome do Sócio / Fantasia" />} />
                        <LabelValue label="Telefone" value={<input className="w-full bg-transparent border-b border-dashed border-gray-300 focus:border-indigo-500 outline-none font-medium text-gray-800 text-sm" value={clientData.phone} onChange={e => setClientData({ ...clientData, phone: e.target.value })} />} />
                        <LabelValue label="Email" value={<input className="w-full bg-transparent border-b border-dashed border-gray-300 focus:border-indigo-500 outline-none font-medium text-gray-600 text-xs" value={clientData.email} onChange={e => setClientData({ ...clientData, email: e.target.value })} />} />
                    </div>

                    {/* Coluna 3: Info Financeira (Editável) - Com Prefixo R$ */}
                    <div className="space-y-1">
                        <LabelValue label="Faturamento Mensal" value={
                            <div className="flex items-center border-b border-dashed border-gray-300 focus-within:border-indigo-500">
                                <span className="text-gray-400 text-xs mr-1">R$</span>
                                <input className="w-full bg-transparent outline-none font-medium text-gray-800 text-sm" type="number" value={qualData.faturamento_mensal} onChange={e => setQualData({ ...qualData, faturamento_mensal: e.target.value })} placeholder="0,00" />
                            </div>
                        } />
                        <LabelValue label="Faturamento Máquina" value={
                            <div className="flex items-center border-b border-dashed border-gray-300 focus-within:border-indigo-500">
                                <span className="text-gray-400 text-xs mr-1">R$</span>
                                <input className="w-full bg-transparent outline-none font-medium text-gray-600 text-xs" type="number" value={qualData.faturamento_maquina} onChange={e => setQualData({ ...qualData, faturamento_maquina: e.target.value })} placeholder="0,00" />
                            </div>
                        } />
                    </div>

                    {/* Coluna 4: Status Integração */}
                    <div>
                        <span className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">Status Integração</span>
                        <div className="flex items-center gap-2">
                            {clientData.integration_status === 'Integrado' ? <CheckCircle size={14} className="text-green-500" /> : <RefreshCw size={14} className="text-gray-400" />}
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{clientData.integration_status || 'Pendente'}</span>
                        </div>
                    </div>

                    {/* Coluna 5: Tabulação */}
                    <div>
                        <span className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">Tabulação / Status</span>
                        {isEditingTab ? (
                            <select
                                className="text-xs p-1 rounded border border-gray-300 bg-white w-full"
                                value={editTabValue}
                                onChange={e => { setEditTabValue(e.target.value); handleSaveTabulation(); }}
                                onBlur={() => setIsEditingTab(false)}
                            >
                                <option value="">Selecione...</option>
                                {tabulationOptions.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        ) : (
                            <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded -ml-1" onClick={() => {
                                if (['ADMIN', 'SUPERVISOR', 'OPERATOR'].includes(userRole)) {
                                    setEditTabValue(qualData.tabulacao);
                                    setIsEditingTab(true);
                                }
                            }}>
                                <span className={cn("text-sm font-bold", qualData.tabulacao ? "text-indigo-600" : "text-gray-400 italic")}>
                                    {qualData.tabulacao || 'Selecionar...'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- MAIN BODY --- */}
                <div className="flex-1 overflow-y-auto bg-gray-50/50 dark:bg-zinc-900/30 p-6">
                    <div className="grid grid-cols-12 gap-6 h-full content-start">

                        {/* === COLUNA ESQUERDA (MAIN DASHBOARD) - 8 Cols === */}
                        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">

                            {/* A) Conta Corrente & B) Cartão */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <DashboardCard title="Conta Corrente" icon={<Landmark size={16} className="text-blue-500" />} color="border-t-4 border-t-blue-500">
                                    <div className="grid grid-cols-3 gap-2 text-xs mb-3 text-gray-600 dark:text-gray-300">
                                        <InfoBlock label="Tipo" value={qualData.cc_tipo_conta} />
                                        <InfoBlock label="Status" value={qualData.cc_status} valueClass="text-green-600" />
                                        <InfoBlock label="Conta" value={qualData.cc_numero} />
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-xs border-t border-dashed border-gray-100 pt-2 text-gray-600 dark:text-gray-300">
                                        <MoneyDisplay label="Saldo" value={qualData.cc_saldo} />
                                        <MoneyDisplay label="Lim. Utilizado" value={qualData.cc_limite_utilizado} />
                                        <MoneyDisplay label="Lim. Disponível" value={qualData.cc_limite_disponivel} />
                                    </div>
                                </DashboardCard>

                                <DashboardCard title="Cartão de Crédito" icon={<CreditCard size={16} className="text-purple-500" />} color="border-t-4 border-t-purple-500">
                                    <div className="grid grid-cols-3 gap-2 text-xs mb-3 text-gray-600 dark:text-gray-300">
                                        <InfoBlock label="Final" value={qualData.card_final} />
                                        <div className="col-span-2"><InfoBlock label="Tipo Cartão" value={qualData.card_tipo} /></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-300">
                                        <InfoBlock label="Status" value={qualData.card_status} />
                                        <div>
                                            <span className="block text-gray-400 text-[10px] uppercase">Fatura ({qualData.card_fatura_aberta_data || '-'})</span>
                                            <span className="font-semibold text-red-500">{qualData.card_fatura_aberta_valor ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(qualData.card_fatura_aberta_valor) : 'R$ 0,00'}</span>
                                        </div>
                                    </div>
                                </DashboardCard>
                            </div>

                            {/* C) Global & D) Outros */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <DashboardCard title="Conta Global" icon={<Globe size={16} className="text-cyan-500" />} color="border-l-4 border-l-cyan-500">
                                    <div className="flex justify-around py-4">
                                        <SimpleBoolReadOnly label="Global Dólar" checked={qualData.global_dolar} />
                                        <SimpleBoolReadOnly label="Global Euro" checked={qualData.global_euro} />
                                    </div>
                                </DashboardCard>

                                <DashboardCard title="Outros Produtos" icon={<Tag size={16} className="text-orange-500" />} color="border-l-4 border-l-orange-500">
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                        <SimpleBoolReadOnly label="Múltiplos Acessos" checked={qualData.prod_multiplos_acessos} />
                                        <SimpleBoolReadOnly label="C6 Pay" checked={qualData.prod_c6_pay} />
                                        <SimpleBoolReadOnly label="C6 Tag" checked={qualData.prod_c6_tag} />
                                        <SimpleBoolReadOnly label="Seguros" checked={qualData.prod_seguros} />
                                        <SimpleBoolReadOnly label="Chaves Pix" checked={qualData.prod_chaves_pix} />
                                    </div>
                                </DashboardCard>
                            </div>

                            {/* E) Limites de Crédito */}
                            <DashboardCard title="Limites de Crédito & Risco" icon={<AlertCircle size={16} className="text-red-500" />} color="border-t-4 border-t-red-500">
                                <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100 dark:border-zinc-800 text-xs text-gray-500">
                                    <div className="flex items-center gap-2">
                                        <span className="uppercase text-[10px] font-bold">Blocklist:</span>
                                        <div className={cn("w-3 h-3 rounded", qualData.credit_blocklist ? "bg-red-500" : "bg-gray-200")}></div>
                                    </div>
                                    <div>Score Interno: <strong>{qualData.credit_score_interno}</strong></div>
                                    <div>Serasa: <strong>{qualData.credit_score_serasa}</strong></div>
                                    <div>Inadimplência: <strong className="text-green-600">{qualData.credit_inadimplencia}</strong></div>
                                </div>

                                <table className="w-full text-xs text-left">
                                    <thead className="text-gray-400 font-medium border-b border-gray-100 dark:border-zinc-800">
                                        <tr>
                                            <th className="pb-2 pl-1 font-normal uppercase text-[10px]">Produto</th>
                                            <th className="pb-2 font-normal uppercase text-[10px]">Utilizado</th>
                                            <th className="pb-2 font-normal uppercase text-[10px]">Pré-Aprovado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
                                        <LimitRow label="Cartão" used={qualData.limit_cartao_utilizado} approved={qualData.limit_cartao_aprovado} />
                                        <LimitRow label="Cheque Especial" used={qualData.limit_cheque_utilizado} approved={qualData.limit_cheque_aprovado} />
                                        <LimitRow label="Parcelado" used={qualData.limit_parcelado_utilizado} approved={qualData.limit_parcelado_aprovado} />
                                        <tr>
                                            <td className="py-2 pl-1 font-medium text-gray-700 dark:text-gray-300">Antecipação</td>
                                            <td className="text-gray-400">-</td>
                                            <td className="text-gray-500">{qualData.limit_anticipacao_disponivel}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </DashboardCard>
                        </div>

                        {/* === COLUNA DIREITA (SIDEBAR) - 4 Cols === */}
                        <div className="col-span-12 lg:col-span-4 pl-6 border-l border-gray-200 dark:border-zinc-800 flex flex-col gap-6">

                            <SectionTitle icon={<CheckCircle size={16} />} title="Qualificação / Lead" />
                            <div className="space-y-4">
                                <div className="bg-white dark:bg-zinc-900 rounded-lg p-3 border border-gray-200 dark:border-zinc-700 shadow-sm relative group hover:border-indigo-300 transition-all">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase ml-1 block mb-1.5">Maquininha Atual</label>
                                    <select
                                        className="w-full text-sm bg-transparent border-b border-gray-200 dark:border-zinc-700 pb-1 focus:border-indigo-500 focus:ring-0 text-gray-800 dark:text-gray-200 font-medium outline-none"
                                        value={qualData.maquininha_atual}
                                        onChange={e => setQualData({ ...qualData, maquininha_atual: e.target.value })}
                                    >
                                        <option value="">Selecione...</option>
                                        <option value="Nenhuma">Nenhuma</option>
                                        <option value="Pagbank">Pagbank</option>
                                        <option value="Mercado Pago">Mercado Pago</option>
                                        <option value="Stone">Stone</option>
                                        <option value="Cielo">Cielo</option>
                                        <option value="Rede">Rede</option>
                                        <option value="Getnet">Getnet</option>
                                        <option value="SafraPay">SafraPay</option>
                                        <option value="Outras">Outras</option>
                                    </select>
                                </div>
                                <div className="bg-white dark:bg-zinc-900 rounded-lg p-3 border border-gray-200 dark:border-zinc-700 shadow-sm relative group hover:border-indigo-300 transition-all">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase ml-1 block mb-1.5">Produto de Interesse</label>
                                    <select
                                        className="w-full text-sm bg-transparent border-b border-gray-200 dark:border-zinc-700 pb-1 focus:border-indigo-500 focus:ring-0 text-gray-800 dark:text-gray-200 font-medium outline-none"
                                        value={qualData.produto_interesse}
                                        onChange={e => setQualData({ ...qualData, produto_interesse: e.target.value })}
                                    >
                                        <option value="">Selecione...</option>
                                        <option value="Conta PJ">Conta PJ</option>
                                        <option value="Boletos">Boletos</option>
                                        <option value="Antecipação">Antecipação</option>
                                        <option value="Capital de Giro">Capital de Giro</option>
                                        <option value="Cartão de Crédito">Cartão de Crédito</option>
                                    </select>
                                </div>

                                <div className="bg-white dark:bg-zinc-900 rounded-lg p-3 border border-gray-200 dark:border-zinc-700 shadow-sm relative group hover:border-indigo-300 transition-all">
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="sb_emite_boletos"
                                                checked={qualData.emite_boletos}
                                                onChange={e => setQualData({ ...qualData, emite_boletos: e.target.checked })}
                                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <label htmlFor="sb_emite_boletos" className="text-xs text-gray-700 dark:text-gray-300 font-bold cursor-pointer select-none">Emite Boletos?</label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="sb_receber_ofertas"
                                                checked={qualData.deseja_receber_ofertas}
                                                onChange={e => setQualData({ ...qualData, deseja_receber_ofertas: e.target.checked })}
                                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <label htmlFor="sb_receber_ofertas" className="text-xs text-gray-700 dark:text-gray-300 font-bold cursor-pointer select-none">Receber Ofertas?</label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <SectionTitle icon={<Calendar size={16} />} title="Agendamento / Retorno" />
                            <div className="bg-white dark:bg-zinc-900 rounded-lg p-3 border border-gray-200 dark:border-zinc-700 shadow-sm relative group hover:border-indigo-300 transition-all">
                                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1 block mb-1.5">Data e Hora</label>
                                <input
                                    type="datetime-local"
                                    className="w-full text-sm bg-transparent border-b border-gray-200 dark:border-zinc-700 pb-1 focus:border-indigo-500 focus:ring-0 text-gray-800 dark:text-gray-200 font-medium outline-none"
                                    value={qualData.agendamento ? format(new Date(qualData.agendamento), "yyyy-MM-dd'T'HH:mm") : ""}
                                    onChange={e => setQualData({ ...qualData, agendamento: e.target.value })}
                                />
                            </div>

                            <SectionTitle icon={<FileText size={16} />} title="Anotações" />
                            <textarea
                                className="w-full text-sm bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-3 min-h-[220px] resize-none focus:ring-2 focus:ring-indigo-500/20 outline-none shadow-sm"
                                value={qualData.informacoes_adicionais}
                                onChange={e => setQualData({ ...qualData, informacoes_adicionais: e.target.value })}
                                placeholder="Escreva observações aqui..."
                            />
                        </div>

                    </div>
                </div>

                {/* --- FOOTER --- */}
                <div className="p-4 border-t border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex justify-between items-center z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    <div>
                        {dealId && <button onClick={handleDelete} className="text-red-600 text-sm hover:underline flex items-center gap-1"><Trash size={14} /> Excluir Card</button>}
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-6 py-2 rounded-lg border border-gray-300 dark:border-zinc-700 font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 transition-colors">Fechar</button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
                        >
                            <Save size={18} /> {saving ? 'Salvando...' : 'SALVAR DADOS'}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}

// --- Micro Components ---

function LabelValue({ label, value }: any) {
    return (
        <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 mb-0.5 block">{label}</span>
            <div>{value}</div>
        </div>
    )
}

function SectionTitle({ icon, title }: { icon: any, title: string }) {
    return (
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100 dark:border-zinc-800">
            <div className="text-gray-400 dark:text-gray-500">{icon}</div>
            <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide">{title}</h3>
        </div>
    )
}

function DashboardCard({ title, icon, color, children }: any) {
    return (
        <div className={cn("bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 p-4 relative overflow-hidden h-full flex flex-col", color)}>
            <div className="flex items-center gap-2 mb-4 border-b border-gray-100 dark:border-zinc-800 pb-2">
                {icon}
                <span className="font-bold text-sm text-gray-800 dark:text-gray-200">{title}</span>
            </div>
            <div className="flex-1 flex flex-col justify-center">
                {children}
            </div>
        </div>
    )
}

function InfoBlock({ label, value, valueClass }: any) {
    return (
        <div>
            <span className="block text-gray-400 text-[10px] uppercase">{label}</span>
            <span className={cn("font-semibold text-gray-800 dark:text-gray-200", valueClass)}>{value || '-'}</span>
        </div>
    )
}

function SimpleBoolReadOnly({ label, checked }: any) {
    return (
        <div className="flex items-center gap-2 text-xs">
            <span className={cn("font-bold text-[10px]", checked ? "text-blue-500" : "text-gray-400")}>{checked ? 'Sim' : 'Não'}</span>
            <span className="text-gray-600 dark:text-gray-400">{label}</span>
        </div>
    )
}

function MoneyDisplay({ label, value }: any) {
    return (
        <div>
            <span className="block text-gray-400 text-[10px] uppercase mb-0.5">{label}</span>
            <span className="block font-bold text-gray-700 dark:text-gray-200 text-sm">
                {value ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value) : 'R$ 0,00'}
            </span>
        </div>
    )
}

function LimitRow({ label, used, approved }: any) {
    return (
        <tr>
            <td className="py-2 pl-1 font-medium text-gray-700 dark:text-gray-300">{label}</td>
            <td className="text-gray-600 dark:text-gray-400">{used ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(used) : '0'}</td>
            <td className="text-green-600 font-semibold">{approved ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(approved) : '0'}</td>
        </tr>
    )
}
