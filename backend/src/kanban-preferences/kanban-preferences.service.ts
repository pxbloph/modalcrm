import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class KanbanPreferencesService {
    constructor(private prisma: PrismaService) { }

    async getPreferences(userId: string, pipelineId: string) {
        let prefs = await this.prisma.userKanbanPreference.findUnique({
            where: {
                user_id_pipeline_id: {
                    user_id: userId,
                    pipeline_id: pipelineId,
                },
            },
        });

        if (!prefs) {
            // Create default preferences if not exists
            prefs = await this.prisma.userKanbanPreference.create({
                data: {
                    user_id: userId,
                    pipeline_id: pipelineId,
                    view_mode: 'board',
                    page_size: 25,
                    visible_fields: [],
                    visible_columns: [],
                    filters_config: {},
                },
            });
        }

        return prefs;
    }

    async updatePreferences(userId: string, pipelineId: string, data: any) {
        return this.prisma.userKanbanPreference.upsert({
            where: {
                user_id_pipeline_id: {
                    user_id: userId,
                    pipeline_id: pipelineId,
                },
            },
            update: {
                view_mode: data.view_mode,
                page_size: data.page_size,
                visible_fields: data.visible_fields,
                visible_columns: data.visible_columns,
                filters_config: data.filters_config,
            },
            create: {
                user_id: userId,
                pipeline_id: pipelineId,
                view_mode: data.view_mode || 'board',
                page_size: data.page_size || 25,
                visible_fields: data.visible_fields || [],
                visible_columns: data.visible_columns || [],
                filters_config: data.filters_config || {},
            },
        });
    }
}
