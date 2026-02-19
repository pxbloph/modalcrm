import { Controller, Get, Query, UseGuards, Param, NotFoundException, Request, ForbiddenException } from '@nestjs/common';
import { AuditService } from './audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';

@Controller('audit-logs')
@UseGuards(AuthGuard('jwt'))
export class AuditController {
    constructor(
        private readonly prisma: PrismaService
    ) { }

    @Get()
    async findAll(@Query() query: any, @Request() req) {
        if (req.user.role !== Role.ADMIN && req.user.role !== Role.SUPERVISOR) {
            throw new ForbiddenException('Acesso negado aos logs de auditoria');
        }
        const {
            page = 1,
            limit = 50,
            event_type,
            entity_type,
            entity_id,
            actor_id,
            start_date,
            end_date,
            search,
            action
        } = query;

        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        const where: any = {};

        if (event_type) where.event_type = event_type;
        // If 'action' is provided and not 'ALL', use it to filter event_type
        if (action && action !== 'ALL') {
            where.event_type = action;
        } else if (event_type) {
            where.event_type = event_type;
        } else {
            // Default behavior: Hide technical logs (HTTP_REQUEST, DEBUG) unless specifically filtered
            where.event_type = { notIn: ['HTTP_REQUEST', 'DEBUG', 'EXCEPTION'] };
        }

        if (entity_type) where.entity_type = entity_type;
        if (entity_id) where.entity_id = entity_id;
        if (actor_id) where.actor_id = actor_id;

        if (start_date || end_date) {
            where.created_at = {};
            if (start_date) where.created_at.gte = new Date(start_date);
            if (end_date) where.created_at.lte = new Date(end_date);
        }

        if (search) {
            where.OR = [
                { action: { contains: search, mode: 'insensitive' } },
                { request_id: { contains: search, mode: 'insensitive' } },
                { entity_id: { contains: search, mode: 'insensitive' } },
                { entity_type: { contains: search, mode: 'insensitive' } }, // Added from the instruction's search block
                { actor: { name: { contains: search, mode: 'insensitive' } } }, // Added from the instruction's search block
                // Add more fields if needed, but be careful with performance on large tables
            ];
        }

        const [logs, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                skip,
                take,
                orderBy: { created_at: 'desc' },
                include: {
                    actor: {
                        select: { id: true, name: true, email: true, role: true }
                    },
                    payload: {
                        select: { metadata: true }
                    }
                }
            }),
            this.prisma.auditLog.count({ where })
        ]);

        return {
            data: logs,
            meta: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit))
            }
        };
    }

    @Get(':id')
    async findOne(@Param('id') id: string, @Request() req) {
        if (req.user.role !== Role.ADMIN && req.user.role !== Role.SUPERVISOR) {
            throw new ForbiddenException('Acesso negado aos logs de auditoria');
        }

        const log = await this.prisma.auditLog.findUnique({
            where: { id },
            include: {
                actor: {
                    select: { id: true, name: true, email: true }
                },
                payload: true
            }
        });

        if (!log) {
            throw new NotFoundException('Log not found');
        }

        return log;
    }
}
