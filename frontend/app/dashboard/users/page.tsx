'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Loader2, Plus, Users } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import UserModal from '@/components/users/UserModal';
import UserListTable from '@/components/users/UserListTable';

interface User {
    id: string;
    name: string;
    surname?: string;
    email: string;
    role: string;
    is_active: boolean;
    supervisor: { name: string } | null;
    created_at: string;
}

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState<User | undefined>(undefined);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await api.get('/users');
            setUsers(response.data);
        } catch (error) {
            console.error('Erro ao buscar usuários', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCreateClick = () => {
        setUserToEdit(undefined);
        setIsModalOpen(true);
    };

    const handleEditClick = (user: User) => {
        setUserToEdit(user);
        setIsModalOpen(true);
    };

    const handleDelete = async (userId: string) => {
        if (!confirm('Tem certeza que deseja excluir este usuário?')) return;
        try {
            await api.delete(`/users/${userId}`);
            // Optimistic update
            setUsers(users.filter(u => u.id !== userId));
            // Trigger refetch to be sure or just stick with optimistic
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.message || 'Erro ao excluir usuário');
        }
    };

    const handleModalSuccess = () => {
        fetchUsers();
    };

    if (loading && users.length === 0) return <div className="p-12 text-center text-gray-500">Carregando usuários...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-end">
                <button
                    onClick={handleCreateClick}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-semibold shadow-sm transition-colors"
                >
                    <Plus className="h-4 w-4" /> Novo Usuário
                </button>
            </div>

            {users.length === 0 && !loading ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200 border-dashed">
                    <div className="bg-gray-50 h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                        <Users className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">Nenhum usuário encontrado</h3>
                    <p className="text-gray-500 mt-1 mb-4">Comece criando o primeiro usuário.</p>
                </div>
            ) : (
                <UserListTable
                    users={users}
                    loading={loading}
                    onEdit={handleEditClick}
                    onDelete={handleDelete}
                    onRefresh={fetchUsers}
                />
            )}

            <UserModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleModalSuccess}
                userToEdit={userToEdit}
            />
        </div>
    );
}
