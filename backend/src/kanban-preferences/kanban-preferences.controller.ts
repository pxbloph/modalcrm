import { Controller, Get, Put, Body, Query, UseGuards, Req } from '@nestjs/common';
import { KanbanPreferencesService } from './kanban-preferences.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('kanban-preferences')
@UseGuards(JwtAuthGuard)
export class KanbanPreferencesController {
    constructor(private readonly preferencesService: KanbanPreferencesService) { }

    @Get()
    async getPreferences(@Req() req, @Query('pipelineId') pipelineId: string) {
        return this.preferencesService.getPreferences(req.user.id, pipelineId);
    }

    @Put()
    async updatePreferences(
        @Req() req,
        @Query('pipelineId') pipelineId: string,
        @Body() data: any,
    ) {
        return this.preferencesService.updatePreferences(req.user.id, pipelineId, data);
    }
}
