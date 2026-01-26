'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Settings, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';

interface Pipeline {
    id: string;
    name: string;
    is_default: boolean;
    _count?: {
        stages: number;
        deals: number;
    }
}

export default function PipelinesSettingsPage() {
    const [pipelines, setPipelines] = useState<Pipeline[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        fetchPipelines();
    }, []);

    const fetchPipelines = async () => {
        try {
            setLoading(true);
            const res = await api.get('/pipelines');
            setPipelines(res.data);
        } catch (error) {
            console.error(error);
            toast({ title: 'Erro', description: 'Falha ao carregar pipelines', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const createPipeline = async () => {
        // For now, create with a default name and redirect to edit
        // Or open a modal. Let's do simple creation for speed.
        try {
            const res = await api.post('/pipelines', { name: 'Novo Pipeline' });
            toast({ title: 'Sucesso', description: 'Pipeline criado' });
            router.push(`/dashboard/settings/pipelines/${res.data.id}`);
        } catch (error) {
            toast({ title: 'Erro', description: 'Falha ao criar pipeline', variant: 'destructive' });
        }
    };

    const deletePipeline = async (id: string) => {
        if (!confirm('Tem certeza? Isso excluirá todos os deals associados.')) return;
        try {
            await api.delete(`/pipelines/${id}`);
            toast({ title: 'Sucesso', description: 'Pipeline removido' });
            fetchPipelines();
        } catch (error) {
            toast({ title: 'Erro', description: 'Falha ao remover pipeline', variant: 'destructive' });
        }
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Pipelines</h1>
                    <p className="text-gray-500 dark:text-gray-400">Gerencie seus fluxos de vendas e processos</p>
                </div>
                <Button onClick={createPipeline} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Pipeline
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pipelines.map((pipeline) => (
                    <Card key={pipeline.id} className="cursor-pointer hover:shadow-md transition-shadow border border-gray-100 dark:bg-zinc-900 dark:border-zinc-800/50" onClick={() => router.push(`/dashboard/settings/pipelines/${pipeline.id}`)}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium dark:text-gray-200">
                                {pipeline.name}
                                {pipeline.is_default && <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full dark:bg-green-900 dark:text-green-100">Padrão</span>}
                            </CardTitle>
                            <Settings className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold dark:text-gray-100">{pipeline._count?.stages || 0} Etapas</div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {pipeline._count?.deals || 0} negócios ativos
                            </p>

                            <div className="mt-4 flex justify-end" onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => deletePipeline(pipeline.id)}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
