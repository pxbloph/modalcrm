
import { Controller, Get, Post, Put, Delete, Patch, Body, Param, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';

@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get()
    async findAll(@Request() req) {
        if (req.user.role !== Role.ADMIN) {
            throw new ForbiddenException('Apenas administradores podem listar usuários');
        }
        // Return all users (supervisors and operators)
        // In a real app, exclude password_hash
        return this.usersService.findAll();
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
}
