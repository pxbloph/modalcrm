'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import TeamCard from '@/components/teams/TeamCard';
import TeamDetail from '@/components/teams/TeamDetail';
import TeamModal from '@/components/teams/TeamModal';
import { Plus, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

export default function TeamsPage() {
    const [teams, setTeams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [teamToEdit, setTeamToEdit] = useState<any>(null); // For edit mode

    const searchParams = useSearchParams();
    const router = useRouter();

    const fetchTeams = async () => {
        try {
            setLoading(true);
            const response = await api.get('/teams');
            setTeams(response.data);
        } catch (error) {
            console.error("Failed to fetch teams", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTeams();
    }, []);

    // Sync state with URL query
    useEffect(() => {
        const teamId = searchParams.get('teamId');
        if (teamId) {
            setSelectedTeamId(teamId);
        } else {
            setSelectedTeamId(null);
        }
    }, [searchParams]);

    const handleTeamClick = (teamId: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('teamId', teamId);
        router.push(`/dashboard/teams?${params.toString()}`);
    };

    const handleCloseDetail = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('teamId');
        router.push(`/dashboard/teams?${params.toString()}`);
    };

    const handleCreateClick = () => {
        setTeamToEdit(null);
        setIsModalOpen(true);
    };

    const handleEditClick = (e: React.MouseEvent, team: any) => {
        e.stopPropagation(); // Prevent opening detail
        setTeamToEdit(team);
        setIsModalOpen(true);
    };

    const handleDeleteClick = async (e: React.MouseEvent, teamId: string) => {
        e.stopPropagation();
        if (!confirm('Tem certeza? Isso pode desvincular membros da equipe.')) return;

        try {
            await api.delete(`/teams/${teamId}`);
            fetchTeams(); // Refresh list
        } catch (error) {
            console.error("Erro ao excluir", error);
            alert("Erro ao excluir equipe.");
        }
    };

    const handleModalSuccess = () => {
        fetchTeams();
    };

    if (loading && teams.length === 0) return <div className="p-8 text-center">Carregando equipes...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-end">
                <button
                    onClick={handleCreateClick}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-semibold shadow-sm transition-colors"
                >
                    <Plus className="h-4 w-4" /> Nova Equipe
                </button>
            </div>

            {teams.length === 0 && !loading ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200 border-dashed dark:bg-zinc-900 dark:border-zinc-800">
                    <div className="bg-gray-50 h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400 dark:bg-zinc-800 dark:text-gray-500">
                        <Users className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Nenhuma equipe encontrada</h3>
                    <p className="text-gray-500 mt-1 mb-4 dark:text-gray-400">Comece criando sua primeira equipe.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {teams.map((team) => (
                        <div key={team.id} className="relative group">
                            <TeamCard
                                team={team}
                                onClick={() => handleTeamClick(team.id)}
                            />
                            {/* Action Buttons */}
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <button
                                    onClick={(e) => handleEditClick(e, team)}
                                    className="p-1.5 bg-white shadow rounded-md text-indigo-600 hover:bg-gray-50 border border-gray-100 dark:bg-zinc-800 dark:border-zinc-700 dark:text-indigo-400 dark:hover:bg-zinc-700"
                                    title="Editar"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                </button>
                                <button
                                    onClick={(e) => handleDeleteClick(e, team.id)}
                                    className="p-1.5 bg-white shadow rounded-md text-red-600 hover:bg-gray-50 border border-gray-100 dark:bg-zinc-800 dark:border-zinc-700 dark:text-red-400 dark:hover:bg-zinc-700"
                                    title="Excluir"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* SPA Overlay for Team Detail */}
            {selectedTeamId && (
                <TeamDetail
                    teamId={selectedTeamId}
                    onClose={handleCloseDetail}
                />
            )}

            {/* Create/Edit Modal */}
            <TeamModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleModalSuccess}
                teamToEdit={teamToEdit}
            />
        </div>
    );
}
