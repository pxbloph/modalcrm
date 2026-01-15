"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let TeamsService = class TeamsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        const { name, supervisorId, leaderId } = data;
        const supervisor = await this.prisma.user.findUnique({ where: { id: supervisorId } });
        if (!supervisor || (supervisor.role !== client_1.Role.SUPERVISOR && supervisor.role !== client_1.Role.ADMIN)) {
            throw new common_1.BadRequestException('Invalid supervisor');
        }
        if (leaderId) {
            if (leaderId === supervisorId) {
                throw new common_1.BadRequestException('Supervisor and Leader cannot be the same person');
            }
            const leader = await this.prisma.user.findUnique({ where: { id: leaderId } });
            if (!leader || (leader.role !== client_1.Role.LEADER && leader.role !== client_1.Role.ADMIN)) {
            }
        }
        const team = await this.prisma.team.create({
            data: {
                name,
                supervisor_id: supervisorId,
                leader_id: leaderId,
            },
        });
        await this.prisma.user.update({ where: { id: supervisorId }, data: { team_id: team.id } });
        if (leaderId) {
            await this.prisma.user.update({ where: { id: leaderId }, data: { team_id: team.id } });
        }
        return team;
    }
    async update(id, data) {
        const { name, supervisorId, leaderId } = data;
        if (supervisorId) {
            const supervisor = await this.prisma.user.findUnique({ where: { id: supervisorId } });
            if (!supervisor || (supervisor.role !== client_1.Role.SUPERVISOR && supervisor.role !== client_1.Role.ADMIN)) {
                throw new common_1.BadRequestException('Invalid supervisor');
            }
        }
        if (leaderId) {
            if (supervisorId && leaderId === supervisorId) {
                throw new common_1.BadRequestException('Supervisor and Leader cannot be the same person');
            }
            if (!supervisorId) {
                const currentTeam = await this.prisma.team.findUnique({ where: { id } });
                if (currentTeam?.supervisor_id === leaderId)
                    throw new common_1.BadRequestException('Supervisor and Leader cannot be same');
            }
            const leader = await this.prisma.user.findUnique({ where: { id: leaderId } });
        }
        const updated = await this.prisma.team.update({
            where: { id },
            data: {
                name,
                supervisor_id: supervisorId,
                leader_id: leaderId,
            }
        });
        if (supervisorId) {
            await this.prisma.user.update({ where: { id: supervisorId }, data: { team_id: id } });
        }
        if (leaderId) {
            await this.prisma.user.update({ where: { id: leaderId }, data: { team_id: id } });
        }
        return updated;
    }
    async remove(id) {
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
        return teams;
    }
    async findOne(id) {
        const team = await this.prisma.team.findUnique({
            where: { id },
            include: {
                supervisor: true,
                leader: true,
                members: true,
            },
        });
        if (!team)
            return null;
        const memberIds = team.members.map(m => m.id);
        const leads = await this.prisma.client.count({
            where: {
                created_by_id: { in: memberIds },
                integration_status: "Cadastro salvo com sucesso!"
            }
        });
        const pendentes = await this.prisma.client.count({
            where: {
                created_by_id: { in: memberIds },
                integration_status: "Cadastrando..."
            }
        });
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
                conversao: Number(conversao.toFixed(1))
            }
        };
    }
    async addMember(teamId, userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.BadRequestException('User not found');
        return this.prisma.user.update({
            where: { id: userId },
            data: { team_id: teamId },
        });
    }
    async removeMember(teamId, userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.BadRequestException('User not found');
        if (user.team_id !== teamId) {
        }
        return this.prisma.user.update({
            where: { id: userId },
            data: { team_id: null },
        });
    }
};
exports.TeamsService = TeamsService;
exports.TeamsService = TeamsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TeamsService);
//# sourceMappingURL=teams.service.js.map