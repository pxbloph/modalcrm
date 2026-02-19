'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { User, Search, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface NewChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    onChatCreated: (conversationId: string) => void;
    userRole?: string;
}

export default function NewChatModal({ isOpen, onClose, onChatCreated, userRole }: NewChatModalProps) {
    const [users, setUsers] = useState<any[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            api.get('/users')
                .then(res => {
                    let eligibleUsers = res.data;

                    // Filter based on role
                    if (userRole === 'OPERATOR') {
                        // Operators see Supervisor/Admin
                        eligibleUsers = res.data.filter((u: any) => u.role === 'SUPERVISOR' || u.role === 'ADMIN');
                    } else if (userRole === 'SUPERVISOR') {
                        // Supervisors see Operators + Admin
                        eligibleUsers = res.data.filter((u: any) => u.role === 'OPERATOR' || u.role === 'ADMIN');
                    } else if (userRole === 'ADMIN') {
                        // Admins see Everyone (except maybe other admins if not needed, but typically yes)
                        // User specifically wanted Admin -> Supervisor
                        eligibleUsers = res.data.filter((u: any) => u.role === 'OPERATOR' || u.role === 'SUPERVISOR');
                    } else {
                        // Default fallback: Operators only? Or everyone?
                        // Let's safe default to Operators
                        eligibleUsers = res.data.filter((u: any) => u.role === 'OPERATOR');
                    }

                    setUsers(eligibleUsers);
                    setFilteredUsers(eligibleUsers);
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Failed to fetch users", err);
                    setLoading(false);
                });
        }
    }, [isOpen, userRole]);

    useEffect(() => {
        const lower = searchTerm.toLowerCase();
        setFilteredUsers(users.filter(u =>
            u.name?.toLowerCase().includes(lower) ||
            u.surname?.toLowerCase().includes(lower) ||
            u.email?.toLowerCase().includes(lower)
        ));
    }, [searchTerm, users]);

    const handleUserSelect = async (userId: string) => {
        if (creating) return;
        setCreating(userId);

        try {
            const res = await api.post('/chat/conversations', { targetUserId: userId });
            onChatCreated(res.data.id);
            onClose();
        } catch (error) {
            console.error(error);
            toast.error("Erro ao iniciar conversa");
        } finally {
            setCreating(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <div className="bg-card rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-200 border border-border">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h3 className="text-lg font-semibold text-foreground">Nova Conversa</h3>
                    <button onClick={onClose} className="p-1 hover:bg-accent rounded-full text-muted-foreground hover:text-foreground transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 border-b border-border">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <input
                            type="text"
                            placeholder="Buscar usuário..."
                            className="w-full pl-9 pr-4 py-2 border border-input bg-input/20 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-foreground placeholder:text-muted-foreground"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {loading ? (
                        <div className="p-4 text-center text-muted-foreground">Carregando...</div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">Nenhum usuário encontrado.</div>
                    ) : (
                        filteredUsers.map(user => (
                            <button
                                key={user.id}
                                onClick={() => handleUserSelect(user.id)}
                                disabled={!!creating}
                                className="w-full flex items-center gap-3 p-3 hover:bg-accent rounded-lg text-left transition disabled:opacity-50 group hover:border-primary/10 border border-transparent"
                            >
                                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary shrink-0 transition-colors">
                                    {creating === user.id ? <Loader2 className="animate-spin text-primary" size={20} /> : <User size={20} />}
                                </div>
                                <div className="min-w-0">
                                    <div className="font-medium text-foreground truncate flex items-center gap-2">
                                        {user.name} {user.surname}
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border uppercase tracking-wider font-bold">
                                            {user.role}
                                        </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
