'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, CheckCircle, AlertTriangle, ArrowRightLeft, UserCheck } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

type TransferLookupResult = {
    lead_id: string;
    company_name: string;
    cnpj_masked: string;
    owner_name: string;
    owner_id: string;
    pipeline_stage: string;
    can_transfer: boolean;
    is_eligible?: boolean;
    deny_reason?: string | null;
    integration_status?: string;
    transfer_target_hint?: string;
};

export default function PullLeadsPage() {
    const router = useRouter();
    const [cnpj, setCnpj] = useState('');
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [result, setResult] = useState<TransferLookupResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cnpj || cnpj.length < 5) {
            toast.error('Digite um CNPJ válido.');
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);
        setSuccessMsg(null);

        try {
            const response = await api.get(`/clients/lookup-for-transfer?cnpj=${cnpj}`);
            if (response.data) {
                setResult(response.data);
            } else {
                setError('Nenhum lead encontrado com este CNPJ.');
            }
        } catch (err: any) {
            console.error('Lookup Error:', err);
            setError(err.response?.data?.message || 'Lead não encontrado ou erro ao buscar.');
        } finally {
            setLoading(false);
        }
    };

    const handleTransfer = async () => {
        if (!result) return;

        setProcessing(true);
        setSuccessMsg(null);
        setError(null);

        try {
            const response = await api.post('/clients/transfer-by-cnpj', {
                cnpj: result.cnpj_masked,
                reason: 'Transferência manual pela página Puxar Leads',
            });

            setSuccessMsg(response.data?.message || 'Ação concluída com sucesso.');

            const leadId = response.data?.lead_id || result.lead_id;
            setTimeout(() => {
                router.push(`/clients/${leadId}/qualify`);
            }, 1500);
        } catch (err: any) {
            console.error('Transfer Error:', err);
            setError(err.response?.data?.message || 'Erro ao processar lead.');
        } finally {
            setProcessing(false);
        }
    };

    const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length > 14) val = val.substring(0, 14);
        val = val.replace(/^(\d{2})(\d)/, '$1.$2');
        val = val.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
        val = val.replace(/\.(\d{3})(\d)/, '.$1/$2');
        val = val.replace(/(\d{4})(\d)/, '$1-$2');
        setCnpj(val);
        if (error) setError(null);
        if (result) setResult(null);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="rounded-2xl border bg-gradient-to-r from-card via-card to-muted/20 p-6 shadow-sm">
                <h1 className="text-2xl font-bold tracking-tight">Puxar Leads</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Busque um lead por CNPJ, valide a aptidão e siga para a tela preenchida do lead após a ação.
                </p>
            </div>

            <div className="rounded-xl border bg-card shadow-sm p-6 space-y-6">
                <form onSubmit={handleSearch} className="flex gap-2">
                    <div className="flex-1">
                        <input
                            type="text"
                            value={cnpj}
                            onChange={handleCnpjChange}
                            placeholder="Ex: 00.000.000/0000-00"
                            className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none font-mono text-sm text-foreground placeholder:text-muted-foreground"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-primary hover:bg-green-400 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? '...' : 'Buscar'}
                        {!loading && <Search className="h-4 w-4" />}
                    </button>
                </form>

                {result && (
                    <div className="p-4 rounded-xl border bg-secondary/30 border-border">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 p-1.5 rounded-full bg-primary/20 text-primary-foreground">
                                <UserCheck className="h-5 w-5 text-green-700 dark:text-green-400" />
                            </div>
                            <div className="flex-1 space-y-1">
                                <h3 className="font-semibold text-foreground">{result.company_name}</h3>
                                <p className="text-sm text-muted-foreground font-medium">{result.cnpj_masked}</p>

                                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground">
                                    <div className="bg-background p-2 rounded border border-border">
                                        <span className="block text-xs font-semibold uppercase opacity-70 mb-0.5">Responsável Atual</span>
                                        <span className="font-medium text-foreground">{result.owner_name}</span>
                                    </div>
                                    <div className="bg-background p-2 rounded border border-border">
                                        <span className="block text-xs font-semibold uppercase opacity-70 mb-0.5">Fase do Funil</span>
                                        <span className="font-medium text-foreground">{result.pipeline_stage}</span>
                                    </div>
                                </div>

                                <div className={`mt-3 rounded-lg border p-3 text-sm ${result.can_transfer ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
                                    <p className="font-semibold">
                                        {result.can_transfer ? 'Lead apto para ação.' : 'Lead não apto para seguir.'}
                                    </p>
                                    <p className="mt-1">
                                        {result.can_transfer
                                            ? (result.transfer_target_hint || 'A responsabilidade será atualizada após a confirmação.')
                                            : (result.deny_reason || 'Este lead será removido do fluxo operacional e arquivado para consulta administrativa.')}
                                    </p>
                                </div>

                                <div className="mt-4 flex justify-end">
                                    <button
                                        onClick={handleTransfer}
                                        disabled={processing}
                                        className="bg-primary hover:bg-green-400 text-primary-foreground px-6 py-2.5 rounded-lg shadow-sm font-semibold transition-all hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {processing ? 'Processando...' : result.can_transfer ? 'Confirmar e Abrir Lead' : 'Arquivar e Excluir Lead Inapto'}
                                        {!processing && <ArrowRightLeft className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/20 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 shrink-0" />
                        <span className="text-sm font-medium">{error}</span>
                    </div>
                )}

                {successMsg && (
                    <div className="p-4 bg-green-50 text-green-700 rounded-lg border border-green-200 flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 shrink-0" />
                        <span className="text-sm font-medium">{successMsg}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
