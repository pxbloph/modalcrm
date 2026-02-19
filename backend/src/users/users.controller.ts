
import { Controller, Get, Post, Put, Delete, Patch, Body, Param, UseGuards, Request, ForbiddenException, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';

@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get()
    async findAll(@Request() req, @Query('scope') scope?: string) {
        // Allow Admin and Supervisor to list users (for Teams/Reports)
        if (req.user.role !== Role.ADMIN && req.user.role !== Role.SUPERVISOR) {
            throw new ForbiddenException('Apenas administradores podem listar todos os usuários');
        }

        // If scope is 'full', return all users (for Audit Filters, etc)
        // Ignoring hierarchy restrictions temporarily for this purpose
        if (scope === 'full') {
            return this.usersService.findAll();
        }

        return this.usersService.findAll(req.user);
    }

    @Get('chat-associates')
    async getChatAssociates(@Request() req) {
        // Available for all authenticated users (Operator needs it)
        return this.usersService.findChatAssociates(req.user);
    }

    @Post()

    async create(@Body() data: any, @Request() req) {
        if (req.user.role !== Role.ADMIN) {
            throw new ForbiddenException('Apenas administradores podem criar usuários');
        }
        return this.usersService.create(data);
    }

    @Get(':id')
    async findOne(@Param('id') id: string, @Request() req) {
        if (req.user.role !== Role.ADMIN) {
            throw new ForbiddenException('Apenas administradores podem ver detalhes de usuários');
        }
        return this.usersService.findById(id);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() data: any, @Request() req) {
        if (req.user.role !== Role.ADMIN) {
            throw new ForbiddenException('Apenas administradores podem editar usuários');
        }
        return this.usersService.update(id, data);
    }

    @Delete(':id')
    async remove(@Param('id') id: string, @Request() req) {
        if (req.user.role !== Role.ADMIN) {
            throw new ForbiddenException('Apenas administradores podem excluir usuários');
        }
        try {
            return await this.usersService.remove(id, req.user.id);
        } catch (error) {
            throw new ForbiddenException(error.message);
        }
    }

    @Delete('batch/bulk-delete')
    async removeBulk(@Body('ids') ids: string[], @Request() req) {
        if (req.user.role !== Role.ADMIN) {
            throw new ForbiddenException('Apenas administradores podem excluir usuários');
        }
        try {
            return await this.usersService.removeBulk(ids, req.user.id);
        } catch (error) {
            throw new ForbiddenException(error.message);
        }
    }

    @Patch('batch/bulk-status')
    async updateStatusBulk(@Body() body: { ids: string[], isActive: boolean }, @Request() req) {
        if (req.user.role !== Role.ADMIN) {
            throw new ForbiddenException('Apenas administradores podem alterar status de usuários');
        }
        try {
            return await this.usersService.updateStatusBulk(body.ids, body.isActive, req.user.id);
        } catch (error) {
            throw new ForbiddenException(error.message);
        }
    }
    @Patch('batch/bulk-supervisor')
    async updateSupervisorBulk(@Body() body: { ids: string[], supervisorId: string | null }, @Request() req) {
        if (req.user.role !== Role.ADMIN) {
            throw new ForbiddenException('Apenas administradores podem atribuir supervisores.');
        }
        try {
            return await this.usersService.updateSupervisorBulk(body.ids, body.supervisorId, req.user.id);
        } catch (error) {
            throw new ForbiddenException(error.message);
        }
    }
}
