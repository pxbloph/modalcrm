'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { User, MessageCircle, Plus, Megaphone } from 'lucide-react';
import NewChatModal from './NewChatModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AnnouncementsTab from './AnnouncementsTab';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Conversation {
    id: string;
    operator: {
        id: string;
        name: string;
        surname: string;
    };
    supervisor: {
        id: string;
        name: string;
        surname: string;
    };
    last_message_at: string;
    unreadCount?: number;
}

interface ChatListProps {
    onSelectChat: (id: string, name: string, userId?: string) => void;
    userRole: string; // 'ADMIN' | 'SUPERVISOR' | 'OPERATOR'
    currentUserId: string;
    hideHeader?: boolean;
}

export default function ChatList({ onSelectChat, userRole, currentUserId, hideHeader }: ChatListProps) {
    const [partners, setPartners] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('chats');

    const fetchConversations = async () => {
        try {
            // New Unified Endpoint
            const res = await api.get('/chat/partners');
            setPartners(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        fetchConversations();
        const interval = setInterval(fetchConversations, 5000); // Polling unread
        return () => clearInterval(interval);
    }, []);

    const handleSelect = (conversationId: string | null, userId: string, userName: string) => {
        if (conversationId) {
            onSelectChat(conversationId, userName, userId);
        } else {
            // Initiate New Conversation Logic or Modal
            setIsModalOpen(true);
        }
    };

    const handleChatCreated = (newConversationId: string) => {
        setIsModalOpen(false);
        fetchConversations();
        // We need to fetch the conversation details to get the name, or pass it back
        // For simplicity, let's just refresh list
    };

    return (
        <div className="flex flex-col h-full bg-card border-r border-border w-80 md:w-96">
            {!hideHeader && (
                <div className="p-4 border-b border-border flex items-center justify-between bg-card shrink-0">
                    <h2 className="font-semibold text-foreground text-lg">Mensagens</h2>
                </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                <div className="px-4 pt-2 shrink-0 bg-card">
                    <TabsList className="w-full grid grid-cols-2 bg-muted p-1 rounded-lg">
                        <TabsTrigger
                            value="chats"
                            className="text-xs font-medium data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
                        >
                            Conversas
                        </TabsTrigger>
                        <TabsTrigger
                            value="announcements"
                            className="text-xs font-medium data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all text-muted-foreground"
                        >
                            Comunicados
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="chats" className="flex-1 flex flex-col min-h-0 pt-2 m-0 data-[state=inactive]:hidden">
                    <div className="flex-1 overflow-y-auto px-2">
                        {partners.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground text-sm">
                                <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                Nenhuma conversa encontrada.
                            </div>
                        ) : (
                            partners
                                .filter(item => item.conversationId) // Only show active conversations
                                .map((item) => {
                                    const isUnread = item.unreadCount > 0;
                                    const userName = `${item.user.name} ${item.user.surname || ''}`;
                                    return (
                                        <div
                                            key={item.user.id}
                                            onClick={() => handleSelect(item.conversationId, item.user.id, userName)}
                                            className={cn(
                                                "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all mb-1 border border-transparent",
                                                "hover:bg-accent",
                                                isUnread ? "bg-primary/10 border-primary/20" : "bg-card"
                                            )}
                                        >
                                            <div className="relative shrink-0">
                                                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold border border-border">
                                                    {item.user.name.charAt(0)}
                                                </div>
                                                {isUnread && (
                                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-[12px] flex items-center justify-center rounded-full border-2 border-card font-bold shadow-sm">
                                                        {item.unreadCount}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-baseline mb-0.5">
                                                    <h3 className={cn("text-sm truncate pr-2", isUnread ? "font-bold text-foreground" : "font-medium text-foreground")}>
                                                        {userName}
                                                    </h3>
                                                    {item.lastMessageAt && (
                                                        <span className="text-[12px] text-muted-foreground shrink-0 tabular-nums">
                                                            {format(new Date(item.lastMessageAt), 'HH:mm')}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                                    <span className={cn("px-1.5 py-0.5 rounded text-[12px] font-medium border uppercase tracking-wider",
                                                        item.user.role === 'ADMIN' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' :
                                                            item.user.role === 'SUPERVISOR' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' :
                                                                'bg-muted text-muted-foreground border-border'
                                                    )}>
                                                        {item.user.role === 'OPERATOR' ? 'OP' : item.user.role.substring(0, 3)}
                                                    </span>
                                                    {item.unreadCount > 0 ? 'Novas mensagens' : 'Conversa ativa'}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                        )}
                    </div>

                    {userRole !== 'OPERATOR' && (
                        <div className="p-4 border-t border-border bg-card shrink-0">
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="w-full bg-primary text-primary-foreground p-3 rounded-lg flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm"
                            >
                                <Plus size={18} />
                                Nova Conversa
                            </button>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="announcements" className="flex-1 min-h-0 m-0 overflow-hidden data-[state=inactive]:hidden">
                    <AnnouncementsTab userRole={userRole} userId={currentUserId} />
                </TabsContent>
            </Tabs>

            {isModalOpen && (
                <NewChatModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onChatCreated={handleChatCreated}
                    userRole={userRole}
                />
            )}
        </div>
    );
}
