import { Body, Controller, Get, Put, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DatabaseSettingsService } from './database-settings.service';
import { SecurityService } from '../security/security.service';

@Controller('database-settings')
@UseGuards(AuthGuard('jwt'))
export class DatabaseSettingsController {
    constructor(
        private readonly service: DatabaseSettingsService,
        private readonly securityService: SecurityService,
    ) { }

    @Get('connection')
    async getConnection(@Request() req: any) {
        await this.securityService.ensurePermission(req.user.id, 'infra.database.connection.manage', 'Sem permissão para visualizar conexão do banco.');
        return this.service.getConnectionSettings();
    }

    @Put('connection')
    async updateConnection(@Body() body: { database_url: string }, @Request() req: any) {
        await this.securityService.ensurePermission(req.user.id, 'infra.database.connection.manage', 'Sem permissão para alterar conexão do banco.');
        return this.service.updateConnection(body?.database_url);
    }

    @Get('logs')
    async getLogs(@Query('limit') limit: string, @Request() req: any) {
        await this.securityService.ensurePermission(req.user.id, 'infra.database.logs.view', 'Sem permissão para visualizar logs do banco.');
        return this.service.getLogs(Number(limit) || 500);
    }
}
