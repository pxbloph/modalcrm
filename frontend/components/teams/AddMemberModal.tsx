import { useState, useEffect } from 'react';
import { X, Search, UserPlus } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    team_id?: string;
}

interface AddMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (userIds: string[]) => Promise<void>;
    currentMembers: string[];
}

export default function AddMemberModal({ isOpen, onClose, onAdd, currentMembers }: AddMemberModalProps) {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchUsers();
            setSearchTerm('');
            setSelectedUserIds([]);
        }
    }, [isOpen]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/users');
            setUsers(res.data);
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter(user =>
        (user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
        !currentMembers.includes(user.id)
    );

    const toggleUser = (userId: string) => {
        setSelectedUserIds(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleSubmit = async () => {
        if (selectedUserIds.length === 0) return;
        setSubmitting(true);
        try {
            await onAdd(selectedUserIds);
            onClose();
        } catch (error) {
            console.error("Error adding members", error);
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <h3 className="text-lg font-bold text-gray-900">Adicionar Membros</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar usuário..."
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-700"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* User List */}
                    <div className="max-h-60 overflow-y-auto border border-gray-100 rounded-lg">
                        {loading ? (
                            <div className="p-4 text-center text-gray-500 text-sm">Carregando usuários...</div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 text-sm">Nenhum usuário disponível.</div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {filteredUsers.map(user => {
                                    const isSelected = selectedUserIds.includes(user.id);
                                    return (
                                        <button
                                            key={user.id}
                                            onClick={() => toggleUser(user.id)}
                                            className={cn(
                                                "w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left",
                                                isSelected && "bg-indigo-50/50"
                                            )}
                                        >
                                            <div className={cn(
                                                "h-5 w-5 rounded border flex items-center justify-center transition-colors",
                                                isSelected ? "bg-indigo-600 border-indigo-600" : "border-gray-300"
                                            )}>
                                                {isSelected && <div className="h-2 w-2 bg-white rounded-sm" />}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-gray-900 text-sm">{user.name}</p>
                                                <p className="text-xs text-gray-500">{user.email}</p>
                                            </div>
                                            <div className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-600 lowercase">
                                                {user.role}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between items-center pt-2">
                        <span className="text-sm text-gray-500">
                            {selectedUserIds.length} selecionado(s)
                        </span>
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={selectedUserIds.length === 0 || submitting}
                                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                {submitting ? (
                                    <>
                                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Adicionando...
                                    </>
                                ) : (
                                    <>
                                        <UserPlus className="h-4 w-4" />
                                        Confirmar
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
