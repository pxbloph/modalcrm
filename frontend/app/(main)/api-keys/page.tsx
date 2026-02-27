'use client';

import React, { useState, useEffect } from 'react';
import {
    Key,
    Plus,
    Trash2,
    Copy,
    Check,
    Calendar,
    Info,
    ShieldCheck,
    AlertCircle,
    Loader2
} from 'lucide-react';
import { toast } from 'sonner';

import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from '@/components/ui/alert';

interface ApiKey {
    id: string;
    name: string;
    key: string;
    is_active: boolean;
    last_used_at: string | null;
    created_at: string;
    created_by: {
        name: string;
        surname: string;
    };
}

export default function ApiKeysPage() {
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [creating, setCreating] = useState(false);

    const [successDialogOpen, setSuccessDialogOpen] = useState(false);
    const [generatedKey, setGeneratedKey] = useState('');
    const [copied, setCopied] = useState(false);

    const fetchKeys = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api-keys');
            setKeys(response.data);
        } catch (error: any) {
            console.error('Error fetching API keys:', error);
            toast.error('Erro ao carregar chaves de API');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchKeys();
    }, []);

    const handleCreateKey = async () => {
        if (!newKeyName.trim()) {
            toast.error('Por favor, dê um nome para a chave');
            return;
        }

        try {
            setCreating(true);
            const response = await api.post('/api-keys', { name: newKeyName });

            setGeneratedKey(response.data.key);
            setSuccessDialogOpen(true);
            setCreateDialogOpen(false);
            setNewKeyName('');
            fetchKeys();
            toast.success('Chave de API gerada com sucesso!');
        } catch (error: any) {
            console.error('Error creating API key:', error);
            toast.error(error.response?.data?.message || 'Erro ao criar chave de API');
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteKey = async (id: string) => {
        if (!confirm('Tem certeza que deseja revogar esta chave? Esta ação não pode ser desfeita e qualquer integração usando esta chave parará de funcionar.')) {
            return;
        }

        try {
            await api.delete(`/api-keys/${id}`);
            setKeys(keys.filter(k => k.id !== id));
            toast.success('Chave revogada com sucesso');
        } catch (error: any) {
            console.error('Error deleting API key:', error);
            toast.error('Erro ao revogar chave');
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success('Chave copiada para a área de transferência');
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">API & Integrações</h1>
                    <p className="text-muted-foreground">
                        Gerencie chaves de API para integrações externas como n8n.
                    </p>
                </div>
                <Button onClick={() => setCreateDialogOpen(true)} className="bg-primary hover:bg-primary/90">
                    <Plus className="mr-2 h-4 w-4" /> Gerar Nova Chave
                </Button>
            </div>

            <Alert className="bg-primary/5 border-primary/20">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <AlertTitle className="text-primary font-semibold">Segurança do Webhook</AlertTitle>
                <AlertDescription>
                    As chaves geradas aqui permitem acesso de escrita ao CRM via endpoint de webhook.
                    Nunca compartilhe suas chaves de API ou as publique em locais públicos.
                </AlertDescription>
            </Alert>

            <Card>
                <CardHeader>
                    <CardTitle>Chaves Ativas</CardTitle>
                    <CardDescription>
                        Lista de todas as chaves de API configuradas no sistema.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : keys.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="bg-muted p-4 rounded-full mb-4">
                                <Key className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-medium">Nenhuma chave encontrada</h3>
                            <p className="text-muted-foreground max-w-xs mx-auto">
                                Você ainda não gerou nenhuma chave de API para integrações.
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Identificação</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Último Uso</TableHead>
                                        <TableHead>Criada em</TableHead>
                                        <TableHead>Responsável</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {keys.map((key) => (
                                        <TableRow key={key.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <Key className="h-4 w-4 text-primary" />
                                                    {key.name}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={key.is_active ? "default" : "secondary"}>
                                                    {key.is_active ? "Ativa" : "Inativa"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Info className="h-3.5 w-3.5" />
                                                    {key.last_used_at
                                                        ? new Date(key.last_used_at).toLocaleString('pt-BR')
                                                        : 'Nunca utilizada'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    {new Date(key.created_at).toLocaleDateString('pt-BR')}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">
                                                    {key.created_by.name} {key.created_by.surname}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleDeleteKey(key.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Dialog Criação */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Gerar Nova Chave de API</DialogTitle>
                        <DialogDescription>
                            Dê um nome para identificar onde esta chave será usada (ex: "Integração n8n Landing Page").
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nome da Chave</Label>
                            <Input
                                id="name"
                                placeholder="Ex: Webhook n8n"
                                value={newKeyName}
                                onChange={(e) => setNewKeyName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateKey()}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleCreateKey} disabled={creating}>
                            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                            Gerar Chave
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog Sucesso (Exibição da Chave) */}
            <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-green-500" />
                            Chave Gerada com Sucesso
                        </DialogTitle>
                        <DialogDescription>
                            Copie sua chave agora. Por razões de segurança, você não poderá vê-la novamente!
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center space-x-2 py-4">
                        <div className="grid flex-1 gap-2">
                            <Label htmlFor="key" className="sr-only">Chave</Label>
                            <Input
                                id="key"
                                value={generatedKey}
                                readOnly
                                className="font-mono text-sm bg-muted"
                            />
                        </div>
                        <Button type="button" size="sm" className="px-3" onClick={() => copyToClipboard(generatedKey)}>
                            <span className="sr-only">Copiar</span>
                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                    </div>
                    <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Atenção</AlertTitle>
                        <AlertDescription className="text-xs">
                            Se você perder esta chave, precisará revogá-la e gerar uma nova.
                        </AlertDescription>
                    </Alert>
                    <DialogFooter className="sm:justify-start">
                        <Button type="button" variant="secondary" onClick={() => setSuccessDialogOpen(false)}>
                            Já salvei a chave
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
