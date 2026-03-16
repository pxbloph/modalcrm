import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SecurityService } from '../security/security.service';
import { VpsTerminalService } from './vps-terminal.service';

@Controller('vps-terminal')
@UseGuards(AuthGuard('jwt'))
export class VpsTerminalController {
    constructor(
        private readonly service: VpsTerminalService,
        private readonly securityService: SecurityService,
    ) { }

    @Get('status')
    async getStatus(@Request() req: any) {
        await this.securityService.ensurePermission(req.user.id, 'infra.vps.terminal.access', 'Sem permissão para acessar terminal da VPS.');
        return this.service.getStatus();
    }

    @Post('test-connection')
    async testConnection(@Request() req: any) {
        await this.securityService.ensurePermission(req.user.id, 'infra.vps.terminal.access', 'Sem permissão para testar conexão da VPS.');
        return this.service.testConnection();
    }

    @Post('execute')
    async execute(@Body() body: { command: string; timeout_ms?: number }, @Request() req: any) {
        await this.securityService.ensurePermission(req.user.id, 'infra.vps.terminal.execute', 'Sem permissão para executar comandos na VPS.');
        return this.service.execute(body?.command, body?.timeout_ms);
    }
}
