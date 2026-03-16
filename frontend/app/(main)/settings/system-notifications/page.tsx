'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

type SystemNotification = {
    id: string;
    type: string;
    severity: 'info' | 'warning' | 'critical';
    title: string;
    message: string;
    action_url?: string;
    source: string;
    created_at: string;
    metadata?: any;
};

const severityStyle: Record<string, string> = {
    info: 'border-blue-500/30 bg-blue-500/10',
    warning: 'border-amber-500/30 bg-amber-500/10',
    critical: 'border-red-500/40 bg-red-500/10',
};

export default function SystemNotificationsPage() {
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState<SystemNotification[]>([]);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await api.get('/system-notifications');
                setNotifications(Array.isArray(res.data) ? res.data : []);
            } catch (error) {
                console.error('Erro ao carregar notificações do sistema', error);
                setNotifications([]);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    return (
        <div className="space-y-6">
            <div className="rounded-2xl border bg-gradient-to-r from-card via-card to-muted/20 p-6 shadow-sm">
                <h1 className="text-2xl font-bold tracking-tight">Notificações do Sistema</h1>
                <p className="text-muted-foreground text-sm mt-1">Alertas de segurança, operação e avisos importantes.</p>
            </div>

            {loading ? (
                <div className="rounded-xl border p-6 text-sm text-muted-foreground">Carregando notificações...</div>
            ) : notifications.length === 0 ? (
                <div className="rounded-xl border p-6 text-sm text-muted-foreground">Nenhuma notificação no momento.</div>
            ) : (
                <div className="space-y-3">
                    {notifications.map((notification) => (
                        <div key={notification.id} className={`rounded-xl border p-4 ${severityStyle[notification.severity] || ''}`}>
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-sm font-semibold">{notification.title}</p>
                                    <p className="text-sm mt-1">{notification.message}</p>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Origem: {notification.source} | {new Date(notification.created_at).toLocaleString('pt-BR')}
                                    </p>
                                </div>
                                {notification.action_url && (
                                    <Link href={notification.action_url} className="text-xs underline underline-offset-2">
                                        Abrir
                                    </Link>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
