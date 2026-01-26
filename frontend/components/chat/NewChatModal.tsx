'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { User, Search, X } from 'lucide-react';

interface NewChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUserSelect: (userId: string) => void;
}

export default function NewChatModal({ isOpen, onClose, onUserSelect }: NewChatModalProps) {
    const [users, setUsers] = useState<any[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            api.get('/users')
                .then(res => {
                    // Filter mainly for Operators if logic is loose, but backend should handle scope.
                    // Just to be safe, filter for OPERATOR role if mixed list.
                    const operators = res.data.filter((u: any) => u.role === 'OPERATOR');
                    setUsers(operators);
                    setFilteredUsers(operators);
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Failed to fetch users", err);
                    setLoading(false);
                });
        }
    }, [isOpen]);

    useEffect(() => {
        const lower = searchTerm.toLowerCase();
        setFilteredUsers(users.filter(u =>
            u.name?.toLowerCase().includes(lower) ||
            u.surname?.toLowerCase().includes(lower) ||
            u.email?.toLowerCase().includes(lower)
        ));
    }, [searchTerm, users]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="text-lg font-semibold text-gray-800">Nova Conversa</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-500">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 border-b">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <input
                            type="text"
                            placeholder="Buscar operador..."
                            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {loading ? (
                        <div className="p-4 text-center text-gray-500">Carregando...</div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">Nenhum operador encontrado.</div>
                    ) : (
                        filteredUsers.map(user => (
                            <button
                                key={user.id}
                                onClick={() => onUserSelect(user.id)}
                                className="w-full flex items-center gap-3 p-3 hover:bg-indigo-50 rounded-lg text-left transition"
                            >
                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                    <User size={20} />
                                </div>
                                <div>
                                    <div className="font-medium text-gray-900">{user.name} {user.surname}</div>
                                    <div className="text-xs text-gray-500">{user.email}</div>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
