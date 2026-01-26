import { Controller, Get, Query, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportFilterDto } from './dto/report-filter.dto';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';

@Controller('reports')
@UseGuards(AuthGuard('jwt'))
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) { }

    @Get('production')
    async getProduction(@Query() filters: ReportFilterDto, @Request() req) {
        this.checkRoles(req.user);
        return this.reportsService.getProductionStats(filters, req.user);
    }

    @Get('conversion')
    async getConversion(@Query() filters: ReportFilterDto, @Request() req) {
        this.checkRoles(req.user);
        return this.reportsService.getConversionStats(filters, req.user);
    }

    @Get('stages')
    async getStages(@Query() filters: ReportFilterDto, @Request() req) {
        this.checkRoles(req.user);
        return this.reportsService.getDealsByStage(filters, req.user);
    }

    @Get('export')
    async getExport(@Query() filters: ReportFilterDto, @Request() req) {
        this.checkRoles(req.user);
        return this.reportsService.getExportData(filters, req.user);
    }

    private checkRoles(user: any) {
        if (user.role !== Role.ADMIN && user.role !== Role.SUPERVISOR) {
            throw new ForbiddenException('Acesso negado. Apenas Admin e Supervisor.');
        }
    }
}
