'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormField } from '@/components/settings/FormBuilderInternal';

interface ClientRegistrationFormProps {
    onSuccess?: (clientId: string) => void;
    onCancel?: () => void;
    className?: string;
}

export default function ClientRegistrationForm({ onSuccess, onCancel, className }: ClientRegistrationFormProps) {
    const router = useRouter();
    const [status, setStatus] = useState<'form' | 'waiting' | 'error'>('form');
    const [loading, setLoading] = useState(true); // Loading template
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [createdClientId, setCreatedClientId] = useState<string | null>(null);
    const [retrySeconds, setRetrySeconds] = useState(10);
    const [integrationStatusMessage, setIntegrationStatusMessage] = useState('');

    // Dynamic Form State
    const [fields, setFields] = useState<FormField[]>([]);
    const [formData, setFormData] = useState<Record<string, any>>({});

    // Fetch Template
    useEffect(() => {
        const fetchTemplate = async () => {
            try {
                const res = await api.get('/form-templates/active?type=REGISTRATION');
                if (res.data && res.data.fields) {
                    setFields(res.data.fields);
                } else {
                    // Fallback to default fields
                    const defaultSystemFields: FormField[] = [
                        { id: 'sys_name', type: 'text', label: 'Razão Social', required: true, systemField: 'name', placeholder: 'Nome da Empresa' },
                        { id: 'sys_surname', type: 'text', label: 'Nome Fantasia / Contato', required: false, systemField: 'surname', placeholder: 'Nome Fantasia' },
                        { id: 'sys_cnpj', type: 'text', label: 'CNPJ', required: true, systemField: 'cnpj', placeholder: 'Apenas números' },
                        { id: 'sys_email', type: 'text', label: 'E-mail', required: true, systemField: 'email', placeholder: 'email@exemplo.com' },
                        { id: 'sys_phone', type: 'text', label: 'Telefone', required: true, systemField: 'phone', placeholder: '5521999999999' },
                    ];
                    setFields(defaultSystemFields);
                }
            } catch (error) {
                console.error("Failed to fetch template", error);
                // Fallback in case of error
                const defaultSystemFields: FormField[] = [
                    { id: 'sys_name', type: 'text', label: 'Razão Social', required: true, systemField: 'name', placeholder: 'Nome da Empresa' },
                    { id: 'sys_cnpj', type: 'text', label: 'CNPJ', required: true, systemField: 'cnpj', placeholder: 'Apenas números' },
                    { id: 'sys_email', type: 'text', label: 'E-mail', required: true, systemField: 'email', placeholder: 'email@exemplo.com' },
                    { id: 'sys_phone', type: 'text', label: 'Telefone', required: true, systemField: 'phone', placeholder: '5521999999999' },
                ];
                setFields(defaultSystemFields);
            } finally {
                setLoading(false);
            }
        };
        fetchTemplate();
    }, []);

    const handleReset = useCallback(() => {
        setStatus('form');
        setFormData({});
        setError('');
        setSubmitting(false);
        setCreatedClientId(null);
        setRetrySeconds(10);
    }, []);

    // Polling Logic
    useEffect(() => {
        let interval: NodeJS.Timeout;
        const MAX_POLLING_TIME = 60000; // 60 seconds
        const startTime = Date.now();

        if (status === 'waiting' && createdClientId) {
            interval = setInterval(async () => {
                const elapsedTime = Date.now() - startTime;

                if (elapsedTime > MAX_POLLING_TIME) {
                    clearInterval(interval);
                    setIntegrationStatusMessage("Tempo limite excedido");
                    setStatus('error');
                    return;
                }

                try {
                    const res = await api.get(`/clients/${createdClientId}`);
                    const rawStatus = res.data.integration_status;
                    const safeStatus = rawStatus ? rawStatus.toUpperCase().trim() : '';

                    const validStatuses = ['CADASTRADO', 'OK', 'SUCCESS', 'CADASTRO SALVO COM SUCESSO!'];
                    const pendingStatuses = ['CADASTRANDO...', 'PENDENTE', 'WAITING', '']; // Treat empty/undefined as pending (race condition)

                    if (validStatuses.includes(safeStatus)) {
                        clearInterval(interval);
                        // Success -> Navigate to Qualify
                        if (onSuccess) {
                            onSuccess(createdClientId);
                        } else {
                            router.push(`/dashboard/clients/${createdClientId}/qualify`);
                        }
                    } else if (!pendingStatuses.includes(safeStatus)) {
                        // Negative/Error Status
                        clearInterval(interval);
                        setIntegrationStatusMessage(rawStatus || "Erro desconhecido");
                        setStatus('error');
                    }
                    // Else: Continue Polling (Pending)
                } catch (err) {
                    console.error("Polling error", err);
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [status, createdClientId, router, onSuccess]);

    // Countdown Logic for Error State
    useEffect(() => {
        if (status === 'error') {
            const timer = setInterval(() => {
                setRetrySeconds(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        handleReset();
                        return 10;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [status]);


    const formatPhone = (value: string) => {
        const numbers = value.replace(/\D/g, '');
        return numbers.slice(0, 13);
    };

    const handleChange = (fieldId: string, value: any, field?: FormField) => {
        let finalValue = value;

        if (field?.systemField === 'cnpj') {
            finalValue = value.replace(/\D/g, '').slice(0, 14); // Numbers only, max 14 digits
        }
        if (field?.systemField === 'phone') {
            finalValue = formatPhone(value);
        }

        setFormData(prev => ({ ...prev, [fieldId]: finalValue }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        // Prepare Payload
        const payload: any = { answers: {} };

        fields.forEach(field => {
            const value = formData[field.id];

            if (field.systemField) {
                payload[field.systemField] = value;
            } else {
                // Dynamic Answer
                if (field.label) {
                    payload.answers[field.label] = value;
                }
            }
        });

        // Basic Validation
        if (payload.phone && payload.phone.length < 12) {
            setError('Telefone deve ter DDI+DDD+Número (ex: 5521999999999)');
            setSubmitting(false);
            return;
        }

        try {
            const response = await api.post('/clients', payload);
            const clientId = response.data.id;

            // Start Polling
            setCreatedClientId(clientId);
            setStatus('waiting');
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || 'Erro ao cadastrar cliente. Verifique se Email, Telefone ou CNPJ já existem.');
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-indigo-600" /></div>;

    if (status === 'waiting') {
        return (
            <div className={`flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}>
                <Loader2 className="h-12 w-12 text-indigo-600 animate-spin mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Cadastrando...</h2>
                <p className="text-gray-500 text-center">
                    Estamos validando o cadastro. Por favor, aguarde e não feche esta tela.
                </p>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className={`flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}>
                <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl">❌</span>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Cliente não será aproveitado</h2>
                <p className="text-gray-600 text-center mb-6">
                    Motivo: <span className="font-mono bg-gray-100 px-1 rounded">{integrationStatusMessage}</span>
                </p>

                <div className="w-full bg-gray-100 rounded-full h-2 mb-6 max-w-xs">
                    <div
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-1000"
                        style={{ width: `${(retrySeconds / 10) * 100}%` }}
                    />
                </div>

                <p className="text-sm text-gray-500 mb-6">
                    Retornando ao cadastro em {retrySeconds} segundos...
                </p>

                <button
                    onClick={handleReset}
                    className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    Cadastrar outro agora
                </button>
            </div>
        );
    }

    return (
        <div className={className}>
            <div className="mb-8 text-center">
                <h1 className="text-2xl font-bold text-gray-900">Cadastro de Cliente</h1>
                <p className="mt-1 text-sm text-gray-500">Preencha as informações abaixo para adicionar um novo cliente.</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {fields.map((field) => (
                        <div key={field.id} className={field.type === 'checkbox' ? '' : 'mb-4'}>
                            {field.type !== 'checkbox' && (
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {field.label} {field.required && <span className="text-red-500">*</span>}
                                </label>
                            )}

                            {field.type === 'text' && (
                                <input
                                    type="text"
                                    required={field.required}
                                    placeholder={field.placeholder}
                                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border text-gray-900 placeholder:text-gray-400"
                                    value={formData[field.id] || ''}
                                    onChange={e => handleChange(field.id, e.target.value, field)}
                                />
                            )}

                            {field.type === 'email' && (
                                <input
                                    type="email"
                                    required={field.required}
                                    placeholder={field.placeholder}
                                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border text-gray-900 placeholder:text-gray-400"
                                    value={formData[field.id] || ''}
                                    onChange={e => handleChange(field.id, e.target.value, field)}
                                />
                            )}

                            {field.type === 'number' && (
                                <input
                                    type="number"
                                    required={field.required}
                                    placeholder={field.placeholder}
                                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border text-gray-900 placeholder:text-gray-400"
                                    value={formData[field.id] || ''}
                                    onChange={e => handleChange(field.id, e.target.value, field)}
                                />
                            )}

                            {field.type === 'textarea' && (
                                <textarea
                                    required={field.required}
                                    rows={4}
                                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border text-gray-900 placeholder:text-gray-400"
                                    value={formData[field.id] || ''}
                                    onChange={e => handleChange(field.id, e.target.value, field)}
                                />
                            )}

                            {field.type === 'select' && (
                                <select
                                    required={field.required}
                                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border text-gray-900"
                                    value={formData[field.id] || ''}
                                    onChange={e => handleChange(field.id, e.target.value, field)}
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
                                                onChange={() => handleChange(field.id, opt.value, field)}
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
                                        onChange={e => handleChange(field.id, e.target.checked, field)}
                                    />
                                    <span className="text-sm font-medium text-gray-700">{field.label}</span>
                                </label>
                            )}

                            {field.type === 'date' && (
                                <input
                                    type="date"
                                    required={field.required}
                                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border text-gray-900"
                                    value={formData[field.id] || ''}
                                    onChange={e => handleChange(field.id, e.target.value, field)}
                                />
                            )}

                            {/* Helper Text for Phone validation */}
                            {field.systemField === 'phone' && (
                                <p className="text-xs text-gray-500 mt-1">Formato: DDI + DDD + Número (ex: 5521999999999)</p>
                            )}

                        </div>
                    ))}

                    {error && (
                        <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4">
                        {onCancel && (
                            <button
                                type="button"
                                onClick={onCancel}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                Cancelar
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 flex items-center gap-2"
                        >
                            {submitting && <Loader2 className="animate-spin h-4 w-4" />}
                            Salvar e Qualificar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
