import { Controller, Get, Query, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { TvDashboardService } from './tv-dashboard.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('dashboards/tv')
@UseGuards(AuthGuard('jwt'))
export class TvDashboardController {
    constructor(private readonly desktopService: TvDashboardService) { }

    private ensureTvAccess(user: any) {
        if (!['ADMIN', 'SUPERVISOR', 'LEADER'].includes(user?.role)) {
            throw new ForbiddenException('Sem acesso aos dashboards de TV.');
        }
    }

    @Get('contas-abertas')
    async getOpenAccounts(@Query('date') date: string | undefined, @Request() req: any) {
        this.ensureTvAccess(req.user);
        return this.desktopService.getOpenAccountsMetrics(date, req.user);
    }

    @Get('v2-metrics')
    async getV2Metrics(@Query('date') date: string | undefined, @Request() req: any) {
        this.ensureTvAccess(req.user);
        return this.desktopService.getExpandedMetrics(date, req.user);
    }
}
