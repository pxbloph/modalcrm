import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const BRAZIL_TZ = 'America/Sao_Paulo';

@Injectable()
export class DevNotesService {
    constructor(private readonly prisma: PrismaService) { }

    private getTodayKey(date = new Date()) {
        return new Intl.DateTimeFormat('en-CA', {
            timeZone: BRAZIL_TZ,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(date);
    }

    async getUserFeed(userId: string) {
        const [notes, seenToday] = await Promise.all([
            (this.prisma as any).devNote.findMany({
                where: { is_active: true },
                orderBy: [{ show_in_daily_popup: 'desc' }, { created_at: 'desc' }],
                include: {
                    created_by: {
                        select: { id: true, name: true, surname: true },
                    },
                },
            }),
            (this.prisma as any).devNoteDailyView.findUnique({
                where: {
                    user_id_day_key: {
                        user_id: userId,
                        day_key: this.getTodayKey(),
                    },
                },
            }),
        ]);

        const popupEligibleNotes = notes.filter((note: any) => note.show_in_daily_popup);

        return {
            notes,
            should_auto_open: popupEligibleNotes.length > 0 && !seenToday,
            day_key: this.getTodayKey(),
        };
    }

    async markSeenToday(userId: string) {
        const dayKey = this.getTodayKey();

        await (this.prisma as any).devNoteDailyView.upsert({
            where: {
                user_id_day_key: {
                    user_id: userId,
                    day_key: dayKey,
                },
            },
            create: {
                user_id: userId,
                day_key: dayKey,
            },
            update: {},
        });

        return { ok: true, day_key: dayKey };
    }

    async listAll() {
        return (this.prisma as any).devNote.findMany({
            orderBy: [{ is_active: 'desc' }, { created_at: 'desc' }],
            include: {
                created_by: {
                    select: { id: true, name: true, surname: true },
                },
            },
        });
    }

    async create(data: any, userId: string) {
        if (!data?.title?.trim() || !data?.content?.trim()) {
            throw new BadRequestException('Título e conteúdo são obrigatórios.');
        }

        return (this.prisma as any).devNote.create({
            data: {
                title: data.title.trim(),
                content: data.content.trim(),
                is_active: data.is_active !== undefined ? Boolean(data.is_active) : true,
                show_in_daily_popup: data.show_in_daily_popup !== undefined ? Boolean(data.show_in_daily_popup) : true,
                created_by_id: userId,
            },
        });
    }

    async update(id: string, data: any) {
        const note = await (this.prisma as any).devNote.findUnique({ where: { id } });
        if (!note) {
            throw new NotFoundException('Dev Note não encontrada.');
        }

        return (this.prisma as any).devNote.update({
            where: { id },
            data: {
                title: data.title !== undefined ? String(data.title).trim() : note.title,
                content: data.content !== undefined ? String(data.content).trim() : note.content,
                is_active: data.is_active !== undefined ? Boolean(data.is_active) : note.is_active,
                show_in_daily_popup: data.show_in_daily_popup !== undefined ? Boolean(data.show_in_daily_popup) : note.show_in_daily_popup,
            },
        });
    }

    async remove(id: string) {
        const note = await (this.prisma as any).devNote.findUnique({ where: { id } });
        if (!note) {
            throw new NotFoundException('Dev Note não encontrada.');
        }

        await (this.prisma as any).devNote.delete({ where: { id } });
        return { ok: true };
    }
}
