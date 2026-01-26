
'use client';

import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import ChatWindow from './ChatWindow';
import api from '@/lib/api';

interface ChatButtonProps {
    currentUser: { id: string; role: string };
    supervisorId?: string; // Optional now
    className?: string;
}


export default function ChatButton({ currentUser, supervisorId, className }: ChatButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);

    // Poll for unread messages (simple approach)
    React.useEffect(() => {
        const fetchUnread = async () => {
            try {
                const res = await api.get('/chat/conversations');
                let count = 0;
                if (Array.isArray(res.data)) {
                    res.data.forEach((c: any) => {
                        // Backend returns 'messages' as unread count list logic in finding
                        count += c.messages?.length || 0;
                    });
                }
                setUnreadCount(count);
            } catch (err) {
                console.error(err);
            }
        };

        fetchUnread();
        const interval = setInterval(fetchUnread, 15000);
        return () => clearInterval(interval);
    }, []);

    const handleOpen = async () => {
        try {
            // 1. Try to find existing conversation from list (since Operator usually has only one active or relevant one)
            const resList = await api.get('/chat/conversations');
            if (resList.data && Array.isArray(resList.data) && resList.data.length > 0) {
                // Pick the first one (most recent)
                const conv = resList.data[0];
                setConversationId(conv.id);
                setIsOpen(true);
                return;
            }
        } catch (err) {
            console.error("Error fetching conversations", err);
        }

        // 2. If no existing conversation, try to create new one if supervisor is linked
        if (!supervisorId) {
            alert("Você não possui um supervisor vinculado para iniciar o chat.");
            return;
        }

        // Find or Create conversation
        try {
            const res = await api.post('/chat/conversations', { targetUserId: supervisorId });
            setConversationId(res.data.id);
            setIsOpen(true);
        } catch (err) {
            console.error("Failed to start chat", err);
            alert("Erro ao iniciar chat com supervisor.");
        }
    };

    return (
        <>
            {!isOpen && (
                <button
                    onClick={handleOpen}
                    className={className || "fixed bottom-4 left-4 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-105 z-40 flex items-center gap-2"}
                    title="Falar com Supervisor"
                >
                    <MessageCircle size={24} />
                    {/* Badge */}
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                            {unreadCount}
                        </span>
                    )}
                </button>
            )}

            {isOpen && conversationId && (
                <ChatWindow
                    conversationId={conversationId}
                    currentUser={currentUser}
                    otherUserName="Supervisor"
                    onClose={() => setIsOpen(false)}
                />
            )}
        </>
    );
}
