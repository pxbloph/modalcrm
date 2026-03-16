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

function resolveSocketUrl(): string | undefined {
    const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL;

    if (configuredApiUrl) {
        // API URL usually ends with /api, but Socket.IO runs at server root (/socket.io)
        return configuredApiUrl.replace(/\/api\/?$/, '');
    }

    if (typeof window !== 'undefined') {
        // Local fallback when env is missing
        return `http://${window.location.hostname}:3500`;
    }

    return undefined;
}

export function ChatProvider({ children }: { children: ReactNode }) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const socketUrl = resolveSocketUrl();

        const socketInstance = io(socketUrl, {
            auth: {
                token: token ? `Bearer ${token}` : '',
            },
            autoConnect: false,
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
