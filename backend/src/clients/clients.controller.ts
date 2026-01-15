
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, Query, Patch } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('clients')
@UseGuards(AuthGuard('jwt'))
export class ClientsController {
    constructor(private readonly clientsService: ClientsService) { }

    @Post()
    create(@Body() createClientDto: any, @Request() req) {
        return this.clientsService.create(createClientDto, req.user);
    }

    @Get('dashboard-metrics')
    async getDashboardMetrics(@Request() req, @Query() query) {
        // Now accesible by all, filtered by service
        return this.clientsService.getDashboardMetrics(req.user, query);
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
