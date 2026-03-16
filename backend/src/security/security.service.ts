import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

export const CRITICAL_INFRA_PERMISSIONS = [
    'infra.database.connection.manage',
    'infra.database.logs.view',
    'infra.vps.terminal.access',
    'infra.vps.terminal.execute',
] as const;

export const SUPER_ADMIN_REQUIRED_PERMISSIONS = [
    'security.manage_roles',
    ...CRITICAL_INFRA_PERMISSIONS,
] as const;

const PERMISSION_CATALOG = [
    {
        group: 'CRM',
        permissions: [
            { key: 'crm.view', label: 'Visualizar CRM' },
            { key: 'crm.create_lead', label: 'Criar leads' },
            { key: 'crm.edit_lead', label: 'Editar leads' },
            { key: 'crm.delete_lead', label: 'Excluir leads' },
            { key: 'crm.move_kanban', label: 'Mover cards no Kanban' },
            { key: 'crm.assign_owner', label: 'Alterar responsável de leads' },
            { key: 'crm.export', label: 'Exportar dados do CRM' },
        ],
    },
    {
        group: 'Usuários e Segurança',
        permissions: [
            { key: 'users.view', label: 'Visualizar usuários' },
            { key: 'users.create', label: 'Criar usuários' },
            { key: 'users.edit', label: 'Editar usuários' },
            { key: 'users.delete', label: 'Excluir usuários' },
            { key: 'security.manage_roles', label: 'Gerenciar roles e permissões' },
            { key: 'security.assign_permissions', label: 'Atribuir permissões por usuário' },
        ],
    },
    {
        group: 'Configurações',
        permissions: [
            { key: 'settings.tabulations', label: 'Gerenciar tabulações' },
            { key: 'settings.pipelines', label: 'Gerenciar pipelines' },
            { key: 'settings.custom_fields', label: 'Gerenciar campos personalizados' },
            { key: 'settings.form_templates', label: 'Gerenciar templates de formulário' },
            { key: 'settings.dev_notes.manage', label: 'Gerenciar Dev Notes' },
            { key: 'settings.deleted_leads_archive.view', label: 'Visualizar leads excluídos arquivados' },
            { key: 'settings.deleted_leads_archive.edit', label: 'Editar leads excluídos arquivados' },
            { key: 'settings.deleted_leads_archive.restore', label: 'Devolver leads excluídos para a base' },
            { key: 'settings.registration.access_control', label: 'Controlar disponibilidade da tela de cadastro' },
        ],
    },
    {
        group: 'Operação',
        permissions: [
            { key: 'imports.open_accounts', label: 'Importar contas abertas' },
            { key: 'imports.leads', label: 'Importar leads' },
            { key: 'reports.view', label: 'Visualizar relatórios' },
            { key: 'audit.view', label: 'Visualizar logs de auditoria' },
            { key: 'api_keys.manage', label: 'Gerenciar chaves de API' },
        ],
    },
    {
        group: 'Infraestrutura Crítica',
        permissions: [
            { key: 'infra.database.connection.manage', label: 'Gerenciar conexão do banco de dados' },
            { key: 'infra.database.logs.view', label: 'Visualizar logs do banco de dados' },
            { key: 'infra.vps.terminal.access', label: 'Acessar terminal Linux da VPS' },
            { key: 'infra.vps.terminal.execute', label: 'Executar comandos no terminal Linux da VPS' },
        ],
    },
];

const BASE_ADMIN_PERMISSIONS = [
    'crm.view', 'crm.create_lead', 'crm.edit_lead', 'crm.delete_lead', 'crm.move_kanban', 'crm.assign_owner', 'crm.export',
    'users.view', 'users.create', 'users.edit', 'users.delete',
    'security.manage_roles', 'security.assign_permissions',
    'settings.tabulations', 'settings.pipelines', 'settings.custom_fields', 'settings.form_templates', 'settings.dev_notes.manage',
    'settings.deleted_leads_archive.view', 'settings.deleted_leads_archive.edit', 'settings.deleted_leads_archive.restore',
    'settings.registration.access_control',
    'imports.open_accounts', 'imports.leads', 'reports.view', 'audit.view', 'api_keys.manage',
];

const DEFAULT_ROLE_PERMISSIONS: Record<Role, string[]> = {
    ADMIN: BASE_ADMIN_PERMISSIONS,
    SUPERVISOR: [
        'crm.view', 'crm.create_lead', 'crm.edit_lead', 'crm.move_kanban', 'crm.assign_owner', 'crm.export',
        'users.view', 'imports.open_accounts', 'imports.leads', 'reports.view', 'audit.view',
    ],
    LEADER: ['crm.view', 'crm.create_lead', 'crm.edit_lead', 'crm.move_kanban', 'reports.view'],
    OPERATOR: ['crm.view', 'crm.create_lead', 'crm.edit_lead'],
};

const SUPER_ADMIN_TEMPLATE = {
    id: 'system-SUPER_ADMIN',
    name: 'SUPER_ADMIN',
    description: 'Template de alto privilégio para gestão crítica de infraestrutura',
    base_role: 'ADMIN',
    initial_page: 'DEFAULT',
    is_system: true,
    permissions_json: [...BASE_ADMIN_PERMISSIONS, ...CRITICAL_INFRA_PERMISSIONS],
};

@Injectable()
export class SecurityService {
    constructor(private prisma: PrismaService) { }

    getPermissionsCatalog() {
        return PERMISSION_CATALOG;
    }

    private async getSystemSettingValue<T>(key: string, fallback: T): Promise<T> {
        const setting = await (this.prisma as any).systemSetting.findUnique({ where: { key } });
        if (!setting) return fallback;
        return setting.value_json as T;
    }

    private getDefaultRoles() {
        const base = (Object.keys(DEFAULT_ROLE_PERMISSIONS) as Role[]).map((role) => ({
            id: `system-${role}`,
            name: role,
            description: `Role padrão do sistema: ${role}`,
            base_role: role,
            initial_page: 'DEFAULT',
            is_system: true,
            permissions_json: DEFAULT_ROLE_PERMISSIONS[role],
        }));

        return [...base, SUPER_ADMIN_TEMPLATE];
    }

    async getRoles() {
        const customRoles = await (this.prisma as any).securityRole.findMany({
            orderBy: { created_at: 'desc' },
        });

        return {
            default_roles: this.getDefaultRoles(),
            custom_roles: customRoles,
        };
    }

    async createRole(data: any, userId: string) {
        if (!data?.name || !Array.isArray(data?.permissions_json)) {
            throw new BadRequestException('Nome e lista de permissões são obrigatórios.');
        }

        return (this.prisma as any).securityRole.create({
            data: {
                name: data.name.trim(),
                description: data.description || null,
                base_role: data.base_role || null,
                initial_page: data.initial_page || 'DEFAULT',
                is_system: false,
                permissions_json: data.permissions_json,
                created_by_id: userId,
            },
        });
    }

    async updateRole(id: string, data: any) {
        const role = await (this.prisma as any).securityRole.findUnique({ where: { id } });
        if (!role) throw new NotFoundException('Role personalizada não encontrada.');
        if (role.is_system) throw new BadRequestException('Roles padrão não podem ser editadas.');

        return (this.prisma as any).securityRole.update({
            where: { id },
            data: {
                name: data.name ?? role.name,
                description: data.description ?? role.description,
                base_role: data.base_role ?? role.base_role,
                initial_page: data.initial_page ?? role.initial_page ?? 'DEFAULT',
                permissions_json: Array.isArray(data.permissions_json) ? data.permissions_json : role.permissions_json,
            },
        });
    }

    async deleteRole(id: string) {
        const role = await (this.prisma as any).securityRole.findUnique({ where: { id } });
        if (!role) throw new NotFoundException('Role personalizada não encontrada.');
        if (role.is_system) throw new BadRequestException('Roles padrão não podem ser excluídas.');

        await this.prisma.user.updateMany({ where: { security_role_id: id }, data: { security_role_id: null } });
        return (this.prisma as any).securityRole.delete({ where: { id } });
    }

    private resolveEffectivePermissions(user: any): string[] {
        const basePermissions = DEFAULT_ROLE_PERMISSIONS[user.role as Role] || [];
        const customPermissions = Array.isArray(user.security_role?.permissions_json)
            ? user.security_role.permissions_json
            : null;
        const overridePermissions = Array.isArray(user.permissions_override) && user.permissions_override.length > 0
            ? user.permissions_override
            : null;

        return overridePermissions || customPermissions || basePermissions;
    }

    private isSuperAdminUser(user: any): boolean {
        const effective = this.resolveEffectivePermissions(user);
        return SUPER_ADMIN_REQUIRED_PERMISSIONS.every((permission) => effective.includes(permission));
    }

    async getEffectivePermissionsByUserId(userId: string): Promise<string[]> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { security_role: true },
        });

        if (!user) {
            throw new NotFoundException('Usuário não encontrado.');
        }

        return this.resolveEffectivePermissions(user as any);
    }

    async userHasPermission(userId: string, permission: string): Promise<boolean> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { security_role: true },
        });

        if (!user) {
            throw new NotFoundException('Usuário não encontrado.');
        }

        if (user.role === 'ADMIN' && permission.startsWith('security.')) {
            return true;
        }

        const effective = this.resolveEffectivePermissions(user as any);
        return effective.includes(permission);
    }

    async ensurePermission(userId: string, permission: string, message?: string) {
        const allowed = await this.userHasPermission(userId, permission);
        if (!allowed) {
            throw new ForbiddenException(message || `Sem permissão necessária: ${permission}`);
        }
    }

    async listUsersPermissions() {
        const users = await this.prisma.user.findMany({
            orderBy: { created_at: 'desc' },
            include: {
                security_role: true,
            },
        });

        return users.map((user: any) => {
            const basePermissions = DEFAULT_ROLE_PERMISSIONS[user.role as Role] || [];
            const customPermissions = Array.isArray(user.security_role?.permissions_json)
                ? user.security_role.permissions_json
                : null;
            const overridePermissions = Array.isArray(user.permissions_override) && user.permissions_override.length > 0
                ? user.permissions_override
                : null;

            return {
                id: user.id,
                name: user.name,
                surname: user.surname,
                email: user.email,
                role: user.role,
                security_role_id: user.security_role_id,
                security_role_name: user.security_role?.name || null,
                permissions_source: overridePermissions ? 'USER_OVERRIDE' : (customPermissions ? 'CUSTOM_ROLE' : 'BASE_ROLE'),
                effective_permissions: overridePermissions || customPermissions || basePermissions,
            };
        });
    }

    async getSuperAdminSafetyStatus() {
        const users = await this.prisma.user.findMany({
            where: { is_active: true },
            include: { security_role: true },
            orderBy: { created_at: 'asc' },
        });

        const superAdmins = users
            .filter((user: any) => this.isSuperAdminUser(user))
            .map((user: any) => ({
                id: user.id,
                name: user.name,
                surname: user.surname,
                email: user.email,
                role: user.role,
                security_role_name: user.security_role?.name || null,
            }));

        const minimumRequired = 2;
        const missingCount = Math.max(0, minimumRequired - superAdmins.length);

        return {
            minimum_required: minimumRequired,
            current_count: superAdmins.length,
            missing_count: missingCount,
            alert: superAdmins.length < minimumRequired,
            message: superAdmins.length < minimumRequired
                ? `Atenção: existem apenas ${superAdmins.length} superadmins ativos. Recomenda-se no mínimo ${minimumRequired} para evitar perda de acesso administrativo.`
                : 'Quantidade de superadmins está adequada.',
            super_admins: superAdmins,
        };
    }

    async updateUserPermissions(userId: string, data: any) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('Usuário não encontrado.');

        if (data.security_role_id) {
            const role = await (this.prisma as any).securityRole.findUnique({ where: { id: data.security_role_id } });
            if (!role) throw new NotFoundException('Role personalizada não encontrada.');
        }

        return this.prisma.user.update({
            where: { id: userId },
            data: {
                role: data.role || user.role,
                security_role_id: data.security_role_id ?? user.security_role_id,
                permissions_override: Array.isArray(data.permissions_override)
                    ? data.permissions_override
                    : (data.permissions_override === null ? null : user.permissions_override),
            },
        });
    }

    async getPublicSystemSettings() {
        const leadRegistrationEnabled = await this.getSystemSettingValue<boolean>('lead_registration_enabled', true);
        return {
            lead_registration_enabled: Boolean(leadRegistrationEnabled),
        };
    }

    async getResolvedInitialPageByUserId(userId: string): Promise<string> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { security_role: true },
        });

        if (!user) {
            throw new NotFoundException('Usuário não encontrado.');
        }

        if (user.initial_page && user.initial_page !== 'DEFAULT') {
            return user.initial_page;
        }

        const roleInitialPage = (user as any).security_role?.initial_page;
        if (roleInitialPage && roleInitialPage !== 'DEFAULT') {
            return roleInitialPage;
        }

        return 'DEFAULT';
    }

    async getManageableSystemSettings() {
        return this.getPublicSystemSettings();
    }

    async updateSystemSettings(data: any) {
        const leadRegistrationEnabled = data?.lead_registration_enabled !== undefined
            ? Boolean(data.lead_registration_enabled)
            : true;

        await (this.prisma as any).systemSetting.upsert({
            where: { key: 'lead_registration_enabled' },
            create: {
                key: 'lead_registration_enabled',
                value_json: leadRegistrationEnabled,
                description: 'Controla se a tela de cadastro de leads esta habilitada.',
            },
            update: {
                value_json: leadRegistrationEnabled,
                description: 'Controla se a tela de cadastro de leads esta habilitada.',
            },
        });

        return this.getManageableSystemSettings();
    }
}
