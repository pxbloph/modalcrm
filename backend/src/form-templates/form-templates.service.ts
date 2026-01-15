import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FormTemplatesService {
    constructor(private prisma: PrismaService) { }

    async create(data: { title: string; fields: any; type: string }) {
        // Set all previous templates of same type to inactive
        // We can do an updateMany before create
        await this.prisma.formTemplate.updateMany({
            where: { type: data.type, is_active: true },
            data: { is_active: false }
        });

        return this.prisma.formTemplate.create({
            data: {
                title: data.title,
                fields: data.fields,
                type: data.type,
                is_active: true
            }
        });
    }

    async findActive(type: string = 'QUALIFICATION') {
        // Get the latest active template of specific type
        return this.prisma.formTemplate.findFirst({
            where: { is_active: true, type },
            orderBy: { created_at: 'desc' }
        });
    }

    async findAll() {
        return this.prisma.formTemplate.findMany({
            orderBy: { created_at: 'desc' }
        });
    }
}
