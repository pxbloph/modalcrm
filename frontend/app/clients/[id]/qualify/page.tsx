
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Loader2, CheckCircle } from 'lucide-react';

interface FormTemplate {
    id: string;
    title: string;
    fields: any[];
}

export default function QualifyPage() {
    const params = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [template, setTemplate] = useState<FormTemplate | null>(null);
    const [client, setClient] = useState<any>(null);
    const [answers, setAnswers] = useState<any>({});
    const [error, setError] = useState('');

    // Default template if none exists
    const defaultFields = [
        { id: 'renda', label: 'Renda Mensal Aproximada', type: 'select', options: ['Até R$ 2.000', 'R$ 2.000 - R$ 5.000', 'R$ 5.000 - R$ 10.000', 'Acima de R$ 10.000'] },
        { id: 'interesse', label: 'Grau de Interesse', type: 'select', options: ['Baixo', 'Médio', 'Alto'] },
        { id: 'observacoes', label: 'Observações Gerais', type: 'textarea' }
    ];

    useEffect(() => {
        const loadData = async () => {
            // Access params.id safely from useParams hook
            const clientId = params?.id as string;
            if (!clientId) return;

            try {
                // Load client
                const clientRes = await api.get(`/clients/${clientId}`);
                setClient(clientRes.data);

                // Load template
                const templateRes = await api.get('/qualifications/template');
                if (templateRes.data) {
                    setTemplate(templateRes.data);
                } else {
                    setTemplate({ id: 'default', title: 'Qualificação Padrão', fields: defaultFields });
                }
            } catch (err) {
                console.error(err);
                setError('Erro ao carregar dados.');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [params?.id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        const clientId = params?.id as string;
        try {
            await api.post(`/qualifications/${clientId}`, { answers });
            // Success! Redirect to dashboard
            router.push('/dashboard');
        } catch (err) {
            console.error(err);
            setError('Erro ao salvar qualificação.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleInputChange = (fieldId: string, value: string) => {
        setAnswers({ ...answers, [fieldId]: value });
    };

    if (loading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-indigo-600" /></div>;
    }

    if (!client) return <div className="p-8">Cliente não encontrado.</div>;

    const currentFields = template?.fields || defaultFields;

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="bg-indigo-600 px-8 py-6">
                    <h1 className="text-2xl font-bold text-white">Qualificação de Cliente</h1>
                    <p className="text-indigo-100 mt-1">{client.name} {client.surname}</p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {currentFields.map((field: any) => (
                        <div key={field.id}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                            {field.type === 'select' ? (
                                <select
                                    className="block w-full rounded-md border-gray-300 border p-2.5 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                                    required
                                >
                                    <option value="">Selecione...</option>
                                    {field.options.map((opt: string) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            ) : field.type === 'textarea' ? (
                                <textarea
                                    className="block w-full rounded-md border-gray-300 border p-2.5 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                    rows={4}
                                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                                />
                            ) : (
                                <input
                                    type={field.type || 'text'}
                                    className="block w-full rounded-md border-gray-300 border p-2.5 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                                />
                            )}
                        </div>
                    ))}

                    {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">{error}</div>}

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={() => router.push('/dashboard')}
                            className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                        >
                            Pular / Voltar
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:opacity-50"
                        >
                            {submitting ? <Loader2 className="animate-spin h-5 w-5" /> : <><CheckCircle className="h-4 w-4" /> Concluir Qualificação</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
