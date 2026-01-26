"use client";

import { useState, useEffect } from "react";
import { X, Save, Trash, Calendar, User, DollarSign, Building2, FileText, CheckCircle, AlertCircle, Clock, Tag } from "lucide-react";
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

    // Form States (Deal Specific)
    const [title, setTitle] = useState("");
    const [value, setValue] = useState("");
    const [customValues, setCustomValues] = useState<Record<string, any>>({});
    const [fields, setFields] = useState<any[]>([]);

    // Tag States
    const [availableTags, setAvailableTags] = useState<{ id: string, name: string, color: string }[]>([]);
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
    const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);

    // Tabulation Edit State (Supervisor)
    const [userRole, setUserRole] = useState<string>("");
    const [isEditingTab, setIsEditingTab] = useState(false);
    const [editTabValue, setEditTabValue] = useState("");
    const [showPipelineSelector, setShowPipelineSelector] = useState(false);
    const [pipelines, setPipelines] = useState<any[]>([]);
    const [selectedPipelineForCreation, setSelectedPipelineForCreation] = useState("");
    const [tabulationOptions, setTabulationOptions] = useState<string[]>([]);
    const [clientStandalone, setClientStandalone] = useState<any>(null);

    useEffect(() => {
        const u = localStorage.getItem('user');
        if (u) setUserRole(JSON.parse(u).role);
    }, []);

    useEffect(() => {
        // Load fields for this pipeline always
        if (pipelineId) fetchFields(); // Only fetch field if pipeline is known, or fetch later
        fetchTags();
        fetchTabulations();

        if (dealId) {
            fetchDeal(dealId);
        } else if (initialClientId) {
            fetchDealByClient(initialClientId);
        } else {
            // Create Mode from Kanban Column (pipeline known)
            setLoading(false);
            if (pipelineId) fetchFields();
        }
    }, [dealId, pipelineId, initialClientId]);

    const fetchTabulations = async () => {
        try {
            const res = await api.get('/qualifications/tabulations');
            setTabulationOptions(res.data || []);
        } catch (e) {
            console.error("Erro ao buscar tabulações", e);
        }
    };

    const fetchTags = async () => {
        try {
            const res = await api.get('/tags');
            setAvailableTags(res.data);
        } catch (e) {
            console.error("Erro ao buscar tags:", e);
        }
    };

    const fetchPipelines = async () => {
        try {
            const res = await api.get('/pipelines');
            setPipelines(res.data);
            if (res.data.length > 0) {
                // Default select the first one or the passed one
                setSelectedPipelineForCreation(pipelineId || res.data[0].id);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const fetchFields = async () => {
        const pid = deal?.pipeline_id || pipelineId || selectedPipelineForCreation;
        if (!pid) return;
        try {
            const res = await api.get(`/custom-fields?pipeline_id=${pid}`);
            setFields(res.data);
        } catch (e) {
            console.error(e);
        }
    };

    // Reload fields when pipeline selection changes in creation mode
    // Reload fields when pipeline selection changes in creation mode
    useEffect(() => {
        if (!dealId && selectedPipelineForCreation) {
            // Optional: fetch fields to preview? Not needed for just creating.
        }
    }, [selectedPipelineForCreation, dealId]);

    const fetchClientStandalone = async (cliId: string) => {
        try {
            const res = await api.get(`/clients/${cliId}`);
            setClientStandalone(res.data);
            setTitle("Nova Oportunidade");
            // Also fetch pipelines for the dropdown
            fetchPipelines();
        } catch (e) {
            console.error(e);
            alert("Erro ao buscar dados do cliente.");
            onClose();
        }
    }

    const fetchDealByClient = async (clientId: string) => {
        setLoading(true);
        try {
            // Try to find active deal
            const res = await api.get('/deals', { params: { client_id: clientId } });
            const deals = res.data;

            if (deals && Array.isArray(deals) && deals.length > 0) {
                fetchDeal(deals[0].id);
            } else {
                // No deal found -> Load client data for standby mode
                await fetchClientStandalone(clientId);
                setLoading(false);
            }
        } catch (e: any) {
            console.error(e);
            alert("Erro ao buscar oportunidades do cliente.");
            onClose();
        }
    };

    const handleCreateWithPipeline = async () => {
        if (!selectedPipelineForCreation) return alert("Selecione um funil.");
        setLoading(true);
        try {
            const uStr = localStorage.getItem('user');
            const user = uStr ? JSON.parse(uStr) : {};

            // Create the deal
            const payload = {
                title: title || "Nova Oportunidade", // User might have typed title
                client_id: initialClientId,
                pipeline_id: selectedPipelineForCreation,
                responsible_id: user.id || undefined,
                value: 0
            };

            const res = await api.post('/deals', payload);

            // Now load the new deal
            setShowPipelineSelector(false);
            fetchDeal(res.data.id);

        } catch (e: any) {
            console.error(e);
            alert("Erro ao criar oportunidade: " + (e.response?.data?.message || e.message));
            setLoading(false);
        }
    };

    const fetchDeal = async (id: string) => {
        setLoading(true);
        try {
            const response = await api.get(`/deals/${id}`);
            const data = response.data;
            setDeal(data);
            setTitle(data.title);
            setValue(data.value || "");

            // Reload fields for this deal's pipeline
            if (data.pipeline_id) {
                const fRes = await api.get(`/custom-fields?pipeline_id=${data.pipeline_id}`);
                setFields(fRes.data);
            }

            // Map tags
            if (data.tags && Array.isArray(data.tags)) {
                setSelectedTagIds(data.tags.map((dt: any) => dt.tag.id));
            } else {
                setSelectedTagIds([]);
            }

            // Map existing custom values
            const initialValues: Record<string, any> = {};
            data.custom_values.forEach((cv: any) => {
                initialValues[cv.field.key] = cv.value;
            });
            setCustomValues(initialValues);

        } catch (error) {
            console.error("Erro ao carregar deal:", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleTag = (tagId: string) => {
        if (selectedTagIds.includes(tagId)) {
            setSelectedTagIds(prev => prev.filter(id => id !== tagId));
        } else {
            setSelectedTagIds(prev => [...prev, tagId]);
        }
    };

    const handleSaveTab = async () => {
        if (!editTabValue.trim()) return;
        try {
            if (dealId) {
                await api.patch(`/deals/${dealId}/tabulation`, { tabulacao: editTabValue });
                fetchDeal(dealId);
            } else if (initialClientId) {
                // MODO SEM KANBAN: Salva direto na qualificação
                // Cria uma nova qualificação apenas com a tabulação atualizada
                await api.post(`/qualifications/${initialClientId}`, {
                    answers: {},
                    tabulacao: editTabValue
                });
                // Recarrega dados do cliente
                fetchClientStandalone(initialClientId);
            }

            setIsEditingTab(false);
            alert("Tabulação atualizada com sucesso!");
        } catch (e: any) {
            console.error(e);
            alert("Erro ao atualizar tabulação: " + (e.response?.data?.message || e.message));
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // MODO SEM KANBAN (Solicitado pelo usuário):
            // Se não tem Deal ID e estamos visualizando um cliente, NÃO criar deal automaticamente.
            if (!dealId && initialClientId) {
                // Apenas fecha o modal, assumindo que as edições de tabulação foram feitas via handleSaveTab
                // ou que o usuário apenas visualizou.
                onUpdate();
                onClose();
                return;
            }

            const payload: any = {
                title,
                value: value ? parseFloat(value) : null,
                pipeline_id: deal?.pipeline_id || pipelineId,
                custom_fields: customValues,
                tag_ids: selectedTagIds,
            };

            if (!dealId && initialClientId) {
                payload.client_id = initialClientId;
            }

            if (dealId) {
                await api.patch(`/deals/${dealId}`, payload);
            } else {
                await api.post(`/deals`, payload);
            }
            onUpdate();
            onClose();
        } catch (error: any) {
            console.error("Erro ao salvar:", error);
            // Se o erro for de pipeline sem estágios, ignorar e fechar se for criação
            if (error.response?.data?.message === 'Pipeline has no stages defined' && !dealId) {
                onUpdate();
                onClose();
                return;
            }
            const msg = error.response?.data?.message || "Erro ao salvar alterações.";
            alert(msg);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!dealId || !confirm("Tem certeza que deseja excluir este card?")) return;
        try {
            await api.delete(`/deals/${dealId}`);
            onUpdate();
            onClose();
        } catch (error) {
            console.error("Erro ao excluir:", error);
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
                <div className="bg-white p-6 rounded shadow-lg">Carregando...</div>
            </div>
        );
    }


    // Helper to extract qual
    // Use standalone client qualification if no deal
    const activeClient = deal?.client || clientStandalone || {};

    // Sort qualifications manually if coming from standalone client (if they are array)
    // Standalone client usually returns qualifications array.
    let quals = activeClient.qualifications;
    if (!quals && deal?.client?.qualifications) quals = deal.client.qualifications;

    const lastQual = quals && quals.length > 0 ? quals[0] : null;

    // We keep 'client' for backward compatibility in DetailInput calls below if we don't change them all
    const client = activeClient;

    return (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center z-[60] p-4">
            <div className="bg-gray-50 dark:bg-[#09090b] rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-zinc-800 animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex justify-between items-start px-6 py-4 border-b border-gray-200 bg-white dark:bg-zinc-900 dark:border-zinc-800">
                    <div className="flex-1 space-y-2">
                        <div className="flex justify-between mr-8 items-center">
                            <input
                                type="text"
                                className="text-xl font-bold text-gray-800 dark:text-gray-100 bg-transparent border-none focus:ring-0 p-0 w-full placeholder:text-gray-400"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Título do Negócio"
                                readOnly={!dealId}
                            />

                            {/* Create Deal Button Area */}
                            {!dealId && clientStandalone && (
                                <div className="flex items-center gap-2">
                                    <select
                                        className="text-xs border border-gray-300 dark:border-zinc-700 rounded px-2 py-1 bg-white dark:bg-zinc-800"
                                        value={selectedPipelineForCreation}
                                        onChange={e => setSelectedPipelineForCreation(e.target.value)}
                                    >
                                        {pipelines.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={handleCreateWithPipeline}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1 shadow-sm transition-colors whitespace-nowrap"
                                    >
                                        <DollarSign size={12} />
                                        Criar Oportunidade
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">
                                {dealId ? `ID: ${dealId}` : "Novo Card"} • {deal?.stage?.name || (dealId ? 'Etapa indefinida' : 'Sem oportunidade ativa')}
                            </span>

                            {/* Tags UI */}
                            {selectedTagIds.map(tagId => {
                                const tag = availableTags.find(t => t.id === tagId);
                                if (!tag) return null;
                                return (
                                    <span key={tag.id}
                                        className="px-2 py-0.5 rounded text-[10px] font-bold text-white flex items-center gap-1 cursor-default group hover:brightness-110 transition-all"
                                        style={{ backgroundColor: tag.color }}>
                                        {tag.name}
                                        <X size={10} className="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => toggleTag(tag.id)} />
                                    </span>
                                )
                            })}

                            <div className="relative">
                                <button
                                    onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
                                    className="text-[10px] flex items-center gap-1 text-gray-500 hover:text-indigo-600 bg-gray-100 px-2 py-0.5 rounded transition-colors dark:bg-zinc-800 dark:text-gray-400 border border-transparent hover:border-indigo-200"
                                >
                                    <Tag size={10} /> + Tag
                                </button>

                                {isTagDropdownOpen && (
                                    <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-700 shadow-xl rounded-lg z-50 p-1 grid gap-0.5 max-h-48 overflow-y-auto">
                                        {availableTags.length === 0 && <div className="p-2 text-xs text-gray-400 text-center">Nenhuma tag cadastrada</div>}
                                        {availableTags.map(tag => (
                                            <button
                                                key={tag.id}
                                                onClick={() => toggleTag(tag.id)}
                                                className={`text-left text-xs px-2 py-1.5 rounded flex items-center justify-between w-full hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors ${selectedTagIds.includes(tag.id) ? 'font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'text-gray-700 dark:text-gray-300'}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }}></div>
                                                    {tag.name}
                                                </div>
                                                {selectedTagIds.includes(tag.id) && <CheckCircle size={10} />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors -mt-2 -mr-2">
                        <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                {/* Content - 2 Columns */}
                <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-[#09090b]">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">

                        {/* LEFT COLUMN: COMPANY DETAILS (55% -> col-span-7) */}
                        <div className="lg:col-span-7 space-y-6">
                            <div className="flex items-center gap-2 pb-2 border-b-2 border-gray-900 dark:border-gray-100 mb-6">
                                <User className="w-5 h-5 text-gray-900 dark:text-gray-100" />
                                <h3 className="font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide text-sm">DADOS CADASTRAIS</h3>
                            </div>

                            {dealId && !deal?.client ? (
                                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 rounded-lg text-sm">
                                    Este card não está vinculado a um cliente.
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Integration Status Card */}
                                    <div className="bg-[#ede9fe] dark:bg-[#2e1065] rounded-lg p-4 flex items-center justify-between border border-[#ddd6fe] dark:border-[#4c1d95]">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-100">
                                                <div className="p-1 rounded-full border-2 border-indigo-600 dark:border-indigo-400"></div>
                                                <span className="font-bold text-xs uppercase tracking-wider">STATUS INTEGRAÇÃO</span>
                                            </div>
                                            <div className="text-indigo-700 dark:text-indigo-300 font-bold text-lg break-all">
                                                {client.integration_status || "Status desconhecido"}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className={cn("px-2 py-1 text-xs font-bold rounded", client.is_qualified ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500")}>
                                                {client.is_qualified ? "Qualificado" : "Não Qualificado"}
                                            </span>
                                            <span className={cn("px-2 py-1 text-xs font-bold rounded", client.has_open_account ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
                                                {client.has_open_account ? "Conta Aberta" : "Sem Conta"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <DetailInput label="Razão Social / Nome" value={client.name} fullWidth />
                                        <DetailInput label="Sobrenome / Fantasia" value={client.surname} fullWidth />

                                        <div className="grid grid-cols-2 gap-4">
                                            <DetailInput label="CNPJ / CPF" value={client.cnpj} />
                                            <DetailInput label="Telefone" value={client.phone} />
                                        </div>

                                        <DetailInput label="Email" value={client.email} fullWidth />
                                    </div>

                                    <div className="pt-6 border-t border-dashed border-gray-300 dark:border-zinc-700 flex justify-between">
                                        <div>
                                            <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">CRIADO EM</span>
                                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                                {client.created_at ? format(new Date(client.created_at), "dd/MM/yyyy HH:mm") : '—'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">RESPONSÁVEL</span>
                                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                                {deal?.responsible?.name || '—'}
                                            </span>
                                        </div>
                                    </div>

                                </div>
                            )}

                            {/* CUSTOM FIELDS SECTION */}
                            {fields.length > 0 && (
                                <div className="space-y-4 pt-6 border-t font-semibold border-gray-100 dark:border-zinc-800">
                                    <div className="flex items-center gap-2 pb-2">
                                        <FileText className="w-5 h-5 text-gray-900 dark:text-gray-100" />
                                        <h3 className="font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide text-sm">CAMPOS PERSONALIZADOS</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {fields.map(field => (
                                            <div key={field.id} className="flex flex-col">
                                                <label className="text-xs font-bold text-gray-500 mb-1.5 ml-1">
                                                    {field.label} {field.is_required && <span className="text-red-500">*</span>}
                                                </label>
                                                {field.type === 'BOOLEAN' ? (
                                                    <select
                                                        className="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 dark:text-gray-200"
                                                        value={customValues[field.key] || ''}
                                                        onChange={e => setCustomValues({ ...customValues, [field.key]: e.target.value })}
                                                    >
                                                        <option value="">Selecione...</option>
                                                        <option value="true">Sim</option>
                                                        <option value="false">Não</option>
                                                    </select>
                                                ) : field.type === 'SELECT' ? (
                                                    <select
                                                        className="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 dark:text-gray-200"
                                                        value={customValues[field.key] || ''}
                                                        onChange={e => setCustomValues({ ...customValues, [field.key]: e.target.value })}
                                                    >
                                                        <option value="">Selecione...</option>
                                                        {field.options && (Array.isArray(field.options) ? field.options : typeof field.options === 'string' ? JSON.parse(field.options) : []).map((opt: any) => (
                                                            <option key={opt} value={opt}>{opt}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <input
                                                        type={field.type === 'NUMBER' ? 'number' : field.type === 'DATE' ? 'date' : 'text'}
                                                        className="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 dark:text-gray-200"
                                                        value={customValues[field.key] || ''}
                                                        onChange={e => setCustomValues({ ...customValues, [field.key]: e.target.value })}
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* RIGHT COLUMN: QUALIFICATION & DEAL DATA (45% -> col-span-5) */}
                        <div className="lg:col-span-5 h-full flex flex-col">

                            <div className="flex items-center gap-2 pb-2 border-b-2 border-gray-900 dark:border-gray-100 mb-6">
                                <CheckCircle className="w-5 h-5 text-gray-900 dark:text-gray-100" />
                                <h3 className="font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide text-sm">DADOS DA QUALIFICAÇÃO</h3>
                            </div>

                            <div className="space-y-6">

                                {/* Tabulation Status - Yellow Box - Editable by Supervisor */}
                                <div className="bg-[#fffbeb] dark:bg-[#451a03] border border-[#fcd34d] dark:border-[#78350f] rounded-lg p-4 transition-all">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <span className="block text-xs text-[#b45309] dark:text-[#fcd34d] uppercase font-bold mb-1">
                                                TABULAÇÃO / STATUS DO LEAD {isEditingTab && "(Editando)"}
                                            </span>

                                            {isEditingTab ? (
                                                <div className="mt-1">
                                                    <select
                                                        className="w-full px-2 py-1 bg-white border border-[#fcd34d] rounded text-[#1e293b] font-bold focus:outline-none focus:ring-1 focus:ring-orange-500 text-sm"
                                                        value={editTabValue}
                                                        onChange={(e) => setEditTabValue(e.target.value)}
                                                    >
                                                        <option value="">Selecione...</option>
                                                        {tabulationOptions.map(opt => (
                                                            <option key={opt} value={opt}>{opt}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            ) : (
                                                <div className="text-xl font-bold text-[#1e293b] dark:text-[#fffbeb]">
                                                    {lastQual?.tabulacao || 'Não tabulado'}
                                                </div>
                                            )}
                                        </div>

                                        {(userRole === 'ADMIN' || userRole === 'SUPERVISOR' || userRole === 'OPERATOR') && (
                                            <div className="ml-4 flex gap-2">
                                                {isEditingTab ? (
                                                    <>
                                                        <button
                                                            onClick={handleSaveTab}
                                                            className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                                                            title="Salvar status"
                                                        >
                                                            <CheckCircle size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => { setIsEditingTab(false); setEditTabValue(""); }}
                                                            className="p-1.5 bg-gray-200 text-gray-600 rounded hover:bg-gray-300 transition-colors"
                                                            title="Cancelar"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={() => {
                                                            setEditTabValue(lastQual?.tabulacao || "");
                                                            setIsEditingTab(true);
                                                        }}
                                                        className="p-1.5 bg-[#fcd34d] text-[#78350f] rounded hover:bg-[#fbbf24] transition-colors"
                                                        title="Editar status manualmente"
                                                    >
                                                        <FileText size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {isEditingTab && <p className="text-[10px] text-[#b45309] mt-2 italic">* Alteração manual disparará webhooks.</p>}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <DetailInput
                                        label="Faturamento Mensal"
                                        value={lastQual?.faturamento_mensal ? `R$ ${Number(lastQual.faturamento_mensal).toLocaleString('pt-BR')},00` : ''}
                                    />
                                    <DetailInput
                                        label="Faturamento Máquina"
                                        value={lastQual?.volume_maquininha ? `R$ ${Number(lastQual.volume_maquininha).toLocaleString('pt-BR')},00` : ''}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <DetailInput
                                        label="Maquininha Atual"
                                        value={lastQual?.maquininha_atual || ''}
                                    />
                                    <DetailInput
                                        label="Produto de Interesse"
                                        value={lastQual?.produto_interesse || '—'}
                                    />
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${lastQual?.emite_boletos ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Emite Boletos? <strong>{lastQual?.emite_boletos ? 'Sim' : 'Não'}</strong>
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${lastQual?.deseja_receber_ofertas ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Receber Ofertas? <strong>{lastQual?.deseja_receber_ofertas ? 'Sim' : 'Não'}</strong>
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1.5 ml-1">Informações Adicionais</label>
                                    <div className="bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-lg p-3 text-sm text-gray-600 dark:text-gray-400 min-h-[80px]">
                                        {/* Fallback to custom fields or specific field if exists */}
                                        {lastQual?.informacoes_adicionais || '—'}
                                    </div>
                                </div>

                            </div>

                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center dark:bg-zinc-900 dark:border-zinc-800">
                    <div>
                        {dealId && (
                            <button
                                onClick={handleDelete}
                                className="text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                            >
                                <Trash className="w-4 h-4" /> Excluir Card
                            </button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 border rounded-lg text-gray-700 bg-white hover:bg-gray-50 border-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-gray-300 dark:hover:bg-zinc-700 text-sm font-medium transition-colors"
                        >
                            Fechar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-5 py-2.5 bg-[#4f46e5] text-white rounded-lg hover:bg-[#4338ca] flex items-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:shadow-none transition-all text-sm font-bold uppercase tracking-wide"
                        >
                            <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}

function DetailInput({ label, value, fullWidth, type = "text" }: any) {
    return (
        <div className={cn("flex flex-col", fullWidth ? "col-span-1 md:col-span-2" : "col-span-1")}>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 ml-1">{label}</label>
            <input
                type={type}
                value={value || ''}
                readOnly
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#18181b] border border-gray-100 dark:border-zinc-800 rounded-lg text-gray-800 dark:text-gray-200 text-sm font-medium focus:outline-none focus:ring-0 cursor-default placeholder:text-gray-300"
            />
        </div>
    )
}
