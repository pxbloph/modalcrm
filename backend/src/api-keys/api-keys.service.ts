import { Injectable, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, Role } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeysService {
    constructor(private prisma: PrismaService) { }

    async create(name: string, user: User) {
        if (user.role !== Role.ADMIN) {
            throw new ForbiddenException('Apenas administradores podem criar chaves de API.');
        }

        // Gerar uma chave segura aleatória
        const rawKey = crypto.randomBytes(32).toString('hex');
        const apiKeyStr = `mbf_${rawKey}`; // Prefixo para identificar facilmente

        const apiKey = await this.prisma.apiKey.create({
            data: {
                name,
                key: apiKeyStr,
                created_by_id: user.id
            }
        });

        return apiKey;
    }

    async findAll(user: User) {
        if (user.role !== Role.ADMIN) {
            throw new ForbiddenException('Apenas administradores podem visualizar chaves de API.');
        }

        return this.prisma.apiKey.findMany({
            orderBy: { created_at: 'desc' },
            include: {
                created_by: {
                    select: { name: true, surname: true }
                }
            }
        });
    }

    async revoke(id: string, user: User) {
        if (user.role !== Role.ADMIN) {
            throw new ForbiddenException('Apenas administradores podem revogar chaves de API.');
        }

        const key = await this.prisma.apiKey.findUnique({ where: { id } });
        if (!key) throw new NotFoundException('Chave não encontrada.');

        // Pode excluir ou apenas inativar. Vamos excluir para simplificar, 
        // ou inativar se quiser histórico.
        return this.prisma.apiKey.delete({
            where: { id }
        });
    }
}
