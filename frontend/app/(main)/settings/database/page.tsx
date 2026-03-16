'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type DbLog = {
    id: string;
    timestamp: string;
    durationMs: number;
    query: string;
    params: string;
    target?: string;
};

export default function DatabaseSettingsPage() {
    const [databaseUrl, setDatabaseUrl] = useState('');
    const [maskedUrl, setMaskedUrl] = useState('');
    const [runtimeConnection, setRuntimeConnection] = useState<any>(null);
    const [logs, setLogs] = useState<DbLog[]>([]);
    const [loadingConnection, setLoadingConnection] = useState(false);
    const [savingConnection, setSavingConnection] = useState(false);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [limit, setLimit] = useState(300);

    const sortedLogs = useMemo(
        () => [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
        [logs],
    );

    const loadConnection = async () => {
        setLoadingConnection(true);
        try {
            const res = await api.get('/database-settings/connection');
            setMaskedUrl(res.data?.configured_database_url_masked || '');
            setRuntimeConnection(res.data?.runtime_connection || null);
        } catch (error: any) {
            console.error(error);
            alert(error?.response?.data?.message || 'Erro ao carregar conexão atual do banco.');
        } finally {
            setLoadingConnection(false);
        }
    };

    const loadLogs = async (customLimit?: number) => {
        setLoadingLogs(true);
        try {
            const useLimit = customLimit ?? limit;
            const res = await api.get('/database-settings/logs', { params: { limit: useLimit } });
            setLogs(res.data?.logs || []);
        } catch (error: any) {
            console.error(error);
            alert(error?.response?.data?.message || 'Erro ao carregar logs do banco.');
        } finally {
            setLoadingLogs(false);
        }
    };

    useEffect(() => {
        loadConnection();
        loadLogs();
    }, []);

    const handleSaveConnection = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!databaseUrl.trim()) {
            alert('Informe a DATABASE_URL para aplicar a troca de banco.');
            return;
        }

        setSavingConnection(true);
        try {
            const res = await api.put('/database-settings/connection', { database_url: databaseUrl.trim() });
            alert(res.data?.message || 'Conexão do banco atualizada.');
            setDatabaseUrl('');
            setMaskedUrl(res.data?.configured_database_url_masked || '');
            setRuntimeConnection(res.data?.current_runtime_connection || null);
            await loadLogs();
        } catch (error: any) {
            console.error(error);
            alert(error?.response?.data?.message || 'Erro ao atualizar conexão do banco.');
        } finally {
            setSavingConnection(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="rounded-2xl border bg-gradient-to-r from-card via-card to-muted/20 p-6 shadow-sm">
                <h1 className="text-2xl font-bold tracking-tight">Conexão com Banco de Dados</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Troque a conexão do PostgreSQL e monitore os logs SQL da aplicação em tempo real.
                </p>
            </div>

            <form onSubmit={handleSaveConnection} className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
                <div className="space-y-2">
                    <Label>Conexão atual (mascarada)</Label>
                    <Input value={loadingConnection ? 'Carregando...' : maskedUrl || 'Não configurada'} readOnly />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg border bg-muted/20 p-3">
                        <div className="font-medium">Banco ativo em runtime</div>
                        <div className="text-muted-foreground mt-1">{runtimeConnection?.database || '-'}</div>
                    </div>
                    <div className="rounded-lg border bg-muted/20 p-3">
                        <div className="font-medium">Host/Usuário</div>
                        <div className="text-muted-foreground mt-1">
                            {runtimeConnection?.host || '-'} / {runtimeConnection?.user || '-'}
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Nova DATABASE_URL</Label>
                    <Input
                        placeholder="postgresql://usuario:senha@host:5432/database?sslmode=require"
                        value={databaseUrl}
                        onChange={(e) => setDatabaseUrl(e.target.value)}
                    />
                </div>

                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
                    A aplicação tenta aplicar a conexão imediatamente. Se o runtime não aplicar, a conexão fica salva no arquivo `.env` e você deve reiniciar o backend.
                </div>

                <Button type="submit" disabled={savingConnection}>
                    {savingConnection ? 'Aplicando conexão...' : 'Salvar e aplicar conexão'}
                </Button>
            </form>

            <div className="rounded-xl border bg-card shadow-sm">
                <div className="border-b p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                    <div>
                        <h2 className="font-semibold">Logs do Banco de Dados</h2>
                        <p className="text-xs text-muted-foreground">Consultas SQL executadas pela aplicação (Prisma).</p>
                    </div>
                    <div className="flex gap-2 items-center">
                        <Input
                            className="w-28"
                            type="number"
                            min={10}
                            max={5000}
                            value={limit}
                            onChange={(e) => setLimit(Number(e.target.value) || 300)}
                        />
                        <Button variant="outline" onClick={() => loadLogs(limit)} disabled={loadingLogs}>
                            {loadingLogs ? 'Atualizando...' : 'Atualizar logs'}
                        </Button>
                    </div>
                </div>

                <div className="max-h-[65vh] overflow-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/60 sticky top-0">
                            <tr>
                                <th className="text-left p-3">Data/Hora</th>
                                <th className="text-left p-3">Duração</th>
                                <th className="text-left p-3">Query</th>
                                <th className="text-left p-3">Parâmetros</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedLogs.map((log) => (
                                <tr key={log.id} className="border-t align-top">
                                    <td className="p-3 whitespace-nowrap">{new Date(log.timestamp).toLocaleString('pt-BR')}</td>
                                    <td className="p-3 whitespace-nowrap">{log.durationMs} ms</td>
                                    <td className="p-3 font-mono text-xs break-all">{log.query}</td>
                                    <td className="p-3 font-mono text-xs break-all text-muted-foreground">{log.params}</td>
                                </tr>
                            ))}
                            {sortedLogs.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-6 text-center text-muted-foreground">
                                        Nenhum log disponível no momento.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
