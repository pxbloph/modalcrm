import { Controller, Get, Post, Body, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { FormTemplatesService } from './form-templates.service';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';

@Controller('form-templates')
@UseGuards(AuthGuard('jwt'))
export class FormTemplatesController {
    constructor(private readonly formTemplatesService: FormTemplatesService) { }

    @Post()
    async create(@Body() data: { title: string; fields: any; type: string }, @Request() req) {
        if (req.user.role !== Role.ADMIN) {
            throw new ForbiddenException('Apenas administradores podem criar modelos de formulário');
        }
        return this.formTemplatesService.create(data);
    }

    @Get('active')
    async findActive(@Request() req) {
        // Available to all authenticated users (operators need it to render form)
        // Accepts query param ?type=QUALIFICATION (default) or REGISTRATION
        const type = req.query.type as string || 'QUALIFICATION';
        return this.formTemplatesService.findActive(type);
    }

    @Get()
    async findAll(@Request() req) {
        if (req.user.role !== Role.ADMIN) {
            throw new ForbiddenException('Apenas administradores podem ver histórico de formulários');
        }
        return this.formTemplatesService.findAll();
    }
}
