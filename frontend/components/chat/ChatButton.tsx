
'use client';

import React, { useState } from 'react';
import { MessageCircle, X, ChevronLeft } from 'lucide-react';
import ChatWindow from './ChatWindow';
import ChatList from './ChatList';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface ChatButtonProps {
    currentUser: { id: string; role: string };
    supervisorId?: string;
    className?: string;
}

export default function ChatButton({ currentUser, className }: ChatButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeChat, setActiveChat] = useState<{ id: string; name: string; userId?: string } | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);

    // Simple poll for total unread badge on the button
    React.useEffect(() => {
        const fetchUnread = async () => {
            try {
                const res = await api.get('/chat/conversations');
                let count = 0;
                if (Array.isArray(res.data)) {
                    res.data.forEach((c: any) => {
                        const msgs = c.messages?.filter((m: any) => !m.is_read && m.sender_id !== currentUser.id);
                        count += msgs ? msgs.length : 0;
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
    }, [currentUser.id]);

    const handleSelectChat = (id: string, name: string, userId?: string) => {
        setActiveChat({ id, name, userId });
    };

    const handleBack = () => {
        setActiveChat(null);
    };

    return (
        <>
            {/* Floating Trigger Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className={className || "fixed bottom-6 right-6 bg-primary hover:bg-primary/90 text-primary-foreground p-3 rounded-full shadow-lg transition-transform hover:scale-105 z-50 flex items-center justify-center w-14 h-14"}
                    title="Chat"
                >
                    <MessageCircle size={24} />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-bold shadow-sm border-2 border-background">
                            {unreadCount}
                        </span>
                    )}
                </button>
            )}

            {/* Main Widget Container */}
            {isOpen && (
                <div className="fixed bottom-0 right-6 w-96 h-[500px] max-h-[85vh] bg-background border-x border-t border-border rounded-t-xl rounded-b-none shadow-2xl flex flex-col z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-10 duration-300">

                    {/* Header (Always Visible or Dynamic?) 
                        If ChatList has its own header, we might just want a Close button wrapper.
                        Using a simple top bar for Close/Back.
                    */}
                    <div className="flex items-center justify-between p-3 border-b bg-[#172030] text-white shrink-0">
                        <div className="flex items-center gap-2">
                            {activeChat ? (
                                <button onClick={handleBack} className="hover:bg-white/20 p-1 rounded transition-colors">
                                    <ChevronLeft size={20} />
                                </button>
                            ) : (
                                <MessageCircle size={20} />
                            )}
                            <span className="font-semibold text-sm truncate">
                                {activeChat ? activeChat.name : 'Mensagens'}
                            </span>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-hidden flex flex-col bg-card">
                        {activeChat ? (
                            <ChatWindow
                                conversationId={activeChat.id}
                                currentUser={currentUser}
                                otherUserName={activeChat.name}
                                onClose={handleBack}
                                isFullPage={false}
                                embedded={true}
                                otherUserId={activeChat.userId}
                            />
                        ) : (
                            <div className="flex-1 w-full overflow-hidden">
                                {/* Pass modified classname to ChatList to fit in widget if needed, 
                                    but ChatList expects to fill parent. 
                                    Note: ChatList has a width class `w-80 md:w-96`, we should override or wrap it.
                                    Wrapper `w-full` helps.
                                */}
                                <div className="w-full h-full [&>div]:w-full [&>div]:border-none">
                                    <ChatList
                                        onSelectChat={handleSelectChat}
                                        userRole={currentUser.role}
                                        currentUserId={currentUser.id}
                                        hideHeader={true}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
