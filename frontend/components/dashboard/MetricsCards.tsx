import { Users, Clock } from 'lucide-react';

export interface DashboardMetrics {
    leads: number;
    accounts: number;
    pending: number;
    conversionRate: number;
}

interface MetricsCardsProps {
    metrics: DashboardMetrics | null;
    loading?: boolean;
}

export function MetricsCards({ metrics, loading }: MetricsCardsProps) {
    if (loading) {
        return <div className="animate-pulse h-32 bg-card rounded-xl border border-border" />;
    }

    if (!metrics) return null;

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Leads - Indigo/Purple */}
            <div className="bg-card overflow-hidden rounded-xl p-3 border border-border hover:border-primary/50 transition-colors shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                    <Users className="h-4 w-4 text-primary" />
                    <dt className="text-xs font-semibold text-muted-foreground truncate">Leads</dt>
                </div>
                <dd className="text-2xl font-bold text-foreground">{metrics.leads}</dd>
            </div>

            {/* Conversão - Green */}
            <div className="bg-card overflow-hidden rounded-xl p-3 border border-border hover:border-green-500/50 transition-colors shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                    <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <dt className="text-xs font-semibold text-muted-foreground truncate">Conversão</dt>
                </div>
                <dd className="text-2xl font-bold text-foreground">
                    {metrics.leads > 0 ? ((metrics.accounts / metrics.leads) * 100).toFixed(0) : '0'}%
                </dd>
            </div>

            {/* Contas - Blue */}
            <div className="bg-card overflow-hidden rounded-xl p-3 border border-border hover:border-blue-500/50 transition-colors shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                    <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <dt className="text-xs font-semibold text-muted-foreground truncate">Contas</dt>
                </div>
                <dd className="text-2xl font-bold text-foreground">{metrics.accounts}</dd>
            </div>

            {/* Pendentes - Orange/Amber */}
            <div className="bg-card overflow-hidden rounded-xl p-3 border border-border hover:border-amber-500/50 transition-colors shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <dt className="text-xs font-semibold text-muted-foreground truncate">Pendentes</dt>
                </div>
                <dd className="text-2xl font-bold text-foreground">
                    {metrics.pending}
                </dd>
            </div>
        </div>
    );
}
