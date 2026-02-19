'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormField } from '@/components/settings/FormBuilderInternal';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
    const [users, setUsers] = useState<any[]>([]);
    const [tabulations, setTabulations] = useState<string[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [selectedResponsible, setSelectedResponsible] = useState<string>("");
    const [selectedTabulation, setSelectedTabulation] = useState<string>("");
    const [fields, setFields] = useState<FormField[]>([]);
    const [formData, setFormData] = useState<any>({});

    // Fetch Template & Admin Data
    useEffect(() => {
        const fetchAll = async () => {
            try {
                // Get User Info
                const storedUser = localStorage.getItem('user');
                let parsedUser = null;
                if (storedUser) {
                    parsedUser = JSON.parse(storedUser);
                    setCurrentUser(parsedUser);
                }

                const promises: Promise<any>[] = [
                    api.get('/form-templates/active?type=REGISTRATION').catch(() => ({ data: { fields: null } }))
                ];

                // If Admin/Supervisor, fetch users and tabulations
                if (parsedUser && (parsedUser.role === 'ADMIN' || parsedUser.role === 'SUPERVISOR')) {
                    promises.push(api.get('/users').catch(() => ({ data: [] })));
                    promises.push(api.get('/qualifications/tabulations').catch(() => ({ data: [] })));
                }

                const [templateRes, usersRes, tabsRes] = await Promise.all(promises);

                // Handle Template
                if (templateRes.data && templateRes.data.fields) {
                    setFields(templateRes.data.fields);
                } else {
                    // Fallback
                    setFields([
                        { id: 'sys_name', type: 'text', label: 'Razão Social', required: true, systemField: 'name', placeholder: 'Nome da Empresa' },
                        { id: 'sys_surname', type: 'text', label: 'Nome Fantasia / Contato', required: false, systemField: 'surname', placeholder: 'Nome Fantasia' },
                        { id: 'sys_cnpj', type: 'text', label: 'CNPJ', required: true, systemField: 'cnpj', placeholder: 'Apenas números' },
                        { id: 'sys_email', type: 'text', label: 'E-mail', required: true, systemField: 'email', placeholder: 'email@exemplo.com' },
                        { id: 'sys_phone', type: 'text', label: 'Telefone', required: true, systemField: 'phone', placeholder: '5521999999999' },
                    ]);
                }

                // Handle Admin Data
                if (usersRes?.data) {
                    setUsers(usersRes.data);
                    // Default to current user
                    setSelectedResponsible(parsedUser.id);
                }
                if (tabsRes?.data) {
                    setTabulations(Array.isArray(tabsRes.data) ? tabsRes.data : []);
                }

            } catch (error) {
                console.error("Failed to load data", error);
                // Fallback Layout
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    const handleReset = useCallback(() => {
        setStatus('form');
        setFormData({});
        setError('');
        setSubmitting(false);
        setCreatedClientId(null);
        setRetrySeconds(10);
        if (currentUser) setSelectedResponsible(currentUser.id);
        setSelectedTabulation("");
    }, [currentUser]);

    // Polling Logic
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (status === 'waiting' && createdClientId) {
            interval = setInterval(async () => {
                try {
                    const res = await api.get(`/clients/${createdClientId}`);
                    const client = res.data;
                    const integStatus = client.integration_status;

                    if (integStatus === 'Cadastro salvo com sucesso!') {
                        clearInterval(interval);
                        if (onSuccess) onSuccess(createdClientId);
                    } else if (integStatus && integStatus !== 'Pendente' && integStatus !== 'Cadastrando...') {
                        // Error or Rejection
                        clearInterval(interval);
                        setIntegrationStatusMessage(integStatus);
                        setStatus('error');
                    }
                } catch (err) {
                    console.error("Polling error", err);
                }
            }, 2000);
        }

        return () => clearInterval(interval);
    }, [status, createdClientId, onSuccess]);

    // Countdown Logic for Error State
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (status === 'error' && retrySeconds > 0) {
            timer = setTimeout(() => setRetrySeconds(prev => prev - 1), 1000);
        } else if (status === 'error' && retrySeconds === 0) {
            handleReset();
        }
        return () => clearTimeout(timer);
    }, [status, retrySeconds, handleReset]);

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

        setFormData((prev: any) => ({ ...prev, [fieldId]: finalValue }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        // Prepare Payload
        const payload: any = { answers: {} };

        // Admin Fields
        if (currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'SUPERVISOR')) {
            if (selectedResponsible) payload.created_by_id = selectedResponsible;
            if (selectedTabulation) payload.tabulacao = selectedTabulation;
        }

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

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

    if (status === 'waiting') {
        return (
            <Card className={`flex flex-col items-center justify-center p-12 ${className}`}>
                <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">Cadastrando...</h2>
                <p className="text-muted-foreground text-center">
                    Estamos validando o cadastro. Por favor, aguarde e não feche esta tela.
                </p>
            </Card>
        );
    }

    if (status === 'error') {
        return (
            <Card className={`flex flex-col items-center justify-center p-12 ${className}`}>
                <div className="h-12 w-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl">❌</span>
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">Cliente não será aproveitado</h2>
                <p className="text-muted-foreground text-center mb-6">
                    Motivo: <span className="font-mono bg-muted px-1 rounded text-foreground">{integrationStatusMessage}</span>
                </p>

                <div className="w-full bg-muted rounded-full h-2 mb-6 max-w-xs">
                    <div
                        className="bg-primary h-2 rounded-full transition-all duration-1000"
                        style={{ width: `${(retrySeconds / 10) * 100}%` }}
                    />
                </div>

                <p className="text-sm text-muted-foreground mb-6">
                    Retornando ao cadastro em {retrySeconds} segundos...
                </p>

                <Button
                    onClick={handleReset}
                    className="px-6 py-2"
                >
                    Cadastrar outro agora
                </Button>
            </Card>
        );
    }

    const isAdminOrSupervisor = currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'SUPERVISOR');

    return (
        <div className={cn("w-full max-w-2xl mx-auto", className)}>
            <Card className="border-border shadow-sm bg-card text-card-foreground">
                <CardHeader className="text-center pb-2">
                    <CardTitle className="text-2xl font-bold">Cadastro de Cliente</CardTitle>
                    <CardDescription>Preencha as informações abaixo para adicionar um novo cliente.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* ADMIN/SUPERVISOR FIELDS */}
                        {isAdminOrSupervisor && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg border border-border">
                                <div className="space-y-2">
                                    <Label className="text-foreground">Responsável *</Label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
                                        value={selectedResponsible}
                                        onChange={(e) => setSelectedResponsible(e.target.value)}
                                        required
                                    >
                                        <option value="">Selecione...</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>{u.name} {u.surname}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-foreground">Tabulação (Opcional)</Label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
                                        value={selectedTabulation}
                                        onChange={(e) => setSelectedTabulation(e.target.value)}
                                    >
                                        <option value="">Selecione...</option>
                                        {tabulations.map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        {fields.map((field) => (
                            <div key={field.id} className={field.type === 'checkbox' ? '' : 'space-y-2'}>
                                {field.type !== 'checkbox' && (
                                    <Label className="text-foreground">
                                        {field.label} {field.required && <span className="text-destructive">*</span>}
                                    </Label>
                                )}

                                {field.type === 'text' && (
                                    <Input
                                        type="text"
                                        required={field.required}
                                        placeholder={field.placeholder}
                                        value={formData[field.id] || ''}
                                        onChange={e => handleChange(field.id, e.target.value, field)}
                                    />
                                )}

                                {field.type === 'email' && (
                                    <Input
                                        type="email"
                                        required={field.required}
                                        placeholder={field.placeholder}
                                        value={formData[field.id] || ''}
                                        onChange={e => handleChange(field.id, e.target.value, field)}
                                    />
                                )}

                                {field.type === 'number' && (
                                    <Input
                                        type="number"
                                        required={field.required}
                                        placeholder={field.placeholder}
                                        value={formData[field.id] || ''}
                                        onChange={e => handleChange(field.id, e.target.value, field)}
                                    />
                                )}

                                {field.type === 'textarea' && (
                                    <textarea
                                        required={field.required}
                                        rows={4}
                                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
                                        value={formData[field.id] || ''}
                                        onChange={e => handleChange(field.id, e.target.value, field)}
                                    />
                                )}

                                {field.type === 'select' && (
                                    <select
                                        required={field.required}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
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
                                                    className="form-radio text-primary border-input bg-background focus:ring-primary accent-primary"
                                                    checked={formData[field.id] === opt.value}
                                                    onChange={() => handleChange(field.id, opt.value, field)}
                                                />
                                                <span className="ml-2 text-foreground text-sm">{opt.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}

                                {field.type === 'checkbox' && (
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            className="rounded border-input bg-background text-primary shadow-sm focus:ring-primary focus:ring-opacity-50 accent-primary"
                                            checked={formData[field.id] === true}
                                            onChange={e => handleChange(field.id, e.target.checked, field)}
                                        />
                                        <span className="text-sm font-medium text-foreground">{field.label}</span>
                                    </label>
                                )}

                                {field.type === 'date' && (
                                    <Input
                                        type="date"
                                        required={field.required}
                                        value={formData[field.id] || ''}
                                        onChange={e => handleChange(field.id, e.target.value, field)}
                                    />
                                )}

                                {/* Helper Text for Phone validation */}
                                {field.systemField === 'phone' && (
                                    <p className="text-xs text-muted-foreground mt-1">Formato: DDI + DDD + Número (ex: 5521999999999)</p>
                                )}

                            </div>
                        ))}

                        {error && (
                            <div className="text-destructive text-sm bg-destructive/10 p-3 rounded-md border border-destructive/20">
                                {error}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-2">
                            {onCancel && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={onCancel}
                                >
                                    Cancelar
                                </Button>
                            )}
                            <Button
                                type="submit"
                                disabled={submitting}
                            >
                                {submitting && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
                                Salvar e Qualificar
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
