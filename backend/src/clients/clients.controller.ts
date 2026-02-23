import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, Query, Patch, Res } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { TabulationsService } from '../tabulations/tabulations.service';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import * as XLSX from 'xlsx';

@Controller('clients')
@UseGuards(AuthGuard('jwt'))
export class ClientsController {
    constructor(
        private readonly clientsService: ClientsService,
        private readonly tabulationsService: TabulationsService
    ) { }

    @Post()
    create(@Body() createClientDto: any, @Request() req) {
        return this.clientsService.create(createClientDto, req.user);
    }

    @Get('lookup')
    lookup(@Query('cnpj') cnpj: string, @Request() req) {
        return this.clientsService.lookupByCnpj(cnpj, req.user);
    }

    @Get('lookup-for-transfer')
    lookupForTransfer(@Query('cnpj') cnpj: string, @Request() req) {
        return this.clientsService.lookupForTransfer(cnpj, req.user);
    }

    @Post('transfer-by-cnpj')
    transferByCnpj(@Body() body: { cnpj: string; reason?: string }, @Request() req) {
        return this.clientsService.transferByCnpj(body.cnpj, req.user, body.reason);
    }

    @Post(':id/takeover')
    takeover(@Param('id') id: string, @Body() body: { reason?: string }, @Request() req) {
        return this.clientsService.takeover(id, req.user, body.reason);
    }

    @Post('takeover/bulk')
    takeoverBulk(@Body() body: any[], @Request() req) {
        return this.clientsService.takeoverBulk(body, req.user);
    }

    @Get('dashboard-metrics')
    async getDashboardMetrics(@Request() req, @Query() query) {
        // Now accesible by all, filtered by service
        return this.clientsService.getDashboardMetrics(req.user, query);
    }

    @Get('export')
    async exportClients(@Request() req, @Query() query, @Res() res: Response) {
        const data = await this.clientsService.exportClients(req.user, query);

        const ws = XLSX.utils.json_to_sheet(data);
        const csv = XLSX.utils.sheet_to_csv(ws);

        res.header('Content-Type', 'text/csv');
        res.attachment(`clientes_export_${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);
    }

    @Get('notifications')
    async getNotifications(@Request() req) {
        return this.clientsService.checkNotifications(req.user);
    }

    @Delete('batch/bulk-delete')
    removeBulk(@Body('ids') ids: string[], @Request() req) {
        return this.clientsService.removeBulk(ids, req.user);
    }

    @Patch('batch/bulk-open-account')
    openAccountBulk(@Body('ids') ids: string[], @Request() req) {
        return this.clientsService.openAccountBulk(ids, req.user);
    }

    @Get()
    findAll(@Request() req, @Query() query) {
        return this.clientsService.findAll(req.user, query);
    }

    @Get(':id')
    async findOne(@Param('id') id: string, @Request() req) {
        return this.clientsService.findOne(id, req.user);
    }

    @Get('tabulations')
    async getTabulations() {
        return this.tabulationsService.findActive();
    }

    @Put(':id')
    update(@Param('id') id: string, @Body() updateClientDto: any, @Request() req) {
        return this.clientsService.update(id, updateClientDto, req.user);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Request() req) {
        return this.clientsService.remove(id, req.user);
    }

    @Patch(':id/qualify')
    qualify(@Param('id') id: string, @Request() req) {
        return this.clientsService.qualify(id, req.user);
    }

    @Patch(':id/open-account')
    openAccount(@Param('id') id: string, @Request() req) {
        return this.clientsService.openAccount(id, req.user);
    }
}
