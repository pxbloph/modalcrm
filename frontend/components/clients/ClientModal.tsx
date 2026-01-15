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
    // status removed
    const [surname, setSurname] = useState('');

    // Qualification States
    const [faturamentoMensal, setFaturamentoMensal] = useState('');
    const [faturamentoMaquina, setFaturamentoMaquina] = useState('');
    const [maquininhaAtual, setMaquininhaAtual] = useState('');
    const [produtoInteresse, setProdutoInteresse] = useState('');
    const [emiteBoletos, setEmiteBoletos] = useState(false);
    const [receberOfertas, setReceberOfertas] = useState(false);
    const [informacoesAdicionais, setInformacoesAdicionais] = useState('');

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
        // status removed
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
    };

    const resetForm = () => {
        setName('');
        setEmail('');
        setPhone('');
        setCnpj('');
        // status removed
        setSurname('');
        setFaturamentoMensal('');
        setFaturamentoMaquina('');
        setMaquininhaAtual('');
        setProdutoInteresse('');
        setEmiteBoletos(false);
        setReceberOfertas(false);
        setInformacoesAdicionais('');
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.put(`/clients/${clientId}`, {
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
            });
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
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
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
                <div className="p-4 sm:p-6 overflow-y-auto flex-grow">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <span className="text-indigo-600 font-semibold animate-pulse">Carregando informações...</span>
                        </div>
                    ) : (
                        <form onSubmit={handleSave} className="space-y-6">
                            {/* Status Banner */}
                            {/* Status Banner */}
                            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="bg-indigo-100 p-2 rounded-full text-indigo-600">
                                        <Shield className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-indigo-900">Status da Integração</p>
                                        <p className="text-sm font-bold text-indigo-700">{client?.integration_status || 'Cadastrando...'}</p>
                                    </div>
                                </div>
                                {/* Tags for Flags */}
                                <div className="flex gap-2">
                                    {client?.is_qualified && (
                                        <span className="inline-flex items-center rounded-md bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                            Qualificado
                                        </span>
                                    )}
                                    {client?.has_open_account && (
                                        <span className="inline-flex items-center rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                            Conta Aberta
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Main Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                                        <User className="h-4 w-4 text-gray-400" /> Razão Social / Nome
                                    </label>
                                    <input
                                        type="text"
                                        disabled={!isEditing}
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3 px-3 text-gray-900 placeholder:text-gray-400 border disabled:bg-gray-50 disabled:text-gray-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Sobrenome / Fantasia</label>
                                    <input
                                        type="text"
                                        disabled={!isEditing}
                                        value={surname}
                                        onChange={(e) => setSurname(e.target.value)}
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3 px-3 text-gray-900 placeholder:text-gray-400 border disabled:bg-gray-50 disabled:text-gray-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-gray-400" /> CNPJ / CPF
                                    </label>
                                    <input
                                        type="text"
                                        disabled={!isEditing}
                                        value={cnpj}
                                        onChange={(e) => setCnpj(e.target.value)}
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3 px-3 text-gray-900 placeholder:text-gray-400 border disabled:bg-gray-50 disabled:text-gray-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                                        <Mail className="h-4 w-4 text-gray-400" /> Email
                                    </label>
                                    <input
                                        type="email"
                                        disabled={!isEditing}
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3 px-3 text-gray-900 placeholder:text-gray-400 border disabled:bg-gray-50 disabled:text-gray-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-gray-400" /> Telefone
                                    </label>
                                    <input
                                        type="text"
                                        disabled={!isEditing}
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3 px-3 text-gray-900 placeholder:text-gray-400 border disabled:bg-gray-50 disabled:text-gray-500"
                                    />
                                </div>
                            </div>

                            {/* Qualification Data */}
                            {/* Qualification Data */}
                            <div className="border-t border-gray-100 pt-4">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <ClipboardCheck className="h-4 w-4" /> Dados da Qualificação
                                </h4>
                                {!isEditing ? (
                                    client?.qualifications && client.qualifications.length > 0 ? (
                                        <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="block text-xs text-gray-400">Faturamento Mensal</span>
                                                <span className="font-medium text-gray-900">
                                                    {client.qualifications[0].faturamento_mensal
                                                        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(client.qualifications[0].faturamento_mensal)
                                                        : '-'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="block text-xs text-gray-400">Faturamento Máquina</span>
                                                <span className="font-medium text-gray-900">
                                                    {client.qualifications[0].faturamento_maquina
                                                        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(client.qualifications[0].faturamento_maquina)
                                                        : '-'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="block text-xs text-gray-400">Maquininha Atual</span>
                                                <span className="font-medium text-gray-900">{client.qualifications[0].maquininha_atual || '-'}</span>
                                            </div>
                                            <div>
                                                <span className="block text-xs text-gray-400">Produto de Interesse</span>
                                                <span className="font-medium text-gray-900">{client.qualifications[0].produto_interesse || '-'}</span>
                                            </div>
                                            <div>
                                                <span className="block text-xs text-gray-400">Emite Boletos?</span>
                                                <span className="font-medium text-gray-900">{client.qualifications[0].emite_boletos ? 'Sim' : 'Não'}</span>
                                            </div>
                                            <div>
                                                <span className="block text-xs text-gray-400">Receber Ofertas?</span>
                                                <span className="font-medium text-gray-900">{client.qualifications[0].deseja_receber_ofertas ? 'Sim' : 'Não'}</span>
                                            </div>
                                            {client.qualifications[0].informacoes_adicionais && (
                                                <div className="col-span-1 md:col-span-2">
                                                    <span className="block text-xs text-gray-400">Informações Adicionais</span>
                                                    <p className="font-medium text-gray-900 mt-1 text-sm whitespace-pre-wrap">
                                                        {client.qualifications[0].informacoes_adicionais}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-gray-500 italic p-4 bg-gray-50 rounded-lg">
                                            Nenhuma qualificação registrada.
                                        </div>
                                    )
                                ) : (
                                    /* EDIT MODE FOR QUALIFICATION */
                                    <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Faturamento Mensal</label>
                                            <input
                                                type="number"
                                                value={faturamentoMensal}
                                                onChange={(e) => setFaturamentoMensal(e.target.value)}
                                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-3 px-3 text-gray-900 placeholder:text-gray-400"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Faturamento Máquina</label>
                                            <input
                                                type="number"
                                                value={faturamentoMaquina}
                                                onChange={(e) => setFaturamentoMaquina(e.target.value)}
                                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-3 px-3 text-gray-900 placeholder:text-gray-400"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Maquininha Atual</label>
                                            <input
                                                type="text"
                                                value={maquininhaAtual}
                                                onChange={(e) => setMaquininhaAtual(e.target.value)}
                                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-3 px-3 text-gray-900 placeholder:text-gray-400"
                                                placeholder="Ex: Stone, Cielo..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Produto de Interesse</label>
                                            <select
                                                value={produtoInteresse}
                                                onChange={(e) => setProdutoInteresse(e.target.value)}
                                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-3 px-3 text-gray-900"
                                            >
                                                <option value="">Selecione...</option>
                                                <option value="Conta PJ">Conta PJ</option>
                                                <option value="Maquininha">Maquininha</option>
                                                <option value="Antecipação">Antecipação</option>
                                                <option value="Seguros">Seguros</option>
                                            </select>
                                        </div>
                                        <div className="flex flex-col gap-2 pt-2">
                                            <label className="flex items-center gap-2 text-sm text-gray-900 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={emiteBoletos}
                                                    onChange={(e) => setEmiteBoletos(e.target.checked)}
                                                    className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                Emite Boletos?
                                            </label>
                                            <label className="flex items-center gap-2 text-sm text-gray-900 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={receberOfertas}
                                                    onChange={(e) => setReceberOfertas(e.target.checked)}
                                                    className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                Receber Ofertas?
                                            </label>
                                        </div>
                                        <div className="col-span-1 md:col-span-2">
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

                            {/* Metadata Section */}
                            <div className="border-t border-gray-100 pt-4">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Informações do Sistema</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-400">Criado em</span>
                                        <span>{client?.created_at ? format(new Date(client.created_at), 'dd/MM/yyyy HH:mm') : '-'}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-400">Responsável</span>
                                        <span>{client?.created_by?.name || '-'} ({client?.created_by?.email})</span>
                                    </div>
                                    {/* Add more metadata if available, e.g. Team */}
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
