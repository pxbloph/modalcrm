
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

interface ChatContextType {
    socket: Socket | null;
    isConnected: boolean;
    joinConversation: (conversationId: string) => void;
    leaveConversation: (conversationId: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

        // Connect to Backend WebSocket URL (Root path usually, or /socket.io default)
        // Assuming backend runs on port 3500
        const socketInstance = io('http://localhost:3500', {
            auth: {
                token: token ? `Bearer ${token}` : '',
            },
            autoConnect: false, // Wait for token check or manual connect
        });

        if (token) {
            socketInstance.connect();
        }

        socketInstance.on('connect', () => {
            console.log('Chat Connected');
            setIsConnected(true);
        });

        socketInstance.on('disconnect', () => {
            console.log('Chat Disconnected');
            setIsConnected(false);
        });

        setSocket(socketInstance);

        return () => {
            socketInstance.disconnect();
        };
    }, []);

    const joinConversation = (conversationId: string) => {
        socket?.emit('joinConversation', { conversationId });
    };

    const leaveConversation = (conversationId: string) => {
        socket?.emit('leaveConversation', { conversationId });
    };

    return (
        <ChatContext.Provider value={{ socket, isConnected, joinConversation, leaveConversation }}>
            {children}
        </ChatContext.Provider>
    );
}

export const useChat = () => {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
};
