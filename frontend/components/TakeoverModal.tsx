import React, { useState } from 'react';
import { X, Search, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

interface TakeoverModalProps {
    onClose: () => void;
    onSuccess: () => void;
    userRole: string;
}

interface LeadLookupResult {
    lead_id: string;
    company_name: string;
    cnpj_masked: string;
    owner_name: string;
    pipeline_stage: string;
    can_take_over: boolean;
    deny_reason: string | null;
}

export function TakeoverModal({ onClose, onSuccess, userRole }: TakeoverModalProps) {
    const [cnpj, setCnpj] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<LeadLookupResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

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
            // Remove máscara simples se o usuário digitou
            const response = await api.get(`/clients/lookup?cnpj=${cnpj}`);
            setResult(response.data);
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

    // Confirm Takeover
    const handleTakeover = async () => {
        if (!result) return;

        setProcessing(true);
        try {
            await api.post(`/clients/${result.lead_id}/takeover`, {
                reason: 'Solicitado via Troca de Responsabilidade (Operador)'
            });
            toast.success('Responsabilidade assumida com sucesso!');
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Takeover Error:', err);
            toast.error(err.response?.data?.message || 'Erro ao assumir lead.');
        } finally {
            setProcessing(false);
        }
    };

    // Mask Helper (Basic CNPJ)
    const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length > 14) val = val.substring(0, 14);

        // Apply simple mask 00.000.000/0000-00
        val = val.replace(/^(\d{2})(\d)/, '$1.$2');
        val = val.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
        val = val.replace(/\.(\d{3})(\d)/, '.$1/$2');
        val = val.replace(/(\d{4})(\d)/, '$1-$2');

        setCnpj(val);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-gray-100 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Search className="h-5 w-5 text-indigo-600" />
                        Trocar Responsabilidade
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-gray-400 hover:text-gray-500 hover:bg-gray-200 rounded-full transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 text-sm text-indigo-700">
                        Busque o lead pelo CNPJ para verificar se você pode assumi-lo.
                    </div>

                    {/* Search Form */}
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <div className="flex-1">
                            <input
                                type="text"
                                value={cnpj}
                                onChange={handleCnpjChange}
                                placeholder="00.000.000/0000-00"
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading ? 'Buscando...' : 'Buscar'}
                            {!loading && <Search className="h-4 w-4" />}
                        </button>
                    </form>

                    {/* Loading State */}
                    {loading && (
                        <div className="flex justify-center py-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                    )}

                    {/* Search Result */}
                    {result && !loading && (
                        <div className="animate-in slide-in-from-bottom-2 duration-300">
                            <div className={`p-4 rounded-xl border ${result.can_take_over ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                <div className="flex items-start gap-3">
                                    <div className={`mt-0.5 p-1.5 rounded-full ${result.can_take_over ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                        {result.can_take_over ? <CheckCircle className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <h3 className="font-semibold text-gray-900">{result.company_name}</h3>
                                        <p className="text-sm text-gray-600 font-medium">{result.cnpj_masked}</p>

                                        <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                                            <span className="bg-white/80 px-2 py-0.5 rounded border border-gray-200 shadow-sm">
                                                Responsável: <strong>{result.owner_name}</strong>
                                            </span>
                                            <span className="bg-white/80 px-2 py-0.5 rounded border border-gray-200 shadow-sm">
                                                Status: {result.pipeline_stage}
                                            </span>
                                        </div>

                                        {!result.can_take_over && result.deny_reason && (
                                            <div className="mt-3 text-sm text-red-700 flex items-center gap-1.5 font-medium">
                                                <AlertCircle className="h-4 w-4" />
                                                {result.deny_reason}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Action Button */}
                            {result.can_take_over && (
                                <div className="mt-6 flex justify-end">
                                    <button
                                        onClick={handleTakeover}
                                        disabled={processing}
                                        className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg shadow-sm font-semibold transition-all hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {processing ? 'Processando...' : 'Assumir Responsabilidade'}
                                        {!processing && <CheckCircle className="h-4 w-4" />}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-100 flex items-center gap-2 animate-in fade-in">
                            <AlertTriangle className="h-5 w-5 shrink-0" />
                            <span className="text-sm font-medium">{error}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default TakeoverModal;
