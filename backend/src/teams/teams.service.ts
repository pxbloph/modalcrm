import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class TeamsService {
    constructor(private prisma: PrismaService) { }

    async create(data: { name: string; supervisorId: string; leaderId?: string }) {
        const { name, supervisorId, leaderId } = data;

        // Validate Supervisor
        const supervisor = await this.prisma.user.findUnique({ where: { id: supervisorId } });
        if (!supervisor || (supervisor.role !== Role.SUPERVISOR && supervisor.role !== Role.ADMIN)) {
            throw new BadRequestException('Invalid supervisor');
        }

        // Validate Leader
        if (leaderId) {
            if (leaderId === supervisorId) {
                throw new BadRequestException('Supervisor and Leader cannot be the same person');
            }
            const leader = await this.prisma.user.findUnique({ where: { id: leaderId } });
            if (!leader || (leader.role !== Role.LEADER && leader.role !== Role.ADMIN)) { // Assuming Leader role or Admin can be leader
                // If LEADER role is strict, check strictly. For now lenient or update user role logic might be needed.
                // Let's stick to the plan: Leader profile compatible.
            }
        }

        const team = await this.prisma.team.create({
            data: {
                name,
                supervisor_id: supervisorId,
                leader_id: leaderId,
            },
        });

        // Assign Supervisor to Team as member? Usually supervisor is unrelated or part of it?
        // Requirement: "Supervisor obrigatório (responsável final)".
        // Requirement: "Cada usuário pertence a 1 única equipe."
        // Does the supervisor belong to the team they supervise? 
        // Usually yes, but the schema has `supervisor_id` on the team.
        // Let's assume the supervisor IS a member too, or at least associated.
        // The user has `team_id`.

        // Update Supervisor and Leader team_id
        await this.prisma.user.update({ where: { id: supervisorId }, data: { team_id: team.id } });
        if (leaderId) {
            await this.prisma.user.update({ where: { id: leaderId }, data: { team_id: team.id } });
        }

        return team;
    }

    async update(id: string, data: { name?: string; supervisorId?: string; leaderId?: string }) {
        const { name, supervisorId, leaderId } = data;

        // Validate Supervisor
        if (supervisorId) {
            const supervisor = await this.prisma.user.findUnique({ where: { id: supervisorId } });
            if (!supervisor || (supervisor.role !== Role.SUPERVISOR && supervisor.role !== Role.ADMIN)) {
                throw new BadRequestException('Invalid supervisor');
            }
        }

        // Validate Leader
        if (leaderId) {
            // Check if leader is same as supervisor (either new or existing)
            if (supervisorId && leaderId === supervisorId) {
                throw new BadRequestException('Supervisor and Leader cannot be the same person');
            }
            if (!supervisorId) {
                const currentTeam = await this.prisma.team.findUnique({ where: { id } });
                if (currentTeam?.supervisor_id === leaderId) throw new BadRequestException('Supervisor and Leader cannot be same');
            }

            const leader = await this.prisma.user.findUnique({ where: { id: leaderId } });
            // Relaxed checks
        }

        const updated = await this.prisma.team.update({
            where: { id },
            data: {
                name,
                supervisor_id: supervisorId,
                leader_id: leaderId,
            }
        });

        // Update User links
        if (supervisorId) {
            await this.prisma.user.update({ where: { id: supervisorId }, data: { team_id: id } });
        }
        if (leaderId) {
            await this.prisma.user.update({ where: { id: leaderId }, data: { team_id: id } });
        }

        return updated;
    }

    async remove(id: string) {
        // Disconnect all members first to avoid Foreign Key Constraint violation
        await this.prisma.user.updateMany({
            where: { team_id: id },
            data: { team_id: null },
        });

        return this.prisma.team.delete({ where: { id } });
    }



    async findAll() {
        const teams = await this.prisma.team.findMany({
            include: {
                supervisor: true,
                leader: true,
                _count: {
                    select: { members: true },
                },
            },
        });

        // Need aggregated metrics: Leads, Conversions etc.
        // This might be expensive to calc on the fly for all teams.
        // For now, let's return the basic structure.
        return teams;
    }

    async findOne(id: string) {
        const team = await this.prisma.team.findUnique({
            where: { id },
            include: {
                supervisor: true,
                leader: true,
                members: true,
            },
        });

        if (!team) return null;

        const memberIds = team.members.map(m => m.id);

        // Calculate Metrics
        // Leads: integration_status = "Cadastro salvo com sucesso!"
        const leads = await this.prisma.client.count({
            where: {
                created_by_id: { in: memberIds },
                integration_status: "Cadastro salvo com sucesso!"
            }
        });

        // Pendentes: integration_status = "Cadastrando..."
        const pendentes = await this.prisma.client.count({
            where: {
                created_by_id: { in: memberIds },
                integration_status: "Cadastrando..."
            }
        });

        // Contas: has_open_account = true
        // Note: Should this apply only to 'Leads'? Usually Account Open implies it's a lead too.
        // Assuming "has_open_account = true" is enough condition regardless of status, OR should verify scope.
        // Usually, accounts open are among the successful clients.
        // Let's filter purely by has_open_account for consistency with request "total de clientes com has_open_account = true".
        const contas = await this.prisma.client.count({
            where: {
                created_by_id: { in: memberIds },
                has_open_account: true
            }
        });

        const conversao = leads > 0 ? ((contas / leads) * 100) : 0;

        return {
            ...team,
            metrics: {
                leads,
                contas,
                pendentes,
                conversao: Number(conversao.toFixed(1)) // 1 decimal place
            }
        };
    }

    async addMember(teamId: string, userId: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new BadRequestException('User not found');

        return this.prisma.user.update({
            where: { id: userId },
            data: { team_id: teamId },
        });
    }

    async removeMember(teamId: string, userId: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new BadRequestException('User not found');

        // Optional: Check if user belongs to team
        if (user.team_id !== teamId) {
            // throw new BadRequestException('User is not in this team'); // Strict check
            // or just ignore
        }

        return this.prisma.user.update({
            where: { id: userId },
            data: { team_id: null },
        });
    }
}
