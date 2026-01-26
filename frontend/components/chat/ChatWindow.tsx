
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useChat } from './ChatContext';
import api from '@/lib/api';
import { X, Send, Paperclip } from 'lucide-react'; // Assuming lucide-react is installed

interface Message {
    id: string;
    conversation_id: string;
    body: string;
    sender_id: string;
    created_at: string;
    is_read: boolean;
}

interface ChatWindowProps {
    conversationId: string;
    currentUser: { id: string; role: string };
    otherUserName: string;
    onClose?: () => void; // Optional if handled externally
    isFullPage?: boolean;
    embedded?: boolean; // New prop for Widget mode
}


export default function ChatWindow({ conversationId, currentUser, otherUserName, onClose, isFullPage = false, embedded = false }: ChatWindowProps) {


    const { socket, joinConversation, leaveConversation } = useChat();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initial Fetch & Room Join
    useEffect(() => {
        if (conversationId) {
            setLoading(true);
            joinConversation(conversationId);

            // Mark as read
            api.post(`/chat/conversations/${conversationId}/read`);

            // Load initial messages
            api.get(`/chat/conversations/${conversationId}/messages`)
                .then(res => {
                    setMessages(res.data);
                    setLoading(false);
                    scrollToBottom();
                })
                .catch(err => {
                    console.error("Failed to load messages", err);
                    setLoading(false);
                });

            return () => {
                leaveConversation(conversationId);
            };
        }
    }, [conversationId]);

    // Listen for new messages
    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = (msg: Message) => {
            if (msg.conversation_id === conversationId) { // Check just in case
                setMessages(prev => [...prev, msg]);
                scrollToBottom();

                // If I am receiving, assume read if window is open (simple logic)
                if (msg.sender_id !== currentUser.id) {
                    api.post(`/chat/conversations/${conversationId}/read`);
                }
            }
        };

        socket.on('message:new', handleNewMessage);

        return () => {
            socket.off('message:new', handleNewMessage);
        };
    }, [socket, conversationId, currentUser.id]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newMessage.trim()) return;

        const tempId = Date.now().toString(); // Optimistic update ID
        const msgToSend = {
            conversationId,
            body: newMessage,
            clientMessageId: tempId
        };

        // UI Optimistic update (optional, but requested send fast)
        // For simplicity, wait for ack or server echo via socket if latency is low.
        // Actually best to emit and append.

        socket?.emit('sendMessage', msgToSend, (response: any) => {
            // Ack callback if needed
        });

        // Clear input
        setNewMessage('');
    };

    const containerClasses = isFullPage
        ? "w-full h-full bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 flex flex-col text-zinc-800 dark:text-zinc-100"
        : embedded
            ? "flex-1 flex flex-col bg-white overflow-hidden text-zinc-800 dark:text-zinc-100 h-full" // Embedded: fill parent, no borders
            : "fixed bottom-4 right-4 w-96 h-[500px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl flex flex-col z-50 transition-all duration-300 ease-in-out";

    return (
        <div className={containerClasses}>


            {/* Header - Conditional render */}
            {!embedded && !isFullPage && (
                <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-800 rounded-t-lg">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-100">{otherUserName}</span>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition">
                        <X size={18} className="text-zinc-500" />
                    </button>
                </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white dark:bg-zinc-900">
                {loading ? (
                    <div className="flex justify-center mt-10"><span className="loader">Loading...</span></div>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.sender_id === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${msg.sender_id === currentUser.id
                                ? 'bg-blue-600 text-white rounded-br-none'
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-none'
                                }`}>
                                <p>{msg.body}</p>
                                <span className="text-[10px] opacity-70 block text-right mt-1">
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-3 border-t border-zinc-200 dark:border-zinc-800 flex gap-2 items-center bg-white dark:bg-zinc-900 rounded-b-lg">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    className="flex-1 bg-zinc-100 dark:bg-zinc-800 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button type="submit" disabled={!newMessage.trim()} className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
                    <Send size={18} />
                </button>
            </form>
        </div>
    );
}
