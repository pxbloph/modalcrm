import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { TabulationsService } from './tabulations.service';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';

@Controller('tabulations')
@UseGuards(AuthGuard('jwt'))
export class TabulationsController {
    constructor(private readonly tabulationsService: TabulationsService) { }

    @Get()
    async findAll(@Request() req) {
        if (req.user.role !== Role.ADMIN) {
            throw new ForbiddenException('Apenas admin pode gerenciar tabulações.');
        }
        return this.tabulationsService.findAll();
    }

    @Get('active')
    async findActive() {
        // Allow everyone (operators need it to select)
        return this.tabulationsService.findActive();
    }

    @Post()
    async create(@Body() data: { label: string; target_stage_id?: string }, @Request() req) {
        if (req.user.role !== Role.ADMIN) {
            throw new ForbiddenException('Apenas admin pode criar tabulações.');
        }
        return this.tabulationsService.create(data);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() data: any, @Request() req) {
        if (req.user.role !== Role.ADMIN) {
            throw new ForbiddenException('Apenas admin pode editar tabulações.');
        }
        return this.tabulationsService.update(id, data);
    }

    @Delete(':id')
    async remove(@Param('id') id: string, @Request() req) {
        if (req.user.role !== Role.ADMIN) {
            throw new ForbiddenException('Apenas admin pode excluir tabulações.');
        }
        return this.tabulationsService.remove(id);
    }
}
