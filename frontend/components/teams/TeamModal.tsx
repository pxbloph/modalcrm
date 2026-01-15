import { useState, useEffect } from 'react';
import { X, Shield, Users } from 'lucide-react';
import api from '@/lib/api';

interface TeamModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    teamToEdit?: any; // If present, mode is EDIT
}

export default function TeamModal({ isOpen, onClose, onSuccess, teamToEdit }: TeamModalProps) {
    const [name, setName] = useState('');
    const [supervisorId, setSupervisorId] = useState('');
    const [leaderId, setLeaderId] = useState('');
    const [loading, setLoading] = useState(false);
    const [supervisors, setSupervisors] = useState<any[]>([]); // Users eligible for Supervisor
    const [leaders, setLeaders] = useState<any[]>([]); // Users eligible for Leader

    useEffect(() => {
        if (isOpen) {
            // Fetch potential supervisors and leaders (users)
            // Ideally backend should provide specific endpoints or filters, 
            // for now fetching all users and filtering client-side or assume /users returns all needed.
            const fetchUsers = async () => {
                try {
                    const res = await api.get('/users');
                    const allUsers = res.data;
                    // Filter based on roles if necessary, or just show all for now
                    setSupervisors(allUsers.filter((u: any) => u.role === 'SUPERVISOR' || u.role === 'ADMIN'));
                    setLeaders(allUsers.filter((u: any) => u.role !== 'OPERATOR')); // Expanded scope or specific LEADER role
                } catch (err) {
                    console.error("Error fetching users", err);
                }
            };
            fetchUsers();

            if (teamToEdit) {
                setName(teamToEdit.name);
                setSupervisorId(teamToEdit.supervisor_id || '');
                setLeaderId(teamToEdit.leader_id || '');
            } else {
                setName('');
                setSupervisorId('');
                setLeaderId('');
            }
        }
    }, [isOpen, teamToEdit]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                name,
                supervisorId: supervisorId || undefined, // Send undefined if empty to avoid issues if backend expects string
                leaderId: leaderId || undefined,
            };

            if (teamToEdit) {
                await api.patch(`/teams/${teamToEdit.id}`, payload);
            } else {
                await api.post('/teams', payload);
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Error saving team", error);
            alert("Erro ao salvar equipe. Verifique os dados.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <h3 className="text-lg font-bold text-gray-900">
                        {teamToEdit ? 'Editar Equipe' : 'Nova Equipe'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Equipe</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border text-gray-700"
                            placeholder="Ex: Comercial, Suporte..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                            <Shield className="h-3 w-3 text-purple-600" /> Supervisor (Decisor)
                        </label>
                        <select
                            required
                            value={supervisorId}
                            onChange={(e) => setSupervisorId(e.target.value)}
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border text-gray-700"
                        >
                            <option value="">Selecione um Supervisor</option>
                            {supervisors.map(u => (
                                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                            <Users className="h-3 w-3 text-blue-600" /> Líder (Apoio) - Opcional
                        </label>
                        <select
                            value={leaderId}
                            onChange={(e) => setLeaderId(e.target.value)}
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border text-gray-700"
                        >
                            <option value="">Nenhum</option>
                            {leaders.map(u => (
                                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">O líder não pode ser o mesmo que o supervisor.</p>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading ? 'Salvando...' : (teamToEdit ? 'Atualizar' : 'Criar Equipe')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
