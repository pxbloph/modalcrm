'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import { FormField } from '@/components/settings/FormBuilderInternal';

interface Client {
    id: string;
    name: string;
    surname: string;
    email: string;
    phone: string;
    cpf?: string;
}

export default function QualifyPage() {
    const params = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [client, setClient] = useState<Client | null>(null);
    const [error, setError] = useState('');

    // Dynamic Form State
    const [fields, setFields] = useState<FormField[]>([]);
    const [formData, setFormData] = useState<Record<string, any>>({});

    useEffect(() => {
        const loadData = async () => {
            if (!params?.id) return;
            try {
                // Parallel fetch: Client + Active Template
                const [clientRes, templateRes] = await Promise.all([
                    api.get(`/clients/${params.id}`),
                    api.get('/form-templates/active')
                ]);

                setClient(clientRes.data);

                // Initialize form data with client name if needed (system field)
                const initialData: any = {};

                const correctTabulacaoOptions = [
                    { label: 'Aguardando abertura', value: 'Aguardando abertura' },
                    { label: 'Retornar outro horário', value: 'Retornar outro horário' },
                    { label: 'Conta aberta', value: 'Conta aberta' },
                    { label: 'Sem interesse', value: 'Sem interesse' }
                ];

                let finalFields: FormField[] = [];

                if (templateRes.data && templateRes.data.fields) {
                    finalFields = templateRes.data.fields;
                } else {
                    // Fallback to default fields
                    finalFields = [
                        { id: 'sys_client_name', type: 'text', label: 'Nome do Cliente', required: false, systemField: 'client_name' },
                        { id: 'sys_maquininha_atual', type: 'select', label: 'Possui Maquininha Hoje?', required: false, systemField: 'maquininha_atual', options: [{ label: 'Nenhuma', value: 'Nenhuma' }, { label: 'Pagbank', value: 'Pagbank' }, { label: 'Mercado Pago', value: 'Mercado Pago' }] },
                        { id: 'sys_faturamento_maquina', type: 'number', label: 'Faturamento em Máquina (Mensal)', required: false, systemField: 'faturamento_maquina', placeholder: 'R$ 0,00' },
                        { id: 'sys_faturamento_mensal', type: 'number', label: 'Faturamento Total (Mensal)', required: false, systemField: 'faturamento_mensal', placeholder: 'R$ 0,00' },
                        { id: 'sys_produto_interesse', type: 'select', label: 'Produto de Interesse', required: false, systemField: 'produto_interesse', options: [{ label: 'Conta PJ', value: 'Conta PJ' }, { label: 'Boletos', value: 'Boletos' }] },
                        { id: 'sys_emite_boletos', type: 'radio', label: 'Emite Boletos?', required: false, systemField: 'emite_boletos', options: [{ label: 'Sim', value: 'true' }, { label: 'Não', value: 'false' }] },
                        { id: 'sys_checkbox_ofertas', type: 'checkbox', label: 'Cliente deseja receber prosposta de maquininha?', required: false, systemField: 'deseja_receber_ofertas' },
                        { id: 'sys_tabulacao', type: 'select', label: 'Tabulação', required: true, systemField: 'tabulacao', options: [] }, // Options will be overridden
                        // Agendamento will be injected
                        { id: 'sys_obs', type: 'textarea', label: 'Informações Adicionais', required: false, systemField: 'informacoes_adicionais' },
                    ];
                }

                // FORCE UPDATE Tabulação Options and Inject Agendamento
                finalFields = finalFields.map(f => {
                    if (f.systemField === 'tabulacao') {
                        return { ...f, options: correctTabulacaoOptions, required: true };
                    }
                    return f;
                });

                // Ensure Agendamento field exists logic
                const hasAgendamento = finalFields.find(f => f.systemField === 'agendamento');
                if (!hasAgendamento) {
                    // Insert after tabulacao
                    const tabIndex = finalFields.findIndex(f => f.systemField === 'tabulacao');
                    const agendamentoField: FormField = {
                        id: 'sys_agendamento',
                        type: 'datetime-local',
                        label: 'Data e Hora do Retorno',
                        required: true,
                        systemField: 'agendamento'
                    };

                    if (tabIndex >= 0) {
                        finalFields.splice(tabIndex + 1, 0, agendamentoField);
                    } else {
                        finalFields.push(agendamentoField);
                    }
                }

                setFields(finalFields);

            } catch (err) {
                console.error(err);
                setError('Erro ao carregar dados.');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [params?.id]);

    const formatCurrency = (value: string) => {
        const digits = value.replace(/\D/g, '');
        const number = parseInt(digits) / 100;
        if (isNaN(number)) return '';
        return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const handleChange = (fieldId: string, value: any, type: string) => {
        if (type === 'number' && typeof value === 'string' && value.includes('R$')) {
            // It's a currency input potentially
            // Simple currency mask logic
            const formatted = formatCurrency(value);
            setFormData(prev => ({ ...prev, [fieldId]: formatted }));
        } else {
            setFormData(prev => ({ ...prev, [fieldId]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            // Validate Tabulação (Extra safety besides HTML required)
            const tabulacaoField = fields.find(f => f.systemField === 'tabulacao');
            if (tabulacaoField && !formData[tabulacaoField.id]) {
                setError('Selecione uma tabulação para concluir.');
                setSubmitting(false);
                return;
            }

            // Prepare Payload
            const payload: any = { answers: {} };

            // Map form data to either top-level system fields OR validation answers
            fields.forEach(field => {
                const value = formData[field.id];

                // System Field Mapping (Flatten specific fields for creating relations/columns)
                if (field.systemField) {
                    if (field.type === 'number') {
                        // Parse currency back to float
                        if (value && typeof value === 'string') {
                            payload[field.systemField] = parseFloat(value.replace(/[^\d,]/g, '').replace(',', '.'));
                        } else {
                            payload[field.systemField] = value;
                        }
                    } else if (field.type === 'radio') {
                        payload[field.systemField] = value === 'true'; // Convert string "true" to boolean
                    } else {
                        payload[field.systemField] = value;
                    }
                } else {
                    // Dynamic Answer
                    payload.answers[field.label] = value; // Saving by Label for readability, or use ID. Label is better for display if ID is obscure.
                }
            });

            const response = await api.post(`/qualifications/${params?.id}`, payload);

            if (response.data.integration_status === 'FAILED') {
                // Show warning but redirect as it was saved
                alert('Qualificação salva com sucesso!\n\nPorém, houve uma falha ao enviar para a integração. O sistema registrou a tentativa e tentará novamente em breve.');
            }

            router.push('/dashboard');
        } catch (err) {
            console.error(err);
            setError('Erro ao salvar qualificação.');
            setSubmitting(false);
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-indigo-600" /></div>;
    if (!client) return <div className="p-8">Cliente não encontrado.</div>;

    return (
        <div className="max-w-3xl mx-auto">
            <button
                onClick={() => router.back()}
                className="mb-4 flex items-center text-sm text-gray-500 hover:text-gray-900"
            >
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </button>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-indigo-600 px-6 py-4">
                    <h1 className="text-xl font-bold text-white">Qualificação de Cliente</h1>
                    <p className="text-indigo-100 text-sm mt-0.5">Complemente os dados para avançar</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {fields.map((field) => {
                        // Conditional Logic for Agendamento
                        if (field.systemField === 'agendamento') {
                            const tabField = fields.find(f => f.systemField === 'tabulacao');
                            const currentTabValue = tabField ? formData[tabField.id] : '';
                            if (currentTabValue !== 'Retornar outro horário') {
                                return null; // Hide field
                            }
                        }

                        return (
                            <div key={field.id} className={field.type === 'checkbox' ? '' : 'mb-4'}>
                                {field.type !== 'checkbox' && (
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {field.label} {field.required && <span className="text-red-500">*</span>}
                                    </label>
                                )}

                                {/* Render Input based on Type */}
                                {field.type === 'text' && (
                                    <input
                                        type="text"
                                        required={field.required}
                                        placeholder={field.placeholder}
                                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border text-gray-900"
                                        value={formData[field.id] || ''}
                                        onChange={e => handleChange(field.id, e.target.value, 'text')}
                                    />
                                )}

                                {field.type === 'textarea' && (
                                    <textarea
                                        required={field.required}
                                        rows={4}
                                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border text-gray-900"
                                        value={formData[field.id] || ''}
                                        onChange={e => handleChange(field.id, e.target.value, 'textarea')}
                                    />
                                )}

                                {field.type === 'number' && (
                                    <input
                                        type="text" // Using text to handle currency masking easily
                                        required={field.required}
                                        placeholder={field.placeholder}
                                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border text-gray-900"
                                        value={formData[field.id] || ''}
                                        onChange={e => handleChange(field.id, e.target.value, 'number')}
                                    />
                                )}

                                {field.type === 'select' && (
                                    <select
                                        required={field.required}
                                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border text-gray-900"
                                        value={formData[field.id] || ''}
                                        onChange={e => handleChange(field.id, e.target.value, 'select')}
                                    >
                                        <option value="">Selecione...</option>
                                        {field.options?.map((opt, idx) => (
                                            <option key={idx} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                )}

                                {field.type === 'radio' && (
                                    <div className="flex items-center gap-4">
                                        {field.options?.map((opt, idx) => (
                                            <label key={idx} className="inline-flex items-center">
                                                <input
                                                    type="radio"
                                                    name={field.id}
                                                    required={field.required}
                                                    className="form-radio text-indigo-600"
                                                    checked={formData[field.id] === opt.value}
                                                    onChange={() => handleChange(field.id, opt.value, 'radio')}
                                                />
                                                <span className="ml-2 text-gray-700">{opt.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}

                                {field.type === 'checkbox' && (
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                            checked={formData[field.id] === true}
                                            onChange={e => handleChange(field.id, e.target.checked, 'checkbox')}
                                        />
                                        <span className="text-sm font-medium text-gray-700">{field.label}</span>
                                    </label>
                                )}

                                {(field.type === 'date' || field.type === 'datetime-local') && (
                                    <input
                                        type="datetime-local"
                                        required={field.required}
                                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border text-gray-900"
                                        value={formData[field.id] || ''}
                                        onChange={e => handleChange(field.id, e.target.value, 'date')}
                                    />
                                )}
                            </div>
                        );
                    })}

                    {error && (
                        <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 flex items-center gap-2"
                        >
                            {submitting ? <Loader2 className="animate-spin h-4 w-4" /> : <><CheckCircle className="h-4 w-4" /> Concluir</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
