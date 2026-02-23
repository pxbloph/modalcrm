import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class KanbanFilterPresetsService {
    constructor(private prisma: PrismaService) { }

    async findAll(user: User) {
        return this.prisma.kanbanFilterPreset.findMany({
            where: { user_id: user.id },
            orderBy: { created_at: 'desc' },
        });
    }

    async create(data: any, user: User) {
        // If setting as default, unset others first
        if (data.is_default) {
            await this.prisma.kanbanFilterPreset.updateMany({
                where: { user_id: user.id },
                data: { is_default: false },
            });
        }

        return this.prisma.kanbanFilterPreset.create({
            data: {
                name: data.name,
                is_default: data.is_default || false,
                config_json: data.config_json,
                user: { connect: { id: user.id } },
            },
        });
    }

    async update(id: string, data: any, user: User) {
        const preset = await this.prisma.kanbanFilterPreset.findUnique({
            where: { id },
        });

        if (!preset || preset.user_id !== user.id) {
            throw new NotFoundException('Preset não encontrado.');
        }

        if (data.is_default) {
            await this.prisma.kanbanFilterPreset.updateMany({
                where: { user_id: user.id, id: { not: id } },
                data: { is_default: false },
            });
        }

        return this.prisma.kanbanFilterPreset.update({
            where: { id },
            data: {
                name: data.name,
                is_default: data.is_default !== undefined ? data.is_default : preset.is_default,
                config_json: data.config_json || preset.config_json,
            },
        });
    }

    async remove(id: string, user: User) {
        const preset = await this.prisma.kanbanFilterPreset.findUnique({
            where: { id },
        });

        if (!preset || preset.user_id !== user.id) {
            throw new NotFoundException('Preset não encontrado.');
        }

        return this.prisma.kanbanFilterPreset.delete({
            where: { id },
        });
    }
}
