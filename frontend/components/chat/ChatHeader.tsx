'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Trophy, Users, FileCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ChatHeaderProps {
    operatorId: string;
    currentRole: string;
}

export default function ChatHeader({ operatorId, currentRole }: ChatHeaderProps) {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (operatorId && (currentRole === 'ADMIN' || currentRole === 'SUPERVISOR')) {
            setLoading(true);
            api.get(`/chat/operator/${operatorId}/stats`)
                .then(res => {
                    setStats(res.data);
                })
                .catch(err => {
                    console.error("Failed to load operator stats", err);
                })
                .finally(() => {
                    setLoading(false);
                });
        }
    }, [operatorId, currentRole]);

    if (currentRole !== 'ADMIN' && currentRole !== 'SUPERVISOR') return null;

    if (loading) {
        return (
            <div className="flex items-center gap-4 p-3 bg-white border-b border-slate-100 animate-pulse">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
            </div>
        );
    }

    if (!stats) return null;

    return (
        <div className="bg-card border-b border-border px-6 py-4 shadow-[0_4px_12px_-4px_rgba(0,0,0,0.05)] z-20 relative">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">

                {/* Identity Section */}
                <div className="flex items-center gap-5 w-full md:w-auto">
                    <div className="relative shrink-0">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#ccff00] to-[#09ff00] flex items-center justify-center text-slate-900 text-2xl font-bold shadow-lg ring-4 ring-primary/10">
                            {stats.operator.name.charAt(0)}
                        </div>
                        <span className="absolute bottom-0 right-0 w-5 h-5 bg-primary border-[3px] border-card rounded-full shadow-sm" title="Online"></span>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-foreground leading-tight">
                            {stats.operator.name} {stats.operator.surname}
                        </h2>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground border border-border mt-1">
                            Operador
                        </span>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">

                    {/* Stat Card 1: Leads */}
                    <div className="flex flex-col items-center justify-center bg-card border border-border rounded-2xl px-6 py-3 min-w-[110px] shadow-sm hover:shadow-md transition-all group">
                        <div className="flex items-center gap-1.5 mb-1 group-hover:scale-105 transition-transform">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span className="text-[12px] uppercase tracking-wider font-bold text-muted-foreground">Leads</span>
                        </div>
                        <span className="text-3xl font-bold text-foreground tracking-tight">{stats.stats.totalLeads}</span>
                    </div>


                    {/* Stat Card 2: Tabulation */}
                    <div className="flex flex-col items-center justify-center bg-blue-500/10 border border-blue-500/20 rounded-2xl px-6 py-3 min-w-[130px] shadow-sm hover:shadow-md transition-all group">
                        <div className="flex items-center gap-1.5 mb-1 group-hover:scale-105 transition-transform">
                            <FileCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-[12px] uppercase tracking-wider font-bold text-blue-600/70 dark:text-blue-400/70">Conta Tab</span>
                        </div>
                        <span className="text-3xl font-bold text-blue-700 dark:text-blue-400 tracking-tight">{stats.stats.totalTabulationOpen}</span>
                    </div>


                    {/* Stat Card 3: Real */}
                    <div className="flex flex-col items-center justify-center bg-primary/10 border border-primary/20 rounded-2xl px-6 py-3 min-w-[130px] shadow-sm hover:shadow-md transition-all group">
                        <div className="flex items-center gap-1.5 mb-1 group-hover:scale-105 transition-transform">
                            <Trophy className="w-4 h-4 text-primary" />
                            <span className="text-[12px] uppercase tracking-wider font-bold text-primary">Conta Real</span>
                        </div>
                        <span className="text-3xl font-bold text-foreground tracking-tight">{stats.stats.totalRealOpen}</span>
                    </div>

                </div>
            </div>
        </div>
    );
}
