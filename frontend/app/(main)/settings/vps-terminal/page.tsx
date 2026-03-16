'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type TerminalEntry = {
    id: string;
    command: string;
    timestamp: string;
    ok: boolean;
    stdout: string;
    stderr: string;
    exit_code: number | null;
    duration_ms: number;
};

export default function VpsTerminalPage() {
    const [status, setStatus] = useState<any>(null);
    const [loadingStatus, setLoadingStatus] = useState(false);
    const [testingConnection, setTestingConnection] = useState(false);
    const [executing, setExecuting] = useState(false);
    const [command, setCommand] = useState('');
    const [timeoutMs, setTimeoutMs] = useState(30000);
    const [history, setHistory] = useState<TerminalEntry[]>([]);

    const terminalOutput = useMemo(() => {
        if (history.length === 0) {
            return '# Terminal Linux VPS\n# Aguardando comando...';
        }

        return history
            .map((item) => {
                const statusText = item.ok ? 'OK' : `ERRO (${item.exit_code ?? 'sem código'})`;
                return [
                    `$ ${item.command}`,
                    `[${new Date(item.timestamp).toLocaleString('pt-BR')}] ${statusText} em ${item.duration_ms}ms`,
                    item.stdout ? `STDOUT:\n${item.stdout}` : '',
                    item.stderr ? `STDERR:\n${item.stderr}` : '',
                ].filter(Boolean).join('\n');
            })
            .join('\n\n----------------------------------------\n\n');
    }, [history]);

    const loadStatus = async () => {
        setLoadingStatus(true);
        try {
            const res = await api.get('/vps-terminal/status');
            setStatus(res.data || null);
        } catch (error: any) {
            console.error(error);
            alert(error?.response?.data?.message || 'Erro ao carregar status do terminal da VPS.');
        } finally {
            setLoadingStatus(false);
        }
    };

    useEffect(() => {
        loadStatus();
    }, []);

    const handleTestConnection = async () => {
        setTestingConnection(true);
        try {
            const res = await api.post('/vps-terminal/test-connection');
            alert(res.data?.message || 'Conexão testada com sucesso.');
            await loadStatus();
        } catch (error: any) {
            console.error(error);
            alert(error?.response?.data?.message || 'Falha no teste de conexão com a VPS.');
        } finally {
            setTestingConnection(false);
        }
    };

    const handleExecute = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!command.trim()) {
            alert('Digite um comando para executar.');
            return;
        }

        setExecuting(true);
        try {
            const res = await api.post('/vps-terminal/execute', {
                command: command.trim(),
                timeout_ms: timeoutMs,
            });

            const entry: TerminalEntry = {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                command: res.data?.command || command.trim(),
                timestamp: new Date().toISOString(),
                ok: Boolean(res.data?.ok),
                stdout: String(res.data?.stdout || ''),
                stderr: String(res.data?.stderr || ''),
                exit_code: res.data?.exit_code ?? null,
                duration_ms: Number(res.data?.duration_ms || 0),
            };

            setHistory((prev) => [entry, ...prev].slice(0, 80));
            setCommand('');
        } catch (error: any) {
            console.error(error);
            alert(error?.response?.data?.message || 'Erro ao executar comando na VPS.');
        } finally {
            setExecuting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="rounded-2xl border bg-gradient-to-r from-card via-card to-muted/20 p-6 shadow-sm">
                <h1 className="text-2xl font-bold tracking-tight">Terminal Linux da VPS</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Acesso administrativo crítico para diagnóstico e operação da infraestrutura.
                </p>
            </div>

            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                    <div className="rounded-lg border bg-muted/20 p-3">
                        <div className="font-medium">Status</div>
                        <div className="text-muted-foreground mt-1">
                            {loadingStatus ? 'Carregando...' : status?.enabled ? 'Habilitado' : 'Desabilitado'}
                        </div>
                    </div>
                    <div className="rounded-lg border bg-muted/20 p-3">
                        <div className="font-medium">Host</div>
                        <div className="text-muted-foreground mt-1">{status?.host || '-'}</div>
                    </div>
                    <div className="rounded-lg border bg-muted/20 p-3">
                        <div className="font-medium">Usuário</div>
                        <div className="text-muted-foreground mt-1">{status?.username || '-'}</div>
                    </div>
                    <div className="rounded-lg border bg-muted/20 p-3">
                        <div className="font-medium">Porta</div>
                        <div className="text-muted-foreground mt-1">{status?.port || '-'}</div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" disabled={testingConnection} onClick={handleTestConnection}>
                        {testingConnection ? 'Testando conexão...' : 'Testar conexão SSH'}
                    </Button>
                    <Button variant="outline" onClick={loadStatus} disabled={loadingStatus}>
                        {loadingStatus ? 'Atualizando...' : 'Atualizar status'}
                    </Button>
                </div>

                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
                    Função altamente sensível. Apenas perfis com permissões de infraestrutura crítica devem possuir acesso.
                </div>
            </div>

            <form onSubmit={handleExecute} className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
                <div className="space-y-2">
                    <Label>Comando Linux</Label>
                    <Input
                        placeholder="ex.: df -h"
                        value={command}
                        onChange={(e) => setCommand(e.target.value)}
                    />
                </div>

                <div className="space-y-2 md:max-w-xs">
                    <Label>Timeout (ms)</Label>
                    <Input
                        type="number"
                        min={5000}
                        max={120000}
                        value={timeoutMs}
                        onChange={(e) => setTimeoutMs(Number(e.target.value) || 30000)}
                    />
                </div>

                <Button type="submit" disabled={executing}>
                    {executing ? 'Executando...' : 'Executar comando'}
                </Button>
            </form>

            <div className="rounded-xl border bg-card shadow-sm">
                <div className="border-b p-4 flex items-center justify-between">
                    <h2 className="font-semibold">Saída do terminal</h2>
                    <Button variant="outline" onClick={() => setHistory([])}>Limpar histórico</Button>
                </div>
                <div className="p-4">
                    <pre className="bg-black text-green-400 rounded-lg p-4 min-h-[360px] max-h-[65vh] overflow-auto text-xs leading-relaxed whitespace-pre-wrap">
                        {terminalOutput}
                    </pre>
                </div>
            </div>
        </div>
    );
}
