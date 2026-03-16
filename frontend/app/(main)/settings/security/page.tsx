'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const BASE_ROLES = ['ADMIN', 'SUPERVISOR', 'LEADER', 'OPERATOR'];

type PermissionItem = { key: string; label: string };
type PermissionGroup = { group: string; permissions: PermissionItem[] };

type SecurityRole = {
    id: string;
    name: string;
    description: string | null;
    base_role: string | null;
    initial_page: string | null;
    is_system: boolean;
    permissions_json: string[];
};

const INITIAL_PAGE_OPTIONS = [
    { value: 'DEFAULT', label: 'Padrão do sistema' },
    { value: 'LEAD_PULL', label: 'Puxar Leads' },
    { value: 'NEW_CLIENT', label: 'Novo Cliente' },
    { value: 'KANBAN', label: 'CRM / Kanban' },
];

export default function SecuritySettingsPage() {
    const [catalog, setCatalog] = useState<PermissionGroup[]>([]);
    const [roles, setRoles] = useState<{ default_roles: any[]; custom_roles: SecurityRole[] }>({ default_roles: [], custom_roles: [] });
    const [safetyStatus, setSafetyStatus] = useState<any>(null);
    const [leadRegistrationEnabled, setLeadRegistrationEnabled] = useState(true);
    const [savingSystemSettings, setSavingSystemSettings] = useState(false);

    const [creatingRole, setCreatingRole] = useState(false);
    const [roleForm, setRoleForm] = useState({
        name: '',
        description: '',
        base_role: 'OPERATOR',
        initial_page: 'DEFAULT',
        permissions_json: [] as string[],
    });

    const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
    const [editingRoleForm, setEditingRoleForm] = useState({
        name: '',
        description: '',
        base_role: 'OPERATOR',
        initial_page: 'DEFAULT',
        permissions_json: [] as string[],
    });
    const [savingRoleEdit, setSavingRoleEdit] = useState(false);
    const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);

    const loadData = async () => {
        try {
            const [catalogRes, rolesRes, safetyRes] = await Promise.all([
                api.get('/security/permissions-catalog'),
                api.get('/security/roles'),
                api.get('/security/safety-status').catch(() => ({ data: null })),
            ]);

            const settingsRes = await api.get('/security/system-settings').catch(() => ({ data: null }));

            setCatalog(catalogRes.data || []);
            setRoles(rolesRes.data || { default_roles: [], custom_roles: [] });
            setSafetyStatus(safetyRes?.data || null);
            setLeadRegistrationEnabled(settingsRes?.data?.lead_registration_enabled ?? true);
        } catch (error) {
            console.error('Erro ao carregar dados de segurança:', error);
            alert('Erro ao carregar dados de segurança.');
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const getDefaultPermissionsForBaseRole = (baseRole: string) => {
        const found = roles.default_roles.find((role: any) => role.base_role === baseRole || role.name === baseRole);
        return Array.isArray(found?.permissions_json) ? found.permissions_json : [];
    };

    const handleBaseRoleChange = (value: string) => {
        setRoleForm((prev) => ({
            ...prev,
            base_role: value,
            permissions_json: getDefaultPermissionsForBaseRole(value),
        }));
    };

    const handleEditBaseRoleChange = (value: string) => {
        setEditingRoleForm((prev) => ({
            ...prev,
            base_role: value,
            permissions_json: getDefaultPermissionsForBaseRole(value),
        }));
    };

    const handleSaveSystemSettings = async () => {
        setSavingSystemSettings(true);
        try {
            const res = await api.put('/security/system-settings', {
                lead_registration_enabled: leadRegistrationEnabled,
            });
            setLeadRegistrationEnabled(res.data?.lead_registration_enabled ?? leadRegistrationEnabled);
            alert('Configuração global atualizada com sucesso.');
        } catch (error: any) {
            console.error(error);
            alert(error?.response?.data?.message || 'Erro ao salvar configuração global.');
        } finally {
            setSavingSystemSettings(false);
        }
    };

    const togglePermission = (permissionKey: string) => {
        setRoleForm((prev) => {
            const exists = prev.permissions_json.includes(permissionKey);
            return {
                ...prev,
                permissions_json: exists
                    ? prev.permissions_json.filter((p) => p !== permissionKey)
                    : [...prev.permissions_json, permissionKey],
            };
        });
    };

    const toggleEditPermission = (permissionKey: string) => {
        setEditingRoleForm((prev) => {
            const exists = prev.permissions_json.includes(permissionKey);
            return {
                ...prev,
                permissions_json: exists
                    ? prev.permissions_json.filter((p) => p !== permissionKey)
                    : [...prev.permissions_json, permissionKey],
            };
        });
    };

    const handleCreateCustomRole = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!roleForm.name.trim()) {
            alert('Informe o nome da role personalizada.');
            return;
        }
        if (roleForm.permissions_json.length === 0) {
            alert('Selecione ao menos uma permissão.');
            return;
        }

        setCreatingRole(true);
        try {
            await api.post('/security/roles', roleForm);
            setRoleForm({ name: '', description: '', base_role: 'OPERATOR', initial_page: 'DEFAULT', permissions_json: [] });
            await loadData();
            alert('Role personalizada criada com sucesso.');
        } catch (error: any) {
            console.error(error);
            alert(error?.response?.data?.message || 'Erro ao criar role personalizada.');
        } finally {
            setCreatingRole(false);
        }
    };

    const startRoleEdit = (role: SecurityRole) => {
        setEditingRoleId(role.id);
        setEditingRoleForm({
            name: role.name || '',
            description: role.description || '',
            base_role: role.base_role || 'OPERATOR',
            initial_page: role.initial_page || 'DEFAULT',
            permissions_json: Array.isArray(role.permissions_json) ? role.permissions_json : [],
        });
    };

    const cancelRoleEdit = () => {
        setEditingRoleId(null);
        setEditingRoleForm({ name: '', description: '', base_role: 'OPERATOR', initial_page: 'DEFAULT', permissions_json: [] });
    };

    const handleSaveRoleEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingRoleId) return;
        if (!editingRoleForm.name.trim()) {
            alert('Informe o nome da role personalizada.');
            return;
        }
        if (editingRoleForm.permissions_json.length === 0) {
            alert('Selecione ao menos uma permissão.');
            return;
        }

        setSavingRoleEdit(true);
        try {
            await api.put(`/security/roles/${editingRoleId}`, editingRoleForm);
            await loadData();
            alert('Role personalizada atualizada com sucesso.');
            cancelRoleEdit();
        } catch (error: any) {
            console.error(error);
            alert(error?.response?.data?.message || 'Erro ao atualizar role personalizada.');
        } finally {
            setSavingRoleEdit(false);
        }
    };

    const handleDeleteRole = async (role: SecurityRole) => {
        const ok = window.confirm(`Excluir a role personalizada "${role.name}"?`);
        if (!ok) return;

        setDeletingRoleId(role.id);
        try {
            await api.delete(`/security/roles/${role.id}`);
            await loadData();
            if (editingRoleId === role.id) {
                cancelRoleEdit();
            }
            alert('Role personalizada excluída com sucesso.');
        } catch (error: any) {
            console.error(error);
            alert(error?.response?.data?.message || 'Erro ao excluir role personalizada.');
        } finally {
            setDeletingRoleId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="rounded-2xl border bg-gradient-to-r from-card via-card to-muted/20 p-6 shadow-sm">
                <h1 className="text-2xl font-bold tracking-tight">Segurança</h1>
                <p className="text-muted-foreground text-sm mt-1">Gerencie roles personalizadas e permissões dos usuários.</p>
            </div>

            {safetyStatus && (
                <div className={`rounded-xl border p-4 shadow-sm ${safetyStatus.alert ? 'border-red-500/40 bg-red-500/10' : 'border-emerald-500/40 bg-emerald-500/10'}`}>
                    <p className="text-sm font-semibold">Risco de Superadmin</p>
                    <p className="text-sm mt-1">{safetyStatus.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                        Ativos: {safetyStatus.current_count} | Mínimo recomendado: {safetyStatus.minimum_required}
                    </p>
                </div>
            )}

            <div className="space-y-4 p-5 border rounded-xl bg-card shadow-sm">
                <h2 className="font-semibold">Controle Global do Cadastro</h2>
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium">Tela de cadastro de leads</p>
                        <p className="text-xs text-muted-foreground">Controla a disponibilidade da rota e do menu de Novo Cliente.</p>
                    </div>
                    <input
                        type="checkbox"
                        checked={leadRegistrationEnabled}
                        onChange={(e) => setLeadRegistrationEnabled(e.target.checked)}
                    />
                </div>
                <Button type="button" onClick={handleSaveSystemSettings} disabled={savingSystemSettings}>
                    {savingSystemSettings ? 'Salvando...' : 'Salvar configuração'}
                </Button>
            </div>

            <Tabs defaultValue="create-role" className="w-full space-y-4">
                <TabsList className="grid w-full grid-cols-1 gap-2 h-auto bg-transparent p-0 md:grid-cols-2">
                    <TabsTrigger value="create-role" className="border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Criar Role</TabsTrigger>
                    <TabsTrigger value="manage-roles" className="border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Roles Personalizadas</TabsTrigger>
                </TabsList>

                <TabsContent value="create-role" className="m-0">
                    <form onSubmit={handleCreateCustomRole} className="space-y-4 p-5 border rounded-xl bg-card shadow-sm">
                        <h2 className="font-semibold">Criar Role Personalizada</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label>Nome da role</Label>
                                <Input value={roleForm.name} onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })} required />
                            </div>
                            <div className="space-y-2">
                                <Label>Role base</Label>
                                <Select value={roleForm.base_role} onValueChange={handleBaseRoleChange}>
                                    <SelectTrigger className="w-full h-10">
                                        <SelectValue placeholder="Selecione" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {BASE_ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Tela inicial</Label>
                                <Select value={roleForm.initial_page} onValueChange={(value) => setRoleForm({ ...roleForm, initial_page: value })}>
                                    <SelectTrigger className="w-full h-10">
                                        <SelectValue placeholder="Selecione" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {INITIAL_PAGE_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Descrição</Label>
                                <Input value={roleForm.description} onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })} />
                            </div>
                        </div>

                        <PermissionCatalog
                            catalog={catalog}
                            selected={roleForm.permissions_json}
                            onToggle={togglePermission}
                        />

                        <Button type="submit" disabled={creatingRole}>
                            {creatingRole ? 'Criando role...' : 'Criar role personalizada'}
                        </Button>
                    </form>
                </TabsContent>

                <TabsContent value="manage-roles" className="m-0 space-y-4">
                    <div className="rounded-xl border bg-card shadow-sm">
                        <div className="p-4 border-b">
                            <h2 className="font-semibold">Visualizar e editar roles personalizadas</h2>
                            <p className="text-xs text-muted-foreground">Selecione uma role para editar nome, descrição, role base e permissões.</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/60">
                                    <tr>
                                        <th className="text-left p-3">Nome</th>
                                        <th className="text-left p-3">Descrição</th>
                                        <th className="text-left p-3">Role Base</th>
                                        <th className="text-left p-3">Tela Inicial</th>
                                        <th className="text-left p-3">Permissões</th>
                                        <th className="text-left p-3">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {roles.custom_roles.map((role) => (
                                        <tr key={role.id} className="border-t">
                                            <td className="p-3 font-medium">{role.name}</td>
                                            <td className="p-3 text-muted-foreground">{role.description || '-'}</td>
                                            <td className="p-3">{role.base_role || '-'}</td>
                                            <td className="p-3">{INITIAL_PAGE_OPTIONS.find((option) => option.value === (role.initial_page || 'DEFAULT'))?.label || 'Padrão do sistema'}</td>
                                            <td className="p-3">{Array.isArray(role.permissions_json) ? role.permissions_json.length : 0}</td>
                                            <td className="p-3 flex gap-2">
                                                <Button size="sm" variant="outline" onClick={() => startRoleEdit(role)}>Editar</Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    disabled={deletingRoleId === role.id}
                                                    onClick={() => handleDeleteRole(role)}
                                                >
                                                    {deletingRoleId === role.id ? 'Excluindo...' : 'Excluir'}
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {roles.custom_roles.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhuma role personalizada encontrada.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {editingRoleId && (
                        <form onSubmit={handleSaveRoleEdit} className="space-y-4 p-5 border rounded-xl bg-card shadow-sm">
                            <div className="flex items-center justify-between gap-3">
                                <h3 className="font-semibold">Editando role personalizada</h3>
                                <Button type="button" variant="outline" onClick={cancelRoleEdit}>Cancelar</Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <Label>Nome da role</Label>
                                    <Input value={editingRoleForm.name} onChange={(e) => setEditingRoleForm({ ...editingRoleForm, name: e.target.value })} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Role base</Label>
                                    <Select value={editingRoleForm.base_role} onValueChange={handleEditBaseRoleChange}>
                                        <SelectTrigger className="w-full h-10">
                                            <SelectValue placeholder="Selecione" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {BASE_ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Tela inicial</Label>
                                    <Select value={editingRoleForm.initial_page} onValueChange={(value) => setEditingRoleForm({ ...editingRoleForm, initial_page: value })}>
                                        <SelectTrigger className="w-full h-10">
                                            <SelectValue placeholder="Selecione" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {INITIAL_PAGE_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Descrição</Label>
                                    <Input value={editingRoleForm.description} onChange={(e) => setEditingRoleForm({ ...editingRoleForm, description: e.target.value })} />
                                </div>
                            </div>

                            <PermissionCatalog
                                catalog={catalog}
                                selected={editingRoleForm.permissions_json}
                                onToggle={toggleEditPermission}
                            />

                            <Button type="submit" disabled={savingRoleEdit}>
                                {savingRoleEdit ? 'Salvando...' : 'Salvar alterações'}
                            </Button>
                        </form>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}

function PermissionCatalog({ catalog, selected, onToggle }: { catalog: PermissionGroup[]; selected: string[]; onToggle: (key: string) => void }) {
    return (
        <div className="space-y-4">
            {catalog.map((group) => (
                <div key={group.group} className="border rounded-lg p-3 bg-muted/20">
                    <h3 className="font-medium mb-2">{group.group}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {group.permissions.map((perm) => (
                            <label key={perm.key} className="flex items-center gap-2 text-sm rounded-md p-2 hover:bg-background">
                                <input
                                    type="checkbox"
                                    checked={selected.includes(perm.key)}
                                    onChange={() => onToggle(perm.key)}
                                />
                                <span>{perm.label}</span>
                                <span className="text-muted-foreground text-xs">({perm.key})</span>
                            </label>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
