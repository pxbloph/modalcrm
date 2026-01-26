import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TagsService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.tag.findMany({
            orderBy: { name: 'asc' },
        });
    }

    async create(data: { name: string; color?: string }) {
        return this.prisma.tag.create({
            data: {
                name: data.name,
                color: data.color || '#64748b'
            }
        });
    }

    async delete(id: string) {
        return this.prisma.tag.delete({ where: { id } });
    }
}
