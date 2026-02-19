
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

        // Determine Socket URL:
        // - In Development (localhost): Connect primarily to port 3500 (Backend)
        // - In Production (Server): Use relative path (undefined) to let Nginx proxy handle it via /socket.io/
        const isDevelopment = typeof window !== 'undefined' && window.location.hostname === 'localhost';
        const socketUrl = isDevelopment ? 'http://localhost:3500' : undefined;

        const socketInstance = io(socketUrl, {
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
