
'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { User, MessageCircle, Plus } from 'lucide-react';
import NewChatModal from './NewChatModal';


interface Conversation {
    id: string;
    operator: {
        id: string;
        name: string;
        surname: string;
    };
    messages: { id: string }[]; // Count check
    last_message_at: string;
}

interface ChatListProps {
    onSelectConversation: (id: string, name: string) => void;
}

export default function ChatList({ onSelectConversation }: ChatListProps) {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);


    const fetchConversations = () => {
        setLoading(true);
        api.get('/chat/conversations')
            .then(res => {
                setConversations(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchConversations();
        // Poll every 30s to update unread badge if socket not enough for list updates
        const interval = setInterval(fetchConversations, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className="p-4 text-center text-zinc-500">Carregando conversas...</div>;



    return (
        <div className="flex flex-col gap-2 p-2 relative h-full">
            <button
                onClick={() => setIsModalOpen(true)}
                className="mb-2 w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center gap-2 font-medium transition shadow-sm"
            >
                <Plus size={18} />
                Nova Conversa
            </button>
            <NewChatModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onUserSelect={(userId) => {
                    setIsModalOpen(false);
                    api.post('/chat/conversations', { targetUserId: userId })
                        .then(res => {
                            // Optimistically add or fetch
                            fetchConversations();
                            onSelectConversation(res.data.id,
                                `${res.data.operator?.name || 'Novo'} ${res.data.operator?.surname || 'Chat'}`
                            );
                        })
                        .catch(err => {
                            alert('Erro ao iniciar conversa');
                            console.error(err);
                        });
                }}
            />
            {conversations.length === 0 && <div className="p-4 text-center text-zinc-500">Nenhuma conversa encontrada.</div>}
            {conversations.map(conv => {
                const unreadCount = conv.messages?.length || 0;
                return (
                    <button
                        key={conv.id}
                        onClick={() => onSelectConversation(conv.id, `${conv.operator.name} ${conv.operator.surname || ''}`)}
                        className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-800 rounded-lg hover:shadow-md transition border border-zinc-200 dark:border-zinc-700 text-left"
                    >
                        <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-500">
                            <User size={20} />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-medium text-zinc-900 dark:text-zinc-100">
                                {conv.operator.name} {conv.operator.surname}
                            </h4>
                            <span className="text-xs text-zinc-500">
                                {new Date(conv.last_message_at).toLocaleDateString()} {new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                        {unreadCount > 0 && (
                            <div className="flex items-center justify-center w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full">
                                {unreadCount}
                            </div>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
