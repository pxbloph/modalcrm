import { Body, Controller, Delete, Get, Param, Post, Put, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DevNotesService } from './dev-notes.service';
import { SecurityService } from '../security/security.service';

@Controller('dev-notes')
@UseGuards(AuthGuard('jwt'))
export class DevNotesController {
    constructor(
        private readonly devNotesService: DevNotesService,
        private readonly securityService: SecurityService,
    ) { }

    private async ensureManageAccess(req: any) {
        if (req?.user?.role === 'ADMIN') return;
        await this.securityService.ensurePermission(req.user.id, 'settings.dev_notes.manage', 'Sem permissão para gerenciar Dev Notes.');
    }

    @Get('feed')
    async getFeed(@Request() req: any) {
        return this.devNotesService.getUserFeed(req.user.id);
    }

    @Post('mark-seen-today')
    async markSeenToday(@Request() req: any) {
        return this.devNotesService.markSeenToday(req.user.id);
    }

    @Get()
    async listAll(@Request() req: any) {
        await this.ensureManageAccess(req);
        return this.devNotesService.listAll();
    }

    @Post()
    async create(@Body() body: any, @Request() req: any) {
        await this.ensureManageAccess(req);
        return this.devNotesService.create(body, req.user.id);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
        await this.ensureManageAccess(req);
        return this.devNotesService.update(id, body);
    }

    @Delete(':id')
    async remove(@Param('id') id: string, @Request() req: any) {
        await this.ensureManageAccess(req);
        return this.devNotesService.remove(id);
    }
}
