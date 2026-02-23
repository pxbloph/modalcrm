import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { KanbanFilterPresetsService } from './kanban-filter-presets.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('kanban/filter-presets')
@UseGuards(AuthGuard('jwt'))
export class KanbanFilterPresetsController {
    constructor(private readonly presetsService: KanbanFilterPresetsService) { }

    @Get()
    findAll(@Request() req) {
        return this.presetsService.findAll(req.user);
    }

    @Post()
    create(@Body() data: any, @Request() req) {
        return this.presetsService.create(data, req.user);
    }

    @Put(':id')
    update(@Param('id') id: string, @Body() data: any, @Request() req) {
        return this.presetsService.update(id, data, req.user);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Request() req) {
        return this.presetsService.remove(id, req.user);
    }
}
