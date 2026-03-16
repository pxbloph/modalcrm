import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Put, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SecurityService } from './security.service';

@Controller('security')
@UseGuards(AuthGuard('jwt'))
export class SecurityController {
    constructor(private readonly securityService: SecurityService) { }

    private async ensureSecurityAccess(req: any, permission: string, message: string) {
        if (req?.user?.role === 'ADMIN') return;
        await this.securityService.ensurePermission(req.user.id, permission, message);
    }

    @Get('permissions-catalog')
    async getPermissionsCatalog(@Request() req: any) {
        await this.ensureSecurityAccess(req, 'security.manage_roles', 'Sem permissão para visualizar catálogo de permissões.');
        return this.securityService.getPermissionsCatalog();
    }

    @Get('roles')
    async getRoles(@Request() req: any) {
        await this.ensureSecurityAccess(req, 'security.manage_roles', 'Sem permissão para visualizar roles.');
        return this.securityService.getRoles();
    }

    @Get('safety-status')
    async getSafetyStatus(@Request() req: any) {
        await this.ensureSecurityAccess(req, 'security.manage_roles', 'Sem permissão para visualizar status de segurança.');
        return this.securityService.getSuperAdminSafetyStatus();
    }

    @Get('system-settings')
    async getSystemSettings(@Request() req: any) {
        if (req?.user?.role !== 'ADMIN') {
            await this.securityService.ensurePermission(
                req.user.id,
                'settings.registration.access_control',
                'Sem permissão para visualizar as configurações globais de cadastro.',
            );
        }
        return this.securityService.getManageableSystemSettings();
    }

    @Get('public-system-settings')
    async getPublicSystemSettings() {
        return this.securityService.getPublicSystemSettings();
    }

    @Put('system-settings')
    async updateSystemSettings(@Body() body: any, @Request() req: any) {
        if (req?.user?.role !== 'ADMIN') {
            await this.securityService.ensurePermission(
                req.user.id,
                'settings.registration.access_control',
                'Sem permissão para alterar as configurações globais de cadastro.',
            );
        }
        return this.securityService.updateSystemSettings(body);
    }

    @Post('roles')
    async createRole(@Body() body: any, @Request() req: any) {
        await this.ensureSecurityAccess(req, 'security.manage_roles', 'Sem permissão para criar roles personalizadas.');
        return this.securityService.createRole(body, req.user.id);
    }

    @Put('roles/:id')
    async updateRole(@Param('id') id: string, @Body() body: any, @Request() req: any) {
        await this.ensureSecurityAccess(req, 'security.manage_roles', 'Sem permissão para editar roles personalizadas.');
        return this.securityService.updateRole(id, body);
    }

    @Delete('roles/:id')
    async deleteRole(@Param('id') id: string, @Request() req: any) {
        await this.ensureSecurityAccess(req, 'security.manage_roles', 'Sem permissão para excluir roles personalizadas.');
        return this.securityService.deleteRole(id);
    }

    @Get('users-permissions')
    async listUsersPermissions(@Request() req: any) {
        await this.ensureSecurityAccess(req, 'security.assign_permissions', 'Sem permissão para visualizar permissões dos usuários.');
        return this.securityService.listUsersPermissions();
    }

    @Patch('users/:id/permissions')
    async updateUserPermissions(@Param('id') id: string, @Body() body: any, @Request() req: any) {
        await this.ensureSecurityAccess(req, 'security.assign_permissions', 'Sem permissão para alterar permissões dos usuários.');
        if (req.user.id === id) {
            throw new BadRequestException('Você não pode alterar suas próprias permissões por segurança operacional.');
        }
        return this.securityService.updateUserPermissions(id, body);
    }
}
