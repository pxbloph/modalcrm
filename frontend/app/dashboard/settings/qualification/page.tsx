'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import FormBuilderInternal, { FormField } from '@/components/settings/FormBuilderInternal';
import { Loader2, Save } from 'lucide-react';

export default function QualificationSettingsPage() {
    const [fields, setFields] = useState<FormField[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Default System Fields (mapped to database columns to ensure backward compatibility)
    const defaultSystemFields: FormField[] = [
        { id: 'sys_client_name', type: 'text', label: 'Nome do Cliente', required: false, systemField: 'client_name' },
        { id: 'sys_maquininha_atual', type: 'select', label: 'Possui Maquininha Hoje?', required: false, systemField: 'maquininha_atual', options: [{ label: 'Nenhuma', value: 'Nenhuma' }, { label: 'Pagbank', value: 'Pagbank' }, { label: 'Mercado Pago', value: 'Mercado Pago' }, { label: 'Stone', value: 'Stone' }] },
        { id: 'sys_faturamento_maquina', type: 'number', label: 'Faturamento em Máquina (Mensal)', required: false, systemField: 'faturamento_maquina', placeholder: 'R$ 0,00' },
        { id: 'sys_faturamento_mensal', type: 'number', label: 'Faturamento Total (Mensal)', required: false, systemField: 'faturamento_mensal', placeholder: 'R$ 0,00' },
        { id: 'sys_produto_interesse', type: 'select', label: 'Produto de Interesse', required: false, systemField: 'produto_interesse', options: [{ label: 'Conta PJ', value: 'Conta PJ' }, { label: 'Boletos', value: 'Boletos' }] },
        { id: 'sys_emite_boletos', type: 'radio', label: 'Emite Boletos?', required: false, systemField: 'emite_boletos', options: [{ label: 'Sim', value: 'true' }, { label: 'Não', value: 'false' }] },
        { id: 'sys_tabulacao', type: 'select', label: 'Tabulação', required: true, systemField: 'tabulacao', options: [{ label: 'Chamar no WhatsApp', value: 'Chamar no WhatsApp' }, { label: 'Não tem interesse', value: 'Não tem interesse' }] },
        { id: 'sys_obs', type: 'textarea', label: 'Informações Adicionais', required: false, systemField: 'informacoes_adicionais' },
    ];

    useEffect(() => {
        const fetchTemplate = async () => {
            try {
                const res = await api.get('/form-templates/active');
                if (res.data) {
                    setFields(res.data.fields as FormField[]);
                } else {
                    // Start with default system fields if no template exists
                    setFields(defaultSystemFields);
                }
            } catch (error) {
                console.error("Failed to fetch template", error);
                setFields(defaultSystemFields);
            } finally {
                setLoading(false);
            }
        };
        fetchTemplate();
    }, []);

    const handleSave = async () => {
        if (!confirm('Deseja salvar e publicar este modelo de formulário? Todos os operadores verão as alterações imediatamente.')) return;

        setSaving(true);
        try {
            await api.post('/form-templates', {
                title: `Versão ${new Date().toLocaleString()}`,
                fields
            });
            alert('Formulário salvo e publicado com sucesso!');
        } catch (error) {
            console.error("Failed to save template", error);
            alert('Erro ao salvar formulário.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-12 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-indigo-600" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Configurar Qualificação</h1>
                    <p className="text-gray-500 mt-1">Personalize os campos e opções do formulário de qualificação.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 flex items-center gap-2 shadow-sm disabled:opacity-70"
                >
                    {saving ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />}
                    Salvar e Publicar
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[600px]">
                <FormBuilderInternal fields={fields} onChange={setFields} />
            </div>
        </div>
    );
}
