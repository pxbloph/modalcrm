'use client';

import { useState, useEffect } from 'react';
import ChatList from '@/components/chat/ChatList';
import ChatWindow from '@/components/chat/ChatWindow';
import { MessageCircle } from 'lucide-react';

export default function ChatPage() {
    const [user, setUser] = useState<any>(null);
    const [activeChat, setActiveChat] = useState<{ id: string, name: string } | null>(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    if (!user) return <div className="p-8">Carregando...</div>;

    const isAdmin = user.role === 'ADMIN';

    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
            <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-800 shrink-0 dark:text-gray-100">
                <MessageCircle className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                {isAdmin ? 'Auditoria de Conversas' : 'Minhas Conversas'}
            </h1>

            <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col md:flex-row dark:bg-zinc-900 dark:border-zinc-800">
                {/* List Area */}
                <div className={`w-full md:w-1/3 border-r border-gray-200 flex flex-col ${activeChat ? 'hidden md:flex' : 'flex'} dark:border-zinc-800`}>
                    <div className="p-4 border-b bg-gray-50 font-medium text-gray-700 dark:bg-zinc-800 dark:border-zinc-700 dark:text-gray-200">
                        Caixa de Entrada
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <ChatList onSelectConversation={(id, name) => setActiveChat({ id, name })} />
                    </div>
                </div>

                {/* Chat Area */}
                <div className={`w-full md:w-2/3 flex flex-col ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
                    {activeChat ? (
                        <ChatWindow
                            conversationId={activeChat.id}
                            currentUser={user}
                            otherUserName={activeChat.name}
                            onClose={() => setActiveChat(null)}
                            isFullPage={true}
                        />
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
                            <MessageCircle className="h-16 w-16 mb-4 opacity-20" />
                            <p>Selecione uma conversa para iniciar</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
