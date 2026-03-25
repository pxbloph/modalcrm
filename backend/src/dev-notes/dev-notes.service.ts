import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DevNotesService {
    constructor(private readonly prisma: PrismaService) { }

    async getUserFeed(userId: string) {
        const notes = await (this.prisma as any).devNote.findMany({
            where: { is_active: true },
            orderBy: [{ show_in_daily_popup: 'desc' }, { created_at: 'desc' }],
            include: {
                created_by: {
                    select: { id: true, name: true, surname: true },
                },
                reads: {
                    where: { user_id: userId },
                    select: { id: true },
                },
            },
        });

        // Notas de popup que o usuário ainda não leu
        const unreadPopupNotes = notes.filter(
            (note: any) => note.show_in_daily_popup && note.reads.length === 0,
        );

        // Remove o campo reads do retorno (detalhe interno)
        const notesClean = notes.map(({ reads, ...note }: any) => note);

        return {
            notes: notesClean,
            should_auto_open: unreadPopupNotes.length > 0,
        };
    }

    async markSeenToday(userId: string) {
        // Busca todas as notas de popup ativas ainda não lidas por este usuário
        const unreadNotes = await (this.prisma as any).devNote.findMany({
            where: {
                is_active: true,
                show_in_daily_popup: true,
                reads: { none: { user_id: userId } },
            },
            select: { id: true },
        });

        if (unreadNotes.length > 0) {
            await (this.prisma as any).devNoteRead.createMany({
                data: unreadNotes.map((note: any) => ({
                    user_id: userId,
                    note_id: note.id,
                })),
                skipDuplicates: true,
            });
        }

        return { ok: true, marked: unreadNotes.length };
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
