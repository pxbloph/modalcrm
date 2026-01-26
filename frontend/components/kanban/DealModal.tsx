"use client";

import { useState, useEffect } from "react";
import { X, Save, Trash, User, Building2, CreditCard, ShoppingBag, Globe, FileText, CheckCircle, AlertCircle, Phone, Mail, DollarSign, Calendar, Tag, Shield } from "lucide-react";
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
        name: "",
        surname: "",
        cnpj: "",
        email: "",
        phone: "",
        id: "",
        integration_status: "",
        is_qualified: false,
        has_open_account: false
    });

    // --- Form States for QUALIFICATION (Synced on Load) ---
    const [qualData, setQualData] = useState({
        faturamento_mensal: "",
        faturamento_maquina: "",
        maquininha_atual: "",
        produto_interesse: "",
        emite_boletos: false,
        deseja_receber_ofertas: false,
        informacoes_adicionais: "",
        tabulacao: ""
    });

    // --- Form States for DEAL ---
    const [title, setTitle] = useState("");
    const [value, setValue] = useState("");
    const [customValues, setCustomValues] = useState<Record<string, any>>({});
    const [fields, setFields] = useState<any[]>([]); // Custom fields from pipeline

    // --- Tags ---
    const [availableTags, setAvailableTags] = useState<{ id: string, name: string, color: string }[]>([]);
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
    const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);

    // --- Metadata / UI ---
    const [isEditingTab, setIsEditingTab] = useState(false);
    const [editTabValue, setEditTabValue] = useState("");
    const [tabulationOptions, setTabulationOptions] = useState<string[]>([]);

    // Standalone mode (if no deal exists yet)
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
            // New Deal pure creation
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

            // Populate Deal Form
            setTitle(data.title);
            setValue(data.value || "");
            if (data.tags) setSelectedTagIds(data.tags.map((t: any) => t.tag.id));

            // Populate Custom Fields
            const cvMap: any = {};
            data.custom_values.forEach((cv: any) => cvMap[cv.field.key] = cv.value);
            setCustomValues(cvMap);

            // Load fields for this pipeline
            if (data.pipeline_id) fetchFields(data.pipeline_id);

            // Populate Client Data
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
            // Also fetch fields for default pipeline
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
            tabulacao: qual.tabulacao || ""
        });
    };

    // --- Actions ---

    const handleSave = async () => {
        setSaving(true);
        try {
            // 1. Save Deal
            const payloadDeal: any = {
                title,
                value: value ? parseFloat(value) : null,
                pipeline_id: deal?.pipeline_id || pipelineId || selectedPipelineForCreation,
                custom_fields: customValues,
                tag_ids: selectedTagIds
            };

            let currentDealId = dealId;

            if (dealId) {
                await api.patch(`/deals/${dealId}`, payloadDeal);
            } else if (dealId === undefined && initialClientId) {
                // Creating deal for existing client logic if needed, 
                // BUT for now, following user request, we might just be editing client data
                // if "Visualizing data" is key.
                // However, we'll try to create deal if in "New Deal" mode
            }

            // 2. Save Client & Qualification Data (If client exists)
            // We always send update to client endpoint to ensure data sync
            const targetClientId = deal?.client_id || initialClientId || clientData.id;

            if (targetClientId) {
                const payloadClient = {
                    name: clientData.name,
                    surname: clientData.surname,
                    email: clientData.email,
                    phone: clientData.phone,
                    cnpj: clientData.cnpj,
                    // Qual Data
                    faturamento_mensal: qualData.faturamento_mensal,
                    faturamento_maquina: qualData.faturamento_maquina,
                    maquininha_atual: qualData.maquininha_atual,
                    produto_interesse: qualData.produto_interesse,
                    emite_boletos: qualData.emite_boletos,
                    deseja_receber_ofertas: qualData.deseja_receber_ofertas,
                    informacoes_adicionais: qualData.informacoes_adicionais,
                    // Integration status only if admin - not sending here to avoid overwrite, handled by separate logic or backend ignore
                };
                await api.put(`/clients/${targetClientId}`, payloadClient);
            }

            // 3. Tabulation Update (Separate logic if needed, but client update handles it usually if model matches)
            // The put /clients update handles qualification update implicitly in the backend service logic usually?
            // Checking client service... usually updateClient updates qualification. 
            // If tabulacao is special, we might need specific endpoint or just rely on the above.
            // Let's assume PUT /clients handles it if we pass it, but better explicit if changed

            if (targetClientId && qualData.tabulacao !== (deal?.client?.qualifications[0]?.tabulacao)) {
                // For now relying on standard flow.
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
                // Use qualification specific endpoint or client update
                await api.post(`/qualifications/${targetClientId}`, {
                    answers: {}, // required by schema usually?
                    tabulacao: editTabValue
                });
                // Update local state
                setQualData(prev => ({ ...prev, tabulacao: editTabValue }));
                setIsEditingTab(false);
                onUpdate(); // Refresh kanban behind
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
        } catch (e) {
            console.error(e);
        }
    };

    const toggleTag = (tagId: string) => {
        if (selectedTagIds.includes(tagId)) setSelectedTagIds(prev => prev.filter(id => id !== tagId));
        else setSelectedTagIds(prev => [...prev, tagId]);
    };

    if (loading) return null; // Or loader

    return (
        <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            {/* Main Modal Container - Full Width logic */}
            <div className="bg-white dark:bg-[#09090b] w-full max-w-[95vw] h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-200">

                {/* --- HEADER --- */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-white dark:bg-[#09090b]">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="flex flex-col">
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="Título do Negócio"
                                className="text-xl font-bold bg-transparent border-none focus:ring-0 p-0 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 w-full"
                            />
                            <div className="flex items-center gap-3 text-xs mt-1">
                                <span className="text-gray-500 font-medium">ID: {dealId ? dealId.split('-')[0] : 'NOVO'}</span>
                                {deal?.stage && (
                                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 font-semibold border border-indigo-100 dark:border-indigo-800">
                                        {deal.stage.name}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Tags Bar */}
                        <div className="flex items-center gap-2 ml-4">
                            {selectedTagIds.map(tid => {
                                const t = availableTags.find(tag => tag.id === tid);
                                if (!t) return null;
                                return (
                                    <span key={tid} className="px-2 py-0.5 text-[10px] font-bold text-white rounded shadow-sm flex gap-1 items-center" style={{ backgroundColor: t.color }}>
                                        {t.name}
                                        <X size={10} className="cursor-pointer hover:scale-125" onClick={() => toggleTag(tid)} />
                                    </span>
                                )
                            })}

                            <div className="relative">
                                <button onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)} className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-gray-400">
                                    <Tag size={16} />
                                </button>
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

                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* --- CONTENT BODY --- */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    {/* Status Bar - High Visibility */}
                    <div className="bg-gray-50 dark:bg-zinc-900/50 px-6 py-4 border-b border-gray-100 dark:border-zinc-800 grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">

                        {/* 1. Integration Status */}
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-gray-100 dark:border-zinc-700 text-indigo-600">
                                <Shield size={18} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Status Integração</span>
                                <span className="text-sm font-bold text-indigo-700 dark:text-indigo-400 leading-tight">
                                    {clientData.integration_status}
                                </span>
                            </div>
                        </div>

                        {/* 2. Tabulation (Editable) */}
                        <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/10 p-2 pr-4 rounded-lg border border-amber-100 dark:border-amber-900/30">
                            <div className="p-1.5 bg-amber-100 dark:bg-amber-800/30 rounded text-amber-600 dark:text-amber-500">
                                <FileText size={18} />
                            </div>
                            <div className="flex-1">
                                <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-500 tracking-wider block mb-0.5">
                                    Tabulação / Status
                                </span>
                                {isEditingTab ? (
                                    <div className="flex gap-2">
                                        <select
                                            className="text-xs p-1 rounded border-amber-200 bg-white dark:bg-zinc-800 dark:border-zinc-600 text-gray-800 dark:text-gray-200 w-full"
                                            value={editTabValue}
                                            onChange={e => setEditTabValue(e.target.value)}
                                        >
                                            <option value="">Selecione...</option>
                                            {tabulationOptions.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                        <button onClick={handleSaveTabulation} className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200"><CheckCircle size={14} /></button>
                                        <button onClick={() => setIsEditingTab(false)} className="p-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"><X size={14} /></button>
                                    </div>
                                ) : (
                                    <div className="flex justify-between items-center group cursor-pointer" onClick={() => {
                                        if (['ADMIN', 'SUPERVISOR', 'OPERATOR'].includes(userRole)) {
                                            setEditTabValue(qualData.tabulacao);
                                            setIsEditingTab(true);
                                        }
                                    }}>
                                        <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                            {qualData.tabulacao || 'Não tabulado'}
                                        </span>
                                        {['ADMIN', 'SUPERVISOR', 'OPERATOR'].includes(userRole) && <div className="ml-2 opacity-0 group-hover:opacity-100 text-amber-500"><FileText size={12} /></div>}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 3. Badges */}
                        <div className="flex items-center justify-end gap-3">
                            <div className={cn("px-3 py-1.5 rounded-lg border flex items-center gap-2", clientData.is_qualified ? "bg-blue-50 border-blue-100 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300" : "bg-gray-50 border-gray-100 text-gray-400 dark:bg-zinc-800 dark:border-zinc-700")}>
                                <div className={cn("w-2 h-2 rounded-full", clientData.is_qualified ? "bg-blue-500" : "bg-gray-300")} />
                                <span className="text-xs font-bold">{clientData.is_qualified ? "Qualificado" : "Não Qualificado"}</span>
                            </div>
                            <div className={cn("px-3 py-1.5 rounded-lg border flex items-center gap-2", clientData.has_open_account ? "bg-green-50 border-green-100 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300" : "bg-gray-50 border-gray-100 text-gray-400 dark:bg-zinc-800 dark:border-zinc-700")}>
                                <div className={cn("w-2 h-2 rounded-full", clientData.has_open_account ? "bg-green-500" : "bg-gray-300")} />
                                <span className="text-xs font-bold">{clientData.has_open_account ? "Conta Aberta" : "Sem Conta"}</span>
                            </div>
                        </div>
                    </div>

                    {/* MAIN GRID - NO SCROLL IF POSSIBLE - 3 COLUMNS */}
                    <div className="flex-1 p-6 overflow-y-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full content-start">

                            {/* COLUMN 1: CADASTRO + CONTATO (4 cols) */}
                            <div className="lg:col-span-4 space-y-4">
                                <SectionTitle icon={<User size={16} />} title="Dados Cadastrais" />
                                <div className="space-y-3">
                                    <Input label="Razão Social / Nome" value={clientData.name} onChange={v => setClientData({ ...clientData, name: v })} />
                                    <Input label="Sobrenome / Fantasia" value={clientData.surname} onChange={v => setClientData({ ...clientData, surname: v })} />
                                    <div className="grid grid-cols-2 gap-3">
                                        <Input label="CPF / CNPJ" value={clientData.cnpj} onChange={v => setClientData({ ...clientData, cnpj: v })} />
                                        <Input label="Telefone" value={clientData.phone} onChange={v => setClientData({ ...clientData, phone: v })} />
                                    </div>
                                    <Input label="Email" value={clientData.email} onChange={v => setClientData({ ...clientData, email: v })} />
                                </div>
                            </div>

                            {/* COLUMN 2: FINANCEIRO + PRODUTOS (4 cols) */}
                            <div className="lg:col-span-4 space-y-4 lg:border-l lg:border-r border-gray-100 dark:border-zinc-800 lg:px-6">
                                <SectionTitle icon={<DollarSign size={16} />} title="Dados Financeiros & Produtos" />
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <Input label="Faturamento Mensal" type="number" value={qualData.faturamento_mensal} onChange={v => setQualData({ ...qualData, faturamento_mensal: v })} prefix="R$" />
                                        <Input label="Fat. Máquina" type="number" value={qualData.faturamento_maquina} onChange={v => setQualData({ ...qualData, faturamento_maquina: v })} prefix="R$" />
                                    </div>

                                    <Input label="Maquininha Atual" value={qualData.maquininha_atual} onChange={v => setQualData({ ...qualData, maquininha_atual: v })} />

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Produto de Interesse</label>
                                        <select
                                            className="w-full text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                            value={qualData.produto_interesse}
                                            onChange={e => setQualData({ ...qualData, produto_interesse: e.target.value })}
                                        >
                                            <option value="">Selecione...</option>
                                            <option value="Conta PJ">Conta PJ</option>
                                            <option value="Maquininha">Maquininha</option>
                                            <option value="Antecipação">Antecipação</option>
                                            <option value="Seguros">Seguros</option>
                                            <option value="Cartão de Crédito">Cartão de Crédito</option>
                                            <option value="Conta Global">Conta Global</option>
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        <Toggle label="Emite Boletos" checked={qualData.emite_boletos} onChange={v => setQualData({ ...qualData, emite_boletos: v })} />
                                        <Toggle label="Receber Ofertas" checked={qualData.deseja_receber_ofertas} onChange={v => setQualData({ ...qualData, deseja_receber_ofertas: v })} />
                                    </div>
                                </div>
                            </div>

                            {/* COLUMN 3: DETALHES + CUSTOM FIELDS (4 cols) */}
                            <div className="lg:col-span-4 space-y-4">
                                <SectionTitle icon={<FileText size={16} />} title="Detalhes & Campos Personalizados" />

                                <div className="space-y-3">
                                    {/* Render Custom Fields dynamically */}
                                    {fields.map(field => (
                                        <div key={field.id}>
                                            <label className="text-[10px] font-bold text-gray-500 uppercase ml-1 block mb-1">{field.label}</label>
                                            {field.type === 'SELECT' ? (
                                                <select
                                                    className="w-full text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2"
                                                    value={customValues[field.key] || ''}
                                                    onChange={e => setCustomValues({ ...customValues, [field.key]: e.target.value })}
                                                >
                                                    <option value="">Selecione...</option>
                                                    {(typeof field.options === 'string' ? JSON.parse(field.options) : field.options || []).map((o: any) => (
                                                        <option key={o} value={o}>{o}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <input
                                                    type={field.type === 'NUMBER' ? 'number' : 'text'}
                                                    className="w-full text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2"
                                                    value={customValues[field.key] || ''}
                                                    onChange={e => setCustomValues({ ...customValues, [field.key]: e.target.value })}
                                                />
                                            )}
                                        </div>
                                    ))}

                                    {/* Additional Info Textarea */}
                                    <div className="pt-2">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1 block mb-1">Informações Adicionais</label>
                                        <textarea
                                            className="w-full text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 min-h-[100px] resize-none focus:ring-2 focus:ring-indigo-500/20"
                                            value={qualData.informacoes_adicionais}
                                            onChange={e => setQualData({ ...qualData, informacoes_adicionais: e.target.value })}
                                            placeholder="Observações importantes..."
                                        />
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                {/* --- FOOTER --- */}
                <div className="p-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 flex justify-between items-center">
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

// --- Micro Components for Uniformity ---

function SectionTitle({ icon, title }: { icon: any, title: string }) {
    return (
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100 dark:border-zinc-800">
            <div className="text-gray-400 dark:text-gray-500">{icon}</div>
            <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide">{title}</h3>
        </div>
    )
}

function Input({ label, value, onChange, type = "text", prefix }: any) {
    return (
        <div className="group">
            <label className="text-[10px] font-bold text-gray-400 group-hover:text-indigo-600 transition-colors uppercase ml-1 mb-1 block">{label}</label>
            <div className="relative">
                {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-medium">{prefix}</span>}
                <input
                    type={type}
                    value={value || ''}
                    onChange={e => onChange(e.target.value)}
                    className={cn(
                        "w-full text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-gray-900 dark:text-gray-100 placeholder:text-gray-300",
                        prefix ? "pl-8" : ""
                    )}
                />
            </div>
        </div>
    )
}

function Toggle({ label, checked, onChange }: any) {
    return (
        <div className="flex items-center gap-2 p-2 rounded-lg border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 cursor-pointer" onClick={() => onChange(!checked)}>
            <div className={cn("w-4 h-4 rounded border flex items-center justify-center transition-colors", checked ? "bg-indigo-600 border-indigo-600" : "border-gray-300 dark:border-zinc-600")}>
                {checked && <CheckCircle size={10} className="text-white" />}
            </div>
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 select-none">{label}</span>
        </div>
    )
}
