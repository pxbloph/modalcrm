import { useState, useEffect } from 'react';
import { X, User, Mail, Phone, FileText, Calendar, Shield, Trash2, CheckCircle, Edit, Save, AlertCircle, ClipboardCheck } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import Link from 'next/link';

interface ClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    clientId?: string;
    userRole: string; // 'ADMIN' | 'SUPERVISOR' | 'OPERATOR' | 'LEADER'
    canEdit: boolean;
    canDelete: boolean;
}

export default function ClientModal({ isOpen, onClose, onSuccess, clientId, userRole, canEdit, canDelete }: ClientModalProps) {
    const [client, setClient] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Form States
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [cnpj, setCnpj] = useState('');
    const [integrationStatus, setIntegrationStatus] = useState(''); // New State
    const [surname, setSurname] = useState('');

    // Qualification States
    const [faturamentoMensal, setFaturamentoMensal] = useState('');
    const [faturamentoMaquina, setFaturamentoMaquina] = useState('');
    const [maquininhaAtual, setMaquininhaAtual] = useState('');
    const [produtoInteresse, setProdutoInteresse] = useState('');
    const [emiteBoletos, setEmiteBoletos] = useState(false);
    const [receberOfertas, setReceberOfertas] = useState(false);
    const [informacoesAdicionais, setInformacoesAdicionais] = useState('');
    const [tabulacao, setTabulacao] = useState(''); // New State

    useEffect(() => {
        if (isOpen && clientId) {
            fetchClientDetails();
            setIsEditing(false); // Reset to view mode on open
        } else {
            setClient(null);
            resetForm();
        }
    }, [isOpen, clientId]);

    const fetchClientDetails = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/clients/${clientId}`);
            const data = response.data;
            setClient(data);
            populateForm(data);
        } catch (error) {
            console.error('Erro ao buscar detalhes do cliente', error);
            // alert('Erro ao carregar cliente');
        } finally {
            setLoading(false);
        }
    };

    const populateForm = (data: any) => {
        setName(data.name || '');
        setEmail(data.email || '');
        setPhone(data.phone || '');
        setCnpj(data.cnpj || '');
        setIntegrationStatus(data.integration_status || '');
        setSurname(data.surname || '');

        // Populate Qualification Fields if available
        const qual = data.qualifications && data.qualifications.length > 0 ? data.qualifications[0] : {};
        setFaturamentoMensal(qual.faturamento_mensal || '');
        setFaturamentoMaquina(qual.faturamento_maquina || '');
        setMaquininhaAtual(qual.maquininha_atual || '');
        setProdutoInteresse(qual.produto_interesse || '');
        setEmiteBoletos(!!qual.emite_boletos);
        setReceberOfertas(!!qual.deseja_receber_ofertas);
        setInformacoesAdicionais(qual.informacoes_adicionais || '');
        setTabulacao(qual.tabulacao || '');
    };

    const resetForm = () => {
        setName('');
        setEmail('');
        setPhone('');
        setCnpj('');
        setIntegrationStatus('');
        setSurname('');
        setFaturamentoMensal('');
        setFaturamentoMaquina('');
        setMaquininhaAtual('');
        setProdutoInteresse('');
        setEmiteBoletos(false);
        setReceberOfertas(false);
        setInformacoesAdicionais('');
        setTabulacao('');
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload: any = {
                name,
                surname,
                email,
                phone,
                cnpj,
                // Qualification Data
                faturamento_mensal: faturamentoMensal,
                faturamento_maquina: faturamentoMaquina,
                maquininha_atual: maquininhaAtual,
                produto_interesse: produtoInteresse,
                emite_boletos: emiteBoletos,
                deseja_receber_ofertas: receberOfertas,
                informacoes_adicionais: informacoesAdicionais
            };

            // Only Admin allows changing status manually
            if (userRole === 'ADMIN') {
                payload.integration_status = integrationStatus;
            }

            await api.put(`/clients/${clientId}`, payload);
            await onSuccess();
            setIsEditing(false); // Exit edit mode
            fetchClientDetails(); // Refresh data
        } catch (error: any) {
            console.error('Erro ao atualizar cliente', error);
            alert(error.response?.data?.message || 'Erro ao atualizar cliente');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Tem certeza que deseja excluir este cliente permanentemente?')) return;
        setSaving(true);
        try {
            await api.delete(`/clients/${clientId}`);
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Erro ao excluir cliente', error);
            alert(error.response?.data?.message || 'Erro ao excluir cliente');
        } finally {
            setSaving(false);
        }
    };

    const handleQualify = async () => {
        if (!confirm('Deseja qualificar este cliente?')) return;
        setSaving(true);
        try {
            await api.patch(`/clients/${clientId}/qualify`);
            // Optimistic update
            setClient({ ...client, is_qualified: true });
            onSuccess();
        } catch (error: any) {
            console.error('Erro ao qualificar', error);
            alert(error.response?.data?.message || 'Erro ao qualificar');
        } finally {
            setSaving(false);
        }
    };

    const handleAccountOpened = async () => {
        if (!confirm('Confirmar que o cliente abriu a conta?')) return;
        setSaving(true);
        try {
            await api.patch(`/clients/${clientId}/open-account`);
            // Optimistic update
            setClient({ ...client, has_open_account: true });
            onSuccess();
        } catch (error: any) {
            console.error('Erro ao marcar conta aberta', error);
            alert(error.response?.data?.message || 'Erro ao marcar conta aberta');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    // Admin always has full edit permissions, explicitly overriding if needed (though canEdit passed as true usually covers it)
    const effectiveCanEdit = canEdit || userRole === 'ADMIN';

    return (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 flex-shrink-0">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">
                            {loading ? 'Carregando...' : (client?.name || 'Detalhes do Cliente')}
                        </h3>
                        <p className="text-xs text-gray-500">
                            {client ? `ID: ${client.id}` : ''}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-grow scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <span className="text-indigo-600 font-semibold animate-pulse">Carregando informações...</span>
                        </div>
                    ) : (
                        <form onSubmit={handleSave} className="space-y-6">
                            {/* NEW LAYOUT: SIDE BY SIDE */}
                            <div className="flex flex-col lg:flex-row gap-8">

                                {/* LEFT COLUMN: REGISTRATION INFO */}
                                <div className="flex-1 space-y-6">
                                    <div className="flex items-center gap-2 border-b pb-2 mb-4">
                                        <User className="h-5 w-5 text-gray-500" />
                                        <h4 className="text-sm font-bold text-gray-900 uppercase">Dados Cadastrais</h4>
                                    </div>

                                    {/* Status Banner (Editable for Admin) */}
                                    <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="bg-indigo-100 p-1.5 rounded-full text-indigo-600">
                                                    <Shield className="h-4 w-4" />
                                                </div>
                                                <span className="text-xs font-semibold text-indigo-900 uppercase">Status Integração</span>
                                            </div>
                                            {/* Tags */}
                                            <div className="flex gap-1">
                                                {client?.is_qualified && (
                                                    <span className="inline-flex items-center rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                                                        Qualificado
                                                    </span>
                                                )}
                                                {client?.has_open_account && (
                                                    <span className="inline-flex items-center rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
                                                        Conta Aberta
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {isEditing && userRole === 'ADMIN' ? (
                                            <select
                                                value={integrationStatus}
                                                onChange={(e) => setIntegrationStatus(e.target.value)}
                                                className="w-full text-sm rounded bg-white border-indigo-200 text-indigo-900 focus:ring-0 focus:border-indigo-400 py-1.5"
                                            >
                                                <option value="Cadastrando...">Cadastrando...</option>
                                                <option value="Pendente">Pendente</option>
                                                <option value="Cadastro salvo com sucesso!">Cadastro salvo com sucesso!</option>
                                                <option value="Erro">Erro</option>
                                            </select>
                                        ) : (
                                            <p className="text-sm font-bold text-indigo-700 ml-1">
                                                {integrationStatus || 'Cadastrando...'}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Razão Social / Nome</label>
                                            <input
                                                type="text"
                                                disabled={!isEditing}
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 text-gray-900 disabled:bg-gray-50 disabled:text-gray-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Sobrenome / Fantasia</label>
                                            <input
                                                type="text"
                                                disabled={!isEditing}
                                                value={surname}
                                                onChange={(e) => setSurname(e.target.value)}
                                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 text-gray-900 disabled:bg-gray-50 disabled:text-gray-500"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">CNPJ / CPF</label>
                                                <input
                                                    type="text"
                                                    disabled={!isEditing}
                                                    value={cnpj}
                                                    onChange={(e) => setCnpj(e.target.value)}
                                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 text-gray-900 disabled:bg-gray-50 disabled:text-gray-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Telefone</label>
                                                <input
                                                    type="text"
                                                    disabled={!isEditing}
                                                    value={phone}
                                                    onChange={(e) => setPhone(e.target.value)}
                                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 text-gray-900 disabled:bg-gray-50 disabled:text-gray-500"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                                            <input
                                                type="email"
                                                disabled={!isEditing}
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 text-gray-900 disabled:bg-gray-50 disabled:text-gray-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Metadata Section - Moved here specifically for registration logic */}
                                    <div className="pt-4 border-t border-dashed">
                                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                                            <div>
                                                <span className="block text-[10px] text-gray-400 uppercase">Criado em</span>
                                                <span className="font-medium">{client?.created_at ? format(new Date(client.created_at), 'dd/MM/yyyy HH:mm') : '-'}</span>
                                            </div>
                                            <div>
                                                <span className="block text-[10px] text-gray-400 uppercase">Responsável</span>
                                                <span className="font-medium truncate block" title={client?.created_by?.email}>
                                                    {client?.created_by?.name || '-'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* RIGHT COLUMN: QUALIFICATION INFO */}
                                <div className="flex-1 space-y-6 lg:border-l lg:pl-8 lg:border-gray-100">
                                    <div className="flex items-center gap-2 border-b pb-2 mb-4">
                                        <ClipboardCheck className="h-5 w-5 text-gray-500" />
                                        <h4 className="text-sm font-bold text-gray-900 uppercase">Dados da Qualificação</h4>
                                    </div>

                                    {!isEditing ? (
                                        client?.qualifications && client.qualifications.length > 0 ? (
                                            <div className="space-y-4 text-sm">
                                                {/* Tabulação Block - New */}
                                                <div className="bg-amber-50 rounded-md p-3 border border-amber-100">
                                                    <span className="block text-xs font-semibold text-amber-800 uppercase mb-1">Tabulação / Status do Lead</span>
                                                    <span className="text-base font-bold text-gray-900">
                                                        {tabulacao || 'Não tabulado'}
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <span className="block text-xs text-gray-400 mb-0.5">Faturamento Mensal</span>
                                                        <span className="font-medium text-gray-900 block bg-gray-50 px-3 py-2 rounded border border-gray-100">
                                                            {client.qualifications[0].faturamento_mensal
                                                                ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(client.qualifications[0].faturamento_mensal)
                                                                : '-'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="block text-xs text-gray-400 mb-0.5">Faturamento Máquina</span>
                                                        <span className="font-medium text-gray-900 block bg-gray-50 px-3 py-2 rounded border border-gray-100">
                                                            {client.qualifications[0].faturamento_maquina
                                                                ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(client.qualifications[0].faturamento_maquina)
                                                                : '-'}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <span className="block text-xs text-gray-400 mb-0.5">Maquininha Atual</span>
                                                        <span className="font-medium text-gray-900 block bg-gray-50 px-3 py-2 rounded border border-gray-100">
                                                            {client.qualifications[0].maquininha_atual || '-'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="block text-xs text-gray-400 mb-0.5">Produto de Interesse</span>
                                                        <span className="font-medium text-gray-900 block bg-gray-50 px-3 py-2 rounded border border-gray-100">
                                                            {client.qualifications[0].produto_interesse || '-'}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex gap-4 pt-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className={cn("w-2 h-2 rounded-full", client.qualifications[0].emite_boletos ? "bg-green-500" : "bg-gray-300")} />
                                                        <span className="text-gray-700">Emite Boletos? <strong>{client.qualifications[0].emite_boletos ? 'Sim' : 'Não'}</strong></span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className={cn("w-2 h-2 rounded-full", client.qualifications[0].deseja_receber_ofertas ? "bg-green-500" : "bg-gray-300")} />
                                                        <span className="text-gray-700">Receber Ofertas? <strong>{client.qualifications[0].deseja_receber_ofertas ? 'Sim' : 'Não'}</strong></span>
                                                    </div>
                                                </div>

                                                {client.qualifications[0].informacoes_adicionais && (
                                                    <div className="mt-4">
                                                        <span className="block text-xs text-gray-400 mb-1">Informações Adicionais</span>
                                                        <div className="bg-gray-50 p-3 rounded border border-gray-100 text-gray-700 whitespace-pre-wrap">
                                                            {client.qualifications[0].informacoes_adicionais}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-sm text-gray-500 italic p-6 bg-gray-50 rounded-lg text-center border border-dashed border-gray-200">
                                                Nenhuma qualificação registrada para este cliente.
                                            </div>
                                        )
                                    ) : (
                                        /* EDIT MODE FOR QUALIFICATION */
                                        <div className="space-y-4">
                                            {/* Note: Tabulação usually updated via specific action, so we keep it read-only or not shown in edit form if not requested. 
                                                User request didn't specify editing tabulacao here, only displaying. 
                                                Leaving tabulacao out of edit mode to avoid confusion, or can enable if needed.*/}

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Faturamento Mensal</label>
                                                    <input
                                                        type="number"
                                                        value={faturamentoMensal}
                                                        onChange={(e) => setFaturamentoMensal(e.target.value)}
                                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 text-gray-900 placeholder:text-gray-400"
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Faturamento Máquina</label>
                                                    <input
                                                        type="number"
                                                        value={faturamentoMaquina}
                                                        onChange={(e) => setFaturamentoMaquina(e.target.value)}
                                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 text-gray-900 placeholder:text-gray-400"
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Maquininha Atual</label>
                                                    <input
                                                        type="text"
                                                        value={maquininhaAtual}
                                                        onChange={(e) => setMaquininhaAtual(e.target.value)}
                                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 text-gray-900 placeholder:text-gray-400"
                                                        placeholder="Ex: Stone, Cielo..."
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Produto de Interesse</label>
                                                    <select
                                                        value={produtoInteresse}
                                                        onChange={(e) => setProdutoInteresse(e.target.value)}
                                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 text-gray-900"
                                                    >
                                                        <option value="">Selecione...</option>
                                                        <option value="Conta PJ">Conta PJ</option>
                                                        <option value="Maquininha">Maquininha</option>
                                                        <option value="Antecipação">Antecipação</option>
                                                        <option value="Seguros">Seguros</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-2 pt-2 bg-gray-50 p-2 rounded">
                                                <label className="flex items-center gap-2 text-sm text-gray-900 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={emiteBoletos}
                                                        onChange={(e) => setEmiteBoletos(e.target.checked)}
                                                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                    Emite Boletos?
                                                </label>
                                                <label className="flex items-center gap-2 text-sm text-gray-900 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={receberOfertas}
                                                        onChange={(e) => setReceberOfertas(e.target.checked)}
                                                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                    Receber Ofertas?
                                                </label>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Informações Adicionais</label>
                                                <textarea
                                                    value={informacoesAdicionais}
                                                    onChange={(e) => setInformacoesAdicionais(e.target.value)}
                                                    rows={4}
                                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-3 text-gray-900 placeholder:text-gray-400"
                                                    placeholder="Observações importantes..."
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Hidden submit button to allow Enter key submission when editing */}
                            {isEditing && <button type="submit" className="hidden" />}
                        </form>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between flex-shrink-0">
                    <div className="flex gap-2">
                        {canDelete && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg flex items-center gap-2 transition-colors"
                            >
                                <Trash2 className="h-4 w-4" />
                                <span className={isEditing ? 'inline' : 'hidden sm:inline'}>Excluir</span>
                            </button>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            {isEditing ? 'Cancelar' : 'Fechar'}
                        </button>

                        {/* Qualify Action */}
                        {!client?.is_qualified && !isEditing && userRole === 'OPERATOR' && (
                            <button
                                type="button"
                                onClick={handleQualify}
                                disabled={saving}
                                className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 flex items-center gap-2 transition-colors border border-indigo-200"
                            >
                                <ClipboardCheck className="h-4 w-4" />
                                Qualificar
                            </button>
                        )}

                        {/* Edit Action - existing logic */}
                        {!isEditing && effectiveCanEdit && (
                            <button
                                type="button"
                                onClick={() => setIsEditing(true)}
                                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 flex items-center gap-2 transition-colors"
                            >
                                <Edit className="h-4 w-4" />
                                Editar
                            </button>
                        )}

                        {isEditing && (
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={saving}
                                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                            >
                                {saving ? <LayoutDashboard className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                Salvar
                            </button>
                        )}

                        {/* Account Opened Action */}
                        {!client?.has_open_account && !isEditing && (userRole === 'ADMIN' || userRole === 'SUPERVISOR') && (
                            <button
                                type="button"
                                onClick={handleAccountOpened}
                                disabled={saving}
                                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 transition-colors ml-2"
                            >
                                <CheckCircle className="h-4 w-4" />
                                Conta Aberta
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Icon helper
function LayoutDashboard({ className }: { className?: string }) {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></svg>
    )
}
