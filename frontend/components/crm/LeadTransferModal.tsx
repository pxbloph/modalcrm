import React, { useState } from 'react';
import { X, Search, CheckCircle, AlertTriangle, ArrowRightLeft, UserCheck } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

interface LeadTransferModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

interface TransferLookupResult {
    lead_id: string;
    company_name: string;
    cnpj_masked: string;
    owner_name: string;
    owner_id: string;
    pipeline_stage: string;
    can_transfer: boolean;
}

export function LeadTransferModal({ onClose, onSuccess }: LeadTransferModalProps) {
    const [cnpj, setCnpj] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<TransferLookupResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Initial Search
    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cnpj || cnpj.length < 5) {
            toast.error('Digite um CNPJ válido.');
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);

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
            if (err.response?.status === 404) {
                setError('Nenhum lead encontrado com este CNPJ.');
            }
        } finally {
            setLoading(false);
        }
    };

    // Confirm Transfer
    const handleTransfer = async () => {
        if (!result) return;

        setProcessing(true);
        setSuccessMsg(null);
        setError(null);
        try {
            const response = await api.post(`/clients/transfer-by-cnpj`, {
                cnpj: result.cnpj_masked, // sending mask or clean? Controller usually creates clean from it, but let's reuse what we have
                reason: 'Transferência manual pelo Operador (Botão Flutuante)'
            });
            // Display SUCCESS and WAIT
            setSuccessMsg(response.data?.message || 'Lead assumido com sucesso!');
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 2500);
        } catch (err: any) {
            console.error('Transfer Error:', err);

            if (err.response?.status === 409) {
                setError(err.response?.data?.message || 'Ação não permitida para este lead.');
            } else {
                setError(err.response?.data?.message || 'Erro ao transferir lead.');
            }
        } finally {
            setProcessing(false);
        }
    };

    // Mask Helper (Basic CNPJ)
    const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, '');
        setCnpj(val);
        // Clear error/result when user types to reset state
        if (error) setError(null);
        if (result) setResult(null);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-card rounded-xl shadow-2xl w-full max-w-lg border border-border overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-secondary/50 border-b border-border">
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <ArrowRightLeft className="h-5 w-5 text-primary" />
                        Puxar Lead por CNPJ
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <p className="text-sm text-muted-foreground">
                        Digite o CNPJ do cliente para trazê-lo para sua carteira. A transferência será registrada.
                    </p>

                    {/* Search Form */}
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <div className="flex-1">
                            <input
                                type="text"
                                value={cnpj}
                                onChange={handleCnpjChange}
                                placeholder="Somente números"
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

                    {/* Search Result */}
                    {result && !loading && (
                        <div className="animate-in slide-in-from-bottom-2 duration-300">
                            <div className="p-4 rounded-xl border bg-secondary/30 border-border">
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 p-1.5 rounded-full bg-primary/20 text-primary-foreground">
                                        <UserCheck className="h-5 w-5 text-green-700 dark:text-green-400" />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <h3 className="font-semibold text-foreground">{result.company_name}</h3>
                                        <p className="text-sm text-muted-foreground font-medium">{result.cnpj_masked}</p>

                                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                            <div className="bg-background p-2 rounded border border-border">
                                                <span className="block text-xs font-semibold uppercase opacity-70 mb-0.5">Responsável Atual</span>
                                                <span className="font-medium text-foreground">{result.owner_name}</span>
                                            </div>
                                            <div className="bg-background p-2 rounded border border-border">
                                                <span className="block text-xs font-semibold uppercase opacity-70 mb-0.5">Fase do Funil</span>
                                                <span className="font-medium text-foreground">{result.pipeline_stage}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Button */}
                            <div className="mt-6 flex justify-end">
                                <button
                                    onClick={handleTransfer}
                                    disabled={processing}
                                    className="w-full sm:w-auto bg-primary hover:bg-green-400 text-primary-foreground px-6 py-2.5 rounded-lg shadow-sm font-semibold transition-all hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {processing ? 'Processando...' : 'Confirmar e Assumir Lead'}
                                    {!processing && <ArrowRightLeft className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Error State */}
                    {error && !successMsg && (
                        <div className="p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/20 flex items-center gap-2 animate-in fade-in">
                            <AlertTriangle className="h-5 w-5 shrink-0" />
                            <span className="text-sm font-medium">{error}</span>
                        </div>
                    )}

                    {/* Success State */}
                    {successMsg && (
                        <div className="p-4 bg-green-50 text-green-700 rounded-lg border border-green-200 flex items-center gap-2 animate-in fade-in mt-4">
                            <CheckCircle className="h-5 w-5 shrink-0" />
                            <span className="text-sm font-medium">{successMsg}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
