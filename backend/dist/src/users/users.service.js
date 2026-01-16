"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = __importStar(require("bcrypt"));
let UsersService = class UsersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findOne(email) {
        return this.prisma.user.findUnique({
            where: { email },
        });
    }
    async findById(id) {
        return this.prisma.user.findUnique({
            where: { id },
        });
    }
    async create(data) {
        const passwordPlain = data.password || data.password_hash;
        if (!passwordPlain) {
            throw new Error('Password is required');
        }
        const hashedPassword = await bcrypt.hash(passwordPlain, 10);
        const createData = {
            name: data.name,
            surname: data.surname,
            cpf: data.cpf,
            email: data.email,
            password_hash: hashedPassword,
            role: data.role,
            is_active: data.is_active !== undefined ? data.is_active : true,
        };
        if (data.supervisor_id) {
            createData.supervisor = {
                connect: { id: data.supervisor_id }
            };
        }
        return this.prisma.user.create({
            data: createData,
        });
    }
    async update(id, data) {
        const updateData = {
            name: data.name,
            surname: data.surname,
            cpf: data.cpf,
            email: data.email,
            role: data.role,
            is_active: data.is_active,
        };
        if (data.password) {
            updateData.password_hash = await bcrypt.hash(data.password, 10);
        }
        if (data.supervisor_id) {
            updateData.supervisor = {
                connect: { id: data.supervisor_id }
            };
        }
        else if (data.supervisor_id === null) {
            updateData.supervisor = {
                disconnect: true
            };
        }
        return this.prisma.user.update({
            where: { id },
            data: updateData,
        });
    }
    async remove(id, requestUserId) {
        if (requestUserId && id === requestUserId) {
            throw new Error('Você não pode excluir sua própria conta.');
        }
        const userToDelete = await this.prisma.user.findUnique({ where: { id } });
        if (userToDelete?.role === 'ADMIN') {
            const adminCount = await this.prisma.user.count({ where: { role: 'ADMIN' } });
            if (adminCount <= 1) {
                throw new Error('Não é possível excluir o último administrador do sistema.');
            }
        }
        return this.prisma.user.delete({
            where: { id },
        });
    }
    async findAllSupervisors() {
        return this.prisma.user.findMany({
            where: { role: 'SUPERVISOR' },
        });
    }
    async findAll(currentUser) {
        const where = {};
        if (currentUser) {
            if (currentUser.role === 'SUPERVISOR') {
                where.AND = [
                    { role: { not: 'ADMIN' } },
                    {
                        OR: [
                            { id: currentUser.id },
                            { supervisor_id: currentUser.id }
                        ]
                    }
                ];
            }
            else if (currentUser.role !== 'ADMIN') {
                where.role = { not: 'ADMIN' };
            }
        }
        return this.prisma.user.findMany({
            where,
            orderBy: { created_at: 'desc' },
            include: {
                supervisor: {
                    select: { name: true }
                }
            }
        });
    }
    async removeBulk(ids, requestUserId) {
        if (ids.includes(requestUserId)) {
            throw new Error('Você não pode excluir sua própria conta.');
        }
        const adminsToDeleteCount = await this.prisma.user.count({
            where: {
                id: { in: ids },
                role: 'ADMIN'
            }
        });
        if (adminsToDeleteCount > 0) {
            const totalAdmins = await this.prisma.user.count({ where: { role: 'ADMIN' } });
            if (totalAdmins - adminsToDeleteCount < 1) {
                throw new Error('Não é possível excluir todos os administradores. Deve restar pelo menos um.');
            }
        }
        return this.prisma.user.deleteMany({
            where: { id: { in: ids } }
        });
    }
    async updateStatusBulk(ids, isActive, requestUserId) {
        if (!isActive && ids.includes(requestUserId)) {
            throw new Error('Você não pode desativar sua própria conta.');
        }
        if (!isActive) {
            const adminsToDeactivateCount = await this.prisma.user.count({
                where: {
                    id: { in: ids },
                    role: 'ADMIN'
                }
            });
            if (adminsToDeactivateCount > 0) {
                const remainingActiveAdmins = await this.prisma.user.count({
                    where: {
                        role: 'ADMIN',
                        is_active: true,
                        id: { notIn: ids }
                    }
                });
                if (remainingActiveAdmins < 1) {
                    throw new Error('Não é possível desativar todos os administradores. Deve restar pelo menos um ativo.');
                }
            }
        }
        return this.prisma.user.updateMany({
            where: { id: { in: ids } },
            data: { is_active: isActive }
        });
    }
    async updateSupervisorBulk(ids, supervisorId, requestUserId) {
        if (ids.includes(requestUserId)) {
        }
        if (supervisorId) {
            const supervisor = await this.prisma.user.findUnique({ where: { id: supervisorId } });
            if (!supervisor) {
                throw new Error('Supervisor não encontrado.');
            }
            if (supervisor.role !== 'SUPERVISOR' && supervisor.role !== 'ADMIN') {
            }
        }
        return this.prisma.user.updateMany({
            where: { id: { in: ids } },
            data: { supervisor_id: supervisorId }
        });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map