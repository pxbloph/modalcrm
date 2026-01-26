'use client';

import React, { useState, useEffect } from 'react';
import { MessageCircle, X, Search, ChevronLeft, User as UserIcon } from 'lucide-react';
import api from '@/lib/api';
import ChatWindow from './ChatWindow';
import { cn } from '@/lib/utils';

// Types
interface ChatWidgetProps {
    currentUser: { id: string; role: string };
    className?: string; // For positioning
}

interface ChatPartner {
    user: { id: string; name: string; surname?: string; role: string };
    conversationId: string | null;
    lastMessageAt: string | null;
    unreadCount: number;
}


export default function ChatWidget({ currentUser, className }: ChatWidgetProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState<'INBOX' | 'CONTACTS' | 'CHAT'>('INBOX');

    // Data
    const [partners, setPartners] = useState<ChatPartner[]>([]);
    const [filteredPartners, setFilteredPartners] = useState<ChatPartner[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Active Chat State
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [activeChatUser, setActiveChatUser] = useState<string>('');

    // Unread Count (Total)
    const [totalUnread, setTotalUnread] = useState(0);

    // Initial Load & Polling
    useEffect(() => {
        if (!isOpen) {
            // Simple poll for badge only when closed
            const interval = setInterval(fetchPartners, 15000);
            fetchPartners();
            return () => clearInterval(interval);
        } else {
            // If open, fetch contacts as well
            fetchPartners();
        }
    }, [isOpen]);

    // Search Filter
    useEffect(() => {
        if (!searchTerm) {
            setFilteredPartners(partners);
        } else {
            const lower = searchTerm.toLowerCase();
            setFilteredPartners(partners.filter(p =>
                p.user.name.toLowerCase().includes(lower) ||
                (p.user.surname && p.user.surname.toLowerCase().includes(lower))
            ));
        }
    }, [searchTerm, partners]);

    const fetchPartners = async () => {
        try {
            const res = await api.get('/chat/partners');
            if (Array.isArray(res.data)) {
                setPartners(res.data);

                // Calculate Unread
                let count = 0;
                res.data.forEach((p: ChatPartner) => {
                    count += p.unreadCount || 0;
                });
                setTotalUnread(count);
            }
        } catch (err) {
            console.error("Error fetching chat partners", err);
        }
    };


    const handleSelectPartner = async (partner: ChatPartner) => {
        if (partner.conversationId) {
            setActiveChatId(partner.conversationId);
            setActiveChatUser(`${partner.user.name} ${partner.user.surname || ''}`);
            setView('CHAT');
        } else {
            // Create new conversation
            try {
                const res = await api.post('/chat/conversations', { targetUserId: partner.user.id });
                setActiveChatId(res.data.id);
                setActiveChatUser(`${partner.user.name} ${partner.user.surname || ''}`);
                fetchPartners(); // Update list in background
                setView('CHAT');
            } catch (err) {
                alert('Erro ao iniciar conversa');
            }
        }
    };

    // Render Logic
    const renderContent = () => {
        if (view === 'CHAT' && activeChatId) {
            return (
                <div className="h-full flex flex-col">
                    <div className="flex items-center p-3 border-b bg-indigo-600 text-white rounded-t-lg">
                        <button onClick={() => setView('INBOX')} className="mr-3 hover:bg-indigo-700 p-1 rounded">
                            <ChevronLeft size={20} />
                        </button>
                        <span className="font-semibold truncate">{activeChatUser}</span>
                        <button onClick={() => setIsOpen(false)} className="ml-auto hover:bg-indigo-700 p-1 rounded">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <ChatWindow
                            conversationId={activeChatId}
                            currentUser={currentUser}
                            otherUserName={activeChatUser}
                            onClose={() => setView('INBOX')} // Overrides internal close to go back
                            isFullPage={false} // Embedded mode
                            embedded={true} // Custom styling for widget embedded
                        />
                    </div>
                </div>
            )
        }

        // INBOX VIEW (Unified)
        return (
            <div className="flex flex-col h-full bg-white rounded-lg shadow-xl overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b bg-indigo-600 text-white">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <MessageCircle size={20} /> Chat
                    </h3>
                    <button onClick={() => setIsOpen(false)} className="hover:bg-indigo-700 p-1 rounded">
                        <X size={20} />
                    </button>
                </div>

                {/* Search / Filter */}
                <div className="p-3 border-b bg-gray-50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <input
                            type="text"
                            placeholder="Buscar supervisor..."
                            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {filteredPartners.length === 0 ? (
                        <div className="text-center text-gray-400 mt-8 text-sm">
                            Nenhum supervisor encontrado.
                        </div>
                    ) : (
                        filteredPartners.map(partner => (
                            <button
                                key={partner.user.id}
                                onClick={() => handleSelectPartner(partner)}
                                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg text-left transition border-b border-gray-100 last:border-0 relative"
                            >
                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 relative">
                                    <UserIcon size={20} />
                                    {/* Online indicator could go here if we had presence */}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline">
                                        <div className="font-medium text-gray-900 truncate">
                                            {partner.user.name} {partner.user.surname}
                                        </div>
                                        {partner.lastMessageAt && (
                                            <div className="text-[10px] text-gray-400">
                                                {new Date(partner.lastMessageAt).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-500 truncate">
                                        {/* Status text or role */}
                                        {partner.conversationId ? 'Conversa aberta' : 'Iniciar conversa'}
                                    </div>
                                </div>
                                {partner.unreadCount > 0 && (
                                    <div className="bg-red-500 text-white text-xs font-bold h-5 w-5 rounded-full flex items-center justify-center shadow-sm">
                                        {partner.unreadCount}
                                    </div>
                                )}
                            </button>
                        ))
                    )}
                </div>
            </div>
        );
    }

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className={className} // Inherit positioning from page
                title="Falar com Supervisor"
            >
                <MessageCircle size={24} />
                {totalUnread > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                        {totalUnread}
                    </span>
                )}
            </button>
        )
    }

    return (
        <div className="fixed bottom-24 right-8 w-96 h-[500px] z-50 flex flex-col shadow-2xl rounded-xl animate-in fade-in slide-in-from-bottom-5 duration-200">
            {renderContent()}
        </div>
    );
}
