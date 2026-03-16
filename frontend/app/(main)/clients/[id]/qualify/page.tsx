'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FormField } from '@/components/settings/FormBuilderInternal';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { QualificationRadioGroup } from '@/components/crm/ClientDealModal/QualificationRadioGroup';

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

    const normalizeField = (field: FormField): FormField => {
        if (field.type !== 'select') {
            return field;
        }

        return {
            ...field,
            type: 'radio',
        };
    };

    useEffect(() => {
        const loadData = async () => {
            if (!params?.id) return;
            try {
                // Parallel fetch: Client + Active Template + Tabulations
                const [clientRes, templateRes, tabsRes] = await Promise.all([
                    api.get(`/clients/${params.id}`),
                    api.get('/form-templates/active'),
                    api.get('/clients/tabulations').catch(() => ({ data: [] }))
                ]);

                setClient(clientRes.data);

                // Map Tabulations from API
                const correctTabulacaoOptions = Array.isArray(tabsRes.data)
                    ? tabsRes.data.map((t: any) => ({
                        label: typeof t === 'string' ? t : t.label,
                        value: typeof t === 'string' ? t : t.label
                    }))
                    : [
                        { label: 'Aguardando abertura', value: 'Aguardando abertura' },
                        { label: 'Retornar outro horário', value: 'Retornar outro horário' },
                        { label: 'Conta aberta', value: 'Conta aberta' }
                    ];

                let finalFields: FormField[] = [];

                if (templateRes.data && templateRes.data.fields) {
                    finalFields = templateRes.data.fields.map((field: FormField) => normalizeField(field));
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
                        return normalizeField({ ...f, options: correctTabulacaoOptions, required: true });
                    }
                    return normalizeField(f);
                });

                // Ensure Agendamento field exists logic
                const hasAgendamento = finalFields.find(f => f.systemField === 'agendamento');
                if (!hasAgendamento) {
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

                // Ensure Account Opening Date field exists logic
                const hasAccDate = finalFields.find(f => f.systemField === 'account_opening_date');
                if (!hasAccDate) {
                    const tabIndex = finalFields.findIndex(f => f.systemField === 'tabulacao');
                    const accField: FormField = {
                        id: 'sys_account_opening_date',
                        type: 'date',
                        label: 'Data de Abertura da Conta',
                        required: true,
                        systemField: 'account_opening_date'
                    };
                    if (tabIndex >= 0) {
                        finalFields.splice(tabIndex + 1, 0, accField);
                    } else {
                        finalFields.push(accField);
                    }
                }

                const initialFormData: Record<string, unknown> = {};

                finalFields.forEach((field) => {
                    if (field.systemField === 'client_name') {
                        initialFormData[field.id] = clientRes.data?.name || '';
                    }

                    if (field.systemField === 'tabulacao' && clientRes.data?.tabulacao) {
                        initialFormData[field.id] = clientRes.data.tabulacao;
                    }

                    if (field.systemField === 'maquininha_atual') {
                        const saved = clientRes.data?.maquininha_atual;
                        initialFormData[field.id] = saved
                            ? saved.split(', ').map((v: string) => v.trim()).filter(Boolean)
                            : ['Nenhuma'];
                    }
                });

                setFields(finalFields);
                setFormData(initialFormData);

            } catch (err) {
                console.error(err);
                setError('Erro ao carregar dados.');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [params?.id]);

    const parseCurrencyToNumber = (value: unknown) => {
        if (typeof value === 'number') return value;
        if (typeof value !== 'string' || !value) return 0;

        const normalized = value.replace(/[^\d,]/g, '').replace(',', '.');
        const parsed = parseFloat(normalized);
        return Number.isNaN(parsed) ? 0 : parsed;
    };

    const getNumberRangeOptions = () => [
        { label: '0 a 10 mil', value: '0' },
        { label: '11 a 20 mil', value: '11000' },
        { label: '21 a 50 mil', value: '21000' },
        { label: '51 a 100 mil', value: '51000' },
        { label: 'Acima de 100 mil', value: '100001' },
    ];

    const handleChange = (fieldId: string, value: any, type: string) => {
        if (type === 'number') {
            setFormData(prev => ({ ...prev, [fieldId]: Number(value) || 0 }));
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
                    if (field.systemField === 'maquininha_atual') {
                        const arr = Array.isArray(value) ? value : ['Nenhuma'];
                        payload[field.systemField] = arr.join(', ');
                    } else if (field.type === 'number') {
                        payload[field.systemField] = parseCurrencyToNumber(value);
                    } else if (field.type === 'radio') {
                        // Só converte para boolean se as opções do campo são true/false
                        const isBooleanField = field.options?.every(o => o.value === 'true' || o.value === 'false');
                        payload[field.systemField] = isBooleanField ? value === 'true' : value;
                    } else if (field.type === 'datetime-local' && value) {
                        // Append São Paulo offset to avoid UTC misinterpretation
                        // "2026-03-12T14:30" → "2026-03-12T14:30:00-03:00"
                        const normalized = value.length === 16 ? `${value}:00-03:00` : value;
                        payload[field.systemField] = normalized;
                    } else {
                        payload[field.systemField] = value;
                    }
                } else {
                    // Dynamic Answer
                    payload.answers[field.label] = value; // Saving by Label for readability, or use ID. Label is better for display if ID is obscure.
                }
            });

            const response = await api.put(`/clients/${params?.id}`, payload);

            if (response.data.integration_status === 'FAILED') {
                // Show warning but redirect as it was saved
                alert('Qualificação salva com sucesso!\n\nPorém, houve uma falha ao enviar para a integração. O sistema registrou a tentativa e tentará novamente em breve.');
            }

            // Redirect to Kanban instead of root
            router.push('/kanban');
        } catch (err) {
            console.error(err);
            setError('Erro ao salvar qualificação.');
            setSubmitting(false);
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
    if (!client) return <div className="p-8 text-center text-muted-foreground">Cliente não encontrado.</div>;

    return (
        <div className="max-w-3xl mx-auto py-8 px-4">
            <Button
                variant="ghost"
                onClick={() => router.back()}
                className="mb-4 pl-0 hover:pl-0 hover:bg-transparent text-muted-foreground hover:text-foreground"
            >
                <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
            </Button>

            <Card className="overflow-hidden border-border shadow-md">
                <div className="bg-primary px-6 py-4">
                    <h1 className="text-xl font-bold text-primary-foreground">Qualificação de Cliente</h1>
                    <p className="text-primary-foreground/90 text-sm mt-0.5">Complemente os dados para avançar</p>
                </div>

                <CardContent className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {fields.map((field) => {
                            // Conditional Logic for Agendamento
                            if (field.systemField === 'agendamento') {
                                const tabField = fields.find(f => f.systemField === 'tabulacao');
                                const currentTabValue = tabField ? formData[tabField.id] : '';
                                if (currentTabValue !== 'Retornar outro horário') {
                                    return null; // Hide field
                                }
                            }

                            if (field.systemField === 'account_opening_date') {
                                const tabField = fields.find(f => f.systemField === 'tabulacao');
                                const currentTabValue = tabField ? formData[tabField.id] : '';
                                if (currentTabValue !== 'Conta aberta') {
                                    return null; // Hide field
                                }
                            }

                            return (
                                <div key={field.id} className={field.type === 'checkbox' ? '' : 'space-y-2'}>
                                    {field.type !== 'checkbox' && (
                                        <Label className="text-foreground">
                                            {field.label} {field.required && <span className="text-destructive">*</span>}
                                        </Label>
                                    )}

                                    {/* Render Input based on Type */}
                                    {field.type === 'text' && (
                                        <Input
                                            type="text"
                                            required={field.required}
                                            placeholder={field.placeholder}
                                            value={formData[field.id] || ''}
                                            onChange={e => handleChange(field.id, e.target.value, 'text')}
                                        />
                                    )}

                                    {field.type === 'textarea' && (
                                        <textarea
                                            required={field.required}
                                            rows={4}
                                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
                                            value={formData[field.id] || ''}
                                            onChange={e => handleChange(field.id, e.target.value, 'textarea')}
                                        />
                                    )}

                                    {field.type === 'number' && (
                                        <div className="rounded-lg border border-border bg-muted/20 p-3">
                                            <QualificationRadioGroup
                                                name={field.id}
                                                value={String(formData[field.id] ?? '')}
                                                onChange={(value) => handleChange(field.id, value, 'number')}
                                                options={getNumberRangeOptions()}
                                                required={field.required}
                                            />
                                        </div>
                                    )}

                                    {(field.type === 'select' || field.type === 'radio') && field.systemField === 'maquininha_atual' && (
                                        <div className="rounded-lg border border-border bg-muted/20 p-3">
                                            <div className="flex flex-wrap gap-2">
                                                {(field.options ?? []).map((opt) => {
                                                    const current: string[] = Array.isArray(formData[field.id]) ? formData[field.id] : ['Nenhuma'];
                                                    const isSelected = current.includes(opt.value);
                                                    return (
                                                        <button
                                                            key={opt.value}
                                                            type="button"
                                                            onClick={() => {
                                                                const prev: string[] = Array.isArray(formData[field.id]) ? formData[field.id] : ['Nenhuma'];
                                                                if (opt.value === 'Nenhuma') {
                                                                    handleChange(field.id, ['Nenhuma'], 'multiselect');
                                                                } else {
                                                                    const withoutNenhuma = prev.filter(v => v !== 'Nenhuma' && v !== opt.value);
                                                                    if (isSelected) {
                                                                        const next = withoutNenhuma.length > 0 ? withoutNenhuma : ['Nenhuma'];
                                                                        handleChange(field.id, next, 'multiselect');
                                                                    } else {
                                                                        handleChange(field.id, [...withoutNenhuma, opt.value], 'multiselect');
                                                                    }
                                                                }
                                                            }}
                                                            className={cn(
                                                                'inline-flex items-center px-3 py-1.5 rounded-full border',
                                                                'text-xs font-semibold select-none transition-all duration-150',
                                                                isSelected
                                                                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                                                    : 'bg-input/20 text-muted-foreground border-input hover:border-primary/50 hover:text-foreground hover:bg-muted/50 cursor-pointer'
                                                            )}
                                                        >
                                                            {opt.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {(field.type === 'select' || field.type === 'radio') && field.systemField !== 'maquininha_atual' && (
                                        <div className="rounded-lg border border-border bg-muted/20 p-3">
                                            <QualificationRadioGroup
                                                name={field.id}
                                                value={formData[field.id] || ''}
                                                onChange={(value) => handleChange(field.id, value, field.type)}
                                                options={field.options ?? []}
                                                required={field.required}
                                            />
                                        </div>
                                    )}

                                    {field.type === 'checkbox' && (
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                className="rounded border-input bg-background text-primary shadow-sm focus:ring-primary focus:ring-opacity-50 accent-primary"
                                                checked={formData[field.id] === true}
                                                onChange={e => handleChange(field.id, e.target.checked, 'checkbox')}
                                            />
                                            <span className="text-sm font-medium text-foreground">{field.label}</span>
                                        </label>
                                    )}

                                    {(field.type === 'date' || field.type === 'datetime-local') && (
                                        <Input
                                            type="datetime-local"
                                            required={field.required}
                                            value={formData[field.id] || ''}
                                            onChange={e => handleChange(field.id, e.target.value, 'date')}
                                        />
                                    )}
                                </div>
                            );
                        })}

                        {error && (
                            <div className="text-destructive text-sm bg-destructive/10 p-3 rounded-md border border-destructive/20">
                                {error}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-4 border-t border-border">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.back()}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={submitting}
                            >
                                {submitting ? <Loader2 className="animate-spin h-4 w-4" /> : <><CheckCircle className="h-4 w-4 mr-2" /> Concluir</>}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}



