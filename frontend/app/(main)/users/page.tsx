'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Plus, Users } from 'lucide-react';
import UserModal from '@/components/users/UserModal';
import UserListTable from '@/components/users/UserListTable';

interface User {
    id: string;
    name: string;
    surname?: string;
    email: string;
    role: string;
    team?: string | null;
    is_active: boolean;
    supervisor: { name: string } | null;
    created_at: string;
    security_role_id?: string | null;
    security_role?: { id: string; name: string } | null;
}

interface CustomRole {
    id: string;
    name: string;
    base_role?: string | null;
}

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState<User | undefined>(undefined);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const [usersRes, rolesRes] = await Promise.all([
                api.get('/users'),
                api.get('/security/roles'),
            ]);

            setUsers(usersRes.data || []);
            setCustomRoles(rolesRes.data?.custom_roles || []);
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
            setUsers(users.filter(u => u.id !== userId));
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
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200 border-dashed dark:bg-zinc-900 dark:border-zinc-800">
                    <div className="bg-gray-50 h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400 dark:bg-zinc-800 dark:text-gray-500">
                        <Users className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Nenhum usuário encontrado</h3>
                    <p className="text-gray-500 mt-1 mb-4 dark:text-gray-400">Comece criando o primeiro usuário.</p>
                </div>
            ) : (
                <UserListTable
                    users={users}
                    customRoles={customRoles}
                    loading={loading}
                    isAdmin={true}
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
                customRoles={customRoles}
            />
        </div>
    );
}
