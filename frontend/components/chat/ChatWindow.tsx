'use client';

import React, { useState, useEffect, useRef } from 'react';
import ChatHeader from './ChatHeader';
import { useChat } from './ChatContext';
import api from '@/lib/api';
import { X, Send, Paperclip, Smile, File, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Message {
    id: string;
    conversation_id: string;
    body: string;
    sender_id: string;
    created_at: string;
    is_read: boolean;
    client_message_id?: string;
}

interface ChatWindowProps {
    conversationId: string;
    currentUser: { id: string; role: string };
    otherUserName: string;
    onClose?: () => void;
    isFullPage?: boolean;
    embedded?: boolean;
    otherUserId?: string;
}

export default function ChatWindow({ conversationId, currentUser, otherUserName, onClose, isFullPage = false, embedded = false, otherUserId }: ChatWindowProps) {
    const { socket, joinConversation, leaveConversation } = useChat();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [isTyping, setIsTyping] = useState(false);
    const [otherUserTyping, setOtherUserTyping] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Reset messages when conversation changes
    useEffect(() => {
        setMessages([]);
    }, [conversationId]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout>(null);

    // Initial Fetch & Room Join
    useEffect(() => {
        if (conversationId) {
            setLoading(true);
            setMessages([]); // Clear prev content immediately
            joinConversation(conversationId);

            // Mark as read
            api.post(`/chat/conversations/${conversationId}/read`);

            // Load messages
            api.get(`/chat/conversations/${conversationId}/messages`)
                .then(res => {
                    setMessages(res.data);
                    setLoading(false);
                    // Scroll happens via effect on messages
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

    // Scroll to bottom on new messages
    useEffect(() => {
        scrollToBottom();
    }, [messages, loading, otherUserTyping]);

    // Listen for socket events
    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = (msg: Message) => {
            if (msg.conversation_id === conversationId) {
                // If message from me (via another tab) or other
                setMessages(prev => {
                    // Dedup based on client_message_id if present
                    if (msg.client_message_id && prev.some(m => m.client_message_id === msg.client_message_id)) {
                        return prev;
                    }
                    return [...prev, msg];
                });

                if (msg.sender_id !== currentUser.id) {
                    api.post(`/chat/conversations/${conversationId}/read`);
                    setOtherUserTyping(false); // Stop typing indicator if they sent it
                }
            }
        };

        const handleTyping = (data: { userId: string, isTyping: boolean }) => {
            if (data.userId !== currentUser.id) {
                setOtherUserTyping(data.isTyping);
            }
        };

        socket.on('message:new', handleNewMessage);
        socket.on('typing', handleTyping);

        return () => {
            socket.off('message:new', handleNewMessage);
            socket.off('typing', handleTyping);
        };
    }, [socket, conversationId, currentUser.id]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewMessage(e.target.value);

        // Emit typing
        if (!isTyping) {
            setIsTyping(true);
            socket?.emit('typing', { conversationId, isTyping: true });
        }

        // Debounce stop typing
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
            socket?.emit('typing', { conversationId, isTyping: false });
        }, 2000);
    };

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newMessage.trim()) return;

        const tempId = Date.now().toString();
        const msgBody = newMessage;

        // Optimistic append
        const optimisticMsg: Message = {
            id: tempId, // Temporary
            conversation_id: conversationId,
            body: msgBody,
            sender_id: currentUser.id,
            created_at: new Date().toISOString(),
            is_read: false,
            client_message_id: tempId
        };

        setMessages(prev => [...prev, optimisticMsg]);
        setNewMessage('');
        setIsTyping(false);
        socket?.emit('typing', { conversationId, isTyping: false });

        try {
            // Send via socket usually faster, but here we used endpoint in previous version?
            // Actually gateway sendMessage saves to DB.
            socket?.emit('sendMessage', {
                conversationId,
                body: msgBody,
                clientMessageId: tempId
            });
        } catch (error) {
            console.error(error);
            toast.error('Erro ao enviar mensagem');
            // Remove optimistic msg?
        }
    };

    const onEmojiClick = (emojiData: EmojiClickData) => {
        setNewMessage(prev => prev + emojiData.emoji);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await api.post('/chat/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Send message with link
            // Using markdown for link/image
            const isImage = file.type.startsWith('image/');
            const fileUrl = `${process.env.NEXT_PUBLIC_API_URL}${res.data.path}`;
            const msgBody = isImage
                ? `![${file.name}](${fileUrl})`
                : `[📎 ${file.name}](${fileUrl})`;

            // Send as message
            socket?.emit('sendMessage', {
                conversationId,
                body: msgBody,
                clientMessageId: Date.now().toString()
            });

        } catch (error) {
            console.error(error);
            toast.error('Erro ao enviar arquivo');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const containerClasses = isFullPage
        ? "w-full h-full bg-background flex flex-col"
        : embedded
            ? "flex-1 flex flex-col bg-card overflow-hidden h-full"
            : "fixed bottom-0 right-10 w-96 h-[500px] bg-card border border-border rounded-t-xl shadow-2xl flex flex-col z-50";

    return (
        <div className={containerClasses}>
            {/* Operator Stats Header (Supervisor/Admin Only) */}
            {otherUserId && (currentUser.role === 'ADMIN' || currentUser.role === 'SUPERVISOR') && (
                <ChatHeader operatorId={otherUserId} currentRole={currentUser.role} />
            )}
            {/* Header */}
            {!embedded && !isFullPage && (
                <div className="p-3 border-b border-border flex justify-between items-center bg-card rounded-t-xl shadow-sm z-10">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold text-sm">
                                {otherUserName.charAt(0)}
                            </div>
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-card rounded-full"></span>
                        </div>
                        <span className="font-semibold text-foreground text-sm">{otherUserName}</span>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-accent rounded-full transition-colors text-muted-foreground hover:text-foreground">
                        <X size={18} />
                    </button>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/50">
                {loading ? (
                    <div className="flex justify-center items-center h-full text-muted-foreground gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-sm">Carregando...</span>
                    </div>
                ) : (
                    <>
                        <div className="text-center py-4">
                            <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                                Início da conversa
                            </span>
                        </div>

                        {messages.map((msg, idx) => {
                            const isMe = msg.sender_id === currentUser.id;
                            return (
                                <div key={msg.id || idx} className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}>
                                    <div className={cn(
                                        "max-w-[75%] px-4 py-2.5 text-sm shadow-sm",
                                        isMe
                                            ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm"
                                            : "bg-muted text-foreground border border-border rounded-2xl rounded-tl-sm"
                                    )}>
                                        <div className="prose prose-sm dark:prose-invert max-w-none break-words leading-relaxed">
                                            <ReactMarkdown components={{
                                                img: ({ node, ...props }) => <img {...props} className="rounded-lg max-h-60 object-cover my-1" />,
                                                a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline flex items-center gap-1"><File className="w-3 h-3" /> {props.children}</a>,
                                                p: ({ node, ...props }) => <p {...props} className="my-0" />
                                            }}>
                                                {msg.body}
                                            </ReactMarkdown>
                                        </div>
                                        <div className={cn("text-[10px] mt-1 text-right font-medium opacity-70", isMe ? "text-primary-foreground" : "text-muted-foreground")}>
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {otherUserTyping && (
                            <div className="flex justify-start animate-fade-in">
                                <div className="bg-muted border border-border rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1 shadow-sm">
                                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Input */}
            <div className="p-3 bg-card border-t border-border flex items-end gap-2 shrink-0">
                {/* Actions */}
                <div className="flex items-center gap-1 pb-2 text-muted-foreground">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileUpload}
                        accept="image/*,.pdf,.doc,.docx"
                    />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-full hover:bg-accent text-muted-foreground"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                    >
                        {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                    </Button>

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-accent text-muted-foreground">
                                <Smile className="w-5 h-5" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0 border-none shadow-xl" side="top" align="start">
                            <EmojiPicker
                                onEmojiClick={onEmojiClick}
                                width={300}
                                height={400}
                                lazyLoadEmojis={true}
                                theme={undefined} // Let it fallback or auto detec based on library defaults. Actually better to remove if 'auto' doesn't exist.
                            // If I can't check the type, looking at the error 'auto' is invalid.
                            // I will try just removing it.
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                <form onSubmit={handleSend} className="flex-1 flex gap-2 items-end bg-input/20 rounded-2xl border border-input focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all p-2">
                    <input
                        className="flex-1 bg-transparent border-none outline-none text-sm px-2 py-1 max-h-32 min-h-[24px] text-foreground placeholder:text-muted-foreground"
                        placeholder="Digite uma mensagem..."
                        value={newMessage}
                        onChange={handleInputChange}
                        autoComplete="off"
                    />
                    <Button
                        type="submit"
                        size="icon"
                        className={cn("h-8 w-8 rounded-full shrink-0 transition-all", newMessage.trim() ? "bg-primary hover:bg-primary/90 text-primary-foreground" : "bg-muted text-muted-foreground cursor-not-allowed")}
                        disabled={!newMessage.trim()}
                    >
                        <Send className="w-4 h-4 ml-0.5" />
                    </Button>
                </form>
            </div>
        </div>
    );
}
