'use client';

import React, { useEffect, useState } from 'react';
import { Megaphone, Check, Plus, AlertCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import NewAnnouncementModal from './NewAnnouncementModal'; // Component we will create next

interface Announcement {
    id: string;
    title: string;
    content: string;
    priority: 'NORMAL' | 'HIGH' | 'URGENT';
    created_at: string;
    author: {
        id: string;
        name: string;
        surname: string | null;
    };
    isRead: boolean;
}

interface AnnouncementsTabProps {
    userRole: string;
    userId: string;
}

export default function AnnouncementsTab({ userRole, userId }: AnnouncementsTabProps) {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchAnnouncements = async () => {
        try {
            const res = await api.get('/chat/announcements');
            setAnnouncements(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAnnouncements();

        // Listen for new via socket ideally, but simple poll or onFocus works too
        // or passing socket via props
    }, []);

    const handleMarkAsRead = async (id: string) => {
        try {
            await api.post(`/chat/announcements/${id}/read`);
            setAnnouncements(prev => prev.map(a =>
                a.id === id ? { ...a, isRead: true } : a
            ));
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este comunicado?')) return;

        try {
            await api.delete(`/chat/announcements/${id}`);
            setAnnouncements(prev => prev.filter(a => a.id !== id));
            toast.success('Comunicado excluído');
        } catch (error) {
            console.error(error);
            toast.error('Erro ao excluir comunicado');
        }
    };

    const handleCreated = () => {
        setIsModalOpen(false);
        fetchAnnouncements();
    };

    const getPriorityColor = (priority: string) => {
        if (priority === 'URGENT') return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
        if (priority === 'HIGH') return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
        return 'bg-primary/10 text-primary border-primary/20'; // Green theme default
    };

    if (isLoading) return <div className="p-4 space-y-4"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>;

    const unreadCount = announcements.filter(a => !a.isRead).length;

    return (
        <div className="flex flex-col h-full bg-card">
            {/* Header */}
            <div className="p-4 border-b border-border bg-card flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <div className="bg-primary/20 p-2 rounded-lg">
                        <Megaphone className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="font-semibold text-foreground">Comunicados</h2>
                        <p className="text-xs text-muted-foreground">
                            {unreadCount > 0 ? `${unreadCount} não lidos` : 'Todos lidos'}
                        </p>
                    </div>
                </div>

                {['ADMIN', 'SUPERVISOR'].includes(userRole) && (
                    <Button
                        size="sm"
                        className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                        onClick={() => setIsModalOpen(true)}
                    >
                        <Plus className="w-4 h-4" />
                        Novo
                    </Button>
                )}
            </div>

            {/* List */}
            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4 max-w-3xl mx-auto pb-4">
                    {announcements.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            <Megaphone className="w-12 h-12 mx-auto mb-2 opacity-20" />
                            <p>Nenhum comunicado encontrado.</p>
                        </div>
                    ) : (
                        announcements.map((item) => (
                            <div
                                key={item.id}
                                className={cn(
                                    "group relative bg-card border rounded-xl p-5 transition-all shadow-sm hover:shadow-md",
                                    !item.isRead ? "border-primary ring-1 ring-primary/20" : "border-border opacity-90 hover:opacity-100"
                                )}
                            >
                                {/* Header Card */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className={cn("text-xs font-medium border", getPriorityColor(item.priority))}>
                                            {item.priority === 'URGENT' ? 'URGENTE' : item.priority === 'HIGH' ? 'IMPORTANTE' : 'AVISO'}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">
                                            {format(new Date(item.created_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                                        </span>
                                    </div>

                                    {!item.isRead && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleMarkAsRead(item.id)}
                                            className="h-7 text-xs text-primary hover:text-primary/90 hover:bg-primary/10 gap-1"
                                        >
                                            <Check className="w-3 h-3" />
                                            Marcar como lido
                                        </Button>
                                    )}

                                    {/* Delete Button (Admin or Author) */}
                                    {(userRole === 'ADMIN' || item.author.id === userId) && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(item.id)}
                                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 ml-1"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>

                                {/* Content */}
                                <h3 className={cn("text-lg font-bold mb-1", !item.isRead ? "text-foreground" : "text-muted-foreground")}>
                                    {item.title}
                                </h3>
                                <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
                                    {item.content}
                                </p>

                                {/* Footer */}
                                <div className="mt-4 pt-3 border-t border-border flex items-center gap-2 text-xs text-muted-foreground opacity-70">
                                    <span className="font-medium text-foreground">
                                        {item.author.name} {item.author.surname}
                                    </span>
                                    <span>•</span>
                                    <span>Supervisor</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>

            {isModalOpen && (
                <NewAnnouncementModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={handleCreated}
                />
            )}
        </div>
    );
}
