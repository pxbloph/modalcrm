'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Loader2, Save, Trash2, Plus, Info } from 'lucide-react';

interface PipelineStage {
    id: string;
    name: string;
    pipeline_id: string;
}

interface Pipeline {
    id: string;
    name: string;
    is_default: boolean;
    stages: PipelineStage[];
}

interface Tabulation {
    id: string;
    label: string;
    is_active: boolean;
    target_stage_id: string | null;
}

export default function TabulationsSettingsPage() {
    const [tabulations, setTabulations] = useState<Tabulation[]>([]);
    const [pipelines, setPipelines] = useState<Pipeline[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null); // id of item being saved
    const [newItemLabel, setNewItemLabel] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [tabsRes, pipesRes] = await Promise.all([
                api.get('/tabulations'),
                api.get('/pipelines')
            ]);
            setTabulations(tabsRes.data);
            setPipelines(pipesRes.data);
        } catch (error) {
            console.error("Failed to fetch data", error);
            alert('Erro ao carregar dados. Verifique se você é Administrador.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newItemLabel.trim()) return;
        setSaving('new');
        try {
            const res = await api.post('/tabulations', { label: newItemLabel });
            setTabulations([...tabulations, res.data]);
            setNewItemLabel('');
        } catch (error) {
            console.error("Failed to create", error);
            alert('Erro ao criar tabulação.');
        } finally {
            setSaving(null);
        }
    };

    const handleUpdate = async (id: string, data: Partial<Tabulation>) => {
        // Optimistic update
        const oldState = [...tabulations];
        setTabulations(tabulations.map(t => t.id === id ? { ...t, ...data } : t));

        try {
            await api.put(`/tabulations/${id}`, data);
        } catch (error) {
            console.error("Failed to update", error);
            alert('Erro ao atualizar. Revertendo...');
            setTabulations(oldState);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta tabulação?')) return;

        try {
            await api.delete(`/tabulations/${id}`);
            setTabulations(tabulations.filter(t => t.id !== id));
        } catch (error) {
            console.error("Failed to delete", error);
            alert('Erro ao excluir.');
        }
    };

    // Flatten stages for easy selection (group by pipeline)
    // We prioritize Default Pipeline
    const defaultPipeline = pipelines.find(p => p.is_default) || pipelines[0];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-card p-6 rounded-xl shadow-sm border border-border">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Gerenciar Tabulações</h1>
                    <p className="text-muted-foreground mt-1">Aqui você define as opções de tabulação e o mapeamento para fases do Kanban.</p>
                </div>
            </div>

            <div className="bg-blue-50/50 border border-blue-200/50 text-blue-800 dark:text-blue-200 px-4 py-3 rounded-lg flex items-start gap-3">
                <Info className="h-5 w-5 mt-0.5 shrink-0" />
                <p className="text-sm">
                    Quando um operador selecionar uma tabulação que possui "Fase Destino" configurada, o card do cliente no Kanban será movido automaticamente para essa fase.
                    <br />
                    <strong>Dica:</strong> Use isso para automações como "Venda Realizada" &rarr; Fase Ganho.
                </p>
            </div>

            <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Nome da Tabulação</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Fase Destino (Kanban)</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Ativo</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                        {loading ? (
                            <tr><td colSpan={4} className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></td></tr>
                        ) : tabulations.map((tab) => (
                            <tr key={tab.id} className="hover:bg-muted/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <input
                                        type="text"
                                        className="bg-transparent border-none focus:ring-0 p-0 font-medium text-foreground w-full placeholder:text-muted-foreground"
                                        value={tab.label}
                                        onChange={(e) => handleUpdate(tab.id, { label: e.target.value })}
                                        onBlur={(e) => handleUpdate(tab.id, { label: e.target.value })}
                                    />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <select
                                        className="block w-full pl-3 pr-10 py-2 text-base border-input bg-background focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md text-foreground"
                                        value={tab.target_stage_id || ''}
                                        onChange={(e) => handleUpdate(tab.id, { target_stage_id: e.target.value || null })}
                                    >
                                        <option value="">-- Sem movimento --</option>
                                        {defaultPipeline?.stages?.map(stage => (
                                            <option key={stage.id} value={stage.id}>
                                                {stage.name}
                                            </option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <button
                                        onClick={() => handleUpdate(tab.id, { is_active: !tab.is_active })}
                                        className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${tab.is_active ? 'bg-primary' : 'bg-muted'}`}
                                    >
                                        <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${tab.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => handleDelete(tab.id)} className="text-destructive hover:text-destructive/80 p-2">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}

                        {/* New Item Row */}
                        <tr className="bg-muted/30">
                            <td className="px-6 py-4 whitespace-nowrap">
                                <input
                                    type="text"
                                    placeholder="Nova tabulação..."
                                    className="block w-full border-input bg-background rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm text-foreground placeholder:text-muted-foreground"
                                    value={newItemLabel}
                                    onChange={(e) => setNewItemLabel(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                                    autoFocus // Helper to type immediately
                                />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-muted-foreground text-sm italic">
                                . . .
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span className="inline-block h-5 w-5 rounded-full bg-primary/50"></span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                <button
                                    onClick={handleCreate}
                                    disabled={!newItemLabel.trim() || saving === 'new'}
                                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none disabled:opacity-50 transition-colors"
                                >
                                    {saving === 'new' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                    <span className="ml-2">Adicionar</span>
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
