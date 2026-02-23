import { Injectable, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { User, Role } from '@prisma/client';

@Injectable()
export class ResponsibilityService {
    constructor(
        private prisma: PrismaService,
        private auditService: AuditService
    ) { }

    async createRequest(data: { leadId: string; toUserId: string; reason: string }, user: User) {
        if (data.reason.length < 20) {
            throw new ConflictException('O motivo deve ter pelo menos 20 caracteres.');
        }

        const lead = await this.prisma.client.findUnique({
            where: { id: data.leadId },
            include: {
                created_by: true,
                // clients: { select: { name: true, surname: true } }
            }
        });

        if (!lead) throw new NotFoundException('Lead não encontrado.');

        // Prevent duplicate pending requests
        const existing = await this.prisma.$queryRaw<any[]>`
            SELECT id FROM responsibility_change_requests 
            WHERE lead_id = ${data.leadId} 
            AND to_user_id = ${data.toUserId}
            AND status = 'pending'
        `;

        if (existing.length > 0) {
            throw new ConflictException('Já existe uma solicitação pendente para este lead e este operador.');
        }

        const fromUserId = lead.created_by_id;
        const tabulacaoSnapshot = (lead as any).tabulacao || 'Sem tabulação';

        // Direct Insert via QueryRaw (since we didn't regenerate Prisma Client yet)
        await this.prisma.$executeRaw`
            INSERT INTO responsibility_change_requests (
                id, lead_id, from_user_id, to_user_id, requested_by_user_id, reason, status, tabulacao_snapshot, created_at
            ) VALUES (
                uuid_generate_v4(), ${data.leadId}, ${fromUserId}, ${data.toUserId}, ${user.id}, ${data.reason}, 'pending', ${tabulacaoSnapshot}, NOW()
            )
        `;

        return { message: 'Solicitação enviada para aprovação.' };
    }

    async findAll(user: User, filters: any = {}) {
        let whereClause = "1=1";

        // RBAC: Operators see only their requests? Or open? Usually admins see all.
        // Let's allow admins/supervisors to see all. Operators see what they requested.
        if (user.role === Role.OPERATOR) {
            whereClause += ` AND r.requested_by_user_id = '${user.id}'`;
        }

        if (filters.status) {
            whereClause += ` AND r.status = '${filters.status}'`;
        } else {
            // Default to pending if admin?
            whereClause += ` AND r.status = 'pending'`;
        }

        const requests = await this.prisma.$queryRawUnsafe(`
            SELECT 
                r.*,
                c.name as client_name, c.cnpj as client_cnpj, c.has_open_account,
                u_from.name as from_name, u_from.surname as from_surname,
                u_to.name as to_name, u_to.surname as to_surname,
                u_req.name as req_name, u_req.surname as req_surname
            FROM responsibility_change_requests r
            JOIN clients c ON r.lead_id = c.id
            JOIN users u_from ON r.from_user_id = u_from.id
            JOIN users u_to ON r.to_user_id = u_to.id
            JOIN users u_req ON r.requested_by_user_id = u_req.id
            WHERE ${whereClause}
            ORDER BY c.has_open_account DESC, r.created_at DESC
        `);

        return requests;
    }

    async approve(id: string, user: User) {
        if (user.role !== Role.ADMIN && user.role !== Role.SUPERVISOR) {
            throw new ForbiddenException('Apenas Supervisores e Admins podem aprovar.');
        }

        const request: any[] = await this.prisma.$queryRaw`
            SELECT * FROM responsibility_change_requests WHERE id = ${id}::uuid
        `;

        if (!request || request.length === 0) throw new NotFoundException('Solicitação não encontrada');
        const req = request[0];

        if (req.status !== 'pending') throw new ConflictException('Solicitação não está pendente.');

        // 1. Execute Update (Client Owner)
        await this.prisma.client.update({
            where: { id: req.lead_id },
            data: { created_by_id: req.to_user_id }
        });

        // 2. Execute Update (Deal Responsible - optional, but requested "Puxar Leads")
        // Find open deal and update responsible
        const openDeals = await this.prisma.deal.findMany({
            where: { client_id: req.lead_id, status: 'OPEN' }
        });

        for (const deal of openDeals) {
            await this.prisma.deal.update({
                where: { id: deal.id },
                data: { responsible_id: req.to_user_id }
            });
            // Log Deal History
            await this.prisma.dealHistory.create({
                data: {
                    deal_id: deal.id,
                    action: 'RESPONSIBLE_UPDATE',
                    details: {
                        from: req.from_user_id, // simplified, actually should look up names
                        to: req.to_user_id,
                        reason: 'Aprovação de Solicitação de Troca'
                    },
                    actor_id: user.id
                }
            });
        }

        // 3. Update Request Status
        await this.prisma.$executeRaw`
            UPDATE responsibility_change_requests 
            SET status = 'approved', reviewer_user_id = ${user.id}, decided_at = NOW()
            WHERE id = ${id}::uuid
        `;

        // 4. Audit
        await this.auditService.log({
            level: 'INFO',
            event_type: 'RESPONSIBILITY_APPROVED',
            entity_type: 'CLIENT',
            entity_id: req.lead_id,
            action: 'APPROVE_TRANSFER',
            actor_id: user.id,
            metadata: { requestId: id }
        } as any);

        return { message: 'Aprovado com sucesso.' };
    }

    async reject(id: string, user: User, comment: string) {
        if (user.role !== Role.ADMIN && user.role !== Role.SUPERVISOR) {
            throw new ForbiddenException('Apenas Supervisores e Admins podem reprovar.');
        }
        if (!comment) throw new ConflictException('Comentário obrigatório ao reprovar.');

        await this.prisma.$executeRaw`
            UPDATE responsibility_change_requests 
            SET status = 'rejected', reviewer_user_id = ${user.id}, reviewer_comment = ${comment}, decided_at = NOW()
            WHERE id = ${id}::uuid
        `;

        return { message: 'Solicitação reprovida.' };
    }
}
