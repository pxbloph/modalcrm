import { X, Users, UserPlus, Shield, TrendingUp, DollarSign, FileText, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import AddMemberModal from './AddMemberModal';

interface TeamDetailProps {
    teamId: string;
    onClose: () => void;
}

export default function TeamDetail({ teamId, onClose }: TeamDetailProps) {
    const [team, setTeam] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

    const fetchTeam = async () => {
        try {
            const response = await api.get(`/teams/${teamId}`);
            setTeam(response.data);
        } catch (error) {
            console.error("Failed to fetch team details", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTeam();
    }, [teamId]);

    const handleAddMember = async (userIds: string[]) => {
        // Batch add
        await Promise.all(userIds.map(id => api.post(`/teams/${teamId}/members`, { userId: id })));
        await fetchTeam(); // Refresh list and metrics once
    };

    const handleRemoveMember = async (userId: string, memberRole: string) => {
        // Validação: Impedir remover o último ADMIN do grupo?
        // O backend não valida isso explicitamente no endpoint de membro, mas podemos checar no front.
        // Se este for o único admin DA EQUIPE? Ou do sistema?
        // Assumindo "último ADMIN da equipe"
        if (memberRole === 'ADMIN') {
            const adminCount = team.members.filter((m: any) => m.role === 'ADMIN').length;
            if (adminCount <= 1) {
                alert("Não é possível remover o último administrador da equipe.");
                return;
            }
        }

        if (!confirm("Tem certeza que deseja remover este membro da equipe?")) return;

        try {
            await api.delete(`/teams/${teamId}/members/${userId}`);
            await fetchTeam(); // Refresh list and counters
        } catch (error) {
            console.error("Erro ao remover membro", error);
            alert("Erro ao remover membro.");
        }
    };

    if (loading) return (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
    );

    if (!team) return null;

    const metrics = team.metrics || { leads: 0, conversao: 0, contas: 0, pendentes: 0 };
    const memberIds = team.members?.map((m: any) => m.id) || [];

    return (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 flex justify-end transition-opacity">
            <div className="w-full max-w-4xl bg-white h-full shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300 dark:bg-zinc-900">

                {/* Header */}
                <div className="sticky top-0 bg-white z-10 border-b border-gray-200 px-8 py-6 flex items-center justify-between dark:bg-zinc-900 dark:border-zinc-800">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{team.name}</h2>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                                <Shield className="h-4 w-4 text-purple-600" /> Supervisor: {team.supervisor?.name || 'N/A'}
                            </span>
                            {team.leader && (
                                <span className="flex items-center gap-1">
                                    <Shield className="h-4 w-4 text-blue-600" /> Líder: {team.leader.name}
                                </span>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors dark:hover:bg-zinc-800">
                        <X className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                <div className="p-8 space-y-8">

                    {/* Metrics Dashboard */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-900/30">
                            <div className="flex items-center gap-2 text-indigo-900 font-semibold mb-2 dark:text-indigo-300">
                                <Users className="h-5 w-5" /> Leads
                            </div>
                            <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">{metrics.leads}</p>
                        </div>
                        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-900/30">
                            <div className="flex items-center gap-2 text-emerald-900 font-semibold mb-2 dark:text-emerald-300">
                                <DollarSign className="h-5 w-5" /> Conversão
                            </div>
                            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{metrics.conversao}%</p>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 dark:bg-blue-900/20 dark:border-blue-900/30">
                            <div className="flex items-center gap-2 text-blue-900 font-semibold mb-2 dark:text-blue-300">
                                <TrendingUp className="h-5 w-5" /> Contas
                            </div>
                            <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{metrics.contas}</p>
                        </div>
                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 dark:bg-amber-900/20 dark:border-amber-900/30">
                            <div className="flex items-center gap-2 text-amber-900 font-semibold mb-2 dark:text-amber-300">
                                <FileText className="h-5 w-5" /> Pendentes
                            </div>
                            <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{metrics.pendentes}</p>
                        </div>
                    </div>

                    {/* Members List */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Membros da Equipe</h3>
                            <button
                                onClick={() => setIsAddMemberOpen(true)}
                                className="flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
                            >
                                <UserPlus className="h-4 w-4" /> Adicionar Membro
                            </button>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden dark:bg-zinc-900 dark:border-zinc-800">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800">
                                <thead className="bg-gray-50 dark:bg-zinc-800">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Nome</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Email</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Função</th>
                                        <th className="relative px-6 py-3"><span className="sr-only">Ações</span></th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200 dark:bg-zinc-900 dark:divide-zinc-800">
                                    {team.members?.map((member: any) => (
                                        <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{member.name} {member.surname}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{member.email}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                <span className={cn(
                                                    "px-2 py-1 text-xs font-semibold rounded-full",
                                                    member.role === 'SUPERVISOR' ? "bg-purple-100 text-purple-800" :
                                                        member.role === 'LEADER' ? "bg-blue-100 text-blue-800" :
                                                            member.role === 'ADMIN' ? "bg-red-100 text-red-800" :
                                                                "bg-gray-100 text-gray-800"
                                                )}>
                                                    {member.role === 'OPERATOR' ? 'Operador' : member.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => handleRemoveMember(member.id, member.role)}
                                                    className="text-red-600 hover:text-red-900 flex items-center gap-1 ml-auto dark:text-red-400 dark:hover:text-red-300"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    Remover
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {(!team.members || team.members.length === 0) && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                                                Nenhum membro nesta equipe ainda.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>

                <AddMemberModal
                    isOpen={isAddMemberOpen}
                    onClose={() => setIsAddMemberOpen(false)}
                    onAdd={handleAddMember}
                    currentMembers={memberIds}
                />
            </div>
        </div>
    );
}
