'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import FormBuilderInternal, { FormField } from '@/components/settings/FormBuilderInternal';
import { Loader2, Save } from 'lucide-react';

export default function RegistrationSettingsPage() {
    const [fields, setFields] = useState<FormField[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Default System Fields for Registration
    // These maps to strictly required columns in the `clients` table
    const defaultSystemFields: FormField[] = [
        { id: 'sys_name', type: 'text', label: 'Razão Social', required: true, systemField: 'name', placeholder: 'Nome da Empresa' },
        { id: 'sys_surname', type: 'text', label: 'Nome Fantasia / Contato', required: false, systemField: 'surname', placeholder: 'Nome Fantasia' },
        { id: 'sys_cnpj', type: 'text', label: 'CNPJ', required: true, systemField: 'cnpj', placeholder: 'Apenas números' },
        { id: 'sys_email', type: 'text', label: 'E-mail', required: true, systemField: 'email', placeholder: 'email@exemplo.com' },
        { id: 'sys_phone', type: 'text', label: 'Telefone', required: true, systemField: 'phone', placeholder: '5521999999999' },
        // Optional Fields that might become standard
        { id: 'sys_origem', type: 'select', label: 'Origem', required: false, systemField: 'origem', options: [{ label: 'Google', value: 'Google' }, { label: 'Indicação', value: 'Indicação' }, { label: 'Instagram', value: 'Instagram' }] },
    ];

    useEffect(() => {
        const fetchTemplate = async () => {
            try {
                // Fetch template specifically for REGISTRATION type
                const res = await api.get('/form-templates/active?type=REGISTRATION');
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
        if (!confirm('Deseja salvar e publicar este formulário de cadastro?')) return;

        setSaving(true);
        try {
            await api.post('/form-templates', {
                title: `Cadastro Versão ${new Date().toLocaleString()}`,
                fields,
                type: 'REGISTRATION'
            });
            alert('Formulário de cadastro salvo e publicado com sucesso!');
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
            <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-200 dark:bg-zinc-900 dark:border-zinc-800">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Configurar Cadastro</h1>
                    <p className="text-gray-500 mt-1 dark:text-gray-400">Personalize os campos do formulário de novos clientes.</p>
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

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[600px] dark:bg-zinc-900 dark:border-zinc-800">
                <div className="mb-6 bg-blue-50 border border-blue-100 p-4 rounded-lg dark:bg-blue-900/20 dark:border-blue-900/30">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>Atenção:</strong> Campos como Razão Social, CNPJ, E-mail e Telefone são essenciais para o sistema.
                        Evite removê-los ou desativar sua obrigatoriedade para garantir o funcionamento correto das integrações.
                    </p>
                </div>
                <FormBuilderInternal fields={fields} onChange={setFields} />
            </div>
        </div>
    );
}
