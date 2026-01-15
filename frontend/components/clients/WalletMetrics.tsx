'use client';

import { Users, CheckCircle, Clock, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
    title: string;
    value: string | number;
    icon: React.ElementType;
    color: 'blue' | 'green' | 'yellow' | 'red';
    isLoading?: boolean;
}

export function MetricCard({ title, value, icon: Icon, color, isLoading }: MetricCardProps) {
    const colorStyles = {
        blue: 'bg-blue-50 text-blue-700 border-blue-100',
        green: 'bg-green-50 text-green-700 border-green-100',
        yellow: 'bg-yellow-50 text-yellow-700 border-yellow-100',
        red: 'bg-red-50 text-red-700 border-red-100', // Just in case
    };

    const iconColorStyles = {
        blue: 'text-blue-600',
        green: 'text-green-600',
        yellow: 'text-yellow-600',
        red: 'text-red-600',
    };

    return (
        <div className={cn("rounded-xl border p-4 flex flex-col justify-between h-28 transform transition-all duration-200 hover:scale-[1.02]", colorStyles[color])}>
            <div className="flex items-center gap-2">
                <Icon className={cn("h-5 w-5", iconColorStyles[color])} />
                <span className="font-semibold text-sm">{title}</span>
            </div>
            <div className="flex items-end justify-between">
                {isLoading ? (
                    <div className="h-8 w-24 bg-current opacity-20 animate-pulse rounded"></div>
                ) : (
                    <span className="text-3xl font-bold tracking-tight">{value}</span>
                )}
            </div>
        </div>
    );
}

interface WalletMetricsProps {
    metrics: {
        leads: number;
        accounts: number;
        pending: number;
        conversionRate: number;
    } | null;
    loading?: boolean;
}

export function WalletMetrics({ metrics, loading }: WalletMetricsProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <MetricCard
                title="Leads"
                value={metrics?.leads || 0}
                icon={Users}
                color="blue"
                isLoading={loading}
            />
            <MetricCard
                title="Conversão"
                value={`${metrics?.conversionRate || 0}%`}
                icon={Percent}
                color="green"
                isLoading={loading}
            />
            <MetricCard
                title="Contas"
                value={metrics?.accounts || 0}
                icon={CheckCircle}
                color="blue"
                isLoading={loading}
            />
            <MetricCard
                title="Pendentes"
                value={metrics?.pending || 0}
                icon={Clock}
                color="yellow"
                isLoading={loading}
            />
        </div>
    );
}
