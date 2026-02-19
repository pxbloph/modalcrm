"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    Search,
    Filter,
    Eye,
    ChevronLeft,
    ChevronRight,
    AlertTriangle,
    CheckCircle,
    Info,
    ShieldAlert
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import api from "@/lib/api"; // Assuming default api instance
import { useToast } from "@/components/ui/use-toast";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type AuditLog = {
    id: string;
    created_at: string;
    level: string;
    event_type: string;
    entity_type: string;
    entity_id: string;
    action: string;
    actor?: { name: string; email: string };
    request_id: string;
    ip_address: string;
    error_message?: string;
    payload?: {
        before?: any;
        after?: any;
        metadata?: any;
    };
};

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [users, setUsers] = useState<{ id: string, name: string, surname?: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [actionFilter, setActionFilter] = useState("ALL");
    const [actorFilter, setActorFilter] = useState("ALL");
    const { toast } = useToast();

    useEffect(() => {
        // Fetch ALL users for filter (scope=full ensures we get everyone, even for Supervisors)
        api.get('/users?scope=full').then(res => setUsers(res.data)).catch(err => console.error("Failed to load users", err));
    }, []);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: String(page),
                limit: "20",
            });
            if (search) params.append("search", search);
            if (actionFilter && actionFilter !== "ALL") params.append("action", actionFilter);
            if (actorFilter && actorFilter !== "ALL") params.append("actor_id", actorFilter);

            const response = await api.get(`/audit-logs?${params.toString()}`);
            setLogs(response.data.data);
            setTotalPages(response.data.meta.totalPages);
        } catch (error) {
            console.error(error);
            toast({
                title: "Erro ao carregar logs",
                description: "Não foi possível buscar os dados de auditoria.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchLogs();
        }, 500);
        return () => clearTimeout(timer);
    }, [page, search, actionFilter, actorFilter]);

    const getLevelBadge = (level: string) => {
        switch (level) {
            case "ERROR": return <Badge variant="destructive">ERR</Badge>;
            case "WARN": return <Badge variant="secondary" className="bg-yellow-500 text-white hover:bg-yellow-600">WARN</Badge>;
            case "INFO": return <Badge variant="secondary" className="bg-blue-500 text-white hover:bg-blue-600">INFO</Badge>;
            default: return <Badge variant="outline">{level}</Badge>;
        }
    };

    const openDetails = async (log: AuditLog) => {
        // If payload is missing (list view might exclude it for performance), fetch details
        if (!log.payload) {
            try {
                const res = await api.get(`/audit-logs/${log.id}`);
                setSelectedLog(res.data);
            } catch (e) {
                toast({ title: "Erro", description: "Falha ao carregar detalhes.", variant: "destructive" });
            }
        } else {
            setSelectedLog(log);
        }
    };

    const getActionFriendlyName = (type: string, action: string) => {
        const map: Record<string, string> = {
            'AUTH_LOGIN': 'Login no Sistema',
            'AUTH_FAILURE': 'Falha de Login',
            'DEAL_CREATED': 'Criou um Negócio',
            'DEAL_UPDATED': 'Atualizou um Negócio',
            'DEAL_MOVED': 'Mudou a Fase do Negócio',
            'TABULATION': 'Realizou Tabulação',
            'EXCEPTION': 'Erro de Sistema',
            'HTTP_REQUEST': 'Requisição Técnica',
            'DEBUG': 'Log Técnico'
        };
        return map[type] || action || type;
    };

    return (
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white/90">Histórico de Atividades</h1>
                    <p className="text-muted-foreground">Monitore o que acontece no sistema de forma simples.</p>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar ID, Ação..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8"
                        />
                    </div>

                    <Select value={actionFilter} onValueChange={setActionFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filtros de Ação" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Todas as Ações</SelectItem>
                            <SelectItem value="AUTH_LOGIN">Login Sucesso</SelectItem>
                            <SelectItem value="AUTH_FAILURE">Login Falha</SelectItem>
                            <SelectItem value="DEAL_CREATED">Novo Negócio</SelectItem>
                            <SelectItem value="DEAL_UPDATED">Edição de Negócio</SelectItem>
                            <SelectItem value="DEAL_MOVED">Mudança de Fase</SelectItem>
                            <SelectItem value="TABULATION">Tabulação</SelectItem>
                            <SelectItem value="EXCEPTION">Erros de Sistema</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={actorFilter} onValueChange={setActorFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Usuário" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                            <SelectItem value="ALL">Todos os Usuários</SelectItem>
                            {users.map(u => (
                                <SelectItem key={u.id} value={u.id}>
                                    {u.name} {u.surname || ''}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button variant="outline" onClick={() => fetchLogs()}>
                        <Filter className="mr-2 h-4 w-4" /> Atualizar
                    </Button>
                </div>
            </div>

            <Card className="border-border/50 bg-black/20 backdrop-blur-xl">
                <CardContent className="p-0">
                    <div className="relative overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs uppercase bg-muted/50 text-muted-foreground">
                                <tr>
                                    <th className="px-6 py-3">Data/Hora</th>
                                    <th className="px-6 py-3">Nível</th>
                                    <th className="px-6 py-3">Ação</th>
                                    <th className="px-6 py-3">Entidade</th>
                                    <th className="px-6 py-3">Usuário</th>
                                    <th className="px-6 py-3 opacity-0">Ver</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                                            Carregando logs...
                                        </td>
                                    </tr>
                                )}
                                {!loading && logs.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                                            Nenhum registro encontrado.
                                        </td>
                                    </tr>
                                )}
                                {!loading && logs.map((log) => (
                                    <tr key={log.id} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                                        <td className="px-6 py-4 font-mono text-xs">
                                            {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                                        </td>
                                        <td className="px-6 py-4">{getLevelBadge(log.level)}</td>
                                        <td className="px-6 py-4 font-medium">
                                            <div className="flex flex-col">
                                                <span className="text-base">{getActionFriendlyName(log.event_type, log.action)}</span>
                                                <span className="text-xs text-muted-foreground font-light">ID: {log.id.slice(0, 8)}...</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-medium">{log.entity_type}</span>
                                                {log.payload?.metadata?.entity_name ? (
                                                    <span className="text-xs text-muted-foreground">{log.payload?.metadata?.entity_name}</span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground font-mono truncate max-w-[100px] block" title={log.entity_id}>
                                                        {log.entity_id}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {log.actor ? (
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{log.actor.name}</span>
                                                </div>
                                            ) : (
                                                <span className="italic text-muted-foreground">Sistema</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button variant="ghost" size="sm" onClick={() => openDetails(log)}>
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>

                {/* Pagination */}
                <div className="flex items-center justify-end p-4 border-t border-border/50 gap-2">
                    <span className="text-sm text-muted-foreground mr-4">Página {page} de {totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </Card>

            {/* Details Modal */}
            <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            Detalhes do Log
                            {selectedLog && getLevelBadge(selectedLog.level)}
                        </DialogTitle>
                        <DialogDescription>
                            ID: <span className="font-mono">{selectedLog?.id}</span> | Request ID: <span className="font-mono">{selectedLog?.request_id}</span>
                        </DialogDescription>
                    </DialogHeader>

                    {selectedLog && (
                        <div className="space-y-6 mt-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="space-y-1">
                                    <p className="font-semibold text-muted-foreground">Ator</p>
                                    <p>{selectedLog.actor?.name || 'Sistema'} ({selectedLog.actor?.email})</p>
                                    <p className="text-xs text-muted-foreground">IP: {selectedLog.ip_address}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="font-semibold text-muted-foreground">Alvo</p>
                                    <p>{selectedLog.entity_type}</p>
                                    <p className="font-mono text-xs">{selectedLog.entity_id}</p>
                                </div>
                            </div>

                            {selectedLog.error_message && (
                                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-md text-red-400 text-sm font-mono overflow-auto">
                                    <p className="font-bold mb-2">Error:</p>
                                    {selectedLog.error_message}
                                </div>
                            )}

                            {selectedLog.payload && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {selectedLog.payload.metadata && (
                                        <div className="col-span-full">
                                            <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Metadados</h3>
                                            <pre className="bg-muted/50 p-4 rounded-md text-xs font-mono overflow-auto max-h-40">
                                                {JSON.stringify(selectedLog.payload.metadata, null, 2)}
                                            </pre>
                                        </div>
                                    )}

                                    <div>
                                        <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Antes (Snapshot)</h3>
                                        {selectedLog.payload.before ? (
                                            <pre className="bg-muted/50 p-4 rounded-md text-xs font-mono overflow-auto max-h-80">
                                                {JSON.stringify(selectedLog.payload.before, null, 2)}
                                            </pre>
                                        ) : (
                                            <p className="text-sm text-muted-foreground italic">Nenhum dado anterior.</p>
                                        )}
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Depois (Atual)</h3>
                                        {selectedLog.payload.after ? (
                                            <pre className="bg-muted/50 p-4 rounded-md text-xs font-mono overflow-auto max-h-80">
                                                {JSON.stringify(selectedLog.payload.after, null, 2)}
                                            </pre>
                                        ) : (
                                            <p className="text-sm text-muted-foreground italic">Nenhum dado posterior.</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
