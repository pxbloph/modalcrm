'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type DeletedLeadArchiveItem = {
    id: string;
    original_lead_id: string;
    name: string;
    surname?: string | null;
    cnpj: string;
    email: string;
    phone: string;
    integration_status?: string | null;
    tabulacao?: string | null;
    original_owner_name?: string | null;
    archive_reason: string;
    archive_context?: string | null;
    deleted_at: string;
    restored_at?: string | null;
    restored_client_id?: string | null;
    attempted_by_user?: {
        id: string;
        name: string;
        surname?: string | null;
        email: string;
    };
};

export default function DeletedLeadsSettingsPage() {
    const [items, setItems] = useState<DeletedLeadArchiveItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [editingItem, setEditingItem] = useState<DeletedLeadArchiveItem | null>(null);
    const [savingEdit, setSavingEdit] = useState(false);
    const [restoringId, setRestoringId] = useState<string | null>(null);
    const [bulkRestoring, setBulkRestoring] = useState(false);

    const canEdit = currentUser?.role === 'ADMIN' || currentUser?.permissions?.includes('settings.deleted_leads_archive.edit');
    const canRestore = currentUser?.role === 'ADMIN' || currentUser?.permissions?.includes('settings.deleted_leads_archive.restore');

    const loadItems = async (term = '') => {
        setLoading(true);
        try {
            const [res, meRes] = await Promise.all([
                api.get('/clients/deleted-leads-archive', {
                    params: {
                        search: term,
                        limit: 200,
                    },
                }),
                api.get('/auth/me'),
            ]);
            setItems(Array.isArray(res.data) ? res.data : []);
            setCurrentUser(meRes.data || null);
        } catch (error) {
            console.error('Erro ao carregar leads arquivados:', error);
            alert('Erro ao carregar leads arquivados.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadItems();
    }, []);

    const selectableItems = useMemo(
        () => items.filter((item) => !item.restored_at),
        [items],
    );

    const toggleSelected = (id: string) => {
        setSelectedIds((prev) => prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]);
    };

    const toggleAll = () => {
        const activeIds = selectableItems.map((item) => item.id);
        setSelectedIds((prev) => prev.length === activeIds.length ? [] : activeIds);
    };

    const handleRestoreOne = async (id: string) => {
        setRestoringId(id);
        try {
            await api.post(`/clients/deleted-leads-archive/${id}/restore`);
            await loadItems(search);
            setSelectedIds((prev) => prev.filter((itemId) => itemId !== id));
            alert('Lead devolvido para a base com sucesso.');
        } catch (error: any) {
            console.error(error);
            alert(error?.response?.data?.message || 'Erro ao devolver lead.');
        } finally {
            setRestoringId(null);
        }
    };

    const handleBulkRestore = async () => {
        if (selectedIds.length === 0) {
            alert('Selecione ao menos um lead arquivado.');
            return;
        }

        setBulkRestoring(true);
        try {
            const res = await api.post('/clients/deleted-leads-archive/restore-bulk', {
                ids: selectedIds,
            });
            await loadItems(search);
            setSelectedIds([]);
            alert(`Devolucao em massa concluida. Sucesso: ${res.data?.success || 0}. Falhas: ${res.data?.failed || 0}.`);
        } catch (error: any) {
            console.error(error);
            alert(error?.response?.data?.message || 'Erro na devolucao em massa.');
        } finally {
            setBulkRestoring(false);
        }
    };

    const handleSaveEdit = async () => {
        if (!editingItem) return;
        setSavingEdit(true);
        try {
            await api.put(`/clients/deleted-leads-archive/${editingItem.id}`, {
                name: editingItem.name,
                surname: editingItem.surname,
                cnpj: editingItem.cnpj,
                email: editingItem.email,
                phone: editingItem.phone,
                integration_status: editingItem.integration_status,
                tabulacao: editingItem.tabulacao,
                archive_reason: editingItem.archive_reason,
            });
            await loadItems(search);
            setEditingItem(null);
            alert('Lead arquivado atualizado com sucesso.');
        } catch (error: any) {
            console.error(error);
            alert(error?.response?.data?.message || 'Erro ao editar lead arquivado.');
        } finally {
            setSavingEdit(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="rounded-2xl border bg-gradient-to-r from-card via-card to-muted/20 p-6 shadow-sm">
                <h1 className="text-2xl font-bold tracking-tight">Leads Excluidos</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Lista de leads removidos do fluxo operacional, com opcoes de visualizacao, edicao e devolucao.
                </p>
            </div>

            <div className="flex gap-3">
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por empresa, CNPJ, e-mail ou responsavel anterior"
                />
                <Button onClick={() => loadItems(search)} disabled={loading}>
                    {loading ? 'Buscando...' : 'Buscar'}
                </Button>
                {canRestore && (
                    <Button onClick={handleBulkRestore} disabled={bulkRestoring || selectedIds.length === 0}>
                        {bulkRestoring ? 'Devolvendo...' : `Devolver em massa (${selectedIds.length})`}
                    </Button>
                )}
            </div>

            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/60">
                            <tr>
                                <th className="text-left p-3 w-10">
                                    <input type="checkbox" checked={selectedIds.length > 0 && selectedIds.length === selectableItems.length} onChange={toggleAll} />
                                </th>
                                <th className="text-left p-3">Empresa</th>
                                <th className="text-left p-3">CNPJ</th>
                                <th className="text-left p-3">Responsavel Anterior</th>
                                <th className="text-left p-3">Tentativa por</th>
                                <th className="text-left p-3">Status</th>
                                <th className="text-left p-3">Motivo</th>
                                <th className="text-left p-3">Excluido em</th>
                                <th className="text-left p-3">Acoes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item) => (
                                <tr key={item.id} className="border-t align-top">
                                    <td className="p-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(item.id)}
                                            disabled={!!item.restored_at || !canRestore}
                                            onChange={() => toggleSelected(item.id)}
                                        />
                                    </td>
                                    <td className="p-3">
                                        <div className="font-medium">{item.name}</div>
                                        <div className="text-xs text-muted-foreground">{item.email}</div>
                                        <div className="text-xs text-muted-foreground">{item.phone}</div>
                                        {item.restored_at && (
                                            <div className="text-xs text-emerald-600 mt-1">Restaurado</div>
                                        )}
                                    </td>
                                    <td className="p-3 font-mono">{item.cnpj}</td>
                                    <td className="p-3">{item.original_owner_name || '-'}</td>
                                    <td className="p-3">
                                        {item.attempted_by_user
                                            ? `${item.attempted_by_user.name} ${item.attempted_by_user.surname || ''}`.trim()
                                            : '-'}
                                    </td>
                                    <td className="p-3">
                                        <div>{item.integration_status || '-'}</div>
                                        <div className="text-xs text-muted-foreground">{item.tabulacao || '-'}</div>
                                    </td>
                                    <td className="p-3 max-w-md whitespace-pre-wrap">{item.archive_reason}</td>
                                    <td className="p-3 whitespace-nowrap">{new Date(item.deleted_at).toLocaleString('pt-BR')}</td>
                                    <td className="p-3">
                                        <div className="flex gap-2">
                                            <Button type="button" variant="outline" size="sm" onClick={() => setEditingItem({ ...item })}>
                                                Visualizar
                                            </Button>
                                            {canEdit && (
                                                <Button type="button" variant="outline" size="sm" onClick={() => setEditingItem({ ...item })}>
                                                    Editar
                                                </Button>
                                            )}
                                            {canRestore && !item.restored_at && (
                                                <Button type="button" size="sm" onClick={() => handleRestoreOne(item.id)} disabled={restoringId === item.id}>
                                                    {restoringId === item.id ? 'Devolvendo...' : 'Devolver'}
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!loading && items.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="p-6 text-center text-muted-foreground">
                                        Nenhum lead arquivado encontrado.
                                    </td>
                                </tr>
                            )}
                            {loading && (
                                <tr>
                                    <td colSpan={9} className="p-6 text-center text-muted-foreground">
                                        Carregando leads arquivados...
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {editingItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-2xl rounded-xl border bg-card p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">{canEdit ? 'Editar lead arquivado' : 'Visualizar lead arquivado'}</h2>
                            <Button type="button" variant="outline" onClick={() => setEditingItem(null)}>Fechar</Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input value={editingItem.name} disabled={!canEdit} onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })} />
                            <Input value={editingItem.surname || ''} disabled={!canEdit} onChange={(e) => setEditingItem({ ...editingItem, surname: e.target.value })} />
                            <Input value={editingItem.cnpj} disabled={!canEdit} onChange={(e) => setEditingItem({ ...editingItem, cnpj: e.target.value })} />
                            <Input value={editingItem.email} disabled={!canEdit} onChange={(e) => setEditingItem({ ...editingItem, email: e.target.value })} />
                            <Input value={editingItem.phone} disabled={!canEdit} onChange={(e) => setEditingItem({ ...editingItem, phone: e.target.value })} />
                            <Input value={editingItem.integration_status || ''} disabled={!canEdit} onChange={(e) => setEditingItem({ ...editingItem, integration_status: e.target.value })} />
                            <Input value={editingItem.tabulacao || ''} disabled={!canEdit} onChange={(e) => setEditingItem({ ...editingItem, tabulacao: e.target.value })} />
                        </div>

                        <textarea
                            value={editingItem.archive_reason}
                            disabled={!canEdit}
                            onChange={(e) => setEditingItem({ ...editingItem, archive_reason: e.target.value })}
                            className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />

                        {canEdit && (
                            <div className="flex justify-end">
                                <Button onClick={handleSaveEdit} disabled={savingEdit}>
                                    {savingEdit ? 'Salvando...' : 'Salvar alteracoes'}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
