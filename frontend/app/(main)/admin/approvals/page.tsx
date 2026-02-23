'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle, XCircle, AlertTriangle, User, ArrowRight, Search, Filter } from 'lucide-react';
import { toast } from 'sonner';

interface Request {
    id: string;
    lead_id: string;
    lead: {
        id: string;
        name: string;
        cnpj: string;
        created_by: { name: string; surname: string };
    };
    from_user: { id: string; name: string; surname: string };
    to_user: { id: string; name: string; surname: string };
    requested_by_user: { id: string; name: string; surname: string };
    reason: string;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    tabulacao_snapshot: string;
    created_at: string;
}

export default function ApprovalsPage() {
    const [requests, setRequests] = useState<Request[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('pending');

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/responsibility-requests?status=${filterStatus}`);
            setRequests(data);
        } catch (error) {
            console.error(error);
            toast.error('Erro ao carregar solicitações.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, [filterStatus]);

    const handleApprove = async (id: string) => {
        if (!confirm('Tem certeza que deseja APROVAR esta solicitação?')) return;

        try {
            await api.patch(`/responsibility-requests/${id}/approve`);
            toast.success('Solicitação aprovada com sucesso!');
            fetchRequests(); // Refresh list
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Erro ao aprovar.');
        }
    };

    const handleReject = async (id: string) => {
        const reason = prompt('Motivo da rejeição (obrigatório):');
        if (reason === null) return; // Cancelled
        if (!reason.trim()) {
            toast.error('O motivo da rejeição é obrigatório.');
            return;
        }

        try {
            await api.patch(`/responsibility-requests/${id}/reject`, { comment: reason });
            toast.error('Solicitação rejeitada.');
            fetchRequests(); // Refresh list
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Erro ao rejeitar.');
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Aprovações de Troca</h1>
                    <p className="text-gray-500 text-sm mt-1">Gerencie as solicitações de mudança de responsabilidade.</p>
                </div>

                <div className="flex items-center gap-2 bg-white p-1 rounded-lg border shadow-sm">
                    <button
                        onClick={() => setFilterStatus('pending')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${filterStatus === 'pending' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        Pendentes
                    </button>
                    <button
                        onClick={() => setFilterStatus('approved')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${filterStatus === 'approved' ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        Aprovados
                    </button>
                    <button
                        onClick={() => setFilterStatus('rejected')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${filterStatus === 'rejected' ? 'bg-red-50 text-red-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        Rejeitados
                    </button>
                    <button
                        onClick={() => setFilterStatus('all')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${filterStatus === 'all' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        Todos
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            ) : requests.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <p className="text-gray-500">Nenhuma solicitação encontrada com este filtro.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {requests.map((req) => {
                        const isAccountOpened = req.tabulacao_snapshot?.toLowerCase().includes('conta aberta');

                        return (
                            <div
                                key={req.id}
                                className={`bg-white rounded-xl shadow-sm border p-5 transition-all hover:shadow-md ${isAccountOpened ? 'border-l-4 border-l-green-500 bg-green-50/10' : 'border-gray-200'}`}
                            >
                                <div className="flex flex-col md:flex-row justify-between gap-6">
                                    {/* Left: Info */}
                                    <div className="flex-1 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide border ${req.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                                    req.status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' :
                                                        'bg-red-100 text-red-800 border-red-200'
                                                }`}>
                                                {req.status === 'pending' ? 'Pendente' :
                                                    req.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                {format(new Date(req.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                                            </span>
                                        </div>

                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="font-semibold text-lg text-gray-900 leading-tight">
                                                    {req.lead?.name || 'Lead Desconhecido'}
                                                </h3>
                                                <p className="text-gray-500 text-sm font-mono mt-0.5">CNPJ: {req.lead?.cnpj || 'N/A'}</p>
                                            </div>
                                            {isAccountOpened && (
                                                <div className="flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-md text-xs font-bold uppercase border border-green-200">
                                                    <CheckCircle size={14} />
                                                    Conta Aberta
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                <span className="text-xs font-bold text-gray-400 uppercase mb-1 block">Transferência</span>
                                                <div className="flex items-center gap-3 text-sm">
                                                    <div className="flex items-center gap-1.5 text-gray-600">
                                                        <User size={14} />
                                                        <span className="font-medium">{req.from_user?.name}</span>
                                                    </div>
                                                    <ArrowRight size={14} className="text-gray-400" />
                                                    <div className="flex items-center gap-1.5 text-indigo-700">
                                                        <User size={14} />
                                                        <span className="font-bold">{req.to_user?.name} {req.to_user?.surname}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                <div className="flex justify-between mb-1">
                                                    <span className="text-xs font-bold text-gray-400 uppercase">Solicitado Por</span>
                                                    <span className="text-xs font-medium text-gray-500">{req.tabulacao_snapshot || 'Sem tabulação'}</span>
                                                </div>
                                                <div className="text-sm font-medium text-gray-700">
                                                    {req.requested_by_user?.name} {req.requested_by_user?.surname}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-2">
                                            <span className="text-xs font-bold text-gray-400 uppercase block mb-1">Motivo / Justificativa</span>
                                            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded border border-gray-100 italic">
                                                "{req.reason}"
                                            </p>
                                        </div>
                                    </div>

                                    {/* Right: Actions */}
                                    {req.status === 'pending' && (
                                        <div className="flex flex-row md:flex-col gap-2 justify-center border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6">
                                            <button
                                                onClick={() => handleApprove(req.id)}
                                                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition-all hover:shadow hover:scale-[1.02]"
                                            >
                                                <CheckCircle size={18} />
                                                <span>Aprovar</span>
                                            </button>

                                            <button
                                                onClick={() => handleReject(req.id)}
                                                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 px-5 py-2.5 rounded-lg font-medium transition-all hover:border-red-300"
                                            >
                                                <XCircle size={18} />
                                                <span>Rejeitar</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
