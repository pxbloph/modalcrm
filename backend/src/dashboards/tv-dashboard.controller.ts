import { Controller, Get, Query } from '@nestjs/common';
import { TvDashboardService } from './tv-dashboard.service';

@Controller('dashboards/tv')
export class TvDashboardController {
    constructor(private readonly desktopService: TvDashboardService) { }

    @Get('contas-abertas')
    async getOpenAccounts(@Query('date') date?: string) {
        return this.desktopService.getOpenAccountsMetrics(date);
    }

    @Get('v2-metrics')
    async getV2Metrics(@Query('date') date?: string) {
        return this.desktopService.getExpandedMetrics(date);
    }
}
