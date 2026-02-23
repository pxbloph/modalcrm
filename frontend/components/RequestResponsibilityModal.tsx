import React, { useState } from 'react';
import { X, Send } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

interface RequestResponsibilityModalProps {
    leadId: string;
    currentUser: any;
    users: any[];
    onClose: () => void;
}

export function RequestResponsibilityModal({ leadId, currentUser, users, onClose }: RequestResponsibilityModalProps) {
    const [reason, setReason] = useState('');
    const [selectedUser, setSelectedUser] = useState(currentUser?.id || '');
    const [processing, setProcessing] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (reason.length < 20) {
            toast.error("O motivo deve ter pelo menos 20 caracteres.");
            return;
        }

        setProcessing(true);
        try {
            await api.post('/responsibility-requests', {
                leadId,
                toUserId: selectedUser,
                reason
            });
            toast.success("Solicitação enviada com sucesso!");
            onClose();
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || "Erro ao enviar solicitação.");
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Send className="h-5 w-5 text-indigo-600" />
                        Solicitar Responsabilidade
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Novo Responsável</label>
                        <select
                            value={selectedUser}
                            onChange={(e) => setSelectedUser(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            {users.map((u: any) => (
                                <option key={u.id} value={u.id}>{u.name} {u.surname}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Motivo <span className="text-red-500">*</span>
                            <span className="text-xs text-gray-400 font-normal ml-2">(Mín 20 chars)</span>
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Justifique a solicitação..."
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-32"
                            required
                        />
                        <div className="text-right text-xs text-gray-400 mt-1">
                            {reason.length} / 20
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={processing || reason.length < 20}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {processing ? 'Enviando...' : 'Enviar Solicitação'}
                            {!processing && <Send className="h-4 w-4" />}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
