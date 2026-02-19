import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TabulationsService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.tabulation.findMany({
            orderBy: { label: 'asc' },
            include: { target_stage: true }
        });
    }

    async findActive() {
        return this.prisma.tabulation.findMany({
            where: { is_active: true },
            orderBy: { label: 'asc' },
            include: { target_stage: true }
        });
    }

    async findByLabel(label: string) {
        return this.prisma.tabulation.findFirst({
            where: { label, is_active: true },
            include: { target_stage: true }
        });
    }

    async create(data: { label: string; target_stage_id?: string }) {
        return this.prisma.tabulation.create({
            data: {
                label: data.label,
                target_stage_id: data.target_stage_id || null, // handle logic ensures null if empty
                is_active: true
            }
        });
    }

    async update(id: string, data: { label?: string; target_stage_id?: string; is_active?: boolean }) {
        return this.prisma.tabulation.update({
            where: { id },
            data
        });
    }

    async remove(id: string) {
        // Soft delete usually preferred, but let's allow "deactivate" via update or actual delete if needed.
        // For now, simple delete. User can re-add.
        return this.prisma.tabulation.delete({
            where: { id }
        });
    }
}
