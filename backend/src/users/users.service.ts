
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    async findOne(email: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { email },
        });
    }

    async findById(id: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { id },
        });
    }

    async create(data: any): Promise<User> {
        const passwordPlain = data.password || data.password_hash;
        if (!passwordPlain) {
            throw new Error('Password is required');
        }

        const hashedPassword = await bcrypt.hash(passwordPlain, 10);

        const createData: Prisma.UserCreateInput = {
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

    async update(id: string, data: any): Promise<User> {
        const updateData: Prisma.UserUpdateInput = {
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
        } else if (data.supervisor_id === null) {
            updateData.supervisor = {
                disconnect: true
            };
        }

        return this.prisma.user.update({
            where: { id },
            data: updateData,
        });
    }

    async remove(id: string, requestUserId?: string): Promise<User> {
        // Rule 1: Cannot delete self
        if (requestUserId && id === requestUserId) {
            throw new Error('Você não pode excluir sua própria conta.');
        }

        // Rule 2: Cannot delete the last ADMIN
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

    async findFirstAdmin(): Promise<User | null> {
        return this.prisma.user.findFirst({
            where: { role: 'ADMIN', is_active: true },
        });
    }

    async findAll(currentUser?: User) {
        const where: Prisma.UserWhereInput = {};

        // If Supervisor/Leader/Operator requests logic:
        // Generally for "Add Member", they validly need to see users.
        // But let's hide ADMINs from non-admins for privacy/cleanliness
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
            } else if (currentUser.role !== 'ADMIN') {
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
    async removeBulk(ids: string[], requestUserId: string) {
        // Rule 1: Cannot delete self
        if (ids.includes(requestUserId)) {
            throw new Error('Você não pode excluir sua própria conta.');
        }

        // Rule 2: Cannot delete the last ADMIN
        // Find how many admins are in the deletion list
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

    async updateStatusBulk(ids: string[], isActive: boolean, requestUserId: string) {
        // Rule 1: Cannot deactivate self
        if (!isActive && ids.includes(requestUserId)) {
            throw new Error('Você não pode desativar sua própria conta.');
        }

        // Rule 2: Cannot deactivate the last ADMIN
        if (!isActive) {
            const adminsToDeactivateCount = await this.prisma.user.count({
                where: {
                    id: { in: ids },
                    role: 'ADMIN'
                }
            });

            if (adminsToDeactivateCount > 0) {
                // Count active admins NOT in the list
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
    async updateSupervisorBulk(ids: string[], supervisorId: string | null, requestUserId: string) {
        // Prevent updating self supervisor if in list (logic optional, but good for safety)
        if (ids.includes(requestUserId)) {
            // Maybe allow, but usually admin doesn't assign supervisor to self via bulk
        }

        // Validate supervisor if provided
        if (supervisorId) {
            const supervisor = await this.prisma.user.findUnique({ where: { id: supervisorId } });
            if (!supervisor) {
                throw new Error('Supervisor não encontrado.');
            }
            if (supervisor.role !== 'SUPERVISOR' && supervisor.role !== 'ADMIN') {
                // Optional: Enforce role check
            }
        }

        return this.prisma.user.updateMany({
            where: { id: { in: ids } },
            data: { supervisor_id: supervisorId }
        });
    }

    async findChatAssociates(currentUser: any) {
        if (currentUser.role === 'OPERATOR') {
            // Operator sees Supervisors and Admins
            return this.prisma.user.findMany({
                where: {
                    role: { in: ['SUPERVISOR', 'ADMIN'] },
                    is_active: true
                },
                select: { id: true, name: true, surname: true, role: true, email: true }
            });
        }

        // Supervisors/Admins see Operators
        // (Could be refined to "My Team" later if needed, but "All Operators" is safer for now)
        return this.prisma.user.findMany({
            where: {
                role: { in: ['OPERATOR'] },
                is_active: true
            },
            select: { id: true, name: true, surname: true, role: true, email: true }
        });
    }
}

